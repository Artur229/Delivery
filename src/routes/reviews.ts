import { createRoute, z } from "@hono/zod-openapi";
import { createOpenApiApp } from "../lib/openapi.js";
import { and, eq } from "drizzle-orm";
import { roles, type Role } from "../constants/roles.js";
import { db } from "../db/client.js";
import { products, reviews, users } from "../db/schema.js";
import { conflict, forbidden, notFound } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { authRequired, type AppBindings } from "../middleware/auth.js";

const authOnly = [authRequired];

const errorResponseSchema = z.object({
  error: z.string(),
  code: z.number(),
});

const reviewAuthorResponseSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    cover: z.string().nullable(),
    role: z.enum(roles),
  })
  .nullable();

const reviewResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  productId: z.string().uuid().nullable(),
  rating: z.number(),
  text: z.string(),
  createdAt: z.string().nullable(),
  user: reviewAuthorResponseSchema,
});

const reviewListResponseSchema = z.object({
  reviews: z.array(reviewResponseSchema),
});

const productSlugParamSchema = z.object({
  slug: z.string().min(1),
});

const reviewIdParamSchema = z.object({
  reviewId: z.string().uuid(),
});

const createReviewBodySchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().min(1).max(2000),
});

const updateReviewBodySchema = createReviewBodySchema.partial();

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
    description: "Not found",
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

const toReviewResponse = (
  review: typeof reviews.$inferSelect & {
    user?: Pick<typeof users.$inferSelect, "id" | "name" | "slug" | "cover" | "role"> | null;
  },
) => ({
  id: review.id,
  userId: review.userId,
  productId: review.productId,
  rating: review.rating,
  text: review.text,
  createdAt: review.createdAt?.toISOString() ?? null,
  user: review.user
    ? {
        id: review.user.id,
        name: review.user.name,
        slug: review.user.slug,
        cover: review.user.cover,
        role: review.user.role,
      }
    : null,
});

const isAdminRole = (role: string): role is Extract<Role, "owner" | "admin"> => {
  return role === "owner" || role === "admin";
};

const getProductBySlug = async (slug: string) => {
  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
  });

  if (!product) {
    throw notFound("Product not found");
  }

  return product;
};

const getReviewWithUser = async (reviewId: string) => {
  const review = await db.query.reviews.findFirst({
    where: eq(reviews.id, reviewId),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          slug: true,
          cover: true,
          role: true,
        },
      },
    },
  });

  if (!review) {
    throw notFound("Review not found");
  }

  return review;
};

const listProductReviewsRoute = createRoute({
  method: "get",
  path: "/products/{slug}/reviews",
  tags: ["Reviews"],
  request: {
    params: productSlugParamSchema,
  },
  responses: {
    200: {
      description: "Product reviews",
      content: {
        "application/json": {
          schema: reviewListResponseSchema,
        },
      },
    },
    404: sharedErrorResponses[404],
  },
});

const createReviewRoute = createRoute({
  method: "post",
  path: "/products/{slug}/reviews",
  tags: ["Reviews"],
  security: [{ BearerAuth: [] }],
  middleware: authOnly,
  request: {
    params: productSlugParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: createReviewBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Created review",
      content: {
        "application/json": {
          schema: reviewResponseSchema,
        },
      },
    },
    ...sharedErrorResponses,
  },
});

const updateReviewRoute = createRoute({
  method: "patch",
  path: "/reviews/{reviewId}",
  tags: ["Reviews"],
  security: [{ BearerAuth: [] }],
  middleware: authOnly,
  request: {
    params: reviewIdParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: updateReviewBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated review",
      content: {
        "application/json": {
          schema: reviewResponseSchema,
        },
      },
    },
    ...sharedErrorResponses,
  },
});

const deleteReviewRoute = createRoute({
  method: "delete",
  path: "/reviews/{reviewId}",
  tags: ["Reviews"],
  security: [{ BearerAuth: [] }],
  middleware: authOnly,
  request: {
    params: reviewIdParamSchema,
  },
  responses: {
    200: {
      description: "Deleted review",
      content: {
        "application/json": {
          schema: successResponseSchema,
        },
      },
    },
    ...sharedErrorResponses,
  },
});

export const reviewsRoute = createOpenApiApp<AppBindings>()
  .openapi(listProductReviewsRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const product = await getProductBySlug(slug);
    const productReviews = await db.query.reviews.findMany({
      where: eq(reviews.productId, product.id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            slug: true,
            cover: true,
            role: true,
          },
        },
      },
    });

    return c.json(
      {
        reviews: productReviews.map(toReviewResponse),
      },
      200,
    );
  })
  .openapi(createReviewRoute, async (c) => {
    const currentUser = c.get("currentUser");
    const { slug } = c.req.valid("param");
    const body = c.req.valid("json");
    const product = await getProductBySlug(slug);
    const user = await db.query.users.findFirst({
      where: eq(users.id, currentUser.id),
    });

    if (!user) {
      throw notFound("User not found");
    }

    if (user.isBlockedFromReviews) {
      throw forbidden("You are blocked from creating reviews");
    }

    const existingReview = await db.query.reviews.findFirst({
      where: and(
        eq(reviews.userId, currentUser.id),
        eq(reviews.productId, product.id),
      ),
    });

    if (existingReview) {
      throw conflict("You have already reviewed this product");
    }

    const [createdReview] = await db
      .insert(reviews)
      .values({
        userId: currentUser.id,
        productId: product.id,
        rating: body.rating,
        text: body.text,
      })
      .returning();

    logger.info("admin", "review created", {
      reviewId: createdReview.id,
      userId: currentUser.id,
      productId: product.id,
    });

    return c.json(toReviewResponse(await getReviewWithUser(createdReview.id)), 201);
  })
  .openapi(updateReviewRoute, async (c) => {
    const currentUser = c.get("currentUser");
    const { reviewId } = c.req.valid("param");
    const body = c.req.valid("json");
    const review = await db.query.reviews.findFirst({
      where: eq(reviews.id, reviewId),
    });

    if (!review) {
      throw notFound("Review not found");
    }

    if (review.userId !== currentUser.id && !isAdminRole(currentUser.role)) {
      throw forbidden("You do not have permission to update this review");
    }

    const [updatedReview] = await db
      .update(reviews)
      .set({
        rating: body.rating,
        text: body.text,
      })
      .where(eq(reviews.id, review.id))
      .returning();

    if (!updatedReview) {
      throw notFound("Review not found");
    }

    logger.info("admin", "review updated", {
      reviewId: updatedReview.id,
      actorId: currentUser.id,
    });

    return c.json(toReviewResponse(await getReviewWithUser(updatedReview.id)), 200);
  })
  .openapi(deleteReviewRoute, async (c) => {
    const currentUser = c.get("currentUser");
    const { reviewId } = c.req.valid("param");
    const review = await db.query.reviews.findFirst({
      where: eq(reviews.id, reviewId),
    });

    if (!review) {
      throw notFound("Review not found");
    }

    if (review.userId !== currentUser.id && !isAdminRole(currentUser.role)) {
      throw forbidden("You do not have permission to delete this review");
    }

    await db.delete(reviews).where(eq(reviews.id, review.id));

    logger.info("admin", "review deleted", {
      reviewId: review.id,
      actorId: currentUser.id,
    });

    return c.json(successResponse, 200);
  });
