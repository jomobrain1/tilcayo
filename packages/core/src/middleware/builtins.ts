import { randomUUID } from "node:crypto";
import { createHttpError } from "../errors/httpErrors.js";
import type { Middleware } from "./types.js";

function positive(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}

export function rateLimit(options: { windowMs: number; max: number; maxKeys?: number }): Middleware {
  const windowMs = positive(options.windowMs, "windowMs");
  const max = positive(options.max, "max");
  const maxKeys = positive(options.maxKeys ?? 10000, "maxKeys");
  const clients = new Map<string, { count: number; reset: number }>();
  return (ctx, next) => {
    const now = Date.now();
    const key = ctx.ip ?? "unknown";
    let client = clients.get(key);
    if (!client || client.reset <= now) {
      for (const [ip, entry] of clients) if (entry.reset <= now) clients.delete(ip);
      if (!clients.has(key) && clients.size >= maxKeys) {
        ctx.header("Retry-After", String(Math.ceil(windowMs / 1000)));
        throw createHttpError(429, "RATE_LIMITED", "Too many requests");
      }
      client = { count: 0, reset: now + windowMs };
      clients.set(key, client);
    }
    if (client.count >= max) {
      ctx.header("Retry-After", String(Math.max(1, Math.ceil((client.reset - now) / 1000))));
      throw createHttpError(429, "RATE_LIMITED", "Too many requests");
    }
    client.count++;
    return next();
  };
}

export function requestId(): Middleware {
  return (ctx, next) => {
    ctx.requestId = randomUUID();
    ctx.header("X-Request-Id", ctx.requestId);
    return next();
  };
}

export interface RequestLog {
  requestId?: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
}

export function requestLogger(write: (entry: RequestLog) => void = (entry) => console.info(entry)): Middleware {
  return (ctx, next) => {
    const start = performance.now();
    ctx.onFinish((status) => {
      // A logging failure must not crash a completed request.
      try { write({ requestId: ctx.requestId, method: ctx.method, path: ctx.path, status, durationMs: Math.round(performance.now() - start) }); } catch { /* Ignore sink failures. */ }
    });
    return next();
  };
}

export function securityHeaders(): Middleware {
  return (ctx, next) => {
    ctx.header("X-Content-Type-Options", "nosniff");
    ctx.header("X-Frame-Options", "DENY");
    ctx.header("Referrer-Policy", "no-referrer");
    return next();
  };
}

export function bodyLimit(bytes: number): Middleware {
  positive(bytes, "bodyLimit");
  return (ctx, next) => {
    ctx.bodyLimit = Math.min(ctx.bodyLimit, bytes);
    return next();
  };
}

export function cors(options: { origin: string | string[]; credentials?: boolean; methods?: string[]; headers?: string[]; maxAge?: number }): Middleware {
  const origins = typeof options.origin === "string" ? [options.origin] : [...options.origin];
  if (options.credentials && origins.includes("*")) throw new Error("Credentialed CORS requires explicit origins");
  const methods = options.methods ?? ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
  const headers = options.headers ?? ["Content-Type", "Authorization"];
  const maxAge = positive(options.maxAge ?? 600, "maxAge");
  return (ctx, next) => {
    const origin = ctx.headers.origin;
    ctx.vary("Origin");
    if (typeof origin !== "string") return next();
    if (!origins.includes("*") && !origins.includes(origin)) throw createHttpError(403, "CORS_DENIED", "Origin is not allowed");
    ctx.header("Access-Control-Allow-Origin", origins.includes("*") ? "*" : origin);
    if (options.credentials) ctx.header("Access-Control-Allow-Credentials", "true");
    if (ctx.method !== "OPTIONS") return next();
    ctx.vary("Access-Control-Request-Method");
    ctx.vary("Access-Control-Request-Headers");
    const method = ctx.headers["access-control-request-method"];
    const requested = ctx.headers["access-control-request-headers"];
    if (typeof method !== "string" || !methods.includes(method) || (typeof requested === "string" && requested.split(",").some((value) => !headers.some((header) => header.toLowerCase() === value.trim().toLowerCase())))) {
      throw createHttpError(403, "CORS_DENIED", "Preflight is not allowed");
    }
    ctx.header("Access-Control-Allow-Methods", methods.join(", "));
    ctx.header("Access-Control-Allow-Headers", headers.join(", "));
    ctx.header("Access-Control-Max-Age", String(maxAge));
    return ctx.response.noContent();
  };
}

// Browser caching for explicitly public GET responses; no server-side response store.
export function cache(options: { maxAge: number }): Middleware {
  const maxAge = positive(options.maxAge, "maxAge");
  return async (ctx, next) => {
    const result = await next();
    if (ctx.method === "GET" && !ctx.headers.authorization && !ctx.headers.cookie) {
      ctx.header("Cache-Control", `public, max-age=${maxAge}`);
    } else ctx.header("Cache-Control", "no-store");
    return result;
  };
}
