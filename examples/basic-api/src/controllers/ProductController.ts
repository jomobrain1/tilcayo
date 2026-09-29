import type { TilcayoContext } from "@tilcayo/core";

export const ProductController = {
  index(ctx: TilcayoContext) {
    const books = [
      {
        id: 1,
        title: "This is the book 1",
      },
      {
        id: 2,
        title: "This is book 2",
      },
    ];
    return ctx.response.success(books, "Products retrieved");
  },

  store(ctx: TilcayoContext) {
    return ctx.response.created(ctx.body, "Product created");
  },

  show(ctx: TilcayoContext) {
    return ctx.response.success({ id: ctx.params.id });
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
