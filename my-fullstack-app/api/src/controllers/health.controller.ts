import type { TilcayoContext } from "@tilcayo/core";

export const health = (ctx: TilcayoContext) => ctx.response.success({ status: "ok" });
