import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { existsSync, watch } from "node:fs";

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
    const compiler = path.join(path.dirname(require.resolve("typescript/package.json")), "bin/tsc");
    // Own the API process directly. An intermediate dev:serve process prevented
    // Windows watchers from reliably finishing a restart and releasing the port.
    await new Promise<void>((resolve, reject) => {
      let api: ChildProcess | undefined, compiling: ChildProcess | undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let revision = 0, busy = false, closed = false;
      const launch = (nodeArgs: string[]) => spawn(process.execPath, nodeArgs, { cwd: root, stdio: "inherit", windowsHide: true });
      const stop = (child?: ChildProcess) => new Promise<void>(done => {
        if (!child || child.exitCode !== null || child.signalCode !== null) return done();
        child.once("exit", () => done()); child.kill("SIGTERM");
      });
      const restart = async () => {
        if (busy || closed) return;
        busy = true;
        try {
          let built: number;
          do {
            built = revision;
            await stop(api); api = undefined;
            if (closed) break;
            compiling = launch([compiler, "-p", "tsconfig.json"]);
            const code = await new Promise<number | null>((done, fail) => { compiling!.once("error", fail); compiling!.once("exit", done); });
            compiling = undefined;
            if (closed) break;
            if (built !== revision) continue;
            if (code === 0) {
              api = launch(["--env-file-if-exists=.env", "dist/index.js"]);
              api.once("error", error => console.error(error.message));
            } else console.error("[tilcayo] Build failed. Waiting for changes.");
          } while (built !== revision && !closed);
        } catch (error) { console.error(error instanceof Error ? error.message : "Unable to restart API"); }
        finally { busy = false; }
      };
      const changed = () => {
        if (closed) return;
        revision++;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { console.log("[tilcayo] Rebuilding changed files..."); void restart(); }, 300);
      };
      const sourceWatcher = watch(path.join(root, "src"), { recursive: true }, (_event, filename) => { if (filename && /\.(ts|json)$/.test(String(filename))) changed(); });
      const configWatcher = watch(root, (_event, filename) => { if (filename && [".env", "tsconfig.json"].includes(String(filename))) changed(); });
      const close = () => {
        if (closed) return; closed = true;
        sourceWatcher.close(); configWatcher.close(); if (timer) clearTimeout(timer);
        process.off("SIGINT", close); process.off("SIGTERM", close);
        void Promise.all([stop(api), stop(compiling)]).then(() => resolve(), reject);
      };
      sourceWatcher.once("error", error => { close(); reject(error); });
      configWatcher.once("error", error => { close(); reject(error); });
      process.on("SIGINT", close); process.on("SIGTERM", close);
      void restart();
    });
    return [];
  }
  throw new Error(`Unknown application command: ${command}`);
}
