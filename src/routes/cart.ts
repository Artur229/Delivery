import { createRoute, z } from "@hono/zod-openapi";
import { createOpenApiApp } from "../lib/openapi.js";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { cartItems, carts, products } from "../db/schema.js";
import { notFound } from "../lib/errors.js";
import { sendToUser } from "../lib/realtime.js";
import { authRequired, type AppBindings } from "../middleware/auth.js";

const authOnly = [authRequired];

const errorResponseSchema = z.object({
  error: z.string(),
  code: z.number(),
});

const cartProductResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  cover: z.string().nullable(),
  price: z.string(),
  description: z.string().nullable(),
});

const cartItemResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  quantity: z.number(),
  product: cartProductResponseSchema.nullable(),
});

const cartResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  updatedAt: z.string().nullable(),
  items: z.array(cartItemResponseSchema),
  totalPrice: z.string(),
});

const addCartItemBodySchema = z.object({
  productSlug: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
});

const updateCartItemBodySchema = z.object({
  quantity: z.coerce.number().int().positive(),
});

const itemIdParamSchema = z.object({
  itemId: z.string().uuid(),
});

const successResponseSchema = z.object({
  success: z.literal(true),
});

const successResponse = {
  success: true,
} as const;

const sharedErrorResponses = {
  401: {
    description: "Unauthorized",
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

const toCartProductResponse = (product: typeof products.$inferSelect) => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  cover: product.cover,
  price: product.price,
  description: product.description,
});

const toCartResponse = (
  cart: typeof carts.$inferSelect & {
    items: Array<
      typeof cartItems.$inferSelect & {
        product: typeof products.$inferSelect | null;
      }
    >;
  },
) => {
  const total = cart.items.reduce((sum, item) => {
    if (!item.product) {
      return sum;
    }

    return sum + Number(item.product.price) * item.quantity;
  }, 0);

  return {
    id: cart.id,
    userId: cart.userId,
    updatedAt: cart.updatedAt?.toISOString() ?? null,
    items: cart.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      product: item.product ? toCartProductResponse(item.product) : null,
    })),
    totalPrice: total.toFixed(2),
  };
};

const getOrCreateCart = async (userId: string) => {
  const existingCart = await db.query.carts.findFirst({
    where: eq(carts.userId, userId),
  });

  if (existingCart) {
    return existingCart;
  }

  const [createdCart] = await db
    .insert(carts)
    .values({
      userId,
      updatedAt: new Date(),
    })
    .returning();

  return createdCart;
};

const getCartWithItems = async (userId: string) => {
  const cart = await getOrCreateCart(userId);
  const cartWithItems = await db.query.carts.findFirst({
    where: eq(carts.id, cart.id),
    with: {
      items: {
        orderBy: [asc(cartItems.id)],
        with: {
          product: true,
        },
      },
    },
  });

  if (!cartWithItems) {
    throw notFound("Cart not found");
  }

  return cartWithItems;
};

const touchCart = async (cartId: string) => {
  await db
    .update(carts)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(carts.id, cartId));
};

const getCartRoute = createRoute({
  method: "get",
  path: "/cart",
  tags: ["Cart"],
  security: [{ BearerAuth: [] }],
  middleware: authOnly,
  responses: {
    200: {
      description: "Current user cart",
      content: {
        "application/json": {
          schema: cartResponseSchema,
        },
      },
    },
    401: sharedErrorResponses[401],
  },
});

const addCartItemRoute = createRoute({
  method: "post",
  path: "/cart/items",
  tags: ["Cart"],
  security: [{ BearerAuth: [] }],
  middleware: authOnly,
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: addCartItemBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated cart",
      content: {
        "application/json": {
          schema: cartResponseSchema,
        },
      },
    },
    ...sharedErrorResponses,
  },
});

const updateCartItemRoute = createRoute({
  method: "patch",
  path: "/cart/items/{itemId}",
  tags: ["Cart"],
  security: [{ BearerAuth: [] }],
  middleware: authOnly,
  request: {
    params: itemIdParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: updateCartItemBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated cart",
      content: {
        "application/json": {
          schema: cartResponseSchema,
        },
      },
    },
    ...sharedErrorResponses,
  },
});

const deleteCartItemRoute = createRoute({
  method: "delete",
  path: "/cart/items/{itemId}",
  tags: ["Cart"],
  security: [{ BearerAuth: [] }],
  middleware: authOnly,
  request: {
    params: itemIdParamSchema,
  },
  responses: {
    200: {
      description: "Updated cart",
      content: {
        "application/json": {
          schema: cartResponseSchema,
        },
      },
    },
    ...sharedErrorResponses,
  },
});

const clearCartRoute = createRoute({
  method: "delete",
  path: "/cart",
  tags: ["Cart"],
  security: [{ BearerAuth: [] }],
  middleware: authOnly,
  responses: {
    200: {
      description: "Cart cleared",
      content: {
        "application/json": {
          schema: successResponseSchema,
        },
      },
    },
    401: sharedErrorResponses[401],
  },
});

export const cartRoute = createOpenApiApp<AppBindings>()
  .openapi(getCartRoute, async (c) => {
    const currentUser = c.get("currentUser");
    const cart = await getCartWithItems(currentUser.id);

    return c.json(toCartResponse(cart), 200);
  })
  .openapi(addCartItemRoute, async (c) => {
    const currentUser = c.get("currentUser");
    const body = c.req.valid("json");
    const cart = await getOrCreateCart(currentUser.id);

    const product = await db.query.products.findFirst({
      where: eq(products.slug, body.productSlug),
    });

    if (!product) {
      throw notFound("Product not found");
    }

    const existingItem = await db.query.cartItems.findFirst({
      where: and(
        eq(cartItems.cartId, cart.id),
        eq(cartItems.productId, product.id),
      ),
    });

    if (existingItem) {
      await db
        .update(cartItems)
        .set({
          quantity: existingItem.quantity + body.quantity,
        })
        .where(eq(cartItems.id, existingItem.id));
    } else {
      await db.insert(cartItems).values({
        cartId: cart.id,
        productId: product.id,
        quantity: body.quantity,
      });
    }

    await touchCart(cart.id);

    const response = toCartResponse(await getCartWithItems(currentUser.id));
    sendToUser(currentUser.id, "cart_updated", response);

    return c.json(response, 200);
  })
  .openapi(updateCartItemRoute, async (c) => {
    const currentUser = c.get("currentUser");
    const { itemId } = c.req.valid("param");
    const body = c.req.valid("json");
    const cart = await getOrCreateCart(currentUser.id);

    const [updatedItem] = await db
      .update(cartItems)
      .set({
        quantity: body.quantity,
      })
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .returning();

    if (!updatedItem) {
      throw notFound("Cart item not found");
    }

    await touchCart(cart.id);

    const response = toCartResponse(await getCartWithItems(currentUser.id));
    sendToUser(currentUser.id, "cart_updated", response);

    return c.json(response, 200);
  })
  .openapi(deleteCartItemRoute, async (c) => {
    const currentUser = c.get("currentUser");
    const { itemId } = c.req.valid("param");
    const cart = await getOrCreateCart(currentUser.id);

    const [deletedItem] = await db
      .delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)))
      .returning();

    if (!deletedItem) {
      throw notFound("Cart item not found");
    }

    await touchCart(cart.id);

    const response = toCartResponse(await getCartWithItems(currentUser.id));
    sendToUser(currentUser.id, "cart_updated", response);

    return c.json(response, 200);
  })
  .openapi(clearCartRoute, async (c) => {
    const currentUser = c.get("currentUser");
    const cart = await getOrCreateCart(currentUser.id);

    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    await touchCart(cart.id);

    sendToUser(
      currentUser.id,
      "cart_updated",
      toCartResponse(await getCartWithItems(currentUser.id)),
    );

    return c.json(successResponse, 200);
  });
