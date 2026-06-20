import { createRoute, z } from "@hono/zod-openapi";
import { createOpenApiApp } from "../lib/openapi.js";
import { and, eq, ne } from "drizzle-orm";
import { db } from "../db/client.js";
import { inventory } from "../db/schema.js";
import { conflict, notFound } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { createUniqueSlug } from "../lib/slug.js";
import { authRequired, type AppBindings } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";

const canReadInventory = [authRequired, allowRoles(["owner", "admin", "chef"])];
const canWriteInventory = [authRequired, allowRoles(["owner", "admin"])];

const errorResponseSchema = z.object({
  error: z.string(),
  code: z.number(),
});

const inventoryResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  quantity: z.string(),
  unit: z.string(),
  cover: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

const inventoryListResponseSchema = z.object({
  inventory: z.array(inventoryResponseSchema),
});

const slugParamSchema = z.object({
  slug: z.string().min(1),
});

const createInventoryBodySchema = z.object({
  name: z.string().trim().min(2).max(160),
  quantity: z.coerce.number().nonnegative(),
  unit: z.string().trim().min(1).max(40),
  cover: z.string().url().nullable().optional(),
});

const updateInventoryBodySchema = createInventoryBodySchema.partial();

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
  403: {
    description: "Forbidden",
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
  },
  404: {
    description: "Inventory item not found",
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
  },
  409: {
    description: "Conflict",
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
  },
};

const toInventoryResponse = (item: typeof inventory.$inferSelect) => ({
  id: item.id,
  name: item.name,
  slug: item.slug,
  quantity: item.quantity,
  unit: item.unit,
  cover: item.cover,
  updatedAt: item.updatedAt?.toISOString() ?? null,
});

const listInventoryRoute = createRoute({
  method: "get",
  path: "/inventory",
  tags: ["Inventory"],
  security: [{ BearerAuth: [] }],
  middleware: canReadInventory,
  responses: {
    200: {
      description: "Inventory items",
      content: {
        "application/json": {
          schema: inventoryListResponseSchema,
        },
      },
    },
    401: sharedErrorResponses[401],
    403: sharedErrorResponses[403],
  },
});

const getInventoryItemRoute = createRoute({
  method: "get",
  path: "/inventory/{slug}",
  tags: ["Inventory"],
  security: [{ BearerAuth: [] }],
  middleware: canReadInventory,
  request: {
    params: slugParamSchema,
  },
  responses: {
    200: {
      description: "Inventory item",
      content: {
        "application/json": {
          schema: inventoryResponseSchema,
        },
      },
    },
    ...sharedErrorResponses,
  },
});

const createInventoryItemRoute = createRoute({
  method: "post",
  path: "/inventory",
  tags: ["Inventory"],
  security: [{ BearerAuth: [] }],
  middleware: canWriteInventory,
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: createInventoryBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Created inventory item",
      content: {
        "application/json": {
          schema: inventoryResponseSchema,
        },
      },
    },
    ...sharedErrorResponses,
  },
});

const updateInventoryItemRoute = createRoute({
  method: "patch",
  path: "/inventory/{slug}",
  tags: ["Inventory"],
  security: [{ BearerAuth: [] }],
  middleware: canWriteInventory,
  request: {
    params: slugParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: updateInventoryBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated inventory item",
      content: {
        "application/json": {
          schema: inventoryResponseSchema,
        },
      },
    },
    ...sharedErrorResponses,
  },
});

const deleteInventoryItemRoute = createRoute({
  method: "delete",
  path: "/inventory/{slug}",
  tags: ["Inventory"],
  security: [{ BearerAuth: [] }],
  middleware: canWriteInventory,
  request: {
    params: slugParamSchema,
  },
  responses: {
    200: {
      description: "Deleted inventory item",
      content: {
        "application/json": {
          schema: successResponseSchema,
        },
      },
    },
    ...sharedErrorResponses,
  },
});

export const inventoryRoute = createOpenApiApp<AppBindings>()
  .openapi(listInventoryRoute, async (c) => {
    const inventoryItems = await db.query.inventory.findMany();

    return c.json(
      {
        inventory: inventoryItems.map(toInventoryResponse),
      },
      200,
    );
  })
  .openapi(getInventoryItemRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const item = await db.query.inventory.findFirst({
      where: eq(inventory.slug, slug),
    });

    if (!item) {
      throw notFound("Inventory item not found");
    }

    return c.json(toInventoryResponse(item), 200);
  })
  .openapi(createInventoryItemRoute, async (c) => {
    const body = c.req.valid("json");
    const currentUser = c.get("currentUser");

    const slug = await createUniqueSlug(body.name, async (candidateSlug) => {
      const item = await db.query.inventory.findFirst({
        where: eq(inventory.slug, candidateSlug),
        columns: {
          id: true,
        },
      });

      return Boolean(item);
    });

    const [createdItem] = await db
      .insert(inventory)
      .values({
        name: body.name,
        slug,
        quantity: String(body.quantity),
        unit: body.unit,
        cover: body.cover,
        updatedAt: new Date(),
      })
      .returning();

    logger.info("admin", "inventory item created", {
      actorId: currentUser.id,
      inventoryItemId: createdItem.id,
    });

    return c.json(toInventoryResponse(createdItem), 201);
  })
  .openapi(updateInventoryItemRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const body = c.req.valid("json");
    const currentUser = c.get("currentUser");

    const existingItem = await db.query.inventory.findFirst({
      where: eq(inventory.slug, slug),
    });

    if (!existingItem) {
      throw notFound("Inventory item not found");
    }

    const values: Partial<typeof inventory.$inferInsert> = {
      unit: body.unit,
      cover: body.cover,
      updatedAt: new Date(),
    };

    if (body.quantity !== undefined) {
      values.quantity = String(body.quantity);
    }

    if (body.name && body.name !== existingItem.name) {
      values.name = body.name;
      values.slug = await createUniqueSlug(body.name, async (candidateSlug) => {
        const item = await db.query.inventory.findFirst({
          where: and(
            eq(inventory.slug, candidateSlug),
            ne(inventory.id, existingItem.id),
          ),
          columns: {
            id: true,
          },
        });

        return Boolean(item);
      });
    }

    const [updatedItem] = await db
      .update(inventory)
      .set(values)
      .where(eq(inventory.id, existingItem.id))
      .returning();

    if (!updatedItem) {
      throw conflict("Inventory item could not be updated");
    }

    logger.info("admin", "inventory item updated", {
      actorId: currentUser.id,
      inventoryItemId: updatedItem.id,
    });

    return c.json(toInventoryResponse(updatedItem), 200);
  })
  .openapi(deleteInventoryItemRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const currentUser = c.get("currentUser");

    const [deletedItem] = await db
      .delete(inventory)
      .where(eq(inventory.slug, slug))
      .returning();

    if (!deletedItem) {
      throw notFound("Inventory item not found");
    }

    logger.info("admin", "inventory item deleted", {
      actorId: currentUser.id,
      inventoryItemId: deletedItem.id,
    });

    return c.json(successResponse, 200);
  });
