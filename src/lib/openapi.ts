import { OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "hono";
import { formatValidationError } from "./validation.js";

export const createOpenApiApp = <E extends Env = Env>() =>
  new OpenAPIHono<E>({
    defaultHook: (result, c) => {
      if (result.success) {
        return;
      }

      return c.json(
        {
          error: formatValidationError(result.target, result.error),
          code: 400,
        },
        400,
      );
    },
  });
