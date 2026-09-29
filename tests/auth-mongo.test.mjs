import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { randomBytes, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { createApp, connectMongo, disconnectMongo } from "../packages/core/dist/index.js";
import { createAuth } from "../packages/auth/dist/index.js";
import { User } from "../packages/auth/dist/models/User.js";
import { RefreshToken } from "../packages/auth/dist/models/RefreshToken.js";
import { hashRefreshToken } from "../packages/auth/dist/tokens.js";

test("live MongoDB authentication, rotation races, revocation and safe persistence", { skip: !process.env.MONGODB_URI, timeout: 60000 }, async () => {
  const dbName = `tilcayo_auth_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  const auth = createAuth({
    accessTokenSecret: randomBytes(32).toString("hex"), refreshTokenSecret: randomBytes(32).toString("hex"), passwordRounds: 10,
  });
  let connected = false;
  let server;
  try {
    try {
      await connectMongo(process.env.MONGODB_URI, { dbName, serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
    } catch { throw new Error("Live auth test could not connect to MongoDB"); }
    connected = true;
    await Promise.all([User.init(), RefreshToken.init()]);
    const app = createApp().routes(auth.routes);
    app.route.get("/profile", (ctx) => ctx.response.success(auth.user(ctx)), { middleware: [auth.middleware] });
    server = app.listen(0);
    await once(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}`;
    async function request(method, path, body, access) {
      const response = await fetch(`${base}${path}`, {
        method, headers: { "Content-Type": "application/json", ...(access ? { Authorization: `Bearer ${access}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result = response.status === 204 ? null : await response.json();
      // Never include a token-bearing response in assertion diagnostics.
      return { status: response.status, body: result, headers: response.headers };
    }
    const post = (action, body) => request("POST", `/api/auth/${action}`, body);
    const registration = { name: "Jane", email: " JANE@example.com ", password: "password123" };
    const created = await post("register", registration);
    assert.equal(created.status, 201);
    assert.equal(created.headers.get("Cache-Control"), "no-store");
    assert.equal(created.body.data.user.email, "jane@example.com");
    assert.equal(/password|passwordHash|tokenHash/.test(JSON.stringify(created.body)), false);
    const userId = created.body.data.user.id;
    const tokens = created.body.data.tokens;
    const stored = await User.findById(userId).select("+passwordHash").lean();
    assert.equal(stored.password, undefined);
    assert.match(stored.passwordHash, /^\$2[aby]\$10\$/);
    assert.equal((await User.findById(userId)).passwordHash, undefined);
    const refresh = await RefreshToken.findOne({ userId }).lean();
    assert.equal(refresh.tokenHash === hashRefreshToken(tokens.refreshToken), true);
    assert.equal(refresh.refreshToken, undefined);
    assert.equal(refresh.accessToken, undefined);
    assert.equal((await User.collection.indexes()).some((index) => index.unique && index.key.email === 1), true);
    assert.equal((await RefreshToken.collection.indexes()).some((index) => index.expireAfterSeconds === 0 && index.key.expiresAt === 1), true);
    assert.equal((await post("register", registration)).status, 409);
    assert.equal((await post("register", { ...registration, email: "bad" })).status, 422);
    assert.equal((await post("register", { ...registration, password: "short" })).status, 422);
    assert.equal((await post("register", { email: "new@example.com", password: "password123" })).status, 422);
    assert.equal((await post("login", { email: "jane@example.com" })).status, 422);
    assert.equal((await post("refresh", {})).status, 422);
    for (const body of [{ email: "jane@example.com", password: "wrong-password" }, { email: "missing@example.com", password: "password123" }]) {
      const wrong = await post("login", body);
      assert.equal(wrong.status, 401);
      assert.equal(wrong.body.error.message, "Invalid credentials");
    }
    const login = await post("login", { email: "JANE@example.com", password: "password123" });
    assert.equal(login.status, 200);
    assert.equal(login.body.data.tokens.refreshToken === tokens.refreshToken, false);
    assert.equal((await request("GET", "/profile")).status, 401);
    assert.equal((await request("GET", "/profile", undefined, tokens.accessToken)).body.data.id, userId);
    assert.equal((await request("GET", "/api/auth/me", undefined, tokens.accessToken)).status, 200);
    assert.equal((await request("GET", "/api/auth/me", undefined, tokens.refreshToken)).status, 401);
    assert.equal((await post("refresh", { refreshToken: tokens.accessToken })).status, 401);
    const rotated = await post("refresh", { refreshToken: tokens.refreshToken });
    assert.equal(rotated.status, 200);
    assert.equal(rotated.body.data.tokens.refreshToken === tokens.refreshToken, false);
    assert.equal((await post("refresh", { refreshToken: tokens.refreshToken })).status, 401);
    const raceToken = rotated.body.data.tokens.refreshToken;
    const racing = await Promise.all([post("refresh", { refreshToken: raceToken }), post("refresh", { refreshToken: raceToken })]);
    assert.deepEqual(racing.map((result) => result.status).sort(), [200, 401]);
    const winner = racing.find((result) => result.status === 200).body.data.tokens;
    assert.equal((await post("logout", { refreshToken: winner.refreshToken })).status, 204);
    assert.equal((await post("logout", { refreshToken: winner.refreshToken })).status, 204);
    assert.equal((await post("refresh", { refreshToken: winner.refreshToken })).status, 401);
    assert.equal((await request("GET", "/profile", undefined, winner.accessToken)).status, 200); // Access JWT lasts until expiry.
    const loginToken = login.body.data.tokens.refreshToken;
    await RefreshToken.updateOne({ tokenHash: hashRefreshToken(loginToken) }, { $set: { expiresAt: new Date(0) } });
    assert.equal((await post("refresh", { refreshToken: loginToken })).status, 401);
    const newLogin = await post("login", { email: "jane@example.com", password: "password123" });
    assert.equal(newLogin.status, 200);
    await User.deleteOne({ _id: userId });
    assert.equal((await request("GET", "/profile", undefined, tokens.accessToken)).status, 401);
    assert.equal((await post("refresh", { refreshToken: newLogin.body.data.tokens.refreshToken })).status, 401);
    // Concurrent registrations rely on the unique index, not just an exists() check.
    const raceUser = { name: "Race", email: "race@example.com", password: "password123" };
    const registrations = await Promise.all([post("register", raceUser), post("register", raceUser)]);
    assert.deepEqual(registrations.map((result) => result.status).sort(), [201, 409]);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    try {
      if (connected && mongoose.connection.name === dbName) await mongoose.connection.dropDatabase();
    } finally { await disconnectMongo(); }
  }
});
