import { createRoute, z } from "@hono/zod-openapi";
import { createOpenApiApp } from "../lib/openapi.js";

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

export const healthRoute = createOpenApiApp().openapi(route, (c) => {
  return c.json({
    status: "ok",
    service: "food-delivery-backend",
    timestamp: new Date().toISOString(),
  });
});
