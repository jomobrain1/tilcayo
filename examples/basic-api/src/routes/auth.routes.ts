import { defineRoutes, rateLimit } from "@tilcayo/core";
import { auth } from "../auth.js";
import * as AuthController from "../controllers/auth.controller.js";
import { registerSchema, loginSchema, refreshSchema, logoutSchema, forgotPasswordSchema, verifyResetCodeSchema, resetPasswordSchema } from "../validators/auth.validator.js";

const attempts = rateLimit({ windowMs: 15 * 60_000, max: 20 });
const recoveryAttempts = rateLimit({ windowMs: 15 * 60_000, max: 20 });

export default defineRoutes((router) => {
  // No-store responses, safe errors, and a 16 KB body limit.
  router.group({ prefix: "/api/auth", middleware: auth.requestMiddleware }, () => {
    router.post("/register", AuthController.register, {
      middleware: [attempts],
      validate: { body: registerSchema },
    });
    router.post("/login", AuthController.login, {
      middleware: [attempts],
      validate: { body: loginSchema },
    });
    router.post("/refresh", AuthController.refresh, {
      validate: { body: refreshSchema },
    });
    router.post("/logout", AuthController.logout, {
      validate: { body: logoutSchema },
    });
    router.post("/forgot-password", AuthController.forgotPassword, { middleware: [recoveryAttempts], validate: { body: forgotPasswordSchema } });
    router.post("/verify-reset-code", AuthController.verifyResetCode, { middleware: [recoveryAttempts], validate: { body: verifyResetCodeSchema } });
    router.post("/reset-password", AuthController.resetPassword, { middleware: [recoveryAttempts], validate: { body: resetPasswordSchema } });
    router.get("/me", AuthController.me, {
      middleware: [auth.middleware],
    });
  });
});
