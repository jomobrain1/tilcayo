import { defineRoutes } from "@tilcayo/core";

import * as ProductController from "../controllers/products.controller.js";
import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
} from "../validators/products.validator.js";

export default defineRoutes((router) => {
  // Resource routes map index/store/show/update/destroy to the five CRUD routes.
  router.resource("/api/products", ProductController, {
    store: { validate: { body: createProductSchema } },
    show: { validate: { params: productIdSchema } },
    update: { validate: { params: productIdSchema, body: updateProductSchema } },
    destroy: { validate: { params: productIdSchema } },
  });

  router.get("/", () => ({
    framework: "Tilcayo",
    message: "Tilcayo API",
  }));

  router.get("/hello", () => ({
    message: "Routing works",
  }));
});
