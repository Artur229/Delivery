import { createRoute, z } from "@hono/zod-openapi";
import { createOpenApiApp } from "../lib/openapi.js";
import { and, eq, ne } from "drizzle-orm";
import { roles } from "../constants/roles.js";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { conflict, notFound } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { createUniqueSlug } from "../lib/slug.js";
import { toUserResponse, userResponseSchema } from "../lib/user.js";
import { authRequired, type AppBindings } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";

const errorResponseSchema = z.object({
  error: z.string(),
  code: z.number(),
});

const userListResponseSchema = z.object({
  users: z.array(userResponseSchema),
});

const updateMeBodySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(3).max(40).nullable().optional(),
  address: z.string().trim().min(3).max(255).nullable().optional(),
  cover: z.string().url().nullable().optional(),
});

const slugParamSchema = z.object({
  slug: z.string().min(1),
});

const updateRoleBodySchema = z.object({
  role: z.enum(roles),
});

const updateReviewBlockBodySchema = z.object({
  isBlockedFromReviews: z.boolean(),
});

const getMeRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["Users"],
  security: [{ BearerAuth: [] }],
  middleware: [authRequired] as const,
  responses: {
    200: {
      description: "Current authenticated user",
      content: {
        "application/json": {
          schema: userResponseSchema,
        },
      },
    },
    401: {
      description: "Missing or invalid access token",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const updateMeRoute = createRoute({
  method: "patch",
  path: "/me",
  tags: ["Users"],
  security: [{ BearerAuth: [] }],
  middleware: [authRequired] as const,
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: updateMeBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated current user",
      content: {
        "application/json": {
          schema: userResponseSchema,
        },
      },
    },
    401: {
      description: "Missing or invalid access token",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    409: {
      description: "Generated slug conflicts with another user",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const listUsersRoute = createRoute({
  method: "get",
  path: "/users",
  tags: ["Users"],
  security: [{ BearerAuth: [] }],
  middleware: [authRequired, allowRoles(["owner", "admin"])] as const,
  responses: {
    200: {
      description: "All users",
      content: {
        "application/json": {
          schema: userListResponseSchema,
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
  },
});

const updateUserRoleRoute = createRoute({
  method: "patch",
  path: "/users/{slug}/role",
  tags: ["Users"],
  security: [{ BearerAuth: [] }],
  middleware: [authRequired, allowRoles(["owner", "admin"])] as const,
  request: {
    params: slugParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: updateRoleBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated user role",
      content: {
        "application/json": {
          schema: userResponseSchema,
        },
      },
    },
    404: {
      description: "User not found",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const updateUserReviewBlockRoute = createRoute({
  method: "patch",
  path: "/users/{slug}/review-block",
  tags: ["Users"],
  security: [{ BearerAuth: [] }],
  middleware: [authRequired, allowRoles(["owner", "admin"])] as const,
  request: {
    params: slugParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: updateReviewBlockBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated review block status",
      content: {
        "application/json": {
          schema: userResponseSchema,
        },
      },
    },
    404: {
      description: "User not found",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

export const usersRoute = createOpenApiApp<AppBindings>()
  .openapi(getMeRoute, async (c) => {
    const currentUser = c.get("currentUser");

    const user = await db.query.users.findFirst({
      where: eq(users.id, currentUser.id),
    });

    if (!user) {
      throw notFound("User not found");
    }

    return c.json(toUserResponse(user), 200);
  })
  .openapi(updateMeRoute, async (c) => {
    const currentUser = c.get("currentUser");
    const body = c.req.valid("json");

    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, currentUser.id),
    });

    if (!existingUser) {
      throw notFound("User not found");
    }

    const values: Partial<typeof users.$inferInsert> = {
      phone: body.phone,
      address: body.address,
      cover: body.cover,
    };

    if (body.name && body.name !== existingUser.name) {
      const slug = await createUniqueSlug(body.name, async (candidateSlug) => {
        const user = await db.query.users.findFirst({
          where: and(eq(users.slug, candidateSlug), ne(users.id, currentUser.id)),
          columns: {
            id: true,
          },
        });

        return Boolean(user);
      });

      values.name = body.name;
      values.slug = slug;
    }

    const [updatedUser] = await db
      .update(users)
      .set(values)
      .where(eq(users.id, currentUser.id))
      .returning();

    if (!updatedUser) {
      throw conflict("User could not be updated");
    }

    logger.info("auth", "user profile updated", {
      userId: updatedUser.id,
    });

    return c.json(toUserResponse(updatedUser), 200);
  })
  .openapi(listUsersRoute, async (c) => {
    const allUsers = await db.query.users.findMany({
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });

    return c.json(
      {
        users: allUsers.map(toUserResponse),
      },
      200,
    );
  })
  .openapi(updateUserRoleRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const body = c.req.valid("json");
    const currentUser = c.get("currentUser");

    const [updatedUser] = await db
      .update(users)
      .set({
        role: body.role,
      })
      .where(eq(users.slug, slug))
      .returning();

    if (!updatedUser) {
      throw notFound("User not found");
    }

    logger.info("admin", "user role changed", {
      actorId: currentUser.id,
      userId: updatedUser.id,
      role: updatedUser.role,
    });

    return c.json(toUserResponse(updatedUser), 200);
  })
  .openapi(updateUserReviewBlockRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const body = c.req.valid("json");
    const currentUser = c.get("currentUser");

    const [updatedUser] = await db
      .update(users)
      .set({
        isBlockedFromReviews: body.isBlockedFromReviews,
      })
      .where(eq(users.slug, slug))
      .returning();

    if (!updatedUser) {
      throw notFound("User not found");
    }

    logger.info("admin", "user review block changed", {
      actorId: currentUser.id,
      userId: updatedUser.id,
      isBlockedFromReviews: updatedUser.isBlockedFromReviews,
    });

    return c.json(toUserResponse(updatedUser), 200);
  });
