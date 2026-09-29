import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import * as z from "zod";
import * as mini from "zod/mini";
import {
  createApp, createRouter, defineRoutes, validateContext,
  createHttpError, isTilcayoHttpError, badRequest, notFound, validationError,
} from "../packages/core/dist/index.js";
import { handleError } from "../packages/core/dist/errors/errorHandler.js";
import apiRoutes from "../examples/basic-api/dist/routes/api.js";

async function withServer(app, run) {
  const server = app.listen(0);
  try {
    await once(server, "listening");
    await run(`http://localhost:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("HTTP error factories and headers-sent delegation", () => {
  for (const [error, status, code, message] of [
    [badRequest(), 400, "BAD_REQUEST", "Bad request"],
    [notFound(), 404, "NOT_FOUND", "Resource not found"],
    [validationError({ body: [] }), 422, "VALIDATION_ERROR", "Request validation failed"],
    [createHttpError(409, "CONFLICT", "Conflict"), 409, "CONFLICT", "Conflict"],
  ]) {
    assert.ok(error instanceof Error);
    assert.ok(isTilcayoHttpError(error));
    assert.equal(error.statusCode, status);
    assert.equal(error.code, code);
    assert.equal(error.message, message);
  }
  for (const value of [null, {}, new Error("private"), createHttpError(999, "BAD", "bad")]) {
    assert.equal(isTilcayoHttpError(value), false);
  }
  const error = badRequest("Invalid", { field: "name" });
  let forwarded;
  handleError(error, {}, { headersSent: true }, (value) => { forwarded = value; });
  assert.equal(forwarded, error);
});

test("validation preserves original context and supports Zod Mini", async () => {
  const ctx = { body: { name: "Keyboard", extra: true }, query: {}, params: {} };
  assert.equal(await validateContext(ctx), ctx);
  const result = await validateContext(ctx, { body: mini.object({ name: mini.string() }) });
  assert.notEqual(result, ctx);
  assert.deepEqual(result.body, { name: "Keyboard" });
  assert.equal(ctx.body.extra, true);
});

test("validation aggregates locations, supports async parsing, and runs before handlers", async () => {
  const app = createApp();
  let calls = 0;
  app.routes(defineRoutes(({ post }) => {
    post("/inspect/:id", (ctx) => {
      calls++;
      return { body: ctx.body, query: ctx.query, params: ctx.params };
    }, { validate: {
      body: z.object({ names: z.array(z.string().min(2)) })
        .refine(async (value) => !value.names.includes("blocked"), "Blocked name")
        .transform(async (value) => ({ names: value.names.map((name) => name.toUpperCase()) })),
      query: z.object({ page: z.coerce.number().int().positive().default(1) }),
      params: z.object({ id: z.string().regex(/^\d+$/).transform((id) => `product-${id}`) }),
    } });
  }));
  await withServer(app, async (base) => {
    const send = (path, body) => fetch(base + path, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const invalid = await send("/inspect/bad?page=0", { names: ["A"] });
    assert.equal(invalid.status, 422);
    const { error } = await invalid.json();
    assert.equal(error.code, "VALIDATION_ERROR");
    assert.deepEqual(Object.keys(error.details).sort(), ["body", "params", "query"]);
    assert.deepEqual(error.details.body[0].path, ["names", "0"]);
    assert.equal(calls, 0);
    const blocked = await send("/inspect/123", { names: ["blocked"] });
    assert.equal(blocked.status, 422);
    assert.equal(calls, 0);
    const valid = await send("/inspect/123?page=2", { names: ["keyboard"], extra: "strip" });
    assert.equal(valid.status, 200);
    assert.deepEqual(await valid.json(), {
      body: { names: ["KEYBOARD"] }, query: { page: 2 }, params: { id: "product-123" },
    });
    const defaults = await send("/inspect/123", { names: ["mouse"] });
    assert.equal((await defaults.json()).query.page, 1);
    assert.equal(calls, 2);
  });
});

test("all HTTP methods and resource actions retain their validation options", () => {
  const router = createRouter();
  const handler = () => ({});
  const option = { validate: { body: z.string() } };
  for (const method of ["get", "post", "put", "patch", "delete"]) router[method]("/direct", handler, option);
  assert.ok(router.all().every((route) => route.options === option));
  const options = Object.fromEntries(["index", "store", "show", "update", "destroy"].map((action) => [action, { validate: { query: z.object({ action: z.literal(action) }) } }]));
  const controller = Object.fromEntries(Object.keys(options).map((action) => [action, handler]));
  router.resource("/items", controller, options);
  assert.deepEqual(router.all().slice(5).map((route) => route.options), Object.values(options));
});

test("product validation, partial updates, custom and unknown 404s", async () => {
  await withServer(createApp().routes(apiRoutes), async (base) => {
    for (const body of [{ name: "A", price: -5 }, {}]) {
      const response = await fetch(`${base}/api/products`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      assert.equal(response.status, 422);
      const result = await response.json();
      assert.equal(result.error.code, "VALIDATION_ERROR");
      assert.deepEqual(result.error.details.body.map((issue) => issue.path), [["name"], ["price"]]);
    }
    const update = await fetch(`${base}/api/products/123`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: '{"price":7000}',
    });
    assert.equal(update.status, 200);
    assert.deepEqual((await update.json()).data, { id: "123", body: { price: 7000 } });
    for (const [path, message] of [["/api/products/missing", "Product not found"], ["/does-not-exist", "Route not found"]]) {
      const response = await fetch(base + path);
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), { success: false, error: { code: "NOT_FOUND", message } });
    }
  });
});

test("400 details and sanitized unexpected errors survive repeated listen", async () => {
  const app = createApp();
  app.route.get("/bad", () => { throw badRequest("Invalid product", { field: "name" }); });
  app.route.get("/crash", async () => { throw new Error("private test error"); });
  for (let attempt = 0; attempt < 2; attempt++) {
    await withServer(app, async (base) => {
      const bad = await fetch(`${base}/bad`);
      assert.equal(bad.status, 400);
      assert.deepEqual(await bad.json(), { success: false, error: {
        code: "BAD_REQUEST", message: "Invalid product", details: { field: "name" },
      } });
      const crash = await fetch(`${base}/crash`);
      assert.equal(crash.status, 500);
      assert.deepEqual(await crash.json(), { success: false, error: {
        code: "INTERNAL_SERVER_ERROR", message: "Internal server error",
      } });
      assert.equal((await fetch(`${base}/unknown`)).status, 404);
    });
  }
});
