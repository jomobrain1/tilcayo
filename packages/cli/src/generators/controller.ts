import type { ResourceNames } from "../utils/naming.js";
import { parseFields } from "../utils/fields.js";
import { mongoWriteData } from "./service.js";

export function handlerNames(names: ResourceNames, resource: boolean): string[] {
  return resource ? ["index", "store", "show", "update", "destroy"] : [
    `get${names.pluralPascal}`, `create${names.model}`, `get${names.model}`,
    `update${names.model}`, `delete${names.model}`,
  ];
}

export function handlerExpressions(names: ResourceNames): string[] {
  return [
    `ctx.response.success([], "${names.pluralPascal} retrieved")`,
    `ctx.response.created(ctx.body, "${names.model} created")`,
    `ctx.response.success({ id: ctx.params.id }, "${names.model} retrieved")`,
    `ctx.response.success({ id: ctx.params.id, body: ctx.body }, "${names.model} updated")`,
    "ctx.response.noContent()",
  ];
}

export function controllerTemplate(names: ResourceNames, resource: boolean, mongo = false, fields?: string, service = false): string {
  const handlers = handlerNames(names, resource);
  const parsed = fields === undefined ? [] : parseFields(fields, true);
  const references = parsed.some((field) => field.kind === "reference");
  const bodyFields = fields === undefined
    ? "  // Add request fields here and keep them aligned with your validator."
    : parsed.map((field) => `  ${field.name}${field.optional ? "?" : ""}: ${field.kind === "reference" ? (field.many ? "string[]" : "string") : field.type === "date" ? "Date" : field.type};`).join("\n");
  const bodyTypes = `type Create${names.model}Body = {\n${bodyFields}\n};\n\ntype Update${names.model}Body = Partial<Create${names.model}Body>;\n\n`;
  const contexts = ["TilcayoContext", `TilcayoContext<Create${names.model}Body>`, "TilcayoContext", `TilcayoContext<Update${names.model}Body>`, "TilcayoContext"];
  const labels = resource ? ["Index", "Store", "Show", "Update", "Destroy"] : [
    `Get ${names.plural}`, `Create ${names.singular}`, `Get ${names.singular}`,
    `Update ${names.singular}`, `Delete ${names.singular}`,
  ];
  if (mongo) {
    const model = names.model;
    const data = references ? `to${model}Data(ctx.body)` : "ctx.body";
    const bodies = [
      `const records = await ${model}.all();\n  return ctx.response.success(records, "${names.pluralPascal} retrieved");`,
      `const record = await ${model}.create(${data});\n  return ctx.response.created(record, "${model} created");`,
      `const record = await ${model}.findOrFail(ctx.params.id);\n  return ctx.response.success(record, "${model} retrieved");`,
      `const record = await ${model}.update(ctx.params.id, ${data});\n  if (!record) throw notFound("${model} not found");\n  return ctx.response.success(record, "${model} updated");`,
      `const record = await ${model}.delete(ctx.params.id);\n  if (!record) throw notFound("${model} not found");\n  return ctx.response.noContent();`,
    ];
    if (service) {
      bodies[0] = `const records = await get${names.pluralPascal}();\n  return ctx.response.success(records, "${names.pluralPascal} retrieved");`;
      bodies[1] = `const record = await create${model}(ctx.body);\n  return ctx.response.created(record, "${model} created");`;
      bodies[2] = `const record = await get${model}ById(ctx.params.id);\n  return ctx.response.success(record, "${model} retrieved");`;
      bodies[3] = `const record = await update${model}(ctx.params.id, ctx.body);\n  return ctx.response.success(record, "${model} updated");`;
      bodies[4] = `await delete${model}(ctx.params.id);\n  return ctx.response.noContent();`;
    }
    const imports = service
      ? `import type { TilcayoContext } from "@tilcayo/core";\nimport { get${names.pluralPascal}, get${model}ById, create${model}, update${model}, delete${model} } from "../services/${names.plural.toLowerCase()}.service.js";\n\n`
      : `import { notFound, type TilcayoContext } from "@tilcayo/core";\nimport { ${model} } from "../models/${model}.js";\n${references ? 'import mongoose from "mongoose";\n' : ""}\n`;
    return imports + bodyTypes + (references && !service ? mongoWriteData(model, parsed) + "\n" : "") + bodies.map((body, index) =>
      `// ${labels[index]} controller\nexport const ${handlers[index]} = async (ctx: ${contexts[index]}) => {\n  ${body}\n};\n`,
    ).join("\n");
  }
  return `import type { TilcayoContext } from "@tilcayo/core";\n\n` + bodyTypes + handlerExpressions(names).map((expression, index) =>
    `// ${labels[index]} controller\nexport const ${handlers[index]} = async (ctx: ${contexts[index]}) => {\n  return ${expression};\n};\n`,
  ).join("\n");
}
