import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { authRoute } from "./routes/auth.js";
import { catalogRoute } from "./routes/catalog.js";
import { healthRoute } from "./routes/health.js";
import { usersRoute } from "./routes/users.js";

export const app = new OpenAPIHono();

app.use("*", requestLogger);
app.onError(errorHandler);
app.notFound((c) => {
  return c.json(
    {
      error: "Not found",
      code: 404,
    },
    404,
  );
});

app.route("/", healthRoute);
app.route("/auth", authRoute);
app.route("/", usersRoute);
app.route("/", catalogRoute);

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
