import { randomUUID } from "crypto";

/** Attach a short request id for log correlation (orders, returns, etc.). */
export function requestIdMiddleware(req, res, next) {
  const incoming = String(req.get("x-request-id") || "").trim();
  const id = incoming || randomUUID().slice(0, 8);
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}

export function logInfo(scope, message, meta = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level: "info",
    scope,
    message,
    ...meta,
  };
  console.log(JSON.stringify(payload));
}

export function logWarn(scope, message, meta = {}) {
  console.warn(JSON.stringify({
    ts: new Date().toISOString(),
    level: "warn",
    scope,
    message,
    ...meta,
  }));
}

export function logError(scope, message, meta = {}) {
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    level: "error",
    scope,
    message,
    ...meta,
  }));
}
