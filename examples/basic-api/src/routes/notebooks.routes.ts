import { defineRoutes } from "@tilcayo/core";
import * as NotebookController from "../controllers/notebooks.controller.js";
import { createNotebookSchema, updateNotebookSchema, notebookIdSchema } from "../validators/notebooks.validator.js";

export default defineRoutes((router) => {
  router.resource("/notebooks", NotebookController, {
    store: { validate: { body: createNotebookSchema } },
    show: { validate: { params: notebookIdSchema } },
    update: { validate: { params: notebookIdSchema, body: updateNotebookSchema } },
    destroy: { validate: { params: notebookIdSchema } },
  });
});
