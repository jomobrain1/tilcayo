import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEnvFile } from "node:process";
import { existsSync, readFileSync } from "node:fs";

function loadEnvironment(root: string, explicitFile?: string): void {
  if (explicitFile !== undefined) {
    loadEnvFile(path.resolve(root, explicitFile));
    return;
  }
  let directory = path.resolve(root);
  while (true) {
    try {
      loadEnvFile(path.join(directory, ".env"));
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (existsSync(path.join(directory, ".git"))) return;
    const manifest = path.join(directory, "package.json");
    if (existsSync(manifest) && JSON.parse(readFileSync(manifest, "utf8")).workspaces) return;
    const parent = path.dirname(directory);
    if (parent === directory) return;
    directory = parent;
  }
}

interface RouteInfo {
  method: string;
  path: string;
  handler: string;
  middleware: string[];
  validation: string[];
}

export async function listRoutes(args: string[], root = process.cwd()): Promise<string[]> {
  const flags = new Map<string, string>();
  let json = false;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === "--json" && !json) { json = true; continue; }
    if (!["--entry", "--env-file", "--method", "--path"].includes(flag) || flags.has(flag)) {
      throw new Error(`Unsupported or duplicate option: ${flag}. Run tilcayo --help.`);
    }
    const value = args[++i];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}.`);
    flags.set(flag, value);
  }
  const method = flags.get("--method")?.toUpperCase();
  if (method && !["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) throw new Error(`Unsupported method: ${method}`);
  const envFile = flags.get("--env-file");
  loadEnvironment(root, envFile);
  const entry = path.resolve(root, flags.get("--entry") ?? "dist/app.js");
  let module;
  try {
    module = await import(pathToFileURL(entry).href);
  } catch (error) {
    throw new Error(`Unable to load ${entry}. Build the application and check its environment and imports. ${error instanceof Error ? error.message : ""}`);
  }
  const app = module.default ?? module.app;
  if (!app || typeof app.getRoutes !== "function") throw new Error("The entry must export a Tilcayo app (default or named app) without connecting to the database or calling listen().");
  const routes: RouteInfo[] = app.getRoutes();
  const filtered = routes.filter((route) => (!method || route.method === method) && (!flags.has("--path") || route.path.includes(flags.get("--path")!)));
  if (json) return [JSON.stringify(filtered, null, 2)];
  if (!filtered.length) return ["No matching routes."];
  const rows = [
    ["METHOD", "PATH", "HANDLER", "MIDDLEWARE", "VALIDATION"],
    ...filtered.map((route) => [route.method, route.path, route.handler, route.middleware.join(", ") || "-", route.validation.join(", ") || "-"]),
  ];
  const widths = rows[0].map((_, index) => Math.max(...rows.map((row) => row[index].length)));
  return [...rows.map((row) => row.map((value, index) => value.padEnd(widths[index])).join("  ").trimEnd()), `${filtered.length} route(s)`];
}
