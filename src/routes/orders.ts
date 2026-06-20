import { createRoute, z } from "@hono/zod-openapi";
import { createOpenApiApp } from "../lib/openapi.js";
import { desc, eq, inArray } from "drizzle-orm";
import {
  deliveryTypes,
  orderStatuses,
  type OrderStatus,
} from "../constants/order.js";
import { paymentTypes } from "../constants/payment.js";
import { roles, type Role } from "../constants/roles.js";
import { db } from "../db/client.js";
import { cartItems, carts, orderItems, orders, products, users } from "../db/schema.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { sendToRoles, sendToUser } from "../lib/realtime.js";
import { authRequired, type AppBindings } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";

const authOnly = [authRequired];
const staffOnly = [authRequired, allowRoles(["owner", "admin", "chef", "courier"])];
const orderSubscriberRoles: Role[] = ["owner", "admin", "chef", "courier"];

const errorResponseSchema = z.object({
  error: z.string(),
  code: z.number(),
});

const orderItemResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  quantity: z.number(),
  price: z.string(),
  product: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      slug: z.string(),
      cover: z.string().nullable(),
    })
    .nullable(),
});

const orderResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  totalPrice: z.string(),
  status: z.enum(orderStatuses),
  deliveryType: z.enum(deliveryTypes),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  paymentType: z.enum(paymentTypes),
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]),
  createdAt: z.string().nullable(),
  items: z.array(orderItemResponseSchema),
});

const orderListResponseSchema = z.object({
  orders: z.array(orderResponseSchema),
});

const orderIdParamSchema = z.object({
  orderId: z.string().uuid(),
});

const createOrderBodySchema = z.object({
  deliveryType: z.enum(deliveryTypes).default("delivery"),
  address: z.string().trim().min(3).max(255).nullable().optional(),
  phone: z.string().trim().min(3).max(40).nullable().optional(),
  paymentType: z.enum(paymentTypes),
});

const createGuestOrderBodySchema = createOrderBodySchema.extend({
  paymentType: z.literal("cash"),
  items: z
    .array(
      z.object({
        productSlug: z.string().trim().min(1),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1),
});

const updateOrderStatusBodySchema = z.object({
  status: z.enum(orderStatuses),
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

const toOrderResponse = (
  order: typeof orders.$inferSelect & {
    items: Array<
      typeof orderItems.$inferSelect & {
        product: Pick<typeof products.$inferSelect, "id" | "name" | "slug" | "cover"> | null;
      }
    >;
  },
) => ({
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

const getOrderWithItems = async (orderId: string) => {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      items: {
        with: {
          product: {
            columns: {
              id: true,
              name: true,
              slug: true,
              cover: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw notFound("Order not found");
  }

  return order;
};

const getUserCartWithItems = async (userId: string) => {
  const cart = await db.query.carts.findFirst({
    where: eq(carts.userId, userId),
    with: {
      items: {
        with: {
          product: true,
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw badRequest("Cart is empty");
  }

  return cart;
};

const canReadOrder = (role: Role, actorId: string, orderUserId: string | null) => {
  if (role === "owner" || role === "admin" || role === "chef" || role === "courier") {
    return true;
  }

  return orderUserId === actorId;
};

const canMoveStatus = (
  role: Role,
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
) => {
  if (role === "owner" || role === "admin") {
    return true;
  }

  if (role === "chef") {
    return (
      (currentStatus === "paid" && nextStatus === "cooking") ||
      (currentStatus === "cooking" && nextStatus === "ready")
    );
  }

  if (role === "courier") {
    return (
      (currentStatus === "ready" && nextStatus === "on_the_way") ||
      (currentStatus === "on_the_way" && nextStatus === "delivered")
    );
  }

  return false;
};

const createOrderRoute = createRoute({
  method: "post",
  path: "/orders",
  tags: ["Orders"],
  security: [{ BearerAuth: [] }],
  middleware: authOnly,
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: createOrderBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Created order from cart",
      content: {
        "application/json": {
          schema: orderResponseSchema,
        },
      },
    },
    ...sharedErrorResponses,
  },
});

const createGuestOrderRoute = createRoute({
  method: "post",
  path: "/guest/orders",
  tags: ["Orders"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: createGuestOrderBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Created guest cash order",
      content: {
        "application/json": {
          schema: orderResponseSchema,
        },
      },
    },
    400: sharedErrorResponses[400],
    404: sharedErrorResponses[404],
  },
});

const listMyOrdersRoute = createRoute({
  method: "get",
  path: "/orders",
  tags: ["Orders"],
  security: [{ BearerAuth: [] }],
  middleware: authOnly,
  responses: {
    200: {
      description: "Current user orders",
      content: {
        "application/json": {
          schema: orderListResponseSchema,
        },
      },
    },
    401: sharedErrorResponses[401],
  },
});

const listAllOrdersRoute = createRoute({
  method: "get",
  path: "/admin/orders",
  tags: ["Orders"],
  security: [{ BearerAuth: [] }],
  middleware: staffOnly,
  responses: {
    200: {
      description: "All orders for staff",
      content: {
        "application/json": {
          schema: orderListResponseSchema,
        },
      },
    },
    401: sharedErrorResponses[401],
    403: sharedErrorResponses[403],
  },
});

const getOrderRoute = createRoute({
  method: "get",
  path: "/orders/{orderId}",
  tags: ["Orders"],
  security: [{ BearerAuth: [] }],
  middleware: authOnly,
  request: {
    params: orderIdParamSchema,
  },
  responses: {
    200: {
      description: "Order details",
      content: {
        "application/json": {
          schema: orderResponseSchema,
        },
      },
    },
    ...sharedErrorResponses,
  },
});

const updateOrderStatusRoute = createRoute({
  method: "patch",
  path: "/orders/{orderId}/status",
  tags: ["Orders"],
  security: [{ BearerAuth: [] }],
  middleware: staffOnly,
  request: {
    params: orderIdParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: updateOrderStatusBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated order status",
      content: {
        "application/json": {
          schema: orderResponseSchema,
        },
      },
    },
    ...sharedErrorResponses,
  },
});

export const ordersRoute = createOpenApiApp<AppBindings>()
  .openapi(createOrderRoute, async (c) => {
    const currentUser = c.get("currentUser");
    const body = c.req.valid("json");
    const cart = await getUserCartWithItems(currentUser.id);

    const currentUserRecord = await db.query.users.findFirst({
      where: eq(users.id, currentUser.id),
    });

    if (!currentUserRecord) {
      throw notFound("User not found");
    }

    const totalPrice = cart.items.reduce((sum, item) => {
      if (!item.product) {
        return sum;
      }

      return sum + Number(item.product.price) * item.quantity;
    }, 0);

    if (totalPrice <= 0) {
      throw badRequest("Cart total must be greater than zero");
    }

    const [createdOrder] = await db
      .insert(orders)
      .values({
        userId: currentUser.id,
        totalPrice: totalPrice.toFixed(2),
        status: "created",
        deliveryType: body.deliveryType,
        address: body.address ?? currentUserRecord.address,
        phone: body.phone ?? currentUserRecord.phone,
        paymentType: body.paymentType,
        paymentStatus: "pending",
      })
      .returning();

    await db.insert(orderItems).values(
      cart.items.map((item) => {
        if (!item.product) {
          throw notFound("Product not found");
        }

        return {
          orderId: createdOrder.id,
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        };
      }),
    );

    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    await db
      .update(carts)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(carts.id, cart.id));

    logger.info("orders", "order created", {
      orderId: createdOrder.id,
      userId: currentUser.id,
      totalPrice: createdOrder.totalPrice,
    });

    const response = toOrderResponse(await getOrderWithItems(createdOrder.id));

    sendToUser(currentUser.id, "cart_updated", {
      id: cart.id,
      userId: currentUser.id,
      updatedAt: new Date().toISOString(),
      items: [],
      totalPrice: "0.00",
    });
    sendToUser(currentUser.id, "order_updated", response);
    sendToRoles(orderSubscriberRoles, "order_updated", response);

    return c.json(response, 201);
  })
  .openapi(createGuestOrderRoute, async (c) => {
    const body = c.req.valid("json");

    if (body.deliveryType === "delivery" && !body.address) {
      throw badRequest("Address is required for delivery");
    }

    if (!body.phone) {
      throw badRequest("Phone is required");
    }

    const requestedItems = new Map<string, number>();
    for (const item of body.items) {
      requestedItems.set(item.productSlug, (requestedItems.get(item.productSlug) ?? 0) + item.quantity);
    }

    const foundProducts = await db.query.products.findMany({
      where: inArray(products.slug, Array.from(requestedItems.keys())),
      columns: {
        id: true,
        name: true,
        slug: true,
        cover: true,
        price: true,
      },
    });

    if (foundProducts.length !== requestedItems.size) {
      throw notFound("One or more products were not found");
    }

    const totalPrice = foundProducts.reduce((sum, product) => {
      return sum + Number(product.price) * (requestedItems.get(product.slug) ?? 0);
    }, 0);

    if (totalPrice <= 0) {
      throw badRequest("Order total must be greater than zero");
    }

    const [createdOrder] = await db
      .insert(orders)
      .values({
        userId: null,
        totalPrice: totalPrice.toFixed(2),
        status: "created",
        deliveryType: body.deliveryType,
        address: body.address ?? null,
        phone: body.phone,
        paymentType: "cash",
        paymentStatus: "pending",
      })
      .returning();

    await db.insert(orderItems).values(
      foundProducts.map((product) => ({
        orderId: createdOrder.id,
        productId: product.id,
        quantity: requestedItems.get(product.slug) ?? 1,
        price: product.price,
      })),
    );

    logger.info("orders", "guest order created", {
      orderId: createdOrder.id,
      totalPrice: createdOrder.totalPrice,
    });

    const response = toOrderResponse(await getOrderWithItems(createdOrder.id));
    sendToRoles(orderSubscriberRoles, "order_updated", response);

    return c.json(response, 201);
  })
  .openapi(listMyOrdersRoute, async (c) => {
    const currentUser = c.get("currentUser");
    const userOrders = await db.query.orders.findMany({
      where: eq(orders.userId, currentUser.id),
      orderBy: [desc(orders.createdAt)],
      with: {
        items: {
          with: {
            product: {
              columns: {
                id: true,
                name: true,
                slug: true,
                cover: true,
              },
            },
          },
        },
      },
    });

    return c.json(
      {
        orders: userOrders.map(toOrderResponse),
      },
      200,
    );
  })
  .openapi(listAllOrdersRoute, async (c) => {
    const allOrders = await db.query.orders.findMany({
      orderBy: [desc(orders.createdAt)],
      with: {
        items: {
          with: {
            product: {
              columns: {
                id: true,
                name: true,
                slug: true,
                cover: true,
              },
            },
          },
        },
      },
    });

    return c.json(
      {
        orders: allOrders.map(toOrderResponse),
      },
      200,
    );
  })
  .openapi(getOrderRoute, async (c) => {
    const currentUser = c.get("currentUser");
    const { orderId } = c.req.valid("param");
    const order = await getOrderWithItems(orderId);

    if (!canReadOrder(currentUser.role as Role, currentUser.id, order.userId)) {
      throw forbidden("You do not have permission to access this order");
    }

    return c.json(toOrderResponse(order), 200);
  })
  .openapi(updateOrderStatusRoute, async (c) => {
    const currentUser = c.get("currentUser");
    const { orderId } = c.req.valid("param");
    const body = c.req.valid("json");
    const order = await getOrderWithItems(orderId);
    const role = currentUser.role as Role;

    if (!canMoveStatus(role, order.status, body.status)) {
      throw forbidden("This role cannot move the order to the requested status");
    }

    const [updatedOrder] = await db
      .update(orders)
      .set({
        status: body.status,
      })
      .where(eq(orders.id, order.id))
      .returning();

    if (!updatedOrder) {
      throw notFound("Order not found");
    }

    logger.info("orders", "order status updated", {
      actorId: currentUser.id,
      orderId: updatedOrder.id,
      from: order.status,
      to: updatedOrder.status,
    });

    const response = toOrderResponse(await getOrderWithItems(updatedOrder.id));

    if (response.userId) {
      sendToUser(response.userId, "order_updated", response);
    }

    sendToRoles(orderSubscriberRoles, "order_updated", response);

    return c.json(response, 200);
  });
