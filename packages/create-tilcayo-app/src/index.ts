import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { make } from "@tilcayo/cli";
import { templates } from "./templates.js";
import { validateOptions, type StarterOptions } from "./options.js";

export type { StarterOptions } from "./options.js";

async function localDependencies(target: string, options: StarterOptions): Promise<Record<string, string>> {
  const checkout = fileURLToPath(new URL("../../../", import.meta.url));
  let manifest;
  try { manifest = JSON.parse(await readFile(path.join(checkout, "package.json"), "utf8")); }
  catch { return {}; }
  if (manifest.name !== "tilcayo" || manifest.private !== true || !Array.isArray(manifest.workspaces) || !manifest.workspaces.includes("packages/*")) return {};
  const dependencies: Record<string, string> = {};
  for (const name of ["core", "cli", ...(options.auth ? ["auth"] : [])]) {
    const directory = path.join(checkout, "packages", name);
    const pkg = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8"));
    if (pkg.name !== `@tilcayo/${name}`) throw new Error(`Invalid local Tilcayo package: ${directory}`);
    try { await access(path.join(directory, "dist/index.js")); }
    catch { throw new Error(`Build the Tilcayo workspace before creating an application: ${directory}/dist/index.js is missing.`); }
    const relative = path.relative(target, directory).split(path.sep).join("/");
    dependencies[name] = `${options.packageManager === "npm" ? "file" : "link"}:${relative}`;
  }
  const require = createRequire(path.join(checkout, "packages/core/package.json"));
  for (const name of ["zod", ...(options.type === "api" || options.auth ? ["mongoose"] : [])]) {
    const directory = path.dirname(require.resolve(`${name}/package.json`));
    const relative = path.relative(target, directory).split(path.sep).join("/");
    dependencies[name] = `${options.packageManager === "npm" ? "file" : "link"}:${relative}`;
  }
  return dependencies;
}

export async function generateApp(options: StarterOptions, root = process.cwd()): Promise<string> {
  validateOptions(options);
  const target = path.resolve(root, options.name);
  const sources = templates(options, await localDependencies(target, options));
  try {
    await mkdir(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error(`Target already exists: ${target}. Choose a new project name.`);
    throw error;
  }
  for (const [filename, source] of Object.entries(sources)) {
    const destination = path.join(target, filename);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, source, { flag: "wx", ...(filename === ".env" ? { mode: 0o600 } : {}) });
  }
  if (options.type === "api") await make(["make:resource", "Note", "title:string", "content?:string"], target);
  if (options.auth) await make(["make:auth"], target);
  return target;
}

function run(command: string, args: string[], cwd: string, shell = false): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", shell, windowsHide: true });
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} failed (${signal ?? code}).`)));
  });
}

export async function installApp(target: string, manager: StarterOptions["packageManager"]): Promise<void> {
  if (!["npm", "pnpm", "yarn"].includes(manager)) throw new Error("Unsupported package manager.");
  try {
    // Both the command and its arguments are fixed, not user-supplied shell text.
    await run(manager, ["install"], target, process.platform === "win32");
    const require = createRequire(path.join(target, "package.json"));
    const cli = path.join(path.dirname(require.resolve("@tilcayo/cli")), "bin.js");
    await run(process.execPath, [cli, "build"], target);
  } catch {
    throw new Error(`Project created at ${target}, but dependency installation or build failed. Check that ${manager} is installed and Tilcayo packages are available in your registry, then run ${manager} install and the Tilcayo build command inside the project.`);
  }
}
