import { readFile } from "node:fs/promises";
import path from "node:path";
import { resourceNames } from "../utils/naming.js";
import { parseFields } from "../utils/fields.js";
import { readSource, writeSource } from "../utils/files.js";
import { modelTemplate } from "../generators/model.js";
import { controllerTemplate, handlerNames } from "../generators/controller.js";
import { validatorTemplate } from "../generators/validator.js";
import { routeTemplate } from "../generators/route.js";
import { serviceTemplate } from "../generators/service.js";

export const help = `Usage: tilcayo <command> <name> [field:type ...]

Commands:
  make:resource Product name:string price:number active:boolean
  make:model Book
  make:controller books
  make:controller books --resource
  make:validator books
  make:route books
  make:service books

Fields: string, number, boolean, date. Use year?:number for an optional field.
Resource, model, controller, and validator commands accept fields.
--resource controllers contain working CRUD; plain controllers are placeholders.
Database: package.json tilcayo.database (defaults to mongo; only mongo is supported).
Legacy --fields, --mongo, and --crud options still work.
Run inside the application directory. Existing files are never overwritten.`;

function requireExports(source: string, names: string[], filename: string): void {
  for (const name of names) {
    if (!new RegExp(`export\\s+(?:(?:async\\s+)?function\\s+|(?:const|let|var)\\s+)${name}\\b`).test(source)) {
      throw new Error(`${filename} must export ${name}. Match the controller style with --resource where appropriate.`);
    }
  }
}

async function databaseFor(root: string): Promise<string> {
  let config: unknown;
  try {
    config = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  } catch {
    throw new Error("Run this command from an application directory with a valid package.json.");
  }
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("Invalid package.json.");
  if (!("tilcayo" in config)) return "mongo";
  const settings = config.tilcayo;
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) throw new Error("package.json tilcayo must be an object.");
  if (!("database" in settings)) return "mongo";
  if (typeof settings.database !== "string") throw new Error("package.json tilcayo.database must be a string.");
  return settings.database;
}

export async function make(args: string[], root = process.cwd()): Promise<string[]> {
  const [command, input, ...options] = args;
  if (!command || command === "--help" || command === "-h") return [help];
  const kind = command.startsWith("make:") ? command.slice(5) : "";
  if (!["resource", "model", "controller", "validator", "route", "service"].includes(kind)) {
    throw new Error(`Unknown command: ${command}. Run tilcayo --help.`);
  }
  if (!input) throw new Error(`Missing name. Example: tilcayo ${command} Book`);
  const names = resourceNames(input);
  const flags = new Set<string>();
  const positional: string[] = [];
  let fields: string | undefined;
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    if (!option.startsWith("--")) {
      positional.push(option);
      continue;
    }
    if (flags.has(option)) throw new Error(`Duplicate flag: ${option}`);
    flags.add(option);
    if (option === "--fields") {
      fields = options[++i];
      if (!fields?.trim() || fields.startsWith("--")) throw new Error('Use --fields "name:string,age:number".');
    } else if (!["--resource", "--mongo", "--crud"].includes(option)) {
      throw new Error("Unsupported flags. Run tilcayo --help.");
    }
  }
  if (fields !== undefined && positional.length) throw new Error("Use positional fields or --fields, not both.");
  fields ??= positional.length ? positional.join(",") : undefined;
  if (fields !== undefined) {
    if (!["resource", "model", "controller", "validator"].includes(kind)) throw new Error(`make:${kind} does not accept fields.`);
    parseFields(fields, true);
  }
  let resource = kind === "resource" || flags.has("--resource");
  if (flags.has("--resource") && kind !== "controller" && kind !== "route") throw new Error("--resource is only supported for controllers and routes.");
  if (flags.has("--mongo") && !["resource", "model", "controller"].includes(kind)) throw new Error("--mongo is only supported for resources, models and controllers.");
  if (flags.has("--crud") && kind !== "controller") throw new Error("--crud is only supported for controllers.");
  const database = await databaseFor(root);
  const crud = kind === "controller" && (resource || flags.has("--crud") || flags.has("--mongo"));
  if ((kind === "resource" || kind === "model" || crud) && !flags.has("--mongo") && database !== "mongo") {
    throw new Error(`Unsupported database: ${database}. Only mongo is implemented.`);
  }
  const filename = names.plural.toLowerCase();
  const messages: string[] = [];
  const registration = [
    `import ${names.singular}Routes from "./routes/${filename}.routes.js";`,
    `app.routes(${names.singular}Routes);`,
  ];

  if (kind === "resource") {
    const files = [
      { folder: "models", name: `${names.model}.ts`, source: modelTemplate(names, fields, true) },
      { folder: "controllers", name: `${filename}.controller.ts`, source: controllerTemplate(names, true, true, fields) },
      { folder: "validators", name: `${filename}.validator.ts`, source: validatorTemplate(names, fields) },
      { folder: "routes", name: `${filename}.routes.ts`, source: routeTemplate(names, true, true, true) },
    ];
    // Check the entire resource before creating any files.
    for (const file of files) {
      if (await readSource(root, file.folder, file.name) !== undefined) throw new Error(`File already exists: src/${file.folder}/${file.name}`);
    }
    for (const file of files) messages.push(`Created ${await writeSource(root, file.folder, file.name, file.source)}`);
    return [...messages, "Register the routes in your application:", ...registration];
  }

  let source: string;
  if (kind === "model") source = modelTemplate(names, fields, true);
  else if (kind === "controller") {
    if (crud) {
      const model = await readSource(root, "models", `${names.model}.ts`);
      if (!model || !/\bmongoModel\s*\(/.test(model)) {
        throw new Error(`Create ${names.model} with make:model ${names.model} first, or use mongoModel("${names.model}", schema) in its model file.`);
      }
    }
    source = controllerTemplate(names, resource, crud, fields);
  } else if (kind === "validator") source = validatorTemplate(names, fields);
  else if (kind === "service") source = serviceTemplate(names);
  else {
    const controller = await readSource(root, "controllers", `${filename}.controller.ts`);
    const validator = await readSource(root, "validators", `${filename}.validator.ts`);
    if (controller !== undefined) {
      if (!flags.has("--resource")) resource = /export\s+(?:const\s+|(?:async\s+)?function\s+)index\b/.test(controller);
      requireExports(controller, handlerNames(names, resource), `${filename}.controller.ts`);
    }
    if (validator !== undefined) requireExports(validator, [`create${names.model}Schema`, `update${names.model}Schema`, `${names.singular}IdSchema`], `${filename}.validator.ts`);
    source = routeTemplate(names, resource, controller !== undefined, validator !== undefined);
    if (controller === undefined) messages.push(`Inline placeholder handlers used. Generate ${filename}.controller.ts and wire its exports when ready.`);
    if (validator === undefined) messages.push(`Generate ${filename}.validator.ts and attach schemas through route validate options.`);
    messages.push("Register the routes in your application:", ...registration);
  }
  const folder = kind === "model" ? "models" : `${kind}s`;
  const target = kind === "model" ? `${names.model}.ts` : `${filename}.${kind === "route" ? "routes" : kind}.ts`;
  const created = await writeSource(root, folder, target, source);
  return [`Created ${created}`, ...messages];
}
