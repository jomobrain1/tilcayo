import { z } from "zod";


// Validate the body when creating a note.
export const createNoteSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1).optional(),
});

// Reuse the same rules, but allow any field to be omitted on update.
export const updateNoteSchema = createNoteSchema.partial();

// Validate the :id route parameter as a 24-character MongoDB ID.
export const noteIdSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid note ID"),
});
