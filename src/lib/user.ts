import { z } from "@hono/zod-openapi";
import { roles } from "../constants/roles.js";
import { users } from "../db/schema.js";

export const userResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  email: z.string().email(),
  role: z.enum(roles),
  cover: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  isBlockedFromReviews: z.boolean().nullable(),
  createdAt: z.string().nullable(),
});

export const toUserResponse = (user: typeof users.$inferSelect) => ({
  id: user.id,
  name: user.name,
  slug: user.slug,
  email: user.email,
  role: user.role,
  cover: user.cover,
  phone: user.phone,
  address: user.address,
  isBlockedFromReviews: user.isBlockedFromReviews,
  createdAt: user.createdAt?.toISOString() ?? null,
});
