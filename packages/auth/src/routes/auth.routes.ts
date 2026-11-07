import { z } from 'zod';
import { avatarControllers } from '../avatar.js';
import { defineRoutes, createHttpError, isTilcayoHttpError, bodyLimit, rateLimit, type Middleware } from "@tilcayo/core";
import { createAuthControllers } from "../controllers/auth.controller.js";
import { createGuard } from "../guard.js";
import { registerSchema, profileSchema, loginSchema, sessionSchemas, forgotPasswordSchema, verifyResetCodeSchema, resetPasswordSchema } from "../validators/auth.validator.js";
import type { ResolvedAuthConfig } from "../types.js";

export function authRequestMiddleware(): Middleware[] {
  const protectResponse: Middleware = async (ctx, next) => {
    ctx.header("Cache-Control", "no-store");
    try { return await next(); } catch (error) {
      if (isTilcayoHttpError(error)) throw error;
      if (error instanceof Error && "type" in error) {
        if (error.type === "entity.too.large") throw createHttpError(413, "BODY_TOO_LARGE", "Request body is too large");
        if (error.type === "entity.parse.failed") throw createHttpError(400, "BAD_REQUEST", "Invalid JSON body");
      }
      throw createHttpError(500, "INTERNAL_SERVER_ERROR", "Internal server error");
    }
  };
  return [protectResponse, bodyLimit(16 * 1024)];
}

export function createAuthRoutes(
  config: ResolvedAuthConfig,
  auth: ReturnType<typeof createGuard>,
  controller: ReturnType<typeof createAuthControllers>,
  requestMiddleware: Middleware[],
) {
  const avatar = avatarControllers(config.avatarStorage, auth.user);
  const attempts = rateLimit({ windowMs: 15 * 60_000, max: 20 });
  const recoveryAttempts = rateLimit({ windowMs: 15 * 60_000, max: 20 });
  return defineRoutes((router) => {
    router.group({ prefix: config.prefix, middleware: requestMiddleware }, () => {
      router.post("/register", controller.register, { middleware: [attempts], validate: { body: registerSchema } });
      router.post("/login", controller.login, { middleware: [attempts], validate: { body: loginSchema } });
      const session = sessionSchemas(config.cookieSession);
      router.post("/refresh", controller.refresh, { validate: { body: session.refresh } });
      router.post("/logout", controller.logout, { validate: { body: session.logout } });
      router.post("/forgot-password", controller.forgotPassword, { middleware: [recoveryAttempts], validate: { body: forgotPasswordSchema } });
      router.post("/verify-reset-code", controller.verifyResetCode, { middleware: [recoveryAttempts], validate: { body: verifyResetCodeSchema } });
      router.post("/reset-password", controller.resetPassword, { middleware: [recoveryAttempts], validate: { body: resetPasswordSchema } });
      router.post('/avatar/authorize', avatar.authorize, { middleware: [auth.middleware, avatar.attempts], validate: { body: z.strictObject({ filename: z.string().min(1).max(255), bytes: z.number().int().positive().max(2 * 1024 * 1024) }) } });
      router.post('/avatar/complete', avatar.complete, { middleware: [auth.middleware, avatar.attempts], validate: { body: z.strictObject({ ticket: z.uuid() }) } });
      router.delete('/avatar', avatar.remove, { middleware: [auth.middleware, avatar.attempts] });
      router.patch("/profile", controller.profile, { middleware: [auth.middleware], validate: { body: profileSchema } });
      router.get("/me", (ctx) => ctx.response.success(auth.user(ctx), "Authenticated user retrieved"), { middleware: [auth.middleware] });
    });
  });
}
