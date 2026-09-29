import * as z from "zod";

export const createBookSchema = z.object({
  title: z.string().min(2),
  author: z.string().min(2),
  publishedYear: z.number().int().optional(),
});

export const updateBookSchema = createBookSchema.partial();

export const bookIdSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid book ID"),
});
