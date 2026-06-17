export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogArea =
  | "auth"
  | "settings"
  | "context"
  | "llm"
  | "startup"
  | "trigger"
  | "updates"
  | "window"
  | "ui";

export type LogContext = Record<string, unknown>;

export type LogEvent = {
  level: LogLevel;
  area: LogArea;
  message: string;
  context?: LogContext;
  occurredAtMs: number;
};

type LogSink = (event: LogEvent) => void;

let sink: LogSink = defaultSink;

export const logger = {
  debug: (area: LogArea, message: string, context?: LogContext) =>
    writeLog("debug", area, message, context),
  info: (area: LogArea, message: string, context?: LogContext) =>
    writeLog("info", area, message, context),
  warn: (area: LogArea, message: string, context?: LogContext) =>
    writeLog("warn", area, message, context),
  error: (area: LogArea, message: string, context?: LogContext) =>
    writeLog("error", area, message, context),
};

export function setLogSink(nextSink: LogSink) {
  sink = nextSink;
}

function writeLog(
  level: LogLevel,
  area: LogArea,
  message: string,
  context?: LogContext,
) {
  sink({
    level,
    area,
    message: redactLogValue(message),
    context: context ? redactLogContext(context) : undefined,
    occurredAtMs: Date.now(),
  });
}

function defaultSink(event: LogEvent) {
  const method = event.level === "error" ? console.error : console.warn;
  method(`[amadeus][${event.level}][${event.area}] ${event.message}`, event.context ?? {});
  forwardLogToTauri(event);
}

function forwardLogToTauri(event: LogEvent) {
  if (
    typeof window === "undefined" ||
    !("__TAURI_INTERNALS__" in (window as unknown as { __TAURI_INTERNALS__?: unknown }))
  ) {
    return;
  }

  void import("@tauri-apps/api/core")
    .then(({ invoke }) =>
      invoke("record_frontend_log", {
        level: event.level,
        area: event.area,
        message: event.message,
        context: event.context ? JSON.stringify(event.context) : undefined,
      }),
    )
    .catch(() => {
      // Logging must never affect app lifecycle.
    });
}

function redactLogContext(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      redactUnknownValue(key, value),
    ]),
  );
}

function redactUnknownValue(key: string, value: unknown): unknown {
  if (isSensitiveKey(key)) {
    return "[redacted-secret]";
  }
  if (typeof value === "string") {
    return redactLogValue(value);
  }
  if (value instanceof Error) {
    return redactLogValue(value.message);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactUnknownValue(key, item));
  }
  if (value && typeof value === "object") {
    return redactLogContext(value as LogContext);
  }
  return value;
}

export function redactLogValue(value: string): string {
  return value.split(/\s+/).map(redactLogToken).join(" ");
}

function redactLogToken(token: string): string {
  const lower = token.toLowerCase();
  const containsSecret =
    lower.includes("token=") ||
    lower.includes("api_key=") ||
    lower.includes("apikey=") ||
    lower.includes("password=") ||
    lower.includes("secret=");
  const containsPath =
    token.startsWith("/") ||
    token.startsWith("~/") ||
    token.includes("://") ||
    token.includes(".pdf") ||
    token.includes(".docx") ||
    token.includes(".xlsx") ||
    token.includes(".hwp");

  if (containsPath && containsSecret) return "[redacted-path] [redacted-secret]";
  if (containsPath) return "[redacted-path]";
  if (containsSecret) return "[redacted-secret]";
  return token;
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower.includes("token") ||
    lower.includes("password") ||
    lower.includes("secret") ||
    lower.includes("apikey") ||
    lower.includes("api_key") ||
    lower.includes("rawocr") ||
    lower.includes("rawwindowtitle")
  );
}
