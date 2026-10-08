export const authFiles = [
  { folder: "", name: "password-reset-email.ts", source: `import { createSmtpPasswordResetSender } from "@tilcayo/auth";

const user = process.env.MAIL_USER;
const password = process.env.MAIL_PASS;

export const sendPasswordResetCode = user && password
  ? createSmtpPasswordResetSender({
    user, password,
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.MAIL_PORT || 465),
    ...(process.env.MAIL_SECURE ? { secure: process.env.MAIL_SECURE === "true" } : {}),
    from: process.env.MAIL_FROM || user,
  })
  : undefined;
` },

  {
    folder: "", name: "auth.ts", source: `import { createAuth } from "@tilcayo/auth";

import { sendPasswordResetCode } from "./password-reset-email.js";

export const auth = createAuth({
  sendPasswordResetCode,
  accessTokenSecret: process.env.AUTH_ACCESS_SECRET ?? "",
  refreshTokenSecret: process.env.AUTH_REFRESH_SECRET ?? "",
});
`,
  },
  {
    folder: "controllers", name: "auth.controller.ts", source: `import type { TilcayoContext } from "@tilcayo/core";
import { auth } from "../auth.js";

type RegisterBody = { name: string; email: string; password: string };
type LoginBody = { email: string; password: string };
type RefreshBody = { refreshToken: string };

// Create an account and issue tokens.
export const register = (ctx: TilcayoContext<RegisterBody>) => {
  return auth.controllers.register(ctx);
};

// Check credentials and issue tokens.
export const login = (ctx: TilcayoContext<LoginBody>) => {
  return auth.controllers.login(ctx);
};

// Replace a refresh token with a new token pair.
export const refresh = (ctx: TilcayoContext<RefreshBody>) => {
  return auth.controllers.refresh(ctx);
};

// Revoke the supplied refresh token.
export const logout = (ctx: TilcayoContext<RefreshBody>) => {
  return auth.controllers.logout(ctx);
};

// Password recovery uses the shared auth implementation.
export const forgotPassword = (ctx: TilcayoContext<{ email: string }>) => auth.controllers.forgotPassword(ctx);
export const verifyResetCode = (ctx: TilcayoContext<{ email: string; code: string }>) => auth.controllers.verifyResetCode(ctx);
export const resetPassword = (ctx: TilcayoContext<{ resetToken: string; password: string }>) => auth.controllers.resetPassword(ctx);

// Read the user set by auth.middleware.
export const me = (ctx: TilcayoContext) => {
  return ctx.response.success(auth.user(ctx), "Authenticated user retrieved");
};
`,
  },
  {
    folder: "validators", name: "auth.validator.ts", source: `// Reuse the default validation, including email normalization and password limits.
// You can import and extend these schemas here when your application needs more fields.
export { registerSchema, loginSchema, refreshSchema, logoutSchema, forgotPasswordSchema, verifyResetCodeSchema, resetPasswordSchema } from "@tilcayo/auth";
`,
  },
  {
    folder: "routes", name: "auth.routes.ts", source: `import { defineRoutes, rateLimit } from "@tilcayo/core";
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
`,
  },
];
