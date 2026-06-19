export type LogScope = "auth" | "orders" | "payments" | "admin" | "system";

type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

const writeLog = (level: LogLevel, scope: LogScope, message: string, meta?: LogMeta) => {
  const payload = {
    level,
    scope,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ? { meta } : {}),
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
};

export const logger = {
  info: (scope: LogScope, message: string, meta?: LogMeta) =>
    writeLog("info", scope, message, meta),
  warn: (scope: LogScope, message: string, meta?: LogMeta) =>
    writeLog("warn", scope, message, meta),
  error: (scope: LogScope, message: string, meta?: LogMeta) =>
    writeLog("error", scope, message, meta),
};
