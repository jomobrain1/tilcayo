import type { ResourceNames } from "../utils/naming.js";
import { parseFields, type ResourceField } from "../utils/fields.js";

export const mongoWriteData = (model: string, fields: ResourceField[]): string => `const to${model}Data = (body: Update${model}Body) => ({
  ...body,
${fields.filter((field) => field.kind === "reference").map((field) =>
  `  ${field.name}: body.${field.name} === undefined ? undefined : ${field.many ? `body.${field.name}.map((id) => new mongoose.Types.ObjectId(id))` : `new mongoose.Types.ObjectId(body.${field.name})`},`,
).join("\n")}
});
`;

export const serviceTemplate = ({ model, plural, pluralPascal }: ResourceNames, fields?: string): string => {
  const parsed = fields === undefined ? [] : parseFields(fields, true);
  const relations = parsed.filter((field) => field.kind === "reference");
  if (!relations.length) return `export const ${plural}Service = {
  // Add service functions here.
};
`;
  return `import mongoose from "mongoose";
import { notFound } from "@tilcayo/core";
import type { z } from "zod";
import { ${model} } from "../models/${model}.js";
import type { create${model}Schema } from "../validators/${plural.toLowerCase()}.validator.js";

type Create${model}Body = z.output<typeof create${model}Schema>;
type Update${model}Body = Partial<Create${model}Body>;

export type ${model}Relation = ${relations.map((field) => `"${field.name}"`).join(" | ")};

export interface ${model}QueryOptions {
  populate?: ${model}Relation[];
}

${mongoWriteData(model, parsed)}
// Population is explicit and intended for application code, not HTTP query strings.
export const get${pluralPascal} = async (options: ${model}QueryOptions = {}) => ${model}.all(options);

export const get${model}ById = async (id: string | string[], options: ${model}QueryOptions = {}) => {
  const record = await ${model}.findOrFail(id);
  for (const relation of options.populate ?? []) await record.populate(relation);
  return record;
};

export const create${model} = async (body: Create${model}Body) => ${model}.create(to${model}Data(body));

export const update${model} = async (id: string | string[], body: Update${model}Body) => {
  const record = await ${model}.update(id, to${model}Data(body));
  if (!record) throw notFound("${model} not found");
  return record;
};

export const delete${model} = async (id: string | string[]) => {
  const record = await ${model}.delete(id);
  if (!record) throw notFound("${model} not found");
  return record;
};
`;
};
