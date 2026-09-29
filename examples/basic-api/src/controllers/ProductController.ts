import { notFound, type TilcayoContext } from "@tilcayo/core";

const products = [
  { id: "1", name: "Keyboard", price: 5000 },
  { id: "2", name: "Mouse", price: 1500 },
];

// Index controller
export const index = async (ctx: TilcayoContext) => {
  return ctx.response.success(products, "Products retrieved");
};

// Store controller
export const store = async (ctx: TilcayoContext) => {
  return ctx.response.created(ctx.body, "Product created");
};

// Show controller
export const show = async (ctx: TilcayoContext) => {
  const product = products.find((item) => item.id === ctx.params.id);

  if (!product) {
    throw notFound("Product not found");
  }

  return ctx.response.success(product, "Product retrieved");
};

// Update controller
export const update = async (ctx: TilcayoContext) => {
  return ctx.response.success(
    { id: ctx.params.id, body: ctx.body },
    "Product updated",
  );
};

// Destroy controller
export const destroy = async (ctx: TilcayoContext) => {
  return ctx.response.noContent();
};
