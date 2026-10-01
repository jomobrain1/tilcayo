import type { ResourceNames } from "../utils/naming.js";
import { parseFields } from "../utils/fields.js";

const fieldTypes = new Map([
  ["string", "String"],
  ["number", "Number"],
  ["boolean", "Boolean"],
  ["date", "Date"],
]);

function schemaFields(input: string): string {
  return parseFields(input, true).map((field) => {
    if (field.kind === "reference") {
      const reference = `type: mongoose.Schema.Types.ObjectId, ref: "${field.model}"`;
      return `  ${field.name}: { ${field.many ? `type: [{ ${reference} }], default: undefined` : reference}, required: ${!field.optional} },`;
    }
    return `  ${field.name}: { type: ${fieldTypes.get(field.type)}${field.optional ? "" : ", required: true"} },`;
  }).join("\n");
}

export const modelTemplate = ({ model, singular }: ResourceNames, fields?: string, mongo = false): string => {
  const schema = fields === undefined ? "{}" : `{\n${schemaFields(fields)}\n}`;
  return `import mongoose from "mongoose";
${mongo ? 'import { mongoModel } from "@tilcayo/core";\n' : ""}
const ${singular}Schema = new mongoose.Schema(${schema}, { timestamps: true });

export const ${model} = ${mongo ? "mongoModel" : "mongoose.model"}("${model}", ${singular}Schema);
`;
};
