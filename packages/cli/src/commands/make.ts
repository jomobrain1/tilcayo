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
  make:model Book [--fields "title:string,year:number"]
  make:controller books [--resource]
  make:validator books
  make:route books [--resource]
  make:service books

Model field types: string, number, boolean, date. Fields are optional by default.
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
  if (kind === "model" && flags[0] === "--fields") {
    if (flags.length !== 2 || !flags[1]?.trim()) {
      throw new Error('Use --fields "name:string,age:number".');
    }
    fields = flags[1];
  } else if (flags.some((flag) => flag !== "--resource") || flags.length > 1) {
    throw new Error("Unsupported flags. Run tilcayo --help.");
  }
  const resource = flags.includes("--resource");
  if (resource && kind !== "controller" && kind !== "route") throw new Error("--resource is only supported for controllers and routes.");
  const names = resourceNames(input);
  try {
    JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  } catch {
    throw new Error("Run this command from an application directory with a valid package.json.");
  }
  const filename = names.plural.toLowerCase();
  const messages: string[] = [];
  let source: string;
  if (kind === "model") source = modelTemplate(names, fields);
  else if (kind === "controller") source = controllerTemplate(names, resource);
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
