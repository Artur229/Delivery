import type { ErrorHandler } from "hono";
import { logger } from "../lib/logger.js";
import { normalizeError } from "../lib/errors.js";

export const errorHandler: ErrorHandler = (error, c) => {
  const normalized = normalizeError(error);

  if (normalized.code >= 500) {
    logger.error("system", normalized.message, {
      path: c.req.path,
      method: c.req.method,
    });
  }

  return c.json(
    {
      error: normalized.message,
      code: normalized.code,
    },
    normalized.code,
  );
};
