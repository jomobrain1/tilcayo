import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { SignJWT, decodeJwt } from "jose";
import { z } from "zod";
import { createAuth, hashPassword, verifyPassword } from "../packages/auth/dist/index.js";
import { resolveConfig } from "../packages/auth/dist/types.js";
import { createAccessToken, createRefreshToken, verifyAccessToken, verifyRefreshToken, hashRefreshToken } from "../packages/auth/dist/tokens.js";
import { User } from "../packages/auth/dist/models/User.js";
import { createApp, unauthorized, forbidden, conflict } from "../packages/core/dist/index.js";

const config = () => resolveConfig({ accessTokenSecret: randomBytes(32).toString("hex"), refreshTokenSecret: randomBytes(32).toString("hex"), passwordRounds: 10 });
const id = "1234567890abcdef12345678";

test("generated application auth routes validate requests and protect the current user", async (t) => {
  const previousAccess = process.env.AUTH_ACCESS_SECRET;
  const previousRefresh = process.env.AUTH_REFRESH_SECRET;
  const c = config();
  process.env.AUTH_ACCESS_SECRET = c.accessTokenSecret;
  process.env.AUTH_REFRESH_SECRET = c.refreshTokenSecret;
  t.after(() => {
    if (previousAccess === undefined) delete process.env.AUTH_ACCESS_SECRET;
    else process.env.AUTH_ACCESS_SECRET = previousAccess;
    if (previousRefresh === undefined) delete process.env.AUTH_REFRESH_SECRET;
    else process.env.AUTH_REFRESH_SECRET = previousRefresh;
  });
  const { default: routes } = await import("../examples/basic-api/dist/routes/auth.routes.js");
  const user = new User.raw({ _id: id, name: "Jane", email: "jane@example.com", passwordHash: "hidden" });
  t.mock.method(User, "find", async () => user);
  const request = await serve(t, createApp().routes(routes));
  for (const action of ["register", "login", "refresh", "logout", "forgot-password", "verify-reset-code", "reset-password"]) {
    const response = await request(`/api/auth/${action}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    });
    assert.equal(response.status, 422);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
  assert.equal((await request("/api/auth/me")).status, 401);
  const token = await createAccessToken(id, c);
  const response = await request("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.id, id);
  assert.equal(response.body.data.passwordHash, undefined);
});

async function serve(t, app) {
  const server = app.listen(0);
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return async (path, options) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, options);
    return { status: response.status, headers: response.headers, body: response.status === 204 ? null : await response.json() };
  };
}

test("auth config validates secrets, lifetimes, rounds and prefix without exposing values", () => {
  for (const change of [
    { accessTokenSecret: "" }, { refreshTokenSecret: "short" }, { accessTokenSecret: " ".repeat(40) },
    { accessTokenTtlSeconds: 0 }, { refreshTokenTtlSeconds: -1 }, { passwordRounds: 9 }, { passwordRounds: 17 },
    { issuer: "" }, { audience: "" }, { prefix: "relative" }, { prefix: "/:dynamic" },
  ]) assert.throws(() => createAuth({ ...config(), ...change }));
  const same = randomBytes(32).toString("hex");
  assert.throws(() => createAuth({ accessTokenSecret: same, refreshTokenSecret: same }));
  const defaults = resolveConfig({ accessTokenSecret: same, refreshTokenSecret: randomBytes(32).toString("hex") });
  assert.equal(defaults.passwordRounds, 12);
  assert.equal(defaults.accessTokenTtlSeconds, 900);
  assert.equal(defaults.refreshTokenTtlSeconds, 604800);
  assert.equal(defaults.prefix, "/api/auth");
  assert.equal(unauthorized().statusCode, 401);
  assert.equal(forbidden().statusCode, 403);
  assert.equal(conflict().statusCode, 409);
});

test("bcrypt hashes, salts, verifies and rejects truncation", async () => {
  const first = await hashPassword("password123", 10);
  const second = await hashPassword("password123", 10);
  assert.notEqual(first, second);
  assert.match(first, /^\$2[aby]\$10\$/);
  assert.equal(await verifyPassword("password123", first), true);
  assert.equal(await verifyPassword("wrong-password", first), false);
  await assert.rejects(hashPassword("a".repeat(73), 10));
  await assert.rejects(hashPassword("😀".repeat(19), 10));
  assert.equal(await verifyPassword("a".repeat(73), first), false);
});

test("JWTs enforce algorithm, claims, expiration, type, issuer, audience and instance isolation", async () => {
  const c = config();
  const access = await createAccessToken(id, c);
  const refresh = await createRefreshToken(id, c);
  assert.equal((await verifyAccessToken(access, c)).sub, id);
  assert.equal((await verifyRefreshToken(refresh, c)).type, "refresh");
  const a = decodeJwt(access);
  const r = decodeJwt(refresh);
  assert.equal(a.exp - a.iat, 900);
  assert.equal(r.exp - r.iat, 604800);
  assert.notEqual(a.jti, r.jti);
  assert.equal(a.iss, "tilcayo");
  assert.equal(a.aud, "tilcayo-app");
  assert.match(hashRefreshToken(refresh), /^[a-f0-9]{64}$/);
  assert.equal(hashRefreshToken(refresh), hashRefreshToken(refresh));
  for (const attempt of [
    () => verifyAccessToken(refresh, c), () => verifyRefreshToken(access, c),
    () => verifyAccessToken(access, config()), () => verifyAccessToken(access, { ...c, issuer: "other" }),
    () => verifyAccessToken(access, { ...c, audience: "other" }), () => verifyAccessToken("invalid", c),
  ]) await assert.rejects(attempt(), { statusCode: 401 });
  for (const [overrides, algorithm] of [
    [{ exp: a.iat - 1 }, "HS256"], [{ type: "refresh" }, "HS256"], [{ sub: "bad-id" }, "HS256"],
    [{ sessionVersion: -1 }, "HS256"], [{ sessionVersion: "0" }, "HS256"], [{ jti: undefined }, "HS256"], [{ exp: undefined }, "HS256"], [{}, "HS384"], [{ iat: a.exp + 1 }, "HS256"],
  ]) {
    const token = await new SignJWT({ ...a, ...overrides }).setProtectedHeader({ alg: algorithm, typ: "JWT" }).sign(new TextEncoder().encode(c.accessTokenSecret));
    await assert.rejects(verifyAccessToken(token, c), { statusCode: 401 });
  }
});

test("middleware and guard protect routes, keep user data safe, and preserve validation", async (t) => {
  const c = config();
  const auth = createAuth(c);
  const other = createAuth(config());
  const user = new User.raw({ _id: id, name: "Jane", email: "jane@example.com", passwordHash: "never-return-this" });
  let found = true;
  t.mock.method(User, "find", async () => found ? user : null);
  const app = createApp().routes(auth.routes);
  app.route.post("/profile", (ctx) => ctx.response.success({ user: auth.user(ctx), body: ctx.body }), {
    middleware: [auth.middleware], validate: { body: z.object({ title: z.string() }) },
  });
  app.route.get("/guard", auth.guard((ctx) => ctx.response.success(ctx.auth.user)));
  app.route.get("/other", other.guard((ctx) => ctx.auth.user));
  app.route.get("/isolated", (ctx) => other.user(ctx), { middleware: [auth.middleware] });
  const request = await serve(t, app);
  for (const authorization of [undefined, "Basic abc", "Bearer", "Bearer a b", "Bearer invalid"]) {
    const response = await request("/api/auth/me", { headers: authorization ? { Authorization: authorization } : {} });
    assert.equal(response.status, 401);
  }
  const access = await createAccessToken(id, c);
  const headers = { Authorization: `Bearer ${access}`, "Content-Type": "application/json" };
  const response = await request("/profile", { method: "POST", headers, body: JSON.stringify({ title: "ok", ignored: true }) });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.body, { title: "ok" });
  assert.equal(response.body.data.user.id, id);
  assert.equal(JSON.stringify(response.body).includes("passwordHash"), false);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal((await request("/guard", { headers })).status, 200);
  assert.equal((await request("/other", { headers })).status, 401);
  assert.equal((await request("/isolated", { headers })).status, 401);
  assert.equal((await request("/api/auth/me", { headers })).status, 200);
  found = false;
  assert.equal((await request("/guard", { headers })).status, 401);
  assert.equal((await request("/api/auth/me", { headers })).status, 401);
});

test("auth validation and parser errors use safe responses; database errors are never logged", async (t) => {
  const auth = createAuth(config());
  const app = createApp().routes(auth.routes);
  const request = await serve(t, app);
  const post = (path, body) => request(`/api/auth/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  for (const body of [{}, { name: "Jane", email: "bad", password: "password123" }, { name: "Jane", email: "jane@example.com", password: "short" }, { name: "Jane", email: "jane@example.com", password: "😀".repeat(19) }]) {
    assert.equal((await post("register", body)).status, 422);
  }
  assert.equal((await post("refresh", {})).status, 422);
  assert.equal((await post("logout", {})).status, 422);
  assert.equal((await post("logout", { refreshToken: "invalid" })).status, 204);
  const malformed = await request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(malformed.status, 400);
  assert.equal((await post("login", { padding: "a".repeat(20000) })).status, 413);
  const log = t.mock.method(console, "error", () => {});
  t.mock.method(User, "first", () => { throw Error("sensitive database details"); });
  const failure = await post("login", { email: "jane@example.com", password: "password123" });
  assert.equal(failure.status, 500);
  assert.equal(JSON.stringify(failure.body).includes("sensitive"), false);
  assert.equal(log.mock.callCount(), 0);
});

test("duplicate-key registration races return conflict", async (t) => {
  const auth = createAuth(config());
  t.mock.method(User.raw, "init", async () => User);
  t.mock.method(User, "exists", async () => null);
  t.mock.method(User, "create", async () => { throw Object.assign(Error("private duplicate details"), { code: 11000 }); });
  const request = await serve(t, createApp().routes(auth.routes));
  const result = await request("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Jane", email: "JANE@example.com", password: "password123" }) });
  assert.equal(result.status, 409);
  assert.equal(result.body.error.message, "Email already registered");
});

test("auth models reuse registered schemas on reload", async () => {
  const reloaded = await import("../packages/auth/dist/models/User.js?reload");
  assert.equal(reloaded.User.raw, User.raw);
  const original = await import("../packages/auth/dist/models/RefreshToken.js");
  const refreshed = await import("../packages/auth/dist/models/RefreshToken.js?reload");
  assert.equal(refreshed.RefreshToken.raw, original.RefreshToken.raw);
});
