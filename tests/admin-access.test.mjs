import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { createApp } from '../packages/core/dist/index.js';
import { createAuth, hashPassword, verifyPassword } from '../packages/auth/dist/index.js';
import { User } from '../packages/auth/dist/models/User.js';
import { AdminRole } from '../packages/auth/dist/models/AdminRole.js';
import { RefreshToken } from '../packages/auth/dist/models/RefreshToken.js';
import { createAccessToken, createRefreshToken } from '../packages/auth/dist/tokens.js';
import { resolveConfig } from '../packages/auth/dist/types.js';

const id = '1234567890abcdef12345678';
const otherId = '1234567890abcdef12345679';
const config = options => resolveConfig({ accessTokenSecret: randomBytes(32).toString('hex'), refreshTokenSecret: randomBytes(32).toString('hex'), passwordRounds: 10, ...options });
async function serve(t, app) {
  const server = app.listen(0); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, request: (path, init) => fetch(base + path, init) };
}

test('cookie sessions survive a new client, rotate once, reject other origins, and clear on logout', async t => {
  const c = config({ cookieSession: true });
  const auth = createAuth(c);
  const user = new User.raw({ _id: id, name: 'Admin', email: 'admin@example.test', roles: ['admin'], passwordHash: await hashPassword('test-password', 10) });
  t.mock.method(User, 'first', async () => user);
  t.mock.method(User, 'find', async () => user);
  const records = new Map();
  t.mock.method(RefreshToken.raw, 'create', async data => { records.set(data.tokenHash, data); return data; });
  t.mock.method(RefreshToken.raw, 'findOneAndUpdate', async filter => {
    const record = records.get(filter.tokenHash);
    if (!record || record.revokedAt) return null;
    record.revokedAt = new Date(); return record;
  });
  t.mock.method(RefreshToken.raw, 'updateOne', async filter => { const record = records.get(filter.tokenHash); if (record) record.revokedAt = new Date(); return { modifiedCount: 1 }; });
  const { base, request } = await serve(t, createApp().routes(auth.routes));
  const post = (action, body, headers = {}) => request('/api/auth/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const login = await post('login', { email: user.email, password: 'test-password' });
  assert.equal(login.status, 200);
  const setCookie = login.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Strict/); assert.match(setCookie, /Path=\/api\/auth/);
  assert.match(setCookie, /Max-Age=604800/);
  const cookie = setCookie.split(';')[0];
  // A fresh client has no access token, just the browser-managed cookie.
  assert.equal((await post('refresh', {}, { Cookie: cookie, Origin: 'https://other.example' })).status, 401);
  const restored = await post('refresh', {}, { Cookie: cookie, Origin: base });
  assert.equal(restored.status, 200);
  const rotatedCookie = restored.headers.get('set-cookie').split(';')[0];
  assert.notEqual(rotatedCookie, cookie);
  const tokens = (await restored.json()).data.tokens;
  const me = await request('/api/auth/me', { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
  assert.equal(me.status, 200);
  assert.ok((await me.json()).data.adminTabs.includes('access'));
  assert.equal((await post('refresh', {}, { Cookie: cookie })).status, 401);
  const logout = await post('logout', {}, { Cookie: rotatedCookie });
  assert.equal(logout.status, 204); assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await post('refresh', {}, { Cookie: rotatedCookie })).status, 401);
});

test('role tabs are enforced against the database and ordinary roles cannot manage access', async t => {
  const c = config(); const auth = createAuth(c);
  const user = new User.raw({ _id: id, name: 'Operator', email: 'operator@example.test', roles: ['catalog_manager'] });
  let roleTabs = ['catalog', 'inventory'];
  t.mock.method(User, 'find', async () => user);
  t.mock.method(AdminRole.raw, 'find', () => ({ lean: async () => [{ key: 'catalog_manager', tabs: roleTabs }] }));
  const app = createApp().routes(auth.adminRoutes);
  for (const tab of ['catalog', 'users', 'access']) app.route.get('/' + tab, ctx => ctx.response.success(auth.user(ctx)), { middleware: [auth.middleware, auth.requireAdminTab(tab)] });
  const { request } = await serve(t, app);
  const headers = { Authorization: `Bearer ${await createAccessToken(id, c)}`, 'Content-Type': 'application/json' };
  assert.equal((await request('/catalog', { headers })).status, 200);
  assert.equal((await request('/users', { headers })).status, 403);
  assert.equal((await request('/api/admin/roles', { headers })).status, 403);
  assert.equal((await request(`/api/admin/users/${otherId}/roles`, { headers, method: 'PUT', body: JSON.stringify({ roles: ['admin'] }) })).status, 403);
  roleTabs = ['users', 'access']; // Even a corrupted custom role cannot grant access management.
  assert.equal((await request('/catalog', { headers })).status, 403);
  assert.equal((await request('/users', { headers })).status, 200);
  assert.equal((await request('/access', { headers })).status, 403);
  user.roles = ['admin'];
  assert.equal((await request(`/api/admin/users/${id}/roles`, { headers, method: 'PUT', body: '{"roles":[]}' })).status, 409);
  assert.equal((await request('/api/admin/roles/editor', { headers, method: 'PUT', body: '{"key":"editor","name":"Editor","tabs":["access"]}' })).status, 422);
  const save = t.mock.method(AdminRole.raw, 'findOneAndUpdate', async (_filter, update) => update.$set);
  assert.equal((await request('/api/admin/roles/editor', { headers, method: 'PUT', body: '{"key":"editor","name":"Editor","tabs":["catalog"]}' })).status, 200);
  assert.deepEqual(save.mock.calls[0].arguments[1].$set.tabs, ['catalog']);
  t.mock.method(AdminRole.raw, 'countDocuments', async () => 0);
  assert.equal((await request(`/api/admin/users/${otherId}/roles`, { headers, method: 'PUT', body: '{"roles":["unknown"]}' })).status, 422);
});

test('user soft delete revokes sessions, excludes active lists, and restore keeps old sessions invalid', async t => {
  const c = config(); const auth = createAuth(c);
  const administrator = new User.raw({ _id: id, name: 'Admin', email: 'admin@example.test', roles: ['admin'] });
  const target = new User.raw({ _id: otherId, name: 'Reader', email: 'reader@example.test', roles: [], passwordHash: await hashPassword('test-password', 10) });
  t.mock.method(User, 'find', async value => String(value) === id ? administrator : target);
  t.mock.method(User, 'findOrFail', async () => target);
  t.mock.method(User, 'first', async () => target);
  t.mock.method(User.raw, 'updateOne', async (_filter, update) => { Object.assign(target, update.$set); if (update.$inc) target.sessionVersion++; return { modifiedCount: 1 }; });
  const revoked = t.mock.method(RefreshToken.raw, 'updateMany', async () => ({ modifiedCount: 1 }));
  const list = t.mock.method(User, 'paginate', async (_query, options) => ({ items: target.deletedAt === null && options.filter.deletedAt === null ? [target] : [], pagination: { total: 0 } }));
  t.mock.method(User, 'count', async () => 1);
  const { request } = await serve(t, createApp().routes(auth.routes).routes(auth.adminRoutes));
  const headers = { Authorization: `Bearer ${await createAccessToken(id, c)}` };
  const oldToken = await createAccessToken(otherId, c);
  assert.equal((await request(`/api/admin/users/${id}`, { headers, method: 'DELETE' })).status, 409);
  assert.equal((await request(`/api/admin/users/${otherId}`, { headers, method: 'DELETE' })).status, 204);
  assert.ok(target.deletedAt); assert.equal(target.sessionVersion, 1); assert.equal(revoked.mock.callCount(), 1);
  assert.equal((await request('/api/auth/me', { headers: { Authorization: `Bearer ${oldToken}` } })).status, 401);
  assert.equal((await request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: target.email, password: 'test-password' }) })).status, 401);
  await request('/api/admin/users', { headers }); assert.equal(list.mock.calls[0].arguments[1].filter.deletedAt, null);
  await request('/api/admin/users?deleted=trash', { headers }); assert.deepEqual(list.mock.calls[1].arguments[1].filter.deletedAt, { $ne: null });
  assert.equal((await request(`/api/admin/users/${otherId}/restore`, { headers, method: 'POST' })).status, 204);
  assert.equal(target.deletedAt, null);
  assert.equal((await request('/api/auth/me', { headers: { Authorization: `Bearer ${oldToken}` } })).status, 401);
});


test('only administrators create users with hashed passwords and validated roles without replacing their session', async t => {
  const c = config(); const auth = createAuth(c);
  const actor = new User.raw({ _id: id, name: 'Admin', email: 'admin@example.test', roles: ['admin'] });
  t.mock.method(User, 'find', async () => actor);
  t.mock.method(AdminRole.raw, 'countDocuments', async filter => filter.key.$in.every(key => key === 'editor') ? filter.key.$in.length : 0);
  t.mock.method(User.raw, 'init', async () => User.raw);
  t.mock.method(User, 'exists', async () => false);
  let created;
  const create = t.mock.method(User, 'create', async value => { created = value; return new User.raw({ _id: otherId, ...value }); });
  const issue = t.mock.method(RefreshToken.raw, 'create', async () => { throw new Error('Creating a user must not start a session'); });
  const { request } = await serve(t, createApp().routes(auth.routes).routes(auth.adminRoutes));
  const headers = { Authorization: `Bearer ${await createAccessToken(id, c)}`, 'Content-Type': 'application/json' };
  const body = { name: 'New user', email: 'NEW@example.test', password: 'test-password', roles: ['editor'] };
  const post = value => request('/api/admin/users', { method: 'POST', headers, body: JSON.stringify(value) });
  assert.equal((await post({ ...body, password: 'short' })).status, 422);
  assert.equal((await post({ ...body, roles: ['unknown'] })).status, 422);
  const response = await post(body); assert.equal(response.status, 201);
  const result = await response.json(); assert.equal(result.data.email, 'new@example.test');
  assert.deepEqual(result.data.roles, ['editor']); assert.equal(result.data.passwordHash, undefined);
  assert.equal(response.headers.get('set-cookie'), null); assert.equal(issue.mock.callCount(), 0);
  assert.ok(await verifyPassword(body.password, created.passwordHash)); assert.equal(created.password, undefined);
  assert.equal((await request('/api/auth/me', { headers })).status, 200);
  t.mock.method(User, 'exists', async () => true); assert.equal((await post(body)).status, 409);
  actor.roles = []; assert.equal((await post(body)).status, 403); assert.equal(create.mock.callCount(), 1);
});

test('suspension blocks login, access and refresh immediately; reactivation never revives old sessions', async t => {
  const c = config(); const auth = createAuth(c);
  const actor = new User.raw({ _id: id, name: 'Admin', email: 'admin@example.test', roles: ['admin'] });
  const target = new User.raw({ _id: otherId, name: 'Member', email: 'member@example.test', roles: [], passwordHash: await hashPassword('test-password', 10) });
  t.mock.method(User, 'find', async key => String(key) === id ? actor : target);
  t.mock.method(User, 'first', async () => target);
  t.mock.method(User.raw, 'findOneAndUpdate', async (filter, update) => {
    assert.equal(filter._id, otherId); assert.equal(filter.deletedAt, null);
    Object.assign(target, update.$set); target.sessionVersion += update.$inc.sessionVersion; return target;
  });
  const revoke = t.mock.method(RefreshToken.raw, 'updateMany', async () => ({ modifiedCount: 1 }));
  t.mock.method(RefreshToken.raw, 'create', async data => data);
  const list = t.mock.method(User, 'paginate', async () => ({ items: [target], pagination: { total: 1 } }));
  t.mock.method(User, 'count', async () => 1);
  const { request } = await serve(t, createApp().routes(auth.routes).routes(auth.adminRoutes));
  const headers = { Authorization: `Bearer ${await createAccessToken(id, c)}`, 'Content-Type': 'application/json' };
  const status = (key, suspended) => request(`/api/admin/users/${key}/status`, { method: 'PUT', headers, body: JSON.stringify({ suspended }) });
  const oldAccess = await createAccessToken(otherId, c); const oldRefresh = await createRefreshToken(otherId, c);
  assert.equal((await status(id, true)).status, 409);
  assert.equal((await status(otherId, true)).status, 200); assert.ok(target.suspendedAt); assert.equal(target.sessionVersion, 1);
  assert.equal(revoke.mock.callCount(), 1);
  const me = token => request('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  const login = () => request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: target.email, password: 'test-password' }) });
  const refresh = () => request('/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: oldRefresh }) });
  assert.equal((await me(oldAccess)).status, 401); assert.equal((await login()).status, 401); assert.equal((await refresh()).status, 401);
  const directory = await request('/api/admin/users?status=suspended', { headers }); assert.equal(directory.status, 200);
  assert.deepEqual(list.mock.calls[0].arguments[1].filter.suspendedAt, { $ne: null });
  assert.ok((await directory.json()).data.items[0].suspendedAt);
  assert.equal((await status(otherId, false)).status, 200); assert.equal(target.suspendedAt, null); assert.equal(target.sessionVersion, 2);
  assert.equal((await me(oldAccess)).status, 401); assert.equal((await refresh()).status, 401); assert.equal((await login()).status, 200);
  actor.roles = []; assert.equal((await status(otherId, true)).status, 403);
});
