import type { ResourceNames } from "../utils/naming.js";
import { parseFields } from "../utils/fields.js";

export const validatorTemplate = ({ model, singular }: ResourceNames, fields?: string): string => {
  const rules = fields === undefined
    ? "  // Add your fields here, for example: name: z.string().min(2),"
    : parseFields(fields, true).map(({ name, type, optional }) => {
      const rule = type === "date" ? 'z.iso.datetime({ offset: true }).pipe(z.coerce.date())' : `z.${type}()${type === "string" ? ".min(1)" : ""}`;
      return `  ${name}: ${rule}${optional ? ".optional()" : ""},`;
    }).join("\n");
  return `import { z } from "zod";

// Validate the body when creating a ${singular}.
export const create${model}Schema = z.object({
${rules}
});

// Reuse the same rules, but allow any field to be omitted on update.
export const update${model}Schema = create${model}Schema.partial();

// Validate the :id route parameter as a 24-character MongoDB ID.
export const ${singular}IdSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ${singular} ID"),
});
`;
};
