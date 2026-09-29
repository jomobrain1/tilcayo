import { z } from "zod";

// Validate the body. These fields are optional, matching the Member model.
export const createMemberSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  age: z.number().optional(),
});

// Reuse the create rules for updates; partial() makes every field optional.
export const updateMemberSchema = createMemberSchema.partial();

// Validate the :id route parameter as a 24-character MongoDB ID.
export const memberIdSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid member ID"),
});
