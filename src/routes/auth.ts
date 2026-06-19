import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, eq, gt } from "drizzle-orm";
import { roles } from "../constants/roles.js";
import { db } from "../db/client.js";
import { refreshTokens, users } from "../db/schema.js";
import { conflict, unauthorized } from "../lib/errors.js";
import { signAuthToken, verifyAuthToken } from "../lib/jwt.js";
import { logger } from "../lib/logger.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { createUniqueSlug } from "../lib/slug.js";
import { toUserResponse, userResponseSchema } from "../lib/user.js";

const accessTokenExpiresIn = "15m";
const refreshTokenExpiresIn = "30d";
const refreshTokenTtlMs = 30 * 24 * 60 * 60 * 1000;

const authResponseSchema = z.object({
  user: userResponseSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

const errorResponseSchema = z.object({
  error: z.string(),
  code: z.number(),
});

const registerBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(6).max(128),
  phone: z.string().trim().min(3).max(40).optional(),
  address: z.string().trim().min(3).max(255).optional(),
  cover: z.string().url().optional(),
});

const loginBodySchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

const logoutBodySchema = z.object({
  refreshToken: z.string().min(1),
});

const createTokenPair = async (user: Pick<typeof users.$inferSelect, "id" | "role">) => {
  const accessToken = await signAuthToken(
    {
      sub: user.id,
      role: user.role,
      type: "access",
    },
    accessTokenExpiresIn,
  );

  const refreshToken = await signAuthToken(
    {
      sub: user.id,
      role: user.role,
      type: "refresh",
    },
    refreshTokenExpiresIn,
  );

  const expiresAt = new Date(Date.now() + refreshTokenTtlMs);

  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refreshToken,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken,
  };
};

const registerRoute = createRoute({
  method: "post",
  path: "/register",
  tags: ["Auth"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: registerBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Registered customer and auth tokens",
      content: {
        "application/json": {
          schema: authResponseSchema,
        },
      },
    },
    409: {
      description: "Email already exists",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const loginRoute = createRoute({
  method: "post",
  path: "/login",
  tags: ["Auth"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: loginBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Auth tokens for valid credentials",
      content: {
        "application/json": {
          schema: authResponseSchema,
        },
      },
    },
    401: {
      description: "Invalid credentials",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const refreshRoute = createRoute({
  method: "post",
  path: "/refresh",
  tags: ["Auth"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: refreshBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Rotated auth tokens",
      content: {
        "application/json": {
          schema: authResponseSchema,
        },
      },
    },
    401: {
      description: "Invalid refresh token",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

const logoutRoute = createRoute({
  method: "post",
  path: "/logout",
  tags: ["Auth"],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: logoutBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Refresh token removed",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
          }),
        },
      },
    },
  },
});

export const authRoute = new OpenAPIHono()
  .openapi(registerRoute, async (c) => {
    const body = c.req.valid("json");

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    if (existingUser) {
      throw conflict("Email is already registered");
    }

    const slug = await createUniqueSlug(body.name, async (candidateSlug) => {
      const user = await db.query.users.findFirst({
        where: eq(users.slug, candidateSlug),
        columns: {
          id: true,
        },
      });

      return Boolean(user);
    });

    const passwordHash = await hashPassword(body.password);

    const [createdUser] = await db
      .insert(users)
      .values({
        name: body.name,
        slug,
        email: body.email,
        passwordHash,
        role: "customer",
        phone: body.phone,
        address: body.address,
        cover: body.cover,
      })
      .returning();

    const tokens = await createTokenPair(createdUser);

    logger.info("auth", "customer registered", {
      userId: createdUser.id,
      email: createdUser.email,
    });

    return c.json(
      {
        user: toUserResponse(createdUser),
        ...tokens,
      },
      201,
    );
  })
  .openapi(loginRoute, async (c) => {
    const body = c.req.valid("json");

    const user = await db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    if (!user) {
      throw unauthorized("Invalid email or password");
    }

    const isValidPassword = await verifyPassword(body.password, user.passwordHash);

    if (!isValidPassword) {
      throw unauthorized("Invalid email or password");
    }

    const tokens = await createTokenPair(user);

    logger.info("auth", "user logged in", {
      userId: user.id,
      email: user.email,
    });

    return c.json(
      {
        user: toUserResponse(user),
        ...tokens,
      },
      200,
    );
  })
  .openapi(refreshRoute, async (c) => {
    const body = c.req.valid("json");
    const payload = await verifyAuthToken(body.refreshToken, "refresh");

    const storedToken = await db.query.refreshTokens.findFirst({
      where: and(
        eq(refreshTokens.userId, payload.sub),
        eq(refreshTokens.token, body.refreshToken),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    });

    if (!storedToken) {
      throw unauthorized("Invalid refresh token");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.sub),
    });

    if (!user) {
      throw unauthorized("Invalid refresh token");
    }

    await db.delete(refreshTokens).where(eq(refreshTokens.token, body.refreshToken));

    const tokens = await createTokenPair(user);

    logger.info("auth", "refresh token rotated", {
      userId: user.id,
    });

    return c.json(
      {
        user: toUserResponse(user),
        ...tokens,
      },
      200,
    );
  })
  .openapi(logoutRoute, async (c) => {
    const body = c.req.valid("json");

    await db.delete(refreshTokens).where(eq(refreshTokens.token, body.refreshToken));

    logger.info("auth", "user logged out");

    return c.json({
      success: true,
    });
  });
