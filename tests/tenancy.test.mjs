import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { createApp, mongoModel, runInTenantScope, connectMongo, disconnectMongo } from '../packages/core/dist/index.js';
import { createAuth, hashPassword, bootstrapTenancy, Tenant, Membership } from '../packages/auth/dist/index.js';
import { User } from '../packages/auth/dist/models/User.js';
import { AdminRole } from '../packages/auth/dist/models/AdminRole.js';
import { RefreshToken } from '../packages/auth/dist/models/RefreshToken.js';
import { parseOptions } from '../packages/create-tilcayo-app/dist/options.js';
import { workspaceUser } from '../packages/auth/dist/tenancy.js';
import { TenantAudit } from '../packages/auth/dist/models/TenantAudit.js';
import { createAccessToken } from '../packages/auth/dist/tokens.js';
import { resolveConfig } from '../packages/auth/dist/types.js';

function hostFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = httpRequest(url, options, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(new Response(res.statusCode === 204 ? null : Buffer.concat(chunks), { status: res.statusCode, headers: Object.fromEntries(Object.entries(res.headers).map(([key,value]) => [key, Array.isArray(value) ? value.join(', ') : String(value)])) })));
    });
    req.on('error', reject); if (options.body) req.write(options.body); req.end();
  });
}

test('tenancy preset requires a full-stack authenticated admin app', () => {
  assert.equal(parseOptions(['sample', '--fullstack', '--auth', '--admin', '--tenancy']).options.tenancy, true);
  assert.throws(() => parseOptions(['sample', '--tenancy']), /Tenancy requires/);
  assert.throws(() => parseOptions(['sample', '--fullstack', '--auth', '--tenancy']), /Tenancy requires/);
});

test('main domain accepts normal users while tenant roles still come from membership', async t => {
  const account = { id: '507f1f77bcf86cd799439013', name: 'Tenant user', email: 'user@example.test', roles: ['admin'] };
  const main = await runInTenantScope({ enabled: true }, () => workspaceUser(account));
  assert.deepEqual(main.roles, []);
  assert.deepEqual(main.adminTabs, []);
  assert.equal(main.tenant, undefined);
  const platform = await runInTenantScope({ enabled: true }, () => workspaceUser({ ...account, roles: ['superadmin'] }));
  assert.deepEqual(platform.adminTabs, ['tenants', 'users', 'catalog', 'inventory', 'categories', 'orders', 'trash']);
  assert.equal(platform.platformRole, 'superadmin');
  t.mock.method(Membership, 'first', async () => ({ roles: ['admin'], sessionVersion: 0 }));
  t.mock.method(Tenant, 'find', async () => ({ _id: '507f1f77bcf86cd799439011', name: 'Sunrise', slug: 'sunrise', status: 'active' }));
  const tenant = await runInTenantScope({ enabled: true, tenantId: '507f1f77bcf86cd799439011' }, () => workspaceUser(account));
  assert.equal(tenant.tenant.slug, 'sunrise');
  for (const tab of ['catalog', 'inventory', 'categories', 'orders']) assert.ok(tenant.adminTabs.includes(tab));
});

test('public main and tenant registration share identities without elevating roles or changing existing credentials', async t => {
  const auth = createAuth({ accessTokenSecret: randomBytes(32).toString('hex'), refreshTokenSecret: randomBytes(32).toString('hex'), passwordRounds: 10, tenancy: { baseDomain: 'localhost' } });
  const tenants = [{ _id: new mongoose.Types.ObjectId(), name: 'Sunrise', slug: 'sunrise', status: 'active' }, { _id: new mongoose.Types.ObjectId(), name: 'Second', slug: 'second', status: 'active' }];
  const accounts = new Map(), memberships = new Map();
  const key = (tenantId, userId) => String(tenantId) + ':' + String(userId);
  t.mock.method(User.raw, 'init', async () => User.raw);
  t.mock.method(User, 'exists', async ({ email }) => accounts.has(email));
  t.mock.method(User, 'first', async ({ email }) => accounts.get(email) ?? null);
  t.mock.method(User, 'find', async id => [...accounts.values()].find(user => String(user._id) === String(id)));
  t.mock.method(User, 'create', async input => { assert.deepEqual(input.roles, []); const user = new User.raw({ ...input, _id: new mongoose.Types.ObjectId() }); accounts.set(user.email, user); return user; });
  t.mock.method(Tenant, 'first', async ({ slug }) => tenants.find(item => item.slug === slug));
  t.mock.method(Tenant, 'find', async id => tenants.find(item => String(item._id) === String(id)));
  t.mock.method(Membership.raw, 'init', async () => Membership.raw);
  t.mock.method(Membership.raw, 'findOneAndUpdate', async (filter, update) => {
    assert.deepEqual(Object.keys(update), ['$setOnInsert']);
    assert.deepEqual(update.$setOnInsert.roles, []);
    const id = key(filter.tenantId, filter.userId);
    if (!memberships.has(id)) memberships.set(id, { ...filter, ...update.$setOnInsert, suspendedAt: null, deletedAt: null });
    return memberships.get(id);
  });
  t.mock.method(Membership, 'first', async filter => { const item = memberships.get(key(filter.tenantId, filter.userId)); return item && !item.suspendedAt && !item.deletedAt ? item : null; });
  t.mock.method(RefreshToken.raw, 'create', async () => ({}));
  const server = createApp({ middleware: [auth.tenantMiddleware] }).routes(auth.routes).listen(0);
  await once(server, 'listening'); t.after(() => new Promise(resolve => server.close(resolve)));
  const password = 'example-password-123';
  const register = (host, email, overrides = {}) => hostFetch(`http://127.0.0.1:${server.address().port}/api/auth/register`, { method: 'POST', headers: { Host: host, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Original name', email, password, ...overrides }) });
  let response = await register('localhost', 'main@example.test');
  assert.equal(response.status, 201, await response.clone().text());
  assert.deepEqual((await response.json()).data.user.adminTabs, []);
  assert.equal(memberships.size, 0);
  assert.equal((await register('localhost', 'main@example.test')).status, 409);
  response = await register('sunrise.localhost', 'tenant@example.test');
  assert.equal(response.status, 201, await response.clone().text());
  let user = (await response.json()).data.user;
  assert.equal(user.tenant.slug, 'sunrise'); assert.deepEqual(user.roles, []); assert.deepEqual(user.adminTabs, []);
  const original = accounts.get('main@example.test'); const hash = original.passwordHash;
  assert.equal((await register('second.localhost', original.email, { password: 'wrong-password-123' })).status, 401);
  assert.equal(memberships.has(key(tenants[1]._id, original._id)), false);
  response = await register('sunrise.localhost', original.email, { name: 'Do not rename' });
  assert.equal(response.status, 201, await response.clone().text());
  assert.equal((await response.json()).data.user.tenant.slug, 'sunrise');
  assert.equal((await register('second.localhost', original.email)).status, 201);
  assert.equal(original.passwordHash, hash); assert.equal(original.name, 'Original name'); assert.deepEqual(original.roles, []);
  const membership = memberships.get(key(tenants[0]._id, original._id));
  membership.roles = ['admin'];
  response = await register('sunrise.localhost', original.email);
  assert.equal(response.status, 201); assert.ok((await response.json()).data.user.roles.includes('admin'));
  membership.suspendedAt = new Date();
  assert.equal((await register('sunrise.localhost', original.email)).status, 403);
  assert.ok(membership.suspendedAt);
  original.roles = ['superadmin'];
  response = await register('second.localhost', original.email);
  assert.equal(response.status, 201); user = (await response.json()).data.user;
  assert.deepEqual(user.roles, []); assert.deepEqual(user.adminTabs, []);
});

test('tenancy setup provisions only the Super Admin without tenant creation or ownership changes', async t => {
  const userId = new mongoose.Types.ObjectId();
  let updates = 0, revocations = 0;
  t.mock.method(User.raw, 'createIndexes', async () => []);
  t.mock.method(User.raw, 'findOneAndUpdate', async (filter, update) => {
    assert.equal(filter.email, 'platform@example.com');
    assert.equal(update.$addToSet.roles, 'superadmin');
    assert.ok(update.$set.passwordHash.startsWith('$2'));
    updates++;
    return { _id: userId };
  });
  t.mock.method(RefreshToken.raw, 'updateMany', async filter => {
    assert.equal(String(filter.userId), String(userId));
    revocations++;
  });
  t.mock.method(AdminRole.raw.collection, 'indexes', async () => []);
  t.mock.method(AdminRole.raw, 'createIndexes', async () => []);
  const forbidden = async () => { throw new Error('Setup must not provision a tenant or move records'); };
  t.mock.method(Tenant, 'create', forbidden);
  t.mock.method(Tenant, 'first', forbidden);
  t.mock.method(Tenant.raw, 'createIndexes', async () => []);
  t.mock.method(Membership.raw, 'updateOne', forbidden);
  t.mock.method(Membership.raw, 'createIndexes', async () => []);
  t.mock.method(AdminRole.raw, 'updateMany', forbidden);
  for (let run = 0; run < 2; run++) {
    assert.deepEqual(await bootstrapTenancy({ email: 'platform@example.com', password: 'example-password-123' }), { userId: String(userId) });
  }
  assert.equal(updates, 2);
  assert.equal(revocations, 2);
});

test('hostname resolution refuses unknown, nested, reserved and suspended tenants', async t => {
  const auth = createAuth({ accessTokenSecret: randomBytes(32).toString('hex'), refreshTokenSecret: randomBytes(32).toString('hex'), tenancy: { baseDomain: 'localhost' } });
  t.mock.method(Tenant, 'first', async ({ slug }) => slug === 'one' ? { _id: '1234567890abcdef12345678', name: 'One', slug, status: 'active' } : slug === 'paused' ? { status: 'suspended' } : null);
  const server = createApp({ middleware: [auth.tenantMiddleware] }).routes(auth.tenancyRoutes).listen(0);
  await once(server, 'listening'); t.after(() => new Promise(resolve => server.close(resolve)));
  const port = server.address().port;
  const get = host => hostFetch(`http://127.0.0.1:${port}/api/auth/workspace`, { headers: { Host: host + ':' + port } });
  for (const host of ['localhost', '127.0.0.1', 'one.localhost']) assert.equal((await get(host)).status, 200);
  for (const host of ['unknown.localhost', 'one.bad.localhost', 'one.evil.com', 'admin.localhost']) assert.equal((await get(host)).status, 404);
  assert.equal((await get('paused.localhost')).status, 403);
  assert.equal((await get('one.localhost@localhost')).status, 400);
});

test('tenant suspension, soft deletion and restore preserve data and require platform Super Admin', async t => {
  const config = resolveConfig({ accessTokenSecret: randomBytes(32).toString('hex'), refreshTokenSecret: randomBytes(32).toString('hex'), tenancy: { baseDomain: 'localhost' } });
  const auth = createAuth(config);
  const user = new User.raw({ _id: new mongoose.Types.ObjectId(), name: 'Platform', email: 'platform@example.test', roles: ['superadmin'], sessionVersion: 0 });
  const tenant = { _id: new mongoose.Types.ObjectId(), name: 'Sunrise', slug: 'sunrise', status: 'active', deletedAt: null };
  let membershipInvalidations = 0, revocations = 0;
  const audits = [];
  t.mock.method(User, 'find', async () => user);
  t.mock.method(Tenant, 'first', async filter => (filter.slug === tenant.slug || String(filter._id) === String(tenant._id)) ? tenant : null);
  t.mock.method(Tenant.raw, 'findOneAndUpdate', async (filter, update) => {
    assert.equal(String(filter._id), String(tenant._id));
    if (filter.deletedAt === null && tenant.deletedAt) return null;
    if (filter.deletedAt?.$ne === null && !tenant.deletedAt) return null;
    Object.assign(tenant, update.$set);
    return { ...tenant };
  });
  t.mock.method(Tenant, 'paginate', async (_page, options) => {
    const trash = options.filter.deletedAt?.$ne === null;
    const items = (!!tenant.deletedAt === trash) ? [{ ...tenant }] : [];
    return { items, pagination: { page: 1, total: items.length, lastPage: 1, hasPreviousPage: false, hasNextPage: false } };
  });
  t.mock.method(Membership.raw, 'updateMany', async (filter, update) => { assert.equal(String(filter.tenantId), String(tenant._id)); assert.equal(update.$inc.sessionVersion, 1); membershipInvalidations++; });
  t.mock.method(RefreshToken.raw, 'updateMany', async filter => { assert.equal(String(filter.tenantId), String(tenant._id)); revocations++; });
  t.mock.method(TenantAudit, 'create', async input => { audits.push(input.action); return input; });
  t.mock.method(Tenant.raw, 'deleteOne', async () => { throw new Error('Tenants must never be permanently deleted'); });
  const server = createApp({ middleware: [auth.tenantMiddleware] }).routes(auth.tenancyRoutes).listen(0);
  await once(server, 'listening'); t.after(() => new Promise(resolve => server.close(resolve)));
  const token = await createAccessToken(String(user._id), config);
  const request = (path, method = 'GET', body, host = 'localhost') => hostFetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers: { Host: host, Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const endpoint = '/api/platform/tenants/' + tenant._id;
  assert.equal((await request(endpoint, 'PUT', { name: tenant.name, status: 'suspended' })).status, 200);
  assert.equal((await request('/api/auth/workspace', 'GET', undefined, 'sunrise.localhost')).status, 403);
  assert.equal((await request(endpoint, 'PUT', { name: tenant.name, status: 'active' })).status, 200);
  assert.equal((await request(endpoint, 'DELETE')).status, 204);
  assert.ok(tenant.deletedAt);
  assert.equal(tenant.status, 'active');
  assert.equal((await request(endpoint, 'DELETE')).status, 404);
  assert.equal((await request(endpoint, 'PUT', { name: 'No edit in Trash', status: 'active' })).status, 404);
  assert.equal((await request('/api/auth/workspace', 'GET', undefined, 'sunrise.localhost')).status, 404);
  assert.equal((await (await request('/api/platform/tenants')).json()).data.items.length, 0);
  assert.equal((await (await request('/api/platform/tenants?deleted=trash')).json()).data.items[0].name, 'Sunrise');
  assert.equal((await request(endpoint + '/restore', 'POST')).status, 200);
  assert.equal(tenant.deletedAt, null);
  assert.equal((await request('/api/auth/workspace', 'GET', undefined, 'sunrise.localhost')).status, 200);
  assert.equal((await request(endpoint + '/restore', 'POST')).status, 404);
  assert.equal(membershipInvalidations, 2);
  assert.equal(revocations, 2);
  assert.deepEqual(audits, ['tenant.suspended', 'tenant.active', 'tenant.deleted', 'tenant.restored']);
  user.roles = [];
  assert.equal((await request(endpoint, 'DELETE')).status, 403);
  assert.equal((await request(endpoint + '/restore', 'POST')).status, 403);
});

test('tenant-owned models fail closed without a workspace and reject cross-tenant document writes', async () => {
  const model = mongoModel('TenantScopeValidationTest', new mongoose.Schema({ name: String, sku: { type: String, unique: true } }), { tenantScoped: true });
  const a = '1234567890abcdef12345678', b = '1234567890abcdef12345679';
  await assert.rejects(new model.raw({ name: 'No workspace' }).validate(), /tenant workspace/i);
  const doc = new model.raw({ name: 'Scoped' });
  await runInTenantScope({ enabled: true, tenantId: a }, () => doc.validate());
  assert.equal(String(doc.get('tenantId')), a);
  await assert.rejects(runInTenantScope({ enabled: true, tenantId: b }, () => doc.validate()), /Tenant mismatch/);
  assert.throws(() => mongoModel('TenantScopeValidationTest', new mongoose.Schema({ name: String })), /different tenant scope/);
  assert.ok(model.raw.schema.indexes().some(([keys, options]) => keys.tenantId && keys.sku && options.unique));
});

// Run against a fresh, uniquely named scratch database. Never uses application collections.
test('real MongoDB: host-bound sessions, membership roles and all model operations isolate tenants', { skip: !process.env.TENANCY_TEST_MONGODB_URI, timeout: 120000 }, async t => {
  const uri = new URL(process.env.TENANCY_TEST_MONGODB_URI);
  const database = 'tcy_tenant_test_' + randomUUID().replaceAll('-', '').slice(0, 16);
  uri.pathname = '/' + database;
  await connectMongo(uri.href, { serverSelectionTimeoutMS: 10000, autoIndex: false });
  t.after(async () => {
    assert.equal(mongoose.connection.name, database);
    assert.ok(database.startsWith('tcy_tenant_test_'));
    try { await mongoose.connection.dropDatabase(); } finally { await disconnectMongo(); }
  });
  const auth = createAuth({ accessTokenSecret: randomBytes(32).toString('hex'), refreshTokenSecret: randomBytes(32).toString('hex'), passwordRounds: 10, cookieSession: true, tenancy: { baseDomain: 'localhost' } });
  const password = 'integration-password'; const passwordHash = await hashPassword(password, 10);
  const owner = await User.create({ name: 'Owner', email: 'owner@example.test', passwordHash, roles: ['superadmin'] });
  const member = await User.create({ name: 'Member', email: 'member@example.test', passwordHash, roles: [] });
  const a = await Tenant.create({ name: 'One', slug: 'one', createdBy: owner._id });
  const b = await Tenant.create({ name: 'Two', slug: 'two', createdBy: owner._id });
  await Membership.create({ tenantId: a._id, userId: owner._id, roles: ['admin'] });
  await Membership.create({ tenantId: a._id, userId: member._id, roles: [] });
  await Membership.create({ tenantId: b._id, userId: member._id, roles: ['admin'] });
  const Record = mongoModel('TenancyIntegrationRecord', new mongoose.Schema({ name: String, sku: { type: String, unique: true } }), { tenantScoped: true });
  for (const model of [User, Tenant, Membership, AdminRole, RefreshToken, Record]) await model.raw.createIndexes();
  const app = createApp({ middleware: [auth.tenantMiddleware, auth.tenantAccessMiddleware] }).routes(auth.routes).routes(auth.adminRoutes).routes(auth.tenancyRoutes);
  app.route.get('/api/records', async ctx => ctx.response.success(await Record.all()));
  app.route.get('/api/records/:id', async ctx => ctx.response.success(await Record.findOrFail(ctx.params.id)));
  app.route.put('/api/records/:id', async ctx => { await Record.findOrFail(ctx.params.id); return ctx.response.success(await Record.update(ctx.params.id, { name: 'Edited' })); });
  app.route.delete('/api/records/:id', async ctx => { await Record.findOrFail(ctx.params.id); await Record.delete(ctx.params.id); return ctx.response.noContent(); });
  const server = app.listen(0); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const port = server.address().port;
  const request = async (host, path, { token, cookie, method = 'GET', body } = {}) => hostFetch(`http://127.0.0.1:${port}${path}`, { method, headers: { Host: host + ':' + port, Origin: `http://${host}:${port}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
  const login = async (host, email) => {
    const response = await request(host, '/api/auth/login', { method: 'POST', body: { email, password } });
    assert.equal(response.status, 200, await response.clone().text());
    return { cookie: response.headers.get('set-cookie').split(';')[0], ...(await response.json()).data };
  };
  const root = await login('localhost', owner.email), ownerA = await login('one.localhost', owner.email);
  const memberA = await login('one.localhost', member.email), memberB = await login('two.localhost', member.email);
  assert.deepEqual(root.user.adminTabs, ['tenants', 'users', 'catalog', 'inventory', 'categories', 'orders', 'trash']);
  assert.ok(ownerA.user.roles.includes('admin')); assert.deepEqual(memberA.user.adminTabs, []); assert.ok(memberB.user.roles.includes('admin'));
  assert.equal((await request('two.localhost', '/api/auth/login', { method: 'POST', body: { email: owner.email, password } })).status, 403);
  assert.equal((await request('two.localhost', '/api/auth/me', { token: memberA.tokens.accessToken })).status, 401);
  assert.equal((await request('two.localhost', '/api/auth/refresh', { cookie: memberA.cookie, method: 'POST', body: {} })).status, 401);
  assert.equal((await request('one.localhost', '/api/platform/tenants', { token: ownerA.tokens.accessToken })).status, 403);
  assert.equal((await request('localhost', '/api/platform/tenants', { token: root.tokens.accessToken })).status, 200);
  assert.equal((await request('localhost', '/api/records', { token: root.tokens.accessToken })).status, 403);
  assert.equal((await request('one.localhost', '/api/records')).status, 401);
  const created = await request('localhost', '/api/platform/tenants', { token: root.tokens.accessToken, method: 'POST', body: { name: 'Third workspace', slug: 'three', adminEmail: owner.email } });
  assert.equal(created.status, 201, await created.clone().text());
  const three = (await created.json()).data;
  assert.equal((await request('localhost', '/api/platform/tenants', { token: root.tokens.accessToken, method: 'POST', body: { name: 'Duplicate', slug: 'three', adminEmail: owner.email } })).status, 409);
  assert.equal((await request('localhost', `/api/platform/tenants/${three.id}/members`, { token: root.tokens.accessToken, method: 'POST', body: { email: member.email, role: 'member' } })).status, 200);
  assert.equal((await login('three.localhost', owner.email)).user.tenant.slug, 'three');
  const within = (tenant, action) => runInTenantScope({ enabled: true, tenantId: String(tenant._id) }, action);
  const ra = await within(a, () => Record.create({ name: 'One only', sku: 'SAME-SKU' }));
  const rb = await within(b, () => Record.create({ name: 'Two only', sku: 'SAME-SKU' }));
  assert.equal((await (await request('one.localhost', '/api/records', { token: ownerA.tokens.accessToken })).json()).data.length, 1);
  for (const method of ['GET', 'PUT', 'DELETE']) assert.equal((await request('one.localhost', '/api/records/' + rb._id, { token: ownerA.tokens.accessToken, method })).status, 404);
  assert.equal(await within(a, () => Record.count()), 1);
  assert.deepEqual(await within(a, () => Record.distinct('name')), ['One only']);
  assert.equal((await within(a, () => Record.aggregate([{ $count: 'total' }])))[0].total, 1);
  await assert.rejects(within(a, () => Record.aggregate([{ $lookup: { from: Record.raw.collection.name, localField: '_id', foreignField: '_id', as: 'all' } }])), /aggregate stage/);
  assert.equal(await within(a, () => Record.raw.findOneAndUpdate({ _id: rb._id }, { $set: { name: 'Leak' } })), null);
  await within(a, () => Record.createMany([{ name: 'Batch', sku: 'BATCH' }]));
  assert.equal(await within(a, () => Record.count()), 2); assert.equal(await within(b, () => Record.count()), 1);
  await assert.rejects(within(a, () => Record.raw.updateMany({}, { $set: { tenantId: b._id } })), /Cannot change tenant/);
  await AdminRole.create({ tenantId: a._id, key: 'editor', name: 'Editor one', tabs: ['users'] });
  await AdminRole.create({ tenantId: b._id, key: 'editor', name: 'Editor two', tabs: ['catalog'] });
  await Membership.raw.updateMany({ userId: member._id }, { $set: { roles: ['editor'] } });
  const meA = await (await request('one.localhost', '/api/auth/me', { token: memberA.tokens.accessToken })).json();
  const meB = await (await request('two.localhost', '/api/auth/me', { token: memberB.tokens.accessToken })).json();
  assert.deepEqual(meA.data.adminTabs, ['users']); assert.deepEqual(meB.data.adminTabs, ['catalog']);
  assert.equal((await request('one.localhost', '/api/admin/users?deleted=trash', { token: memberA.tokens.accessToken })).status, 403);
  assert.equal((await request('two.localhost', '/api/admin/users', { token: memberB.tokens.accessToken })).status, 403);
  await assert.rejects(within(a, () => Record.raw.bulkWrite([{ deleteMany: { filter: {} } }])), /scoped model writes/);
  const suspend = await request('one.localhost', `/api/admin/users/${member._id}/status`, { token: ownerA.tokens.accessToken, method: 'PUT', body: { suspended: true } });
  assert.equal(suspend.status, 200, await suspend.text());
  assert.equal((await request('one.localhost', '/api/auth/me', { token: memberA.tokens.accessToken })).status, 403);
  assert.equal((await request('two.localhost', '/api/auth/me', { token: memberB.tokens.accessToken })).status, 200);
  await request('one.localhost', `/api/admin/users/${member._id}/status`, { token: ownerA.tokens.accessToken, method: 'PUT', body: { suspended: false } });
  assert.equal((await request('one.localhost', '/api/auth/me', { token: memberA.tokens.accessToken })).status, 401);
  const updated = await request('localhost', `/api/platform/tenants/${a._id}`, { token: root.tokens.accessToken, method: 'PUT', body: { name: a.name, status: 'suspended' } });
  assert.equal(updated.status, 200);
  assert.equal((await request('one.localhost', '/api/auth/workspace')).status, 403);
  assert.equal((await request('two.localhost', '/api/auth/workspace')).status, 200);
  assert.equal(String((await within(b, () => Record.find(rb._id)))._id), String(rb._id));
  assert.notEqual(String(ra._id), String(rb._id));
});
