import { currentTenantScope, unauthorized, createHttpError, isTilcayoHttpError, type Middleware, type TilcayoContext, type RouteHandler } from "@tilcayo/core";
import { User } from "./models/User.js";
import { toAuthUser } from "./toAuthUser.js";
import { workspaceUser, assertTokenTenant } from "./tenancy.js";
import { verifyAccessToken } from "./tokens.js";
import type { ResolvedAuthConfig, AuthenticatedContext, AuthenticatedRouteHandler } from "./types.js";

export function createGuard(config: ResolvedAuthConfig) {
  const state = Symbol("tilcayo.auth");
  type AuthContext = TilcayoContext & { [state]?: AuthenticatedContext["auth"] };

  async function authenticate(ctx: TilcayoContext): Promise<AuthenticatedContext["auth"]> {
    const header = ctx.headers.authorization;
    if (typeof header !== "string" || header.length > 8192 || !/^Bearer [^\s]+$/i.test(header)) throw unauthorized("Bearer access token required");
    if (config.tenancy && !currentTenantScope()?.enabled) throw createHttpError(500, "TENANCY_CONFIGURATION", "Tenant middleware is required");
    const token = await verifyAccessToken(header.slice(7), config);
    if (config.tenancy) assertTokenTenant(token.tenantId);
    const user = await User.find(token.sub);
    if (!user || user.deletedAt || user.suspendedAt || (user.sessionVersion ?? 0) !== token.sessionVersion) throw unauthorized("Invalid or expired token");
    const publicUser = await workspaceUser(toAuthUser(user));
    if (config.tenancy) assertTokenTenant(token.tenantId, token.membershipVersion ?? 0);
    return { user: publicUser, token };
  }

  // Auth failures never pass database details to the global logger or response.
  async function safeAuthenticate(ctx: TilcayoContext) {
    try { return await authenticate(ctx); } catch (error) {
      if (isTilcayoHttpError(error)) throw error;
      throw createHttpError(500, "INTERNAL_SERVER_ERROR", "Internal server error");
    }
  }

  const middleware: Middleware = async (ctx, next) => {
    ctx.header("Cache-Control", "no-store");
    (ctx as AuthContext)[state] = await safeAuthenticate(ctx);
    return next();
  };

  function user(ctx: TilcayoContext) {
    const auth = (ctx as AuthContext)[state];
    if (!auth) throw unauthorized();
    return auth.user;
  }

  function guard<Body = unknown>(handler: AuthenticatedRouteHandler<Body>): RouteHandler<Body> {
    return async (ctx) => handler({ ...ctx, auth: await safeAuthenticate(ctx) });
  }

  // Run after middleware. Roles come from the database on every request.
  function requireRole(role: string): Middleware {
    if (!role.trim()) throw new Error("A role is required");
    return (ctx, next) => {
      if (!user(ctx).roles?.includes(role) && !(role === "admin" && user(ctx).roles?.includes("superadmin"))) throw createHttpError(403, "FORBIDDEN", "Access denied");
      return next();
    };
  }

  function requireAdminTab(tab: string | readonly string[]): Middleware {
    return (ctx, next) => {
      if (!(typeof tab === "string" ? [tab] : tab).some(item => user(ctx).adminTabs?.includes(item))) throw createHttpError(403, "FORBIDDEN", "Access denied");
      return next();
    };
  }

  return { middleware, guard, user, requireRole, requireAdminTab };
}
