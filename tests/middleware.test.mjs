import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { z } from "zod";
import { createApp, createRouter, rateLimit, cors, requestId, requestLogger, securityHeaders, bodyLimit, cache, badRequest } from "../packages/core/dist/index.js";
import { runMiddleware } from "../packages/core/dist/middleware/types.js";

async function serve(t, app) {
  const server = app.listen(0);
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return (path, options) => fetch(`http://127.0.0.1:${server.address().port}${path}`, options);
}

test("middleware order, nested groups, resources, short circuit and validation", async (t) => {
  const events = [];
  const mark = (name) => async (ctx, next) => { events.push(name); const value = await next(); events.push(`${name}:after`); return value; };
  const app = createApp({ middleware: [mark("app")] });
  const action = (ctx) => { events.push("controller"); return ctx.body; };
  app.route.group({ prefix: "/api", middleware: [mark("group")] }, () => {
    app.route.group({ prefix: "/v1", middleware: [mark("nested")] }, () => {
      app.route.resource("/items", { index: action, store: action, show: action, update: action, destroy: action }, {
        middleware: [mark("resource")],
        store: { middleware: [mark("route")], validate: { body: z.object({ title: z.string().transform((value) => { events.push("validation"); return value; }) }) } },
      });
    });
  });
  app.route.get("/stop", () => { throw new Error("must not run"); }, { middleware: [(ctx) => ctx.response.success("stopped")] });
  app.route.get("/plain", () => "plain");
  app.route.get("/deny", () => "unused", { middleware: [() => { throw badRequest("Denied"); }] });
  const request = await serve(t, app);
  const response = await request("/api/v1/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "ok" }) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { title: "ok" });
  assert.deepEqual(events, ["app", "group", "nested", "resource", "route", "validation", "controller", "route:after", "resource:after", "nested:after", "group:after", "app:after"]);
  events.length = 0;
  assert.equal((await (await request("/stop")).json()).data, "stopped");
  assert.equal((await request("/deny")).status, 400);
  events.length = 0;
  await request("/plain");
  assert.deepEqual(events, ["app", "app:after"]);
  const router = createRouter();
  assert.throws(() => router.group({ prefix: "/bad", middleware: [mark("bad")] }, () => { throw Error("stop"); }));
  router.get("/ok", () => null);
  assert.equal(router.all()[0].path, "/ok");
  assert.equal(router.all()[0].options.middleware, undefined);
});

test("rate limits share counters, allow separate routes, expire and reject spoofed forwarding headers", async (t) => {
  let now = 1000;
  t.mock.method(Date, "now", () => now);
  const shared = rateLimit({ windowMs: 1000, max: 2 });
  const app = createApp();
  app.route.group({ prefix: "/api", middleware: [shared] }, () => {
    app.route.get("/a", () => "a");
    app.route.get("/b", () => "b");
  });
  app.route.get("/other", () => "other", { middleware: [rateLimit({ windowMs: 1000, max: 1 })] });
  const request = await serve(t, app);
  assert.equal((await request("/api/a")).status, 200);
  assert.equal((await request("/api/b")).status, 200);
  const blocked = await request("/api/a", { headers: { "X-Forwarded-For": "1.2.3.4" } });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get("Retry-After"), "1");
  assert.equal((await blocked.json()).error.code, "RATE_LIMITED");
  assert.equal((await request("/other")).status, 200);
  now = 2000;
  assert.equal((await request("/api/a")).status, 200);
  for (const value of [0, -1, 1.5, Infinity]) assert.throws(() => rateLimit({ windowMs: value, max: 1 }));
});

test("CORS preflight uses requested route middleware and never calls controllers", async (t) => {
  let calls = 0;
  const app = createApp();
  app.route.get("/items", () => "get", { middleware: [cors({ origin: "https://read.example" })] });
  app.route.post("/items", () => { calls++; return "post"; }, { middleware: [cors({ origin: "https://write.example", credentials: true })] });
  const request = await serve(t, app);
  const response = await request("/items", { method: "OPTIONS", headers: { Origin: "https://write.example", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" } });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://write.example");
  assert.equal(response.headers.get("Access-Control-Allow-Credentials"), "true");
  assert.match(response.headers.get("Vary"), /Origin/);
  assert.equal(calls, 0);
  assert.equal((await request("/items", { headers: { Origin: "https://evil.example" } })).status, 403);
  assert.equal((await request("/items", { method: "OPTIONS", headers: { Origin: "https://write.example", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "x-not-allowed" } })).status, 403);
  assert.equal((await request("/items", { method: "POST", headers: { Origin: "https://write.example" } })).status, 200);
  assert.equal(calls, 1);
  assert.throws(() => cors({ origin: "*", credentials: true }));
});

test("body limits run before parsing and errors retain request IDs, logging, and security headers", async (t) => {
  const logs = [];
  const app = createApp({ middleware: [requestId(), requestLogger((entry) => logs.push(entry)), securityHeaders()] });
  app.route.post("/small", (ctx) => ({ id: ctx.requestId, body: ctx.body }), { middleware: [bodyLimit(20)] });
  const request = await serve(t, app);
  const valid = await request("/small", { method: "POST", headers: { "Content-Type": "application/json", "X-Request-Id": "untrusted" }, body: '{"x":1}' });
  const data = await valid.json();
  assert.equal(data.id, valid.headers.get("X-Request-Id"));
  assert.notEqual(data.id, "untrusted");
  assert.equal(valid.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(valid.headers.get("X-Powered-By"), null);
  const large = await request("/small", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ x: "a".repeat(50) }) });
  assert.equal(large.status, 413);
  assert.ok(large.headers.get("X-Request-Id"));
  assert.equal((await large.json()).error.code, "BODY_TOO_LARGE");
  const malformed = await request("/small", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(malformed.status, 400);
  await malformed.text();
  assert.deepEqual(logs.map((entry) => entry.status), [200, 413, 400]);
  assert.ok(logs.every((entry) => entry.requestId && entry.durationMs >= 0));
  assert.throws(() => bodyLimit(0));
});

test("cache is opt-in for public GET responses and never caches thrown errors", async (t) => {
  const app = createApp();
  const middleware = [cache({ maxAge: 30 })];
  app.route.get("/public", () => "hello", { middleware });
  app.route.get("/error", () => { throw badRequest("No"); }, { middleware });
  app.route.get("/cookie", () => "hello", { middleware: [cache({ maxAge: 30 }), (ctx, next) => { ctx.header("Set-Cookie", "session=test"); return next(); }] });
  app.route.get("/status", () => "no", { middleware: [cache({ maxAge: 30 }), (ctx, next) => { ctx.status(403); return next(); }] });
  const request = await serve(t, app);
  assert.equal((await request("/public")).headers.get("Cache-Control"), "public, max-age=30");
  assert.equal((await request("/public", { headers: { Authorization: "Bearer token" } })).headers.get("Cache-Control"), "no-store");
  assert.equal((await request("/public", { headers: { Cookie: "session=test" } })).headers.get("Cache-Control"), "no-store");
  assert.equal((await request("/error")).headers.get("Cache-Control"), "no-store");
  assert.equal((await request("/cookie")).headers.get("Cache-Control"), "no-store");
  assert.equal((await request("/status")).headers.get("Cache-Control"), "no-store");
});

test("middleware rejects duplicate next calls and bounded rate storage recovers after expiry", async (t) => {
  let calls = 0;
  await assert.rejects(runMiddleware({}, [async (_ctx, next) => { await next(); return next(); }], async () => { calls++; }), /more than once/);
  assert.equal(calls, 1);
  let now = 1000;
  t.mock.method(Date, "now", () => now);
  const limiter = rateLimit({ windowMs: 1000, max: 2, maxKeys: 1 });
  const context = (ip) => ({ ip, header() {} });
  const next = async () => "ok";
  assert.equal(await limiter(context("a"), next), "ok");
  assert.throws(() => limiter(context("b"), next), { statusCode: 429 });
  assert.equal(await limiter(context("a"), next), "ok");
  now = 2000;
  assert.equal(await limiter(context("b"), next), "ok");
});
