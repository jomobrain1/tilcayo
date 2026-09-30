import { resolveConfig, type AuthConfig } from "./types.js";
import { createGuard } from "./guard.js";
import { createAuthRoutes, authRequestMiddleware } from "./routes/auth.routes.js";
import { createAuthControllers } from "./controllers/auth.controller.js";

export function createAuth(config: AuthConfig) {
  const resolved = resolveConfig(config);
  const auth = createGuard(resolved);
  const controllers = createAuthControllers(resolved);
  const requestMiddleware = authRequestMiddleware();
  return {
    routes: createAuthRoutes(resolved, auth, controllers, requestMiddleware),
    controllers,
    requestMiddleware,
    ...auth,
  };
}
