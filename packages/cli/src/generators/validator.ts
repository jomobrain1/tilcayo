import type { ResourceNames } from "../utils/naming.js";
import { parseFields } from "../utils/fields.js";

export const validatorTemplate = ({ model, singular }: ResourceNames, fields?: string): string => {
  const parsed = fields === undefined ? [] : parseFields(fields, true);
  const references = parsed.some((field) => field.kind === "reference");
  const rules = fields === undefined
    ? "  // Add your fields here, for example: name: z.string().min(2),"
    : parsed.map((field) => {
      const rule = field.kind === "reference"
        ? (field.many ? `z.array(objectIdValidator("${field.model}"))` : `objectIdValidator("${field.model}")`)
        : field.type === "date" ? 'z.iso.datetime({ offset: true }).pipe(z.coerce.date())' : `z.${field.type}()${field.type === "string" ? ".min(1)" : ""}`;
      return `  ${field.name}: ${rule}${field.optional ? ".optional()" : ""},`;
    }).join("\n");
  return `import { z } from "zod";
${references ? `import mongoose from "mongoose";

const objectIdValidator = (model: string) => z.string().refine(
  (value) => mongoose.Types.ObjectId.isValid(value),
  { message: \`Invalid \${model} id\` },
);
` : ""}

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
