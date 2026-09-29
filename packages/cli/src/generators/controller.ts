import type { ResourceNames } from "../utils/naming.js";

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

export function controllerTemplate(names: ResourceNames, resource: boolean): string {
  const handlers = handlerNames(names, resource);
  const labels = resource ? ["Index", "Store", "Show", "Update", "Destroy"] : [
    `Get ${names.plural}`, `Create ${names.singular}`, `Get ${names.singular}`,
    `Update ${names.singular}`, `Delete ${names.singular}`,
  ];
  return `import type { TilcayoContext } from "@tilcayo/core";\n\n` + handlerExpressions(names).map((expression, index) =>
    `// ${labels[index]} controller\nexport const ${handlers[index]} = async (ctx: TilcayoContext) => {\n  return ${expression};\n};\n`,
  ).join("\n");
}
