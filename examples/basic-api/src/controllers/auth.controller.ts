import type { TilcayoContext } from "@tilcayo/core";
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
