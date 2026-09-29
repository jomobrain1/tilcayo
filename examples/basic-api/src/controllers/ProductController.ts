import type { TilcayoContext } from "@tilcayo/core";
import { notFound } from "@tilcayo/core";

export const ProductController = {
  index(ctx: TilcayoContext) {
    return ctx.response.success([], "Products retrieved");
  },

  store(ctx: TilcayoContext) {
    return ctx.response.created(ctx.body, "Product created");
  },

  show(ctx: TilcayoContext) {
    if (ctx.params.id === "missing") {
      throw notFound("Product not found");
    }
    return ctx.response.success({ id: ctx.params.id }, "Product retrieved");
  },

  update(ctx: TilcayoContext) {
    return ctx.response.success(
      { id: ctx.params.id, body: ctx.body },
      "Product updated",
    );
  },

  destroy(ctx: TilcayoContext) {
    return ctx.response.noContent();
  },
};
