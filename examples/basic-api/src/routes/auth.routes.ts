import { defineRoutes, rateLimit } from "@tilcayo/core";
import { auth } from "../auth.js";
import * as AuthController from "../controllers/auth.controller.js";
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from "../validators/auth.validator.js";

const attempts = rateLimit({ windowMs: 15 * 60_000, max: 20 });

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
    router.get("/me", AuthController.me, {
      middleware: [auth.middleware],
    });
  });
});
