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

export default defineRoutes(({ get, post, put, delete: remove, group }) => {
  group({ prefix: "/api/books" }, () => {
    get("/", getBooks);
    post("/", createBook, {
      validate: { body: createBookSchema },
    });
    get("/:id", getBook, {
      validate: { params: bookIdSchema },
    });
    put("/:id", updateBook, {
      validate: { params: bookIdSchema, body: updateBookSchema },
    });
    remove("/:id", deleteBook, {
      validate: { params: bookIdSchema },
    });
  });
});
