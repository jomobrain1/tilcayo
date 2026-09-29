import { readFile } from "node:fs/promises";
import path from "node:path";
import { resourceNames } from "../utils/naming.js";
import { readSource, writeSource } from "../utils/files.js";
import { modelTemplate } from "../generators/model.js";
import { controllerTemplate, handlerNames } from "../generators/controller.js";
import { validatorTemplate } from "../generators/validator.js";
import { routeTemplate } from "../generators/route.js";
import { serviceTemplate } from "../generators/service.js";

export const help = `Usage: tilcayo <command> <name> [options]

Commands:
  make:model Book [--mongo] [--fields "title:string,year:number"]
  make:controller books [--resource] [--crud --mongo] [--fields "title:string,year?:number"]
  make:validator books
  make:route books [--resource]
  make:service books

Model field types: string, number, boolean, date. Fields are optional by default.
Controller --fields generates a plain request body type; use ? for optional fields.
--mongo models expose Tilcayo database methods; --crud --mongo controllers use them.
Mongo controllers use all() in index. Use paginate(ctx.query) when you want pagination.
Run from an application directory containing package.json.
Existing files are never overwritten.`;

function requireExports(source: string, names: string[], filename: string): void {
  for (const name of names) {
    if (!new RegExp(`export\\s+(?:(?:async\\s+)?function\\s+|(?:const|let|var)\\s+)${name}\\b`).test(source)) {
      throw new Error(`${filename} must export ${name}. Match the controller style with --resource where appropriate.`);
    }
  }
}

export async function make(args: string[], root = process.cwd()): Promise<string[]> {
  const [command, input, ...flags] = args;
  if (!command || command === "--help" || command === "-h") return [help];
  const kind = command.startsWith("make:") ? command.slice(5) : "";
  if (!["model", "controller", "validator", "route", "service"].includes(kind)) {
    throw new Error(`Unknown command: ${command}. Run tilcayo --help.`);
  }
  if (!input) throw new Error(`Missing name. Example: tilcayo ${command} Book`);
  let fields: string | undefined;
  const seen = new Set<string>();
  for (let i = 0; i < flags.length; i++) {
    const flag = flags[i];
    if (seen.has(flag)) throw new Error(`Duplicate flag: ${flag}`);
    seen.add(flag);
    if (flag === "--fields" && (kind === "model" || kind === "controller")) {
      fields = flags[++i];
      if (!fields?.trim() || fields.startsWith("--")) throw new Error('Use --fields "name:string,age:number".');
    } else if (!["--resource", "--mongo", "--crud"].includes(flag)) {
      throw new Error("Unsupported flags. Run tilcayo --help.");
    }
  }
  const resource = seen.has("--resource");
  const mongo = seen.has("--mongo");
  const crud = seen.has("--crud");
  if (resource && kind !== "controller" && kind !== "route") throw new Error("--resource is only supported for controllers and routes.");
  if (mongo && kind !== "model" && kind !== "controller") throw new Error("--mongo is only supported for models and controllers.");
  if (crud && kind !== "controller") throw new Error("--crud is only supported for controllers.");
  if (crud && !mongo) throw new Error("Choose a database for CRUD: --crud --mongo. MySQL is not implemented yet.");
  const names = resourceNames(input);
  try {
    JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  } catch {
    throw new Error("Run this command from an application directory with a valid package.json.");
  }
  const filename = names.plural.toLowerCase();
  const messages: string[] = [];
  let source: string;
  if (kind === "model") source = modelTemplate(names, fields, mongo);
  else if (kind === "controller") {
    if (mongo) {
      const model = await readSource(root, "models", `${names.model}.ts`);
      if (!model || !/\bmongoModel\s*\(/.test(model)) {
        throw new Error(`Create ${names.model} with make:model ${names.model} --mongo first, or use mongoModel("${names.model}", schema) in its model file.`);
      }
      messages.push("Attach body validators in your routes. For pagination, replace all() with paginate(ctx.query).");
    }
    source = controllerTemplate(names, resource, mongo, fields);
    messages.push("Keep the controller body types aligned with your route validators.");
  }
  else if (kind === "validator") source = validatorTemplate(names);
  else if (kind === "service") source = serviceTemplate(names);
  else {
    const controller = await readSource(root, "controllers", `${filename}.controller.ts`);
    const validator = await readSource(root, "validators", `${filename}.validator.ts`);
    if (controller !== undefined) requireExports(controller, handlerNames(names, resource), `${filename}.controller.ts`);
    if (validator !== undefined) requireExports(validator, [`create${names.model}Schema`, `update${names.model}Schema`, `${names.singular}IdSchema`], `${filename}.validator.ts`);
    source = routeTemplate(names, resource, controller !== undefined, validator !== undefined);
    if (controller === undefined) messages.push(`Inline placeholder handlers used. Generate ${filename}.controller.ts and wire its exports when ready.`);
    if (validator === undefined) messages.push(`Generate ${filename}.validator.ts and attach schemas through route validate options.`);
    messages.push(`Register the route file with app.routes(${names.singular}Routes).`);
  }
  const folder = kind === "model" ? "models" : `${kind}s`;
  const target = kind === "model" ? `${names.model}.ts` : `${filename}.${kind === "route" ? "routes" : kind}.ts`;
  const created = await writeSource(root, folder, target, source);
  return [`Created ${created}`, ...messages];
}
