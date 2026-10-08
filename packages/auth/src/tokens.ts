import { createHash, randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { unauthorized } from "@tilcayo/core";
import type { ResolvedAuthConfig, AuthTokenPayload } from "./types.js";

type Config = ResolvedAuthConfig;

async function sign(sub: string, type: AuthTokenPayload["type"], config: Config, sessionVersion = 0): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const secret = type === "access" ? config.accessTokenSecret : config.refreshTokenSecret;
  const ttl = type === "access" ? config.accessTokenTtlSeconds : config.refreshTokenTtlSeconds;
  return new SignJWT({ type, sessionVersion }).setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(sub).setJti(randomUUID()).setIssuedAt(now).setExpirationTime(now + ttl)
    .setIssuer(config.issuer).setAudience(config.audience).sign(new TextEncoder().encode(secret));
}

async function verify(token: string, type: AuthTokenPayload["type"], config: Config): Promise<AuthTokenPayload> {
  try {
    const secret = type === "access" ? config.accessTokenSecret : config.refreshTokenSecret;
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"], typ: "JWT", issuer: config.issuer, audience: config.audience,
      requiredClaims: ["sub", "jti", "type", "iat", "exp", "iss", "aud"],
    });
    if (payload.type !== type || typeof payload.sub !== "string" || !/^[a-f\d]{24}$/i.test(payload.sub)
      || typeof payload.jti !== "string" || !payload.jti || typeof payload.iat !== "number" || typeof payload.exp !== "number"
      || payload.iat > Math.floor(Date.now() / 1000) || payload.exp <= payload.iat) throw new Error("Invalid claims");
    if (payload.sessionVersion !== undefined && (!Number.isSafeInteger(payload.sessionVersion) || (payload.sessionVersion as number) < 0)) throw new Error("Invalid session version");
    return { sessionVersion: (payload.sessionVersion as number | undefined) ?? 0, sub: payload.sub, jti: payload.jti, type, iat: payload.iat, exp: payload.exp };
  } catch {
    throw unauthorized("Invalid or expired token");
  }
}

export const createAccessToken = (userId: string, config: Config, sessionVersion = 0) => sign(userId, "access", config, sessionVersion);
export const createRefreshToken = (userId: string, config: Config, sessionVersion = 0) => sign(userId, "refresh", config, sessionVersion);
export const verifyAccessToken = (token: string, config: Config) => verify(token, "access", config);
export const verifyRefreshToken = (token: string, config: Config) => verify(token, "refresh", config);
export const hashRefreshToken = (token: string): string => createHash("sha256").update(token).digest("hex");
