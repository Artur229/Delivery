import { createMiddleware } from "hono/factory";
import { verifyAuthToken } from "../lib/jwt.js";
import { unauthorized } from "../lib/errors.js";

export type CurrentUser = {
  id: string;
  role: string;
};

export type AppBindings = {
  Variables: {
    currentUser: CurrentUser;
  };
};

const getBearerToken = (authorizationHeader?: string) => {
  if (!authorizationHeader) {
    throw unauthorized("Authorization header is required");
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw unauthorized("Bearer token is required");
  }

  return token;
};

export const authRequired = createMiddleware<AppBindings>(async (c, next) => {
  const token = getBearerToken(c.req.header("Authorization"));
  const payload = await verifyAuthToken(token, "access");

  c.set("currentUser", {
    id: payload.sub,
    role: payload.role,
  });

  await next();
});
