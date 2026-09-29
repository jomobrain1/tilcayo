import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import { createApp, createRouter } from "../packages/core/dist/index.js";
import apiRoutes from "../examples/basic-api/dist/routes/api.js";

test("basic-api serves product controllers", async () => {
  const server = createApp().routes(apiRoutes).listen(0);
  try {
    await once(server, "listening");
    const base = `http://localhost:${server.address().port}`;

    for (const [path, expected] of [
      ["/", { framework: "Tilcayo", message: "Tilcayo API" }],
      ["/hello", { message: "Routing works" }],
    ]) {
      const response = await fetch(`${base}${path}`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), expected);
    }

    const cases = [
      ["GET", "", undefined, 200, { success: true, message: "Products retrieved", data: [{ id: "1", name: "Keyboard", price: 5000 }, { id: "2", name: "Mouse", price: 1500 }] }],
      ["GET", "/1", undefined, 200, { success: true, message: "Product retrieved", data: { id: "1", name: "Keyboard", price: 5000 } }],
      ["POST", "", { name: "Keyboard", price: 5000 }, 201, { success: true, message: "Product created", data: { name: "Keyboard", price: 5000 } }],
      ["PUT", "/3", { name: "Updated Keyboard" }, 200, { success: true, message: "Product updated", data: { id: "3", body: { name: "Updated Keyboard" } } }],
      ["DELETE", "/3", undefined, 204, undefined],
    ];
    for (const [method, path, body, status, expected] of cases) {
      const response = await fetch(`${base}/api/products${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      assert.equal(response.status, status, `${method} ${path}`);
      if (expected === undefined) assert.equal(await response.text(), "");
      else assert.deepEqual(await response.json(), expected);
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
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
