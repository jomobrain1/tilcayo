import type { ResourceNames } from "../utils/naming.js";

export const validatorTemplate = ({ model, singular }: ResourceNames): string => `import * as z from "zod";

export const create${model}Schema = z.object({});

export const update${model}Schema = create${model}Schema.partial();

export const ${singular}IdSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ${singular} ID"),
});
`;
