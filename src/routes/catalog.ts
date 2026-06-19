import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  categories,
  ingredients,
  productCategories,
  products,
  productTags,
  tags,
} from "../db/schema.js";
import { conflict, notFound } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { createUniqueSlug } from "../lib/slug.js";
import { authRequired, type AppBindings } from "../middleware/auth.js";
import { allowRoles } from "../middleware/roles.js";

const adminOnly = [authRequired, allowRoles(["owner", "admin"])];

const errorResponseSchema = z.object({
  error: z.string(),
  code: z.number(),
});

const slugParamSchema = z.object({
  slug: z.string().min(1),
});

const categoryResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  cover: z.string().nullable(),
  description: z.string().nullable(),
});

const tagResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});

const ingredientResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  name: z.string(),
  quantity: z.string(),
  unit: z.string(),
});

const productResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  cover: z.string().nullable(),
  price: z.string(),
  description: z.string().nullable(),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.string().nullable(),
});

const productDetailsResponseSchema = productResponseSchema.extend({
  categories: z.array(categoryResponseSchema),
  tags: z.array(tagResponseSchema),
  ingredients: z.array(ingredientResponseSchema),
});

const createCategoryBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  cover: z.string().url().nullable().optional(),
  description: z.string().trim().min(1).max(1000).nullable().optional(),
});

const updateCategoryBodySchema = createCategoryBodySchema.partial();

const createTagBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
});

const updateTagBodySchema = createTagBodySchema.partial();

const createProductBodySchema = z.object({
  name: z.string().trim().min(2).max(160),
  cover: z.string().url().nullable().optional(),
  price: z.coerce.number().positive(),
  description: z.string().trim().min(1).max(2000).nullable().optional(),
  categorySlugs: z.array(z.string().min(1)).optional(),
  tagSlugs: z.array(z.string().min(1)).optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        quantity: z.coerce.number().positive(),
        unit: z.string().trim().min(1).max(40),
      }),
    )
    .optional(),
});

const updateProductBodySchema = createProductBodySchema.partial();

const createIngredientBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.coerce.number().positive(),
  unit: z.string().trim().min(1).max(40),
});

const updateIngredientBodySchema = createIngredientBodySchema.partial();

const categoryListSchema = z.object({
  categories: z.array(categoryResponseSchema),
});

const tagListSchema = z.object({
  tags: z.array(tagResponseSchema),
});

const productListSchema = z.object({
  products: z.array(productResponseSchema),
});

const ingredientListSchema = z.object({
  ingredients: z.array(ingredientResponseSchema),
});

const successResponseSchema = z.object({
  success: z.literal(true),
});

const successResponse = {
  success: true,
} as const;

const toCategoryResponse = (category: typeof categories.$inferSelect) => ({
  id: category.id,
  name: category.name,
  slug: category.slug,
  cover: category.cover,
  description: category.description,
});

const toTagResponse = (tag: typeof tags.$inferSelect) => ({
  id: tag.id,
  name: tag.name,
  slug: tag.slug,
});

const toIngredientResponse = (ingredient: typeof ingredients.$inferSelect) => ({
  id: ingredient.id,
  productId: ingredient.productId,
  name: ingredient.name,
  quantity: ingredient.quantity,
  unit: ingredient.unit,
});

const toProductResponse = (product: typeof products.$inferSelect) => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  cover: product.cover,
  price: product.price,
  description: product.description,
  createdBy: product.createdBy,
  createdAt: product.createdAt?.toISOString() ?? null,
});

const syncProductCategories = async (productId: string, categorySlugs?: string[]) => {
  if (!categorySlugs) {
    return;
  }

  await db.delete(productCategories).where(eq(productCategories.productId, productId));

  if (categorySlugs.length === 0) {
    return;
  }

  const foundCategories = await db.query.categories.findMany({
    where: inArray(categories.slug, categorySlugs),
  });

  if (foundCategories.length !== categorySlugs.length) {
    throw notFound("One or more categories were not found");
  }

  await db.insert(productCategories).values(
    foundCategories.map((category) => ({
      productId,
      categoryId: category.id,
    })),
  );
};

const syncProductTags = async (productId: string, tagSlugs?: string[]) => {
  if (!tagSlugs) {
    return;
  }

  await db.delete(productTags).where(eq(productTags.productId, productId));

  if (tagSlugs.length === 0) {
    return;
  }

  const foundTags = await db.query.tags.findMany({
    where: inArray(tags.slug, tagSlugs),
  });

  if (foundTags.length !== tagSlugs.length) {
    throw notFound("One or more tags were not found");
  }

  await db.insert(productTags).values(
    foundTags.map((tag) => ({
      productId,
      tagId: tag.id,
    })),
  );
};

const syncProductIngredients = async (
  productId: string,
  productIngredients?: z.infer<typeof createProductBodySchema>["ingredients"],
) => {
  if (!productIngredients) {
    return;
  }

  await db.delete(ingredients).where(eq(ingredients.productId, productId));

  if (productIngredients.length === 0) {
    return;
  }

  await db.insert(ingredients).values(
    productIngredients.map((ingredient) => ({
      productId,
      name: ingredient.name,
      quantity: String(ingredient.quantity),
      unit: ingredient.unit,
    })),
  );
};

const getProductDetails = async (productSlug: string) => {
  const product = await db.query.products.findFirst({
    where: eq(products.slug, productSlug),
    with: {
      productCategories: {
        with: {
          category: true,
        },
      },
      productTags: {
        with: {
          tag: true,
        },
      },
      ingredients: true,
    },
  });

  if (!product) {
    throw notFound("Product not found");
  }

  return {
    ...toProductResponse(product),
    categories: product.productCategories.map((entry) =>
      toCategoryResponse(entry.category),
    ),
    tags: product.productTags.map((entry) => toTagResponse(entry.tag)),
    ingredients: product.ingredients.map(toIngredientResponse),
  };
};

const createRouteConfig = {
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

const listCategoriesRoute = createRoute({
  method: "get",
  path: "/categories",
  tags: ["Catalog"],
  responses: {
    200: {
      description: "Categories",
      content: {
        "application/json": {
          schema: categoryListSchema,
        },
      },
    },
  },
});

const getCategoryRoute = createRoute({
  method: "get",
  path: "/categories/{slug}",
  tags: ["Catalog"],
  request: {
    params: slugParamSchema,
  },
  responses: {
    200: {
      description: "Category",
      content: {
        "application/json": {
          schema: categoryResponseSchema,
        },
      },
    },
    404: createRouteConfig[404],
  },
});

const createCategoryRoute = createRoute({
  method: "post",
  path: "/categories",
  tags: ["Catalog"],
  middleware: adminOnly,
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: createCategoryBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Created category",
      content: {
        "application/json": {
          schema: categoryResponseSchema,
        },
      },
    },
    ...createRouteConfig,
  },
});

const updateCategoryRoute = createRoute({
  method: "patch",
  path: "/categories/{slug}",
  tags: ["Catalog"],
  middleware: adminOnly,
  request: {
    params: slugParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: updateCategoryBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated category",
      content: {
        "application/json": {
          schema: categoryResponseSchema,
        },
      },
    },
    ...createRouteConfig,
  },
});

const deleteCategoryRoute = createRoute({
  method: "delete",
  path: "/categories/{slug}",
  tags: ["Catalog"],
  middleware: adminOnly,
  request: {
    params: slugParamSchema,
  },
  responses: {
    200: {
      description: "Deleted category",
      content: {
        "application/json": {
          schema: successResponseSchema,
        },
      },
    },
    ...createRouteConfig,
  },
});

const listTagsRoute = createRoute({
  method: "get",
  path: "/tags",
  tags: ["Catalog"],
  responses: {
    200: {
      description: "Tags",
      content: {
        "application/json": {
          schema: tagListSchema,
        },
      },
    },
  },
});

const createTagRoute = createRoute({
  method: "post",
  path: "/tags",
  tags: ["Catalog"],
  middleware: adminOnly,
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: createTagBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Created tag",
      content: {
        "application/json": {
          schema: tagResponseSchema,
        },
      },
    },
    ...createRouteConfig,
  },
});

const updateTagRoute = createRoute({
  method: "patch",
  path: "/tags/{slug}",
  tags: ["Catalog"],
  middleware: adminOnly,
  request: {
    params: slugParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: updateTagBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated tag",
      content: {
        "application/json": {
          schema: tagResponseSchema,
        },
      },
    },
    ...createRouteConfig,
  },
});

const deleteTagRoute = createRoute({
  method: "delete",
  path: "/tags/{slug}",
  tags: ["Catalog"],
  middleware: adminOnly,
  request: {
    params: slugParamSchema,
  },
  responses: {
    200: {
      description: "Deleted tag",
      content: {
        "application/json": {
          schema: successResponseSchema,
        },
      },
    },
    ...createRouteConfig,
  },
});

const listProductsRoute = createRoute({
  method: "get",
  path: "/products",
  tags: ["Catalog"],
  responses: {
    200: {
      description: "Products",
      content: {
        "application/json": {
          schema: productListSchema,
        },
      },
    },
  },
});

const getProductRoute = createRoute({
  method: "get",
  path: "/products/{slug}",
  tags: ["Catalog"],
  request: {
    params: slugParamSchema,
  },
  responses: {
    200: {
      description: "Product details",
      content: {
        "application/json": {
          schema: productDetailsResponseSchema,
        },
      },
    },
    404: createRouteConfig[404],
  },
});

const createProductRoute = createRoute({
  method: "post",
  path: "/products",
  tags: ["Catalog"],
  middleware: adminOnly,
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: createProductBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Created product",
      content: {
        "application/json": {
          schema: productDetailsResponseSchema,
        },
      },
    },
    ...createRouteConfig,
  },
});

const updateProductRoute = createRoute({
  method: "patch",
  path: "/products/{slug}",
  tags: ["Catalog"],
  middleware: adminOnly,
  request: {
    params: slugParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: updateProductBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated product",
      content: {
        "application/json": {
          schema: productDetailsResponseSchema,
        },
      },
    },
    ...createRouteConfig,
  },
});

const deleteProductRoute = createRoute({
  method: "delete",
  path: "/products/{slug}",
  tags: ["Catalog"],
  middleware: adminOnly,
  request: {
    params: slugParamSchema,
  },
  responses: {
    200: {
      description: "Deleted product",
      content: {
        "application/json": {
          schema: successResponseSchema,
        },
      },
    },
    ...createRouteConfig,
  },
});

const listProductIngredientsRoute = createRoute({
  method: "get",
  path: "/products/{slug}/ingredients",
  tags: ["Catalog"],
  request: {
    params: slugParamSchema,
  },
  responses: {
    200: {
      description: "Product ingredients",
      content: {
        "application/json": {
          schema: ingredientListSchema,
        },
      },
    },
    404: createRouteConfig[404],
  },
});

const createProductIngredientRoute = createRoute({
  method: "post",
  path: "/products/{slug}/ingredients",
  tags: ["Catalog"],
  middleware: adminOnly,
  request: {
    params: slugParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: createIngredientBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Created product ingredient",
      content: {
        "application/json": {
          schema: ingredientResponseSchema,
        },
      },
    },
    ...createRouteConfig,
  },
});

const updateProductIngredientRoute = createRoute({
  method: "patch",
  path: "/products/{slug}/ingredients/{ingredientId}",
  tags: ["Catalog"],
  middleware: adminOnly,
  request: {
    params: z.object({
      slug: z.string().min(1),
      ingredientId: z.string().uuid(),
    }),
    body: {
      required: true,
      content: {
        "application/json": {
          schema: updateIngredientBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated product ingredient",
      content: {
        "application/json": {
          schema: ingredientResponseSchema,
        },
      },
    },
    ...createRouteConfig,
  },
});

const deleteProductIngredientRoute = createRoute({
  method: "delete",
  path: "/products/{slug}/ingredients/{ingredientId}",
  tags: ["Catalog"],
  middleware: adminOnly,
  request: {
    params: z.object({
      slug: z.string().min(1),
      ingredientId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: "Deleted product ingredient",
      content: {
        "application/json": {
          schema: successResponseSchema,
        },
      },
    },
    ...createRouteConfig,
  },
});

export const catalogRoute = new OpenAPIHono<AppBindings>()
  .openapi(listCategoriesRoute, async (c) => {
    const allCategories = await db.query.categories.findMany();

    return c.json(
      {
        categories: allCategories.map(toCategoryResponse),
      },
      200,
    );
  })
  .openapi(getCategoryRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const category = await db.query.categories.findFirst({
      where: eq(categories.slug, slug),
    });

    if (!category) {
      throw notFound("Category not found");
    }

    return c.json(toCategoryResponse(category), 200);
  })
  .openapi(createCategoryRoute, async (c) => {
    const body = c.req.valid("json");
    const slug = await createUniqueSlug(body.name, async (candidateSlug) => {
      const category = await db.query.categories.findFirst({
        where: eq(categories.slug, candidateSlug),
        columns: {
          id: true,
        },
      });

      return Boolean(category);
    });

    const [createdCategory] = await db
      .insert(categories)
      .values({
        name: body.name,
        slug,
        cover: body.cover,
        description: body.description,
      })
      .returning();

    logger.info("admin", "category created", {
      categoryId: createdCategory.id,
    });

    return c.json(toCategoryResponse(createdCategory), 201);
  })
  .openapi(updateCategoryRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const body = c.req.valid("json");

    const existingCategory = await db.query.categories.findFirst({
      where: eq(categories.slug, slug),
    });

    if (!existingCategory) {
      throw notFound("Category not found");
    }

    const values: Partial<typeof categories.$inferInsert> = {
      cover: body.cover,
      description: body.description,
    };

    if (body.name && body.name !== existingCategory.name) {
      values.name = body.name;
      values.slug = await createUniqueSlug(body.name, async (candidateSlug) => {
        const category = await db.query.categories.findFirst({
          where: and(
            eq(categories.slug, candidateSlug),
            ne(categories.id, existingCategory.id),
          ),
          columns: {
            id: true,
          },
        });

        return Boolean(category);
      });
    }

    const [updatedCategory] = await db
      .update(categories)
      .set(values)
      .where(eq(categories.id, existingCategory.id))
      .returning();

    if (!updatedCategory) {
      throw conflict("Category could not be updated");
    }

    return c.json(toCategoryResponse(updatedCategory), 200);
  })
  .openapi(deleteCategoryRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const [deletedCategory] = await db
      .delete(categories)
      .where(eq(categories.slug, slug))
      .returning();

    if (!deletedCategory) {
      throw notFound("Category not found");
    }

    return c.json(successResponse, 200);
  })
  .openapi(listTagsRoute, async (c) => {
    const allTags = await db.query.tags.findMany();

    return c.json(
      {
        tags: allTags.map(toTagResponse),
      },
      200,
    );
  })
  .openapi(createTagRoute, async (c) => {
    const body = c.req.valid("json");
    const slug = await createUniqueSlug(body.name, async (candidateSlug) => {
      const tag = await db.query.tags.findFirst({
        where: eq(tags.slug, candidateSlug),
        columns: {
          id: true,
        },
      });

      return Boolean(tag);
    });

    const [createdTag] = await db
      .insert(tags)
      .values({
        name: body.name,
        slug,
      })
      .returning();

    return c.json(toTagResponse(createdTag), 201);
  })
  .openapi(updateTagRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const body = c.req.valid("json");

    const existingTag = await db.query.tags.findFirst({
      where: eq(tags.slug, slug),
    });

    if (!existingTag) {
      throw notFound("Tag not found");
    }

    const values: Partial<typeof tags.$inferInsert> = {};

    if (body.name && body.name !== existingTag.name) {
      values.name = body.name;
      values.slug = await createUniqueSlug(body.name, async (candidateSlug) => {
        const tag = await db.query.tags.findFirst({
          where: and(eq(tags.slug, candidateSlug), ne(tags.id, existingTag.id)),
          columns: {
            id: true,
          },
        });

        return Boolean(tag);
      });
    }

    const [updatedTag] = await db
      .update(tags)
      .set(values)
      .where(eq(tags.id, existingTag.id))
      .returning();

    if (!updatedTag) {
      throw conflict("Tag could not be updated");
    }

    return c.json(toTagResponse(updatedTag), 200);
  })
  .openapi(deleteTagRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const [deletedTag] = await db.delete(tags).where(eq(tags.slug, slug)).returning();

    if (!deletedTag) {
      throw notFound("Tag not found");
    }

    return c.json(successResponse, 200);
  })
  .openapi(listProductsRoute, async (c) => {
    const allProducts = await db.query.products.findMany();

    return c.json(
      {
        products: allProducts.map(toProductResponse),
      },
      200,
    );
  })
  .openapi(getProductRoute, async (c) => {
    const { slug } = c.req.valid("param");
    return c.json(await getProductDetails(slug), 200);
  })
  .openapi(createProductRoute, async (c) => {
    const body = c.req.valid("json");
    const currentUser = c.get("currentUser");
    const slug = await createUniqueSlug(body.name, async (candidateSlug) => {
      const product = await db.query.products.findFirst({
        where: eq(products.slug, candidateSlug),
        columns: {
          id: true,
        },
      });

      return Boolean(product);
    });

    const [createdProduct] = await db
      .insert(products)
      .values({
        name: body.name,
        slug,
        cover: body.cover,
        price: String(body.price),
        description: body.description,
        createdBy: currentUser.id,
      })
      .returning();

    await syncProductCategories(createdProduct.id, body.categorySlugs);
    await syncProductTags(createdProduct.id, body.tagSlugs);
    await syncProductIngredients(createdProduct.id, body.ingredients);

    return c.json(await getProductDetails(createdProduct.slug), 201);
  })
  .openapi(updateProductRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const body = c.req.valid("json");

    const existingProduct = await db.query.products.findFirst({
      where: eq(products.slug, slug),
    });

    if (!existingProduct) {
      throw notFound("Product not found");
    }

    const values: Partial<typeof products.$inferInsert> = {
      cover: body.cover,
      description: body.description,
    };

    if (body.price !== undefined) {
      values.price = String(body.price);
    }

    if (body.name && body.name !== existingProduct.name) {
      values.name = body.name;
      values.slug = await createUniqueSlug(body.name, async (candidateSlug) => {
        const product = await db.query.products.findFirst({
          where: and(
            eq(products.slug, candidateSlug),
            ne(products.id, existingProduct.id),
          ),
          columns: {
            id: true,
          },
        });

        return Boolean(product);
      });
    }

    const [updatedProduct] = await db
      .update(products)
      .set(values)
      .where(eq(products.id, existingProduct.id))
      .returning();

    if (!updatedProduct) {
      throw conflict("Product could not be updated");
    }

    await syncProductCategories(updatedProduct.id, body.categorySlugs);
    await syncProductTags(updatedProduct.id, body.tagSlugs);
    await syncProductIngredients(updatedProduct.id, body.ingredients);

    return c.json(await getProductDetails(updatedProduct.slug), 200);
  })
  .openapi(deleteProductRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const [deletedProduct] = await db
      .delete(products)
      .where(eq(products.slug, slug))
      .returning();

    if (!deletedProduct) {
      throw notFound("Product not found");
    }

    return c.json(successResponse, 200);
  })
  .openapi(listProductIngredientsRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const product = await db.query.products.findFirst({
      where: eq(products.slug, slug),
      with: {
        ingredients: true,
      },
    });

    if (!product) {
      throw notFound("Product not found");
    }

    return c.json(
      {
        ingredients: product.ingredients.map(toIngredientResponse),
      },
      200,
    );
  })
  .openapi(createProductIngredientRoute, async (c) => {
    const { slug } = c.req.valid("param");
    const body = c.req.valid("json");
    const product = await db.query.products.findFirst({
      where: eq(products.slug, slug),
    });

    if (!product) {
      throw notFound("Product not found");
    }

    const [createdIngredient] = await db
      .insert(ingredients)
      .values({
        productId: product.id,
        name: body.name,
        quantity: String(body.quantity),
        unit: body.unit,
      })
      .returning();

    return c.json(toIngredientResponse(createdIngredient), 201);
  })
  .openapi(updateProductIngredientRoute, async (c) => {
    const { slug, ingredientId } = c.req.valid("param");
    const body = c.req.valid("json");
    const product = await db.query.products.findFirst({
      where: eq(products.slug, slug),
    });

    if (!product) {
      throw notFound("Product not found");
    }

    const [updatedIngredient] = await db
      .update(ingredients)
      .set({
        name: body.name,
        quantity: body.quantity === undefined ? undefined : String(body.quantity),
        unit: body.unit,
      })
      .where(
        and(eq(ingredients.id, ingredientId), eq(ingredients.productId, product.id)),
      )
      .returning();

    if (!updatedIngredient) {
      throw notFound("Ingredient not found");
    }

    return c.json(toIngredientResponse(updatedIngredient), 200);
  })
  .openapi(deleteProductIngredientRoute, async (c) => {
    const { slug, ingredientId } = c.req.valid("param");
    const product = await db.query.products.findFirst({
      where: eq(products.slug, slug),
    });

    if (!product) {
      throw notFound("Product not found");
    }

    const [deletedIngredient] = await db
      .delete(ingredients)
      .where(
        and(eq(ingredients.id, ingredientId), eq(ingredients.productId, product.id)),
      )
      .returning();

    if (!deletedIngredient) {
      throw notFound("Ingredient not found");
    }

    return c.json(successResponse, 200);
  });
