import { resolveConfig, type AuthConfig } from "./types.js";
import { createGuard } from "./guard.js";
import { createAuthRoutes } from "./routes/auth.routes.js";

export function createAuth(config: AuthConfig) {
  const resolved = resolveConfig(config);
  const auth = createGuard(resolved);
  return { routes: createAuthRoutes(resolved, auth), ...auth };
}
