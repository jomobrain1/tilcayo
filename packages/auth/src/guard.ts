import { unauthorized, createHttpError, isTilcayoHttpError, type Middleware, type TilcayoContext, type RouteHandler } from "@tilcayo/core";
import { User } from "./models/User.js";
import { toAuthUser } from "./toAuthUser.js";
import { verifyAccessToken } from "./tokens.js";
import type { ResolvedAuthConfig, AuthenticatedContext, AuthenticatedRouteHandler } from "./types.js";

export function createGuard(config: ResolvedAuthConfig) {
  const state = Symbol("tilcayo.auth");
  type AuthContext = TilcayoContext & { [state]?: AuthenticatedContext["auth"] };

  async function authenticate(ctx: TilcayoContext): Promise<AuthenticatedContext["auth"]> {
    const header = ctx.headers.authorization;
    if (typeof header !== "string" || header.length > 8192 || !/^Bearer [^\s]+$/i.test(header)) throw unauthorized("Bearer access token required");
    const token = await verifyAccessToken(header.slice(7), config);
    const user = await User.find(token.sub);
    if (!user || (user.sessionVersion ?? 0) !== token.sessionVersion) throw unauthorized("Invalid or expired token");
    return { user: toAuthUser(user), token };
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

  return { middleware, guard, user };
}
