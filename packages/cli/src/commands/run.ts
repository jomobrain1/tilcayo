import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

export async function runApp(args: string[], root = process.cwd()): Promise<string[]> {
  const [command, ...extra] = args;
  if (extra.length) throw new Error(`Usage: tilcayo ${command}`);
  if (!existsSync(path.join(root, "package.json")) || !existsSync(path.join(root, "tsconfig.json"))) {
    throw new Error("Run this command inside a Tilcayo application with package.json and tsconfig.json.");
  }
  const require = createRequire(path.join(root, "package.json"));
  const runNode = (nodeArgs: string[]) => new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, nodeArgs, { cwd: root, stdio: "inherit", windowsHide: true });
    const interrupt = () => { child.kill("SIGINT"); };
    const terminate = () => { child.kill("SIGTERM"); };
    process.on("SIGINT", interrupt);
    process.on("SIGTERM", terminate);
    const cleanup = () => { process.off("SIGINT", interrupt); process.off("SIGTERM", terminate); };
    child.once("error", (error) => { cleanup(); reject(error); });
    child.once("exit", (code, signal) => {
      cleanup();
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${signal ?? `code ${code}`}.`));
    });
  });
  if (command === "build" || command === "dev:serve") {
    let compiler: string;
    try { compiler = path.join(path.dirname(require.resolve("typescript/package.json")), "bin/tsc"); }
    catch { throw new Error("TypeScript is missing. Install application dependencies first."); }
    await runNode([compiler, "-p", "tsconfig.json"]);
    if (command === "build") return [];
  }
  if (command === "start" || command === "dev:serve") {
    if (!existsSync(path.join(root, "dist/index.js"))) throw new Error("Build the application first with tilcayo build.");
    await runNode(["--env-file-if-exists=.env", "dist/index.js"]);
    return [];
  }
  if (command === "dev") {
    let nodemon;
    try { nodemon = require("nodemon"); }
    catch { throw new Error("Nodemon is missing. Install application dependencies first."); }
    nodemon({
      script: fileURLToPath(new URL("../bin.js", import.meta.url)),
      args: ["dev:serve"],
      exec: "node",
      cwd: root,
      watch: ["src", "tsconfig.json", ".env"],
      ext: "ts,json,env",
      ignore: ["dist/**", "node_modules/**"],
      delay: 300,
    }).on("log", (event: { message: string }) => console.log(`[tilcayo] ${event.message}`));
    return [];
  }
  throw new Error(`Unknown application command: ${command}`);
}
