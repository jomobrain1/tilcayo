import { z } from "zod";

// Validate the body when creating a book.
export const createBookSchema = z.object({
  title: z.string().min(2), // At least 2 characters.
  author: z.string().min(2),
  publishedYear: z.number().int().optional(), // A whole number, if provided.
});

// Reuse the same rules, but allow any field to be omitted on update.
export const updateBookSchema = createBookSchema.partial();

// Validate the :id route parameter as a 24-character MongoDB ID.
export const bookIdSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid book ID"),
});
