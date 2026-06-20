import type { ValidationTargets } from "hono";
import type { ZodError } from "zod";

const targetLabels: Partial<Record<keyof ValidationTargets, string>> = {
  json: "body",
  form: "form",
  query: "query",
  param: "params",
  header: "headers",
  cookie: "cookies",
};

const formatIssuePath = (path: PropertyKey[]) => {
  return path.map(String).filter(Boolean).join(".");
};

export const formatValidationError = (
  target: keyof ValidationTargets,
  error: ZodError,
) => {
  const issue = error.issues[0];
  const label = targetLabels[target] ?? target;

  if (!issue) {
    return `Invalid ${label}`;
  }

  const path = formatIssuePath(issue.path);

  if (!path) {
    return `Invalid ${label}: ${issue.message}`;
  }

  return `Invalid ${label}.${path}: ${issue.message}`;
};
