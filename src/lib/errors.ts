import { HTTPException } from "hono/http-exception";

export type ErrorCode = 400 | 401 | 403 | 404 | 409 | 422 | 500;

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message = "Bad request") => new AppError(message, 400);
export const unauthorized = (message = "Unauthorized") => new AppError(message, 401);
export const forbidden = (message = "Forbidden") => new AppError(message, 403);
export const notFound = (message = "Not found") => new AppError(message, 404);
export const conflict = (message = "Conflict") => new AppError(message, 409);
export const unprocessable = (message = "Validation error") =>
  new AppError(message, 422);

export const normalizeError = (error: unknown) => {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
    };
  }

  if (error instanceof HTTPException) {
    return {
      message: error.message || "Request failed",
      code: error.status as ErrorCode,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || "Internal server error",
      code: 500 as const,
    };
  }

  return {
    message: "Internal server error",
    code: 500 as const,
  };
};
