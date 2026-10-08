import type { ResourceField } from "../utils/fields.js";
import type { ResourceNames } from "../utils/naming.js";

export function frontendFieldType(field: ResourceField): string {
  if (field.kind === "reference") return field.many ? "string[]" : "string";
  return field.type === "date" ? "string" : field.type;
}

export function frontendTypesTemplate(names: ResourceNames, fields: ResourceField[]): string {
  const properties = fields.map(field => `  ${field.name}${field.optional ? "?" : ""}: ${frontendFieldType(field)};`).join("\n");
  // Mongo CRUD returns _id. Dates and references are JSON strings, never Date/ObjectId.
  return `export interface ${names.model} {
  _id: string;
${properties}
  createdAt: string;
  updatedAt: string;
}

export interface Create${names.model}Input {
${properties}
}

export type Update${names.model}Input = Partial<Create${names.model}Input>;
`;
}
