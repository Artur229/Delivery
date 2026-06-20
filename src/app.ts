import { apiReference } from "@scalar/hono-api-reference";
import { createOpenApiApp } from "./lib/openapi.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { authRoute } from "./routes/auth.js";
import { cartRoute } from "./routes/cart.js";
import { chatRoute } from "./routes/chat.js";
import { catalogRoute } from "./routes/catalog.js";
import { healthRoute } from "./routes/health.js";
import { inventoryRoute } from "./routes/inventory.js";
import { ordersRoute } from "./routes/orders.js";
import { paymentsRoute } from "./routes/payments.js";
import { reviewsRoute } from "./routes/reviews.js";
import { usersRoute } from "./routes/users.js";

export const app = createOpenApiApp();

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
app.route("/", inventoryRoute);
app.route("/", cartRoute);
app.route("/", ordersRoute);
app.route("/", paymentsRoute);
app.route("/", reviewsRoute);
app.route("/", chatRoute);

app.openAPIRegistry.registerComponent("securitySchemes", "BearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

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
