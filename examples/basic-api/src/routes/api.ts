import { defineRoutes } from "@tilcayo/core";

import { ProductController } from "../controllers/ProductController.js";
import { createProductSchema, updateProductSchema, productIdSchema } from "../validators/product.js";

export default defineRoutes(({ get, group, resource }) => {
  group({ prefix: "/api" }, () => {
    resource("/products", ProductController, {
      store: { validate: { body: createProductSchema } },
      show: { validate: { params: productIdSchema } },
      update: { validate: { params: productIdSchema, body: updateProductSchema } },
      destroy: { validate: { params: productIdSchema } },
    });
  });

  get("/", () => ({
    framework: "Tilcayo",
    message: "Tilcayo API",
  }));

  get("/hello", () => ({
    message: "Routing works",
  }));
});
