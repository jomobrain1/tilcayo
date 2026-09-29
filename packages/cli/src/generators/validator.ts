import type { ResourceNames } from "../utils/naming.js";

export const validatorTemplate = ({ model, singular }: ResourceNames): string => `import { z } from "zod";

// Validate the body when creating a ${singular}.
export const create${model}Schema = z.object({
  // Add your fields here, for example: name: z.string().min(2),
});

// Reuse the same rules, but allow any field to be omitted on update.
export const update${model}Schema = create${model}Schema.partial();

// Validate the :id route parameter as a 24-character MongoDB ID.
export const ${singular}IdSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ${singular} ID"),
});
`;
