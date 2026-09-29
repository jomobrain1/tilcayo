import { defineRoutes } from "@tilcayo/core";

import * as BookController from "../controllers/books.controller.js";
import {
  createBookSchema,
  updateBookSchema,
  bookIdSchema,
} from "../validators/books.validator.js";

export default defineRoutes((router) => {
  router.resource("/api/books", BookController, {
    store: { validate: { body: createBookSchema } },
    show: { validate: { params: bookIdSchema } },
    update: { validate: { params: bookIdSchema, body: updateBookSchema } },
    destroy: { validate: { params: bookIdSchema } },
  });
});
