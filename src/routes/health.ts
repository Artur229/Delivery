import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("food-delivery-backend"),
  timestamp: z.string(),
});

const route = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  responses: {
    200: {
      description: "Service health status",
      content: {
        "application/json": {
          schema: healthResponseSchema,
        },
      },
    },
  },
});

export const healthRoute = new OpenAPIHono().openapi(route, (c) => {
  return c.json({
    status: "ok",
    service: "food-delivery-backend",
    timestamp: new Date().toISOString(),
  });
});
