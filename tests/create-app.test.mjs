import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, writeFile, rm, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { generateApp } from "../packages/create-tilcayo-app/dist/index.js";
import { parseOptions } from "../packages/create-tilcayo-app/dist/options.js";
import { templates } from "../packages/create-tilcayo-app/dist/templates.js";

const repo = fileURLToPath(new URL("../", import.meta.url));
const creator = path.join(repo, "packages/create-tilcayo-app/dist/bin.js");
const cli = path.join(repo, "packages/cli/dist/bin.js");

async function fixture(t) {
  const root = await mkdtemp(path.join(repo, ".starter-test-"));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(repo));
    assert.ok(path.basename(root).startsWith(".starter-test-"));
    await rm(root, { recursive: true, force: true });
  });
  return root;
}

function run(binary, args, cwd) {
  const env = { ...process.env };
  delete env.AUTH_ACCESS_SECRET;
  delete env.AUTH_REFRESH_SECRET;
  delete env.MONGODB_URI;
  return spawnSync(process.execPath, [binary, ...args], { cwd, env, encoding: "utf8", windowsHide: true, timeout: 30000 });
}

test("starter flags validate names, choices and conflicts before writing", async (t) => {
  const root = await fixture(t);
  for (const args of [["../escape"], ["CON"], ["nul"], ["a;b"], ["api", "extra"], ["--type", "web"], ["--package-manager", "bun"], ["--auth", "--no-auth"], ["--type"], ["--unknown"]]) {
    const result = run(creator, [...args, "--no-install"], root);
    assert.notEqual(result.status, 0, args.join(" "));
  }
  assert.deepEqual(await readdir(root), []);
  assert.equal(parseOptions(["app", "--yes"]).options.type, "api");
  const help = run(creator, ["--help"], root);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--no-install/);
  assert.deepEqual(await readdir(root), []);
});

test("starter generates every API/auth variant that compiles and lists its registered routes", async (t) => {
  const root = await fixture(t);
  for (const type of ["api", "minimal"]) {
    for (const auth of [false, true]) {
      const name = `${type}-${auth ? "auth" : "public"}`;
      const target = await generateApp({ name, type, auth, packageManager: "npm", install: false }, root);
      const manifest = JSON.parse(await readFile(path.join(target, "package.json"), "utf8"));
      assert.equal(!!manifest.dependencies["@tilcayo/auth"], auth);
      assert.equal(manifest.scripts.dev, "tilcayo dev");
      for (const folder of ["controllers", "routes", "models", "services", "validators"]) {
        assert.ok((await readdir(path.join(target, "src"))).includes(folder));
      }
      const example = await readFile(path.join(target, ".env.example"), "utf8");
      const env = await readFile(path.join(target, ".env"), "utf8");
      assert.match(example, /^# Server\nPORT=9149\n/);
      if (type === "api" || auth) assert.match(example, /\n# Database\nMONGODB_URI=/);
      if (auth) assert.match(example, /\n# Authentication/);
      assert.equal(example.includes("MONGODB_URI="), type === "api" || auth);
      if (auth) {
        assert.match(example, /AUTH_ACCESS_SECRET=\nAUTH_REFRESH_SECRET=\n/);
        const access = env.match(/AUTH_ACCESS_SECRET=(\w+)/)[1];
        const refresh = env.match(/AUTH_REFRESH_SECRET=(\w+)/)[1];
        assert.equal(access.length, 64);
        assert.equal(refresh.length, 64);
        assert.notEqual(access, refresh);
      } else assert.ok(!env.includes("AUTH_"));
      const compiled = run(cli, ["build"], target);
      assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr);
      const listed = run(cli, ["routes:list", "--json"], target);
      assert.equal(listed.status, 0, listed.stderr);
      const routes = JSON.parse(listed.stdout);
      assert.equal(routes.length, 1 + (type === "api" ? 5 : 0) + (auth ? 5 : 0));
      assert.ok(routes.some((route) => route.path === "/health"));
      assert.equal(routes.some((route) => route.path === "/api/auth/me"), auth);
      if (type === "minimal" && !auth) {
        const { default: app } = await import(pathToFileURL(path.join(target, "dist/app.js")).href);
        const server = app.listen(0);
        await once(server, "listening");
        try {
          const response = await fetch(`http://127.0.0.1:${server.address().port}/health`);
          assert.equal(response.status, 200);
          assert.deepEqual((await response.json()).data, { status: "ok" });
          assert.ok(response.headers.get("x-request-id"));
        } finally { await new Promise((resolve) => server.close(resolve)); }
      }
      await assert.rejects(() => generateApp({ name, type, auth, packageManager: "npm", install: false }, root), /already exists/);
      assert.equal(await readFile(path.join(target, ".env"), "utf8"), env);
    }
  }
});

test("noninteractive CLI supports each manager, skips installation and keeps secrets out of output", async (t) => {
  const root = await fixture(t);
  const secrets = new Set();
  for (const manager of ["npm", "pnpm", "yarn"]) {
    const name = `with-${manager}`;
    const result = run(creator, [name, "--package-manager", manager, "--type", "minimal", "--auth", "--no-install", "--yes"], root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Created/);
    const target = path.join(root, name);
    assert.ok(!(await readdir(target)).includes("node_modules"));
    const manifest = JSON.parse(await readFile(path.join(target, "package.json"), "utf8"));
    assert.equal(manifest.tilcayo.packageManager, manager);
    for (const [section, name] of [["dependencies", "core"], ["dependencies", "auth"], ["devDependencies", "cli"]]) {
      const reference = manifest[section][`@tilcayo/${name}`];
      const protocol = manager === "npm" ? "file:" : "link:";
      assert.ok(reference.startsWith(protocol), reference);
      assert.equal(path.resolve(target, reference.slice(protocol.length)), path.join(repo, "packages", name));
    }
    for (const name of ["zod", "mongoose"]) {
      const reference = manifest.dependencies[name];
      assert.equal(path.resolve(target, reference.slice(reference.indexOf(":") + 1)), path.join(repo, "node_modules", name));
    }
    const env = await readFile(path.join(target, ".env"), "utf8");
    const secret = env.match(/AUTH_ACCESS_SECRET=(\w+)/)[1];
    assert.ok(!result.stdout.includes(secret));
    secrets.add(secret);
    if (manager === "yarn") assert.match(await readFile(path.join(target, ".yarnrc.yml"), "utf8"), /node-modules/);
  }
  assert.equal(secrets.size, 3);
});

test("published starter templates keep registry dependencies", () => {
  const files = templates({ name: "published-app", type: "api", auth: true, packageManager: "npm", install: true });
  const manifest = JSON.parse(files["package.json"]);
  assert.equal(manifest.dependencies["@tilcayo/core"], "^0.0.1");
  assert.equal(manifest.dependencies["@tilcayo/auth"], "^0.0.1");
  assert.equal(manifest.devDependencies["@tilcayo/cli"], "^0.0.1");
});

test("tilcayo build reports compilation failure and start requires a build", async (t) => {
  const root = await fixture(t);
  const target = await generateApp({ name: "broken", type: "minimal", auth: false, packageManager: "npm", install: false }, root);
  const start = run(cli, ["start"], target);
  assert.notEqual(start.status, 0);
  assert.match(start.stderr, /tilcayo build/);
  await writeFile(path.join(target, "src/broken.ts"), "const value: number = 'wrong';\n");
  const build = run(cli, ["build"], target);
  assert.notEqual(build.status, 0);
  assert.match(build.stdout, /not assignable/);
});

test("tilcayo dev starts a generated API and rebuilds changed routes", { timeout: 40000 }, async (t) => {
  const root = await fixture(t);
  const target = await generateApp({ name: "dev-api", type: "minimal", auth: false, packageManager: "npm", install: false }, root);
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  await writeFile(path.join(target, ".env"), `PORT=${port}\n`);
  const env = { ...process.env };
  delete env.PORT;
  const child = spawn(process.execPath, [cli, "dev"], { cwd: target, env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true, detached: process.platform !== "win32" });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  try {
    const waitForStatus = async (expected) => {
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        assert.equal(child.exitCode, null, output);
        try {
          const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(500) });
          if ((await response.json()).data.status === expected) return;
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      assert.fail(`API did not return ${expected}. ${output}`);
    };
    await waitForStatus("ok");
    const controller = path.join(target, "src/controllers/health.controller.ts");
    await writeFile(controller, (await readFile(controller, "utf8")).replace('status: "ok"', 'status: "updated"'));
    await waitForStatus("updated");
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const stopped = once(child, "exit");
      if (process.platform === "win32") {
        const result = spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true, encoding: "utf8", timeout: 5000 });
        if (result.status !== 0) child.kill();
      } else process.kill(-child.pid, "SIGTERM");
      await stopped;
    }
  }
});
