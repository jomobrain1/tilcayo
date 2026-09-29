import { z } from "zod";

// Validate the body when creating a product.
export const createProductSchema = z.object({
  name: z.string().min(2), // At least 2 characters.
  price: z.number().nonnegative(), // Zero or greater.
});

// Reuse the same rules, but allow any field to be omitted on update.
export const updateProductSchema = createProductSchema.partial();

// Product routes use string IDs, not MongoDB IDs.
export const productIdSchema = z.object({ id: z.string() });
