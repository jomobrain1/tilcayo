import type { ResourceNames } from "../utils/naming.js";
import { parseFields } from "../utils/fields.js";

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

export function controllerTemplate(names: ResourceNames, resource: boolean, mongo = false, fields?: string): string {
  const handlers = handlerNames(names, resource);
  const bodyFields = fields === undefined
    ? "  // Add request fields here and keep them aligned with your validator."
    : parseFields(fields, true).map(({ name, type, optional }) => `  ${name}${optional ? "?" : ""}: ${type === "date" ? "Date" : type};`).join("\n");
  const bodyTypes = `type Create${names.model}Body = {\n${bodyFields}\n};\n\ntype Update${names.model}Body = Partial<Create${names.model}Body>;\n\n`;
  const contexts = ["TilcayoContext", `TilcayoContext<Create${names.model}Body>`, "TilcayoContext", `TilcayoContext<Update${names.model}Body>`, "TilcayoContext"];
  const labels = resource ? ["Index", "Store", "Show", "Update", "Destroy"] : [
    `Get ${names.plural}`, `Create ${names.singular}`, `Get ${names.singular}`,
    `Update ${names.singular}`, `Delete ${names.singular}`,
  ];
  if (mongo) {
    const model = names.model;
    const bodies = [
      `const records = await ${model}.all();\n  return ctx.response.success(records, "${names.pluralPascal} retrieved");`,
      `const record = await ${model}.create(ctx.body);\n  return ctx.response.created(record, "${model} created");`,
      `const record = await ${model}.findOrFail(ctx.params.id);\n  return ctx.response.success(record, "${model} retrieved");`,
      `const record = await ${model}.update(ctx.params.id, ctx.body);\n  if (!record) throw notFound("${model} not found");\n  return ctx.response.success(record, "${model} updated");`,
      `const record = await ${model}.delete(ctx.params.id);\n  if (!record) throw notFound("${model} not found");\n  return ctx.response.noContent();`,
    ];
    return `import { notFound, type TilcayoContext } from "@tilcayo/core";\nimport { ${model} } from "../models/${model}.js";\n\n` + bodyTypes + bodies.map((body, index) =>
      `// ${labels[index]} controller\nexport const ${handlers[index]} = async (ctx: ${contexts[index]}) => {\n  ${body}\n};\n`,
    ).join("\n");
  }
  return `import type { TilcayoContext } from "@tilcayo/core";\n\n` + bodyTypes + handlerExpressions(names).map((expression, index) =>
    `// ${labels[index]} controller\nexport const ${handlers[index]} = async (ctx: ${contexts[index]}) => {\n  return ${expression};\n};\n`,
  ).join("\n");
}
