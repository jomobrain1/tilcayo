import { defineRoutes } from "@tilcayo/core";

import * as ProductController from "../controllers/ProductController.js";
import {
  getBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
} from "../controllers/BookController.js";
import {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
} from "../validators/product.js";
import {
  createBookSchema,
  updateBookSchema,
  bookIdSchema,
} from "../validators/book.js";

export default defineRoutes((router) => {
  // Resource routes map index/store/show/update/destroy to the five CRUD routes.
  router.resource("/api/products", ProductController, {
    store: { validate: { body: createProductSchema } },
    show: { validate: { params: productIdSchema } },
    update: { validate: { params: productIdSchema, body: updateProductSchema } },
    destroy: { validate: { params: productIdSchema } },
  });

  // Explicit routes let each standalone handler have a descriptive name.
  router.group({ prefix: "/api/books" }, () => {
    router.get("/", getBooks);
    router.post("/", createBook, {
      validate: { body: createBookSchema },
    });
    router.get("/:id", getBook, {
      validate: { params: bookIdSchema },
    });
    router.put("/:id", updateBook, {
      validate: { params: bookIdSchema, body: updateBookSchema },
    });
    router.delete("/:id", deleteBook, {
      validate: { params: bookIdSchema },
    });
  });

  router.get("/", () => ({
    framework: "Tilcayo",
    message: "Tilcayo API",
  }));

  router.get("/hello", () => ({
    message: "Routing works",
  }));
});
