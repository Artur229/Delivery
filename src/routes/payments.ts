import { createRoute, z } from "@hono/zod-openapi";
import { createOpenApiApp } from "../lib/openapi.js";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { env } from "../config/env.js";
import type { Role } from "../constants/roles.js";
import { db } from "../db/client.js";
import { orders } from "../db/schema.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { sendToRoles, sendToUser } from "../lib/realtime.js";
import { getStripe } from "../lib/stripe.js";
import { authRequired, type AppBindings } from "../middleware/auth.js";

const authOnly = [authRequired];
const orderSubscriberRoles: Role[] = ["owner", "admin", "chef", "courier"];

const errorResponseSchema = z.object({
  error: z.string(),
  code: z.number(),
});

const orderIdParamSchema = z.object({
  orderId: z.string().uuid(),
});

const checkoutSessionResponseSchema = z.object({
  checkoutUrl: z.string().url(),
  sessionId: z.string(),
});

const webhookResponseSchema = z.object({
  received: z.literal(true),
});

const sharedErrorResponses = {
  400: {
    description: "Bad request",
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
  },
  401: {
    description: "Unauthorized",
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
  },
  403: {
    description: "Forbidden",
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
  },
  404: {
    description: "Not found",
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
  },
};

const successWebhookResponse = {
  received: true,
} as const;

const getOrder = async (orderId: string) => {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      items: {
        with: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    throw notFound("Order not found");
  }

  return order;
};

const toOrderPaymentResponse = (order: Awaited<ReturnType<typeof getOrder>>) => ({
  id: order.id,
  userId: order.userId,
  totalPrice: order.totalPrice,
  status: order.status,
  deliveryType: order.deliveryType,
  address: order.address,
  phone: order.phone,
  paymentType: order.paymentType,
  paymentStatus: order.paymentStatus,
  createdAt: order.createdAt?.toISOString() ?? null,
  items: order.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    price: item.price,
    product: item.product
      ? {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          cover: item.product.cover,
        }
      : null,
  })),
});

const broadcastOrderPaymentUpdate = async (orderId: string) => {
  const response = toOrderPaymentResponse(await getOrder(orderId));

  if (response.userId) {
    sendToUser(response.userId, "order_updated", response);
  }

  sendToRoles(orderSubscriberRoles, "order_updated", response);
};

const updateOrderPaymentSuccess = async (orderId: string) => {
  await db
    .update(orders)
    .set({
      paymentStatus: "paid",
      status: "paid",
    })
    .where(eq(orders.id, orderId));
};

const updateOrderPaymentFailure = async (orderId: string) => {
  await db
    .update(orders)
    .set({
      paymentStatus: "failed",
    })
    .where(eq(orders.id, orderId));
};

const updateOrderPaymentRefunded = async (orderId: string) => {
  await db
    .update(orders)
    .set({
      paymentStatus: "refunded",
    })
    .where(eq(orders.id, orderId));
};

const createCheckoutRoute = createRoute({
  method: "post",
  path: "/payments/checkout/{orderId}",
  tags: ["Payments"],
  security: [{ BearerAuth: [] }],
  middleware: authOnly,
  request: {
    params: orderIdParamSchema,
  },
  responses: {
    200: {
      description: "Stripe checkout session",
      content: {
        "application/json": {
          schema: checkoutSessionResponseSchema,
        },
      },
    },
    ...sharedErrorResponses,
  },
});

const stripeWebhookRoute = createRoute({
  method: "post",
  path: "/payments/stripe/webhook",
  tags: ["Payments"],
  responses: {
    200: {
      description: "Stripe webhook accepted",
      content: {
        "application/json": {
          schema: webhookResponseSchema,
        },
      },
    },
    400: sharedErrorResponses[400],
  },
});

export const paymentsRoute = createOpenApiApp<AppBindings>()
  .openapi(createCheckoutRoute, async (c) => {
    const currentUser = c.get("currentUser");
    const { orderId } = c.req.valid("param");
    const order = await getOrder(orderId);

    if (order.userId !== currentUser.id) {
      throw forbidden("You do not have permission to pay for this order");
    }

    if (order.paymentType !== "card") {
      throw badRequest("Checkout is only available for card payments");
    }

    if (order.paymentStatus === "paid") {
      throw badRequest("Order is already paid");
    }

    if (order.items.length === 0) {
      throw badRequest("Order has no items");
    }

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${env.APP_URL}/payments/success?orderId=${order.id}`,
      cancel_url: `${env.APP_URL}/payments/cancel?orderId=${order.id}`,
      client_reference_id: order.id,
      metadata: {
        orderId: order.id,
        userId: currentUser.id,
      },
      line_items: order.items.map((item) => {
        if (!item.product) {
          throw badRequest("Order item product is missing");
        }

        return {
          quantity: item.quantity,
          price_data: {
            currency: "uah",
            unit_amount: Math.round(Number(item.price) * 100),
            product_data: {
              name: item.product.name,
            },
          },
        };
      }),
    });

    if (!session.url) {
      throw badRequest("Stripe checkout session URL was not created");
    }

    logger.info("payments", "stripe checkout session created", {
      orderId: order.id,
      sessionId: session.id,
    });

    return c.json(
      {
        checkoutUrl: session.url,
        sessionId: session.id,
      },
      200,
    );
  })
  .openapi(stripeWebhookRoute, async (c) => {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw badRequest("Stripe webhook secret is not configured");
    }

    const signature = c.req.header("stripe-signature");

    if (!signature) {
      throw badRequest("Stripe signature header is required");
    }

    const payload = await c.req.text();
    const stripe = getStripe();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (error) {
      logger.warn("payments", "stripe webhook signature verification failed", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw badRequest("Invalid Stripe webhook signature");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        await updateOrderPaymentSuccess(orderId);
        await broadcastOrderPaymentUpdate(orderId);
        logger.info("payments", "stripe checkout completed", {
          orderId,
          sessionId: session.id,
        });
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata?.orderId;

      if (orderId) {
        await updateOrderPaymentFailure(orderId);
        await broadcastOrderPaymentUpdate(orderId);
        logger.warn("payments", "stripe payment failed", {
          orderId,
          paymentIntentId: paymentIntent.id,
        });
      }
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const orderId = charge.metadata?.orderId;

      if (orderId) {
        await updateOrderPaymentRefunded(orderId);
        await broadcastOrderPaymentUpdate(orderId);
        logger.info("payments", "stripe charge refunded", {
          orderId,
          chargeId: charge.id,
        });
      }
    }

    return c.json(successWebhookResponse, 200);
  });
