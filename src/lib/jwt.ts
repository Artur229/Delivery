import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env.js";
import { unauthorized } from "./errors.js";

export type TokenType = "access" | "refresh";

export type AuthTokenPayload = {
  sub: string;
  role: string;
  type: TokenType;
};

const encoder = new TextEncoder();

const getSecret = (type: TokenType) => {
  const secret = type === "access" ? env.JWT_SECRET : env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw unauthorized(`${type} token secret is not configured`);
  }

  return encoder.encode(secret);
};

export const signAuthToken = async (
  payload: AuthTokenPayload,
  expiresIn: string,
) => {
  return new SignJWT({
    role: payload.role,
    type: payload.type,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret(payload.type));
};

export const verifyAuthToken = async (
  token: string,
  expectedType: TokenType,
): Promise<AuthTokenPayload> => {
  try {
    const { payload } = await jwtVerify(token, getSecret(expectedType));

    if (
      typeof payload.sub !== "string" ||
      typeof payload.role !== "string" ||
      payload.type !== expectedType
    ) {
      throw unauthorized("Invalid token payload");
    }

    return {
      sub: payload.sub,
      role: payload.role,
      type: expectedType,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AppError") {
      throw error;
    }

    throw unauthorized("Invalid or expired token");
  }
};
