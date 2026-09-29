import * as z from "zod";

export const createBookSchema = z.object({
  title: z.string().min(2),
  author: z.string().min(2),
});

export const updateBookSchema = createBookSchema.partial();

export const bookIdSchema = z.object({ id: z.string() });
