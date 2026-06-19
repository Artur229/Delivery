import { createMiddleware } from "hono/factory";
import type { Role } from "../constants/roles.js";
import { forbidden, unauthorized } from "../lib/errors.js";
import type { AppBindings } from "./auth.js";

export const allowRoles = (allowedRoles: Role[]) =>
  createMiddleware<AppBindings>(async (c, next) => {
    const currentUser = c.get("currentUser");

    if (!currentUser) {
      throw unauthorized();
    }

    if (!allowedRoles.includes(currentUser.role as Role)) {
      throw forbidden("You do not have permission to access this resource");
    }

    await next();
  });
