import type { TilcayoContext } from "@tilcayo/core";
import { auth } from "../auth.js";

// Get profile controller
export const getProfile = async (ctx: TilcayoContext) => {
  return ctx.response.success(auth.user(ctx), "Profile retrieved");
};
