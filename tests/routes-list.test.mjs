import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { createApp } from "../packages/core/dist/index.js";

const repo = fileURLToPath(new URL("../", import.meta.url));
const binary = path.join(repo, "packages/cli/dist/bin.js");

test("routes:list discovers the nearest environment within the workspace and honors explicit files", async (t) => {
  const directory = await mkdtemp(path.join(repo, ".routes-test-"));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(repo));
    assert.ok(path.basename(directory).startsWith(".routes-test-"));
    await rm(directory, { recursive: true, force: true });
  });
  const cwd = path.join(directory, "examples", "api");
  await mkdir(cwd, { recursive: true });
  await writeFile(path.join(directory, "package.json"), JSON.stringify({ workspaces: ["examples/*"] }));
  await writeFile(path.join(directory, ".env"), "TILCAYO_ROUTE_ENV_TEST=workspace\n");
  await writeFile(path.join(cwd, "app.mjs"), `export default { getRoutes() { return [{ method: 'GET', path: '/' + (process.env.TILCAYO_ROUTE_ENV_TEST ?? 'missing'), handler: 'test', middleware: [], validation: [] }]; } };`);
  const env = { ...process.env };
  delete env.TILCAYO_ROUTE_ENV_TEST;
  const run = (...args) => spawnSync(process.execPath, [binary, "routes:list", "--entry", "app.mjs", "--json", ...args], { cwd, env, encoding: "utf8", windowsHide: true });
  const routePath = (...args) => {
    const result = run(...args);
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout)[0].path;
  };
  assert.equal(routePath(), "/workspace");
  await writeFile(path.join(cwd, ".env"), "TILCAYO_ROUTE_ENV_TEST=local\n");
  assert.equal(routePath(), "/local");
  assert.equal(routePath("--env-file", "../../.env"), "/workspace");
  env.TILCAYO_ROUTE_ENV_TEST = "shell";
  assert.equal(routePath(), "/shell");
  delete env.TILCAYO_ROUTE_ENV_TEST;
  assert.notEqual(run("--env-file", "missing.env").status, 0);
  await rm(path.join(cwd, ".env"));
  await writeFile(path.join(cwd, ".git"), "gitdir: unused");
  assert.equal(routePath(), "/missing");
});

test("route inspection expands resources, inherits middleware and returns detached metadata", () => {
  const global = async function globalMiddleware() {};
  const group = async function groupMiddleware() {};
  const local = async function localMiddleware() {};
  const app = createApp({ middleware: [global] });
  const controller = Object.fromEntries(["index", "store", "show", "update", "destroy"].map((name) => [name, function action() {}]));
  app.route.group({ prefix: "/api", middleware: [group] }, () => {
    app.route.resource("/books", controller, { store: { middleware: [local], validate: { body: {} } } });
  });
  const routes = app.getRoutes();
  assert.equal(routes.length, 5);
  assert.deepEqual(routes[1], { method: "POST", path: "/api/books", handler: "action", middleware: ["globalMiddleware", "groupMiddleware", "localMiddleware"], validation: ["body"] });
  assert.equal(routes[2].path, "/api/books/:id");
  routes[0].middleware.push("changed");
  assert.equal(app.getRoutes()[0].middleware.length, 2);
});

test("routes:list loads an exported app, filters routes and reports invalid input", async (t) => {
  const directory = await mkdtemp(path.join(repo, ".routes-test-"));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(repo));
    assert.ok(path.basename(directory).startsWith(".routes-test-"));
    await rm(directory, { recursive: true, force: true });
  });
  const core = pathToFileURL(path.join(repo, "packages/core/dist/index.js")).href;
  await writeFile(path.join(directory, "app.mjs"), `import { createApp } from ${JSON.stringify(core)};
    export const app = createApp();
    app.route.get('/api/books', function listBooks() {});
    app.route.post('/api/books', function createBook() {});
    app.route.get('/health', () => {});`);
  const run = (...args) => spawnSync(process.execPath, [binary, "routes:list", ...args], { cwd: directory, encoding: "utf8", windowsHide: true });
  const result = run("--entry", "app.mjs", "--method", "get", "--path", "/api", "--json");
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [{ method: "GET", path: "/api/books", handler: "listBooks", middleware: [], validation: [] }]);
  const table = run("--entry", "app.mjs");
  assert.equal(table.status, 0, table.stderr);
  assert.match(table.stdout, /METHOD\s+PATH\s+HANDLER\s+MIDDLEWARE\s+VALIDATION/);
  assert.match(table.stdout, /3 route\(s\)/);
  assert.match(run("--entry", "app.mjs", "--path", "missing").stdout, /No matching routes/);
  assert.notEqual(run("--method").status, 0);
  assert.notEqual(run("--method", "BOGUS").status, 0);
  assert.notEqual(run("--unknown").status, 0);
  assert.notEqual(run("--entry", "missing.mjs").status, 0);
  await writeFile(path.join(directory, "empty.mjs"), "export default {};");
  assert.match(run("--entry", "empty.mjs").stderr, /must export a Tilcayo app/);
});
