import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { healthRoute } from "./routes/health.js";

export const app = new OpenAPIHono();

app.route("/", healthRoute);

app.doc("/api/openapi.json", {
  openapi: "3.0.0",
  info: {
    title: "Food Delivery Backend API",
    version: "0.1.0",
    description: "Backend API for food delivery applications.",
  },
});

app.get(
  "/api/docs",
  apiReference({
    theme: "saturn",
    spec: {
      url: "/api/openapi.json",
    },
  }),
);
