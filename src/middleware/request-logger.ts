import { createMiddleware } from "hono/factory";
import { logger } from "../lib/logger.js";

export const requestLogger = createMiddleware(async (c, next) => {
  const startedAt = Date.now();

  await next();

  logger.info("system", "request completed", {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: Date.now() - startedAt,
  });
});
