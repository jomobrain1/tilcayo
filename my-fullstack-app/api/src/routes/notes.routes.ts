import { defineRoutes } from "@tilcayo/core";
import * as NoteController from "../controllers/notes.controller.js";
import { createNoteSchema, updateNoteSchema, noteIdSchema } from "../validators/notes.validator.js";

export default defineRoutes((router) => {
  router.resource("/api/notes", NoteController, {
    store: { validate: { body: createNoteSchema } },
    show: { validate: { params: noteIdSchema } },
    update: { validate: { params: noteIdSchema, body: updateNoteSchema } },
    destroy: { validate: { params: noteIdSchema } },
  });
});
