import type { TilcayoContext } from "@tilcayo/core";

// Index controller
export const index = async (ctx: TilcayoContext) => {
  return ctx.response.success([], "Members retrieved");
};

// Store controller
export const store = async (ctx: TilcayoContext) => {
  return ctx.response.created(ctx.body, "Member created");
};

// Show controller
export const show = async (ctx: TilcayoContext) => {
  return ctx.response.success({ id: ctx.params.id }, "Member retrieved");
};

// Update controller
export const update = async (ctx: TilcayoContext) => {
  return ctx.response.success({ id: ctx.params.id, body: ctx.body }, "Member updated");
};

// Destroy controller
export const destroy = async (ctx: TilcayoContext) => {
  return ctx.response.noContent();
};
