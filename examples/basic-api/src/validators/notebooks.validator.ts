import { z } from "zod";

// Validate the body when creating a notebook.
export const createNotebookSchema = z.object({
  title: z.string().min(1),
  price: z.number(),
  active: z.boolean(),
});

// Reuse the same rules, but allow any field to be omitted on update.
export const updateNotebookSchema = createNotebookSchema.partial();

// Validate the :id route parameter as a 24-character MongoDB ID.
export const notebookIdSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid notebook ID"),
});
