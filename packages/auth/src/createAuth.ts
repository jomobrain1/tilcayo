import { avatarControllers } from './avatar.js';
import { createTenantMiddleware } from "./tenancy.js";
import { createTenancyRoutes } from "./routes/tenancy.routes.js";
import { resolveConfig, type AuthConfig } from "./types.js";
import { sessionSchemas } from "./validators/auth.validator.js";
import { createGuard } from "./guard.js";
import { createAuthRoutes, authRequestMiddleware } from "./routes/auth.routes.js";
import { createAuthControllers } from "./controllers/auth.controller.js";
import { createAdminRoutes } from "./routes/admin.routes.js";

export function createAuth(config: AuthConfig) {
  const resolved = resolveConfig(config);
  const auth = createGuard(resolved);
  const controllers = createAuthControllers(resolved, auth.user);
  const tenantMiddleware = resolved.tenancy ? createTenantMiddleware(resolved.tenancy) : (_ctx: import("@tilcayo/core").TilcayoContext, next: () => unknown) => next();
  const requestMiddleware = [...(resolved.tenancy ? [tenantMiddleware] : []), ...authRequestMiddleware()];
  return {
    routes: createAuthRoutes(resolved, auth, controllers, requestMiddleware),
    adminRoutes: createAdminRoutes(auth, resolved.passwordRounds),
    tenantMiddleware,
    tenantAccessMiddleware: async (ctx: import("@tilcayo/core").MiddlewareContext, next: () => Promise<unknown>) => {
      if (resolved.tenancy && !ctx.path.startsWith(resolved.prefix + '/') && ctx.path !== '/health') return auth.middleware(ctx, next);
      return next();
    },
    tenancyRoutes: createTenancyRoutes(resolved, auth, requestMiddleware),
    avatar: avatarControllers(resolved.avatarStorage, auth.user),
    controllers,
    schemas: sessionSchemas(resolved.cookieSession),
    requestMiddleware,
    ...auth,
  };
}
