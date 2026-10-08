import type { ResourceNames } from "../utils/naming.js";
import { handlerExpressions, handlerNames } from "./controller.js";

export function routeTemplate(names: ResourceNames, resource: boolean, controller: boolean, validation: boolean, prefix = ""): string {
  const handlers = handlerNames(names, resource);
  let imports = `import { defineRoutes } from "@tilcayo/core";\n`;
  if (controller) {
    imports += resource
      ? `import * as ${names.model}Controller from "../controllers/${names.plural.toLowerCase()}.controller.js";\n`
      : `import { ${handlers.join(", ")} } from "../controllers/${names.plural.toLowerCase()}.controller.js";\n`;
  }
  const create = `create${names.model}Schema`;
  const update = `update${names.model}Schema`;
  const id = `${names.singular}IdSchema`;
  if (validation) imports += `import { ${create}, ${update}, ${id} } from "../validators/${names.plural.toLowerCase()}.validator.js";\n`;
  const path = `${prefix}/${names.plural.toLowerCase()}`;
  const options = ["", `{ validate: { body: ${create} } }`, `{ validate: { params: ${id} } }`,
    `{ validate: { params: ${id}, body: ${update} } }`, `{ validate: { params: ${id} } }`];
  const expressions = handlerExpressions(names);
  let body: string;
  if (resource) {
    const target = controller ? `${names.model}Controller` : `{
${handlers.map((handler, i) => `    ${handler}: (ctx) => ${expressions[i]},`).join("\n")}
  }`;
    const config = validation ? `, {
    store: ${options[1]},
    show: ${options[2]},
    update: ${options[3]},
    destroy: ${options[4]},
  }` : "";
    body = `  router.resource("${path}", ${target}${config});`;
  } else {
    body = ["get", "post", "get", "put", "delete"].map((method, i) => {
      const target = controller ? handlers[i] : `(ctx) => ${expressions[i]}`;
      const config = validation && options[i] ? `, ${options[i]}` : "";
      return `  router.${method}("${path}${i > 1 ? "/:id" : ""}", ${target}${config});`;
    }).join("\n");
  }
  return `${imports}\nexport default defineRoutes((router) => {\n${body}\n});\n`;
}
