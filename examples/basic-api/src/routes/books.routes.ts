import { defineRoutes } from "@tilcayo/core";

import {
  getBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
} from "../controllers/books.controller.js";
import {
  createBookSchema,
  updateBookSchema,
  bookIdSchema,
} from "../validators/books.validator.js";

export default defineRoutes((router) => {
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
});
