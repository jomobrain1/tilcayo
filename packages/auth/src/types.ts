import type { TilcayoContext } from "@tilcayo/core";

export interface AuthConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenTtlSeconds?: number;
  refreshTokenTtlSeconds?: number;
  issuer?: string;
  audience?: string;
  passwordRounds?: number;
  prefix?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthTokenPayload {
  sub: string;
  type: "access" | "refresh";
  jti: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedContext<Body = unknown> extends TilcayoContext<Body> {
  auth: { user: AuthUser; token: AuthTokenPayload };
}

export type AuthenticatedRouteHandler<Body = unknown> = (ctx: AuthenticatedContext<Body>) => unknown | Promise<unknown>;

export function resolveConfig(config: AuthConfig): Readonly<Required<AuthConfig>> {
  for (const secret of [config.accessTokenSecret, config.refreshTokenSecret]) {
    if (typeof secret !== "string" || Buffer.byteLength(secret.trim()) < 32) throw new Error("Auth secrets must each contain at least 32 bytes");
  }
  if (config.accessTokenSecret === config.refreshTokenSecret) throw new Error("Use different access and refresh secrets");
  const resolved = {
    accessTokenTtlSeconds: 900, refreshTokenTtlSeconds: 604800,
    issuer: "tilcayo", audience: "tilcayo-app", passwordRounds: 12, prefix: "/api/auth",
    ...config,
  };
  for (const seconds of [resolved.accessTokenTtlSeconds, resolved.refreshTokenTtlSeconds]) {
    if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > 31536000) throw new Error("Token lifetimes must be 1 to 31536000 seconds");
  }
  if (!Number.isInteger(resolved.passwordRounds) || resolved.passwordRounds < 10 || resolved.passwordRounds > 16) throw new Error("passwordRounds must be between 10 and 16");
  if (typeof resolved.issuer !== "string" || !resolved.issuer.trim() || typeof resolved.audience !== "string" || !resolved.audience.trim()) throw new Error("Auth issuer and audience are required");
  if (typeof resolved.prefix !== "string" || !/^\/(?:[a-zA-Z0-9_-]+\/?)*$/.test(resolved.prefix)) throw new Error("Auth prefix must be a plain absolute route path");
  resolved.prefix = resolved.prefix.replace(/\/$/, "");
  return Object.freeze(resolved);
}
