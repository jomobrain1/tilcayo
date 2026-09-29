import { defineRoutes, rateLimit, cors, requestId, requestLogger, securityHeaders, bodyLimit, cache } from "@tilcayo/core";

import * as ProductController from "../controllers/products.controller.js";
import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
} from "../validators/products.validator.js";

export default defineRoutes((router) => {
  router.group({ prefix: "/api" }, () => {
    router.resource("/products", ProductController, {
      store: {
        middleware: [rateLimit({ windowMs: 60_000, max: 20 })],
        validate: { body: createProductSchema },
      },
      show: { validate: { params: productIdSchema } },
      update: { validate: { params: productIdSchema, body: updateProductSchema } },
      destroy: { validate: { params: productIdSchema } },
    });
  });

  router.get("/", () => ({
    framework: "Tilcayo",
    message: "Tilcayo API",
  }));

  router.get("/hello", () => ({
    message: "Routing works",
  }), {
    middleware: [
      requestId(),
      requestLogger(),
      securityHeaders(),
      cors({ origin: "http://localhost:5173" }),
      rateLimit({ windowMs: 60_000, max: 100 }),
      bodyLimit(16 * 1024),
      cache({ maxAge: 30 }),
    ],
  });
});
