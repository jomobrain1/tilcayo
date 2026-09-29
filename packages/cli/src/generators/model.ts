import type { ResourceNames } from "../utils/naming.js";

export const modelTemplate = ({ model, singular }: ResourceNames): string => `import mongoose, { type InferSchemaType } from "mongoose";

const ${singular}Schema = new mongoose.Schema({}, { timestamps: true });

export type ${model}Document = InferSchemaType<typeof ${singular}Schema>;

export const ${model} = mongoose.modelNames().includes("${model}")
  ? mongoose.model<${model}Document>("${model}")
  : mongoose.model<${model}Document>("${model}", ${singular}Schema);
`;
