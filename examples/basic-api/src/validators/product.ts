import * as z from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2),
  price: z.number().nonnegative(),
});

export const updateProductSchema = createProductSchema.partial();

export const productIdSchema = z.object({ id: z.string() });
