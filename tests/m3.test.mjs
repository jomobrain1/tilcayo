import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";
import { createApp, createRouter } from "../packages/core/dist/index.js";

test("basic-api serves product controllers on port 9149", async () => {
  const child = spawn(process.execPath, ["examples/basic-api/dist/index.js"], {
    cwd: new URL("../", import.meta.url),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let errors = "";
  child.stderr.on("data", (data) => { errors += data; });
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Server startup timed out")), 10000);
      child.once("error", (error) => { clearTimeout(timeout); reject(error); });
      child.once("exit", (code) => {
        clearTimeout(timeout);
        reject(new Error(`Server exited with ${code}: ${errors}`));
      });
      child.stdout.on("data", (data) => {
        if (data.toString().includes("http://localhost:9149")) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    for (const [path, expected] of [
      ["/", { framework: "Tilcayo", message: "Tilcayo API" }],
      ["/hello", { message: "Routing works" }],
    ]) {
      const response = await fetch(`http://localhost:9149${path}`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), expected);
    }

    const cases = [
      ["GET", "", undefined, 200, { success: true, message: "Products retrieved", data: [] }],
      ["GET", "/123", undefined, 200, { success: true, message: "Success", data: { id: "123" } }],
      ["POST", "", { name: "Keyboard" }, 201, { success: true, message: "Product created", data: { name: "Keyboard" } }],
      ["PUT", "/123", { name: "Updated Keyboard" }, 200, { success: true, message: "Product updated", data: { id: "123", body: { name: "Updated Keyboard" } } }],
      ["DELETE", "/123", undefined, 204, undefined],
    ];
    for (const [method, path, body, status, expected] of cases) {
      const response = await fetch(`http://localhost:9149/api/products${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      assert.equal(response.status, status, `${method} ${path}`);
      if (expected === undefined) assert.equal(await response.text(), "");
      else assert.deepEqual(await response.json(), expected);
    }
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill();
      await exited;
    }
  }
});

test("context fields, async handlers, helper defaults and undefined responses", async () => {
  const app = createApp();
  app.route.patch("/inspect/:id", async (ctx) => {
    assert.equal(ctx.req, undefined);
    assert.equal(ctx.res, undefined);
    assert.equal(ctx.next, undefined);
    return ctx.response.success({
      params: ctx.params, query: ctx.query, body: ctx.body,
      header: ctx.headers["x-context-test"], method: ctx.method,
      path: ctx.path, ip: ctx.ip,
    });
  });
  app.route.get("/wild/*parts", (ctx) => ctx.params);
  app.route.post("/created", (ctx) => ctx.response.created());
  app.route.get("/empty", () => undefined);
  const server = app.listen(0);
  try {
    await once(server, "listening");
    const base = `http://localhost:${server.address().port}`;
    const response = await fetch(`${base}/inspect/123?search=keyboard`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-context-test": "present" },
      body: JSON.stringify({ name: "Keyboard" }),
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(typeof result.data.ip, "string");
    assert.ok(result.data.ip.length > 0);
    assert.deepEqual(result, {
      success: true, message: "Success",
      data: { params: { id: "123" }, query: { search: "keyboard" },
        body: { name: "Keyboard" }, header: "present", method: "PATCH",
        path: "/inspect/123", ip: result.data.ip },
    });
    assert.deepEqual(await (await fetch(`${base}/wild/one/two`)).json(), { parts: ["one", "two"] });
    const created = await fetch(`${base}/created`, { method: "POST" });
    assert.equal(created.status, 201);
    assert.deepEqual(await created.json(), { success: true, message: "Created successfully" });
    const empty = await fetch(`${base}/empty`);
    assert.equal(empty.status, 204);
    assert.equal(await empty.text(), "");
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("groups restore prefixes and routers keep independent route definitions", () => {
  const route = createRouter();
  route.group({ prefix: "/api/" }, () => {
    route.group({ prefix: "/v1" }, () => route.get("/items", () => []));
    route.get("/products", () => []);
  });
  assert.throws(() => route.group({ prefix: "/failed" }, () => { throw new Error("stop"); }));
  route.get("/", () => ({}));
  assert.deepEqual(route.all().map(({ path }) => path), ["/api/v1/items", "/api/products", "/"]);
  assert.deepEqual(createRouter().all(), []);
});
