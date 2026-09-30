export const authFiles = [
  {
    folder: "", name: "auth.ts", source: `import { createAuth } from "@tilcayo/auth";

export const auth = createAuth({
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

// Read the user set by auth.middleware.
export const me = (ctx: TilcayoContext) => {
  return ctx.response.success(auth.user(ctx), "Authenticated user retrieved");
};
`,
  },
  {
    folder: "validators", name: "auth.validator.ts", source: `// Reuse the default validation, including email normalization and password limits.
// You can import and extend these schemas here when your application needs more fields.
export { registerSchema, loginSchema, refreshSchema, logoutSchema } from "@tilcayo/auth";
`,
  },
  {
    folder: "routes", name: "auth.routes.ts", source: `import { defineRoutes, rateLimit } from "@tilcayo/core";
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
`,
  },
];
