import type { ResourceNames } from "../utils/naming.js";

const fieldTypes = new Map([
  ["string", "String"],
  ["number", "Number"],
  ["boolean", "Boolean"],
  ["date", "Date"],
]);

function schemaFields(input: string): string {
  const names = new Set<string>();
  return input.split(",").map((entry) => {
    const parts = entry.trim().split(":");
    const name = parts[0]?.trim() ?? "";
    const type = fieldTypes.get(parts[1]?.trim() ?? "");
    if (parts.length !== 2 || !/^[A-Za-z][A-Za-z0-9_]*$/.test(name) || !type) {
      throw new Error('Invalid field. Use --fields "name:string,age:number". Types: string, number, boolean, date.');
    }
    if (["constructor", "prototype", "createdAt", "updatedAt"].includes(name)) {
      throw new Error(`Reserved field name: ${name}`);
    }
    if (names.has(name)) throw new Error(`Duplicate field: ${name}`);
    names.add(name);
    return `  ${name}: { type: ${type} },`;
  }).join("\n");
}

export const modelTemplate = ({ model, singular }: ResourceNames, fields?: string): string => {
  const schema = fields === undefined ? "{}" : `{\n${schemaFields(fields)}\n}`;
  return `import mongoose from "mongoose";

const ${singular}Schema = new mongoose.Schema(${schema}, { timestamps: true });

export const ${model} = mongoose.model("${model}", ${singular}Schema);
`;
};
