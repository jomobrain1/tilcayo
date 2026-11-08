import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { createApp } from '../packages/core/dist/index.js';
import { hashPassword } from '../packages/auth/dist/index.js';
import { User } from '../packages/auth/dist/models/User.js';
import { RefreshToken } from '../packages/auth/dist/models/RefreshToken.js';
import path from 'node:path';
import { generateApp } from '../packages/create-tilcayo-app/dist/index.js';
import { parseOptions } from '../packages/create-tilcayo-app/dist/options.js';
import { make } from '../packages/cli/dist/index.js';
import { installTenancy } from '../packages/create-tilcayo-app/dist/installTenancy.js';
const repo = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const compiler = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin/tsc');

test('starter aliases preserve API creation and reject conflicting presets', () => {
  assert.equal(parseOptions(['app', '--api']).options.type, 'api');
  assert.equal(parseOptions(['app', '--fullstack', '--auth', '--admin']).options.admin, true);
  assert.throws(() => parseOptions(['app', '--fullstack', '--admin']), /Admin requires/);
  assert.throws(() => parseOptions(['app', '--api', '--auth', '--admin']), /Admin requires/);
  assert.throws(() => parseOptions(['app', '--api', '--fullstack']), /conflicting/);
  assert.throws(() => parseOptions(['app', '--type', 'react', '--fullstack']), /conflicting/);
});

test('full-app enables the complete preset without yes and preserves installer choices', () => {
  const parsed = parseOptions(['app', '--full-app']);
  assert.deepEqual(parsed.options, { name: 'app', packageManager: 'npm', type: 'fullstack', auth: true, admin: true, tenancy: true, install: true });
  assert.equal(parsed.yes, true);
  assert.equal(parsed.missing.size, 0);
  for (const args of [
    ['app', '--full-app', '--no-install', '--package-manager', 'pnpm'],
    ['app', '--package-manager', 'pnpm', '--no-install', '--full-app'],
  ]) {
    const result = parseOptions(args);
    assert.equal(result.options.packageManager, 'pnpm');
    assert.equal(result.options.install, false);
  }
  for (const args of [
    ['app', '--full-app', '--no-auth'], ['app', '--no-auth', '--full-app'],
    ['app', '--full-app', '--api'], ['app', '--type', 'react', '--full-app'],
    ['app', '--full-app', '--full-app'],
  ]) assert.throws(() => parseOptions(args), /conflict/i);
  assert.equal(parseOptions(['app', '--full-app', '--fullstack', '--auth', '--admin', '--tenancy']).options.tenancy, true);
});

test('all full-stack presets compile and generate relationship CRUD', async t => {
  const parent = await mkdtemp(path.join(repo, '.starter-test-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  for (const [name, auth, admin] of [['public', false, false], ['auth', true, false], ['admin', true, true]]) {
    const root = await generateApp({ name, type: 'fullstack', auth, admin, packageManager: 'npm', install: false }, parent);
    const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
    assert.deepEqual(manifest.workspaces, ['api', 'client']);
    assert.equal(manifest.tilcayo.admin, admin);
    if (auth) {
      assert.match(await readFile(path.join(root, 'api/.env'), 'utf8'), /AUTH_COOKIE_SESSION=true/);
      assert.match(await readFile(path.join(root, 'api/src/auth.ts'), 'utf8'), /cookieSession: true/);
      assert.match(await readFile(path.join(root, 'client/src/app/auth.ts'), 'utf8'), /cookieSession: true/);
      assert.match(await readFile(path.join(root, 'client/vite.config.ts'), 'utf8'), /changeOrigin: false/);
    }
    assert.match(await readFile(path.join(root, 'client/vite.config.ts'), 'utf8'), /\/api/);
    assert.match(await readFile(path.join(root, 'api/src/routes/notes.routes.ts'), 'utf8'), /\/api\/notes/);
    const routes = await readFile(path.join(root, 'client/src/routes.tsx'), 'utf8');
    assert.match(routes, /\.\.\.notesRoutes/);
    assert.equal(routes.includes('...adminRoutes'), admin);
    await make(['make:resource', 'Author', 'name:string', '--fullstack'], root);
    await make(['make:resource', 'Book', 'title:string', 'author:ref:Author', 'year:number?', '--fullstack'], root);
    for (const filename of ['api/tsconfig.json', 'client/tsconfig.app.json']) {
      try { execFileSync(process.execPath, [compiler, '-p', path.join(root, filename)], { encoding: 'utf8' }); }
      catch (error) { throw new Error(error.stdout || error.message); }
    }
    await assert.rejects(generateApp({ name, type: 'fullstack', auth, admin, packageManager: 'npm', install: false }, parent), /already exists/);
  }
});


test('generated full-stack API restores a cookie-only session after reload and revokes it on logout', async t => {
  const parent = await mkdtemp(path.join(repo, '.starter-session-test-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const root = await generateApp({ name: 'session', type: 'fullstack', auth: true, packageManager: 'npm', install: false }, parent);
  execFileSync(process.execPath, [compiler, '-p', path.join(root, 'api/tsconfig.json')], { encoding: 'utf8' });
  for (const key of ['AUTH_ACCESS_SECRET', 'AUTH_REFRESH_SECRET', 'AUTH_COOKIE_SESSION']) {
    const previous = process.env[key];
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
    if (key === 'AUTH_COOKIE_SESSION') delete process.env[key];
    else process.env[key] = randomBytes(32).toString('hex');
  }
  const { default: routes } = await import(pathToFileURL(path.join(root, 'api/dist/routes/auth.routes.js')).href);
  const user = new User.raw({ _id: '1234567890abcdef12345678', name: 'Reload', email: 'reload@example.test', roles: [], passwordHash: await hashPassword('test-password', 10) });
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
  const server = createApp().routes(routes).listen(0);
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (action, body, cookie) => fetch(base + '/api/auth/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
  const login = await post('login', { email: user.email, password: 'test-password' });
  assert.equal(login.status, 200);
  let cookie = login.headers.get('set-cookie').split(';')[0];
  // A reload loses in-memory tokens. Only the HttpOnly cookie remains.
  for (let reload = 0; reload < 2; reload++) {
    const restored = await post('refresh', {}, cookie);
    assert.equal(restored.status, 200);
    cookie = restored.headers.get('set-cookie').split(';')[0];
    const { data: { tokens, user: restoredUser } } = await restored.json();
    assert.equal(restoredUser.email, user.email);
    assert.equal(restoredUser.passwordHash, undefined);
    const me = await fetch(base + '/api/auth/me', { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).data.email, user.email);
  }
  const logout = await post('logout', {}, cookie);
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await post('refresh', {}, cookie)).status, 401);
});


test('tenancy starter compiles and future resources stay tenant scoped', async t => {
  const parent = await mkdtemp(path.join(repo, '.tenancy-starter-test-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const root = await generateApp({ name: 'workspaces', type: 'fullstack', auth: true, admin: true, tenancy: true, packageManager: 'npm', install: false }, parent);
  assert.match(await readFile(path.join(root, 'api/src/auth.ts'), 'utf8'), /tenancy:.*baseDomain/);
  assert.match(await readFile(path.join(root, 'api/src/app.ts'), 'utf8'), /auth.tenantAccessMiddleware/);
  assert.match(await readFile(path.join(root, 'api/src/models/Product.ts'), 'utf8'), /tenantScoped: true/);
  assert.match(await readFile(path.join(root, 'client/src/components/navigation.tsx'), 'utf8'), /WorkspaceIdentity/);
  assert.match(await readFile(path.join(root, 'api/src/scripts/setup-tenancy.ts'), 'utf8'), /TENANCY_SUPERADMIN_PASSWORD/);
  assert.ok(!(await readFile(path.join(root, 'api/src/scripts/setup-tenancy.ts'), 'utf8')).includes('12345678'));
  const setup = await readFile(path.join(root, 'api/src/scripts/setup-tenancy.ts'), 'utf8');
  assert.match(setup, /bootstrapTenancy\(\{ email: credentials.data.email, password: credentials.data.password \}\)/);
  assert.doesNotMatch(setup, /myapp|TENANCY_DEFAULT|collection\.updateMany/);
  assert.match(await readFile(path.join(root, 'api/src/scripts/seed-admin-demo.ts'), 'utf8'), /Set TENANCY_SEED_SLUG/);
  const workspace = await readFile(path.join(root, 'client/src/features/tenancy/workspace-switcher.tsx'), 'utf8');
  assert.match(workspace, /aria-label="Current workspace"/);
  assert.doesNotMatch(workspace, /<details|workspace-identity-menu/);
  await make(['make:resource', 'WorkspaceItem', 'title:string', '--fullstack'], root);
  assert.match(await readFile(path.join(root, 'api/src/models/WorkspaceItem.ts'), 'utf8'), /tenantScoped: true/);
  for (const filename of ['api/tsconfig.json', 'client/tsconfig.app.json']) {
    try { execFileSync(process.execPath, [compiler, '-p', path.join(root, filename)], { encoding: 'utf8' }); }
    catch (error) { throw new Error(error.stdout || error.message); }
  }
  for (const filename of ['api/.env', 'api/.env.example']) {
    const values = parseEnv(await readFile(path.join(root, filename), 'utf8'));
    assert.equal(values.TENANCY_BASE_DOMAIN, 'localhost');
    assert.equal(values.TENANCY_SUPERADMIN_EMAIL, '');
    assert.equal(values.TENANCY_SUPERADMIN_PASSWORD, '');
  }
  const cleanEnv = { ...process.env };
  for (const key of ['MONGODB_URI', 'TENANCY_SUPERADMIN_EMAIL', 'TENANCY_SUPERADMIN_PASSWORD']) delete cleanEnv[key];
  const invokeSetup = values => spawnSync(process.execPath, ['dist/scripts/setup-tenancy.js'], { cwd: path.join(root, 'api'), env: { ...cleanEnv, ...values }, encoding: 'utf8', timeout: 15000, windowsHide: true });
  const missing = invokeSetup({});
  assert.equal(missing.status, 1, missing.stderr);
  assert.match(missing.stderr, /Missing settings in api\/.env: MONGODB_URI, TENANCY_SUPERADMIN_EMAIL, TENANCY_SUPERADMIN_PASSWORD/);
  const invalid = invokeSetup({ MONGODB_URI: 'invalid://private-connection-marker', TENANCY_SUPERADMIN_EMAIL: 'not-an-email', TENANCY_SUPERADMIN_PASSWORD: 'short' });
  assert.equal(invalid.status, 1, invalid.stderr);
  assert.match(invalid.stderr, /Invalid settings in api\/.env: TENANCY_SUPERADMIN_EMAIL, TENANCY_SUPERADMIN_PASSWORD/);
  assert.doesNotMatch(invalid.stderr, /not-an-email|private-connection-marker/);
  const connection = invokeSetup({ MONGODB_URI: 'invalid://private-connection-marker', TENANCY_SUPERADMIN_EMAIL: 'setup@example.test', TENANCY_SUPERADMIN_PASSWORD: 'test-only-password' });
  assert.equal(connection.status, 1, connection.stderr);
  assert.match(connection.stderr, /Could not connect to MongoDB/);
  assert.doesNotMatch(connection.stderr, /private-connection-marker|test-only-password/);
  // Explicit upgrade runs preserve configured values and do not duplicate placeholders.
  const envPath = path.join(root, 'api/.env');
  const configured = (await readFile(envPath, 'utf8')).replace('TENANCY_BASE_DOMAIN=localhost', 'TENANCY_BASE_DOMAIN=example.test').replace('TENANCY_SUPERADMIN_EMAIL=\n', 'TENANCY_SUPERADMIN_EMAIL=setup@example.test\n').replace('TENANCY_SUPERADMIN_PASSWORD=\n', 'TENANCY_SUPERADMIN_PASSWORD=test-only-password\n');
  await writeFile(envPath, configured);
  await installTenancy(root);
  assert.equal(await readFile(envPath, 'utf8'), configured);
});
