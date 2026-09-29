import { z } from "zod";

// Validate the body when creating a article.
export const createArticleSchema = z.object({
  // Add your fields here, for example: name: z.string().min(2),
});

// Reuse the same rules, but allow any field to be omitted on update.
export const updateArticleSchema = createArticleSchema.partial();

// Validate the :id route parameter as a 24-character MongoDB ID.
export const articleIdSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid article ID"),
});
