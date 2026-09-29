import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp, defineRoutes } from "../packages/core/dist/index.js";

test("reusable registrars preserve app isolation, chaining and route order", () => {
  const first = createApp();
  const second = createApp();
  const registrar = defineRoutes(({ get, post, put, patch, delete: remove, group }) => {
    group({ prefix: "/api" }, () => {
      group({ prefix: "/v1" }, () => {
        get("/items", (ctx) => ctx.params);
        post("/items", (ctx) => ctx.body);
        put("/items/:id", (ctx) => ctx.body);
        patch("/items/:id", (ctx) => ctx.body);
        remove("/items/:id", (ctx) => ctx.response.noContent());
      });
    });
    get("/", () => ({}));
  });

  assert.deepEqual(first.route.all(), []);
  assert.deepEqual(second.route.all(), []);
  assert.equal(first.routes(registrar), first);
  assert.deepEqual(second.route.all(), []);
  second.routes(registrar);
  const expected = [
    ["GET", "/api/v1/items"], ["POST", "/api/v1/items"],
    ["PUT", "/api/v1/items/:id"], ["PATCH", "/api/v1/items/:id"],
    ["DELETE", "/api/v1/items/:id"], ["GET", "/"],
  ];
  const definitions = (app) => app.route.all().map(({ method, path }) => [method, path]);
  assert.deepEqual(definitions(first), expected);
  assert.deepEqual(definitions(second), expected);
  first.route.get("/first-only", () => ({}));
  assert.deepEqual(definitions(second), expected);
  second.routes(defineRoutes(({ get }) => get("/second-only", () => ({}))));
  assert.equal(first.route.all().at(-1).path, "/first-only");
  assert.equal(second.route.all().at(-1).path, "/second-only");
});
