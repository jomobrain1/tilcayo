import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTilcayoAuth } from '../dist/auth/index.js';
import { createTilcayoStore } from '../dist/redux/index.js';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { Provider } from 'react-redux';
import { createAuthRoutes } from '../../auth/dist/routes/auth.routes.js';
import { createRouter } from '../../core/dist/routing/createRouter.js';

const user = { id: 'user-1', name: 'Reader', email: 'reader@example.test', createdAt: '2026-01-01T00:00:00.000Z' };
const tokens = { tokenType: 'Bearer', accessToken: 'access-old', refreshToken: 'refresh-old' };
const rotated = { tokenType: 'Bearer', accessToken: 'access-new', refreshToken: 'refresh-new' };
const success = (data, message = 'Success', status = 200) => Response.json({ success: true, message, data }, { status });
const failure = (status = 401, code = 'UNAUTHORIZED') => Response.json({ success: false, statusCode: status, error: { code, message: 'Invalid credentials', details: { body: [] } } }, { status });
function setup(t, fetch, options = {}) {
  const auth = createTilcayoAuth({ fetch, ...options });
  const store = createTilcayoStore({ api: auth.api, reducers: { auth: auth.authReducer } });
  t.after(() => store.dispatch(auth.api.util.resetApiState()));
  return { ...auth, store, run: (name, arg) => store.dispatch(auth.api.endpoints[name].initiate(arg)) };
}

test('login pending/success updates Redux and me cache without exposing tokens', async t => {
  let release;
  const app = setup(t, async (url, init) => {
    assert.equal(url, '/api/auth/login'); assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(init.body), { email: user.email, password: 'test-password' });
    assert.equal(init.credentials, undefined);
    await new Promise(resolve => { release = resolve; });
    return success({ user: { ...user, passwordHash: 'must-not-leak' }, tokens }, 'Logged in');
  });
  assert.equal(app.store.getState().auth.initialized, false);
  const pending = app.run('login', { email: user.email, password: 'test-password' });
  assert.equal(app.api.endpoints.login.select(pending.requestId)(app.store.getState()).isLoading, true);
  while (!release) await new Promise(resolve => setImmediate(resolve));
  release(); const result = await pending;
  assert.equal(app.api.endpoints.login.select(pending.requestId)(app.store.getState()).isSuccess, true);
  assert.deepEqual(result.data.data, user);
  assert.deepEqual(app.store.getState().auth, { user, isAuthenticated: true, initialized: true });
  assert.deepEqual(app.api.endpoints.me.select()(app.store.getState()).data.data, user);
  const serialized = JSON.stringify(app.store.getState());
  assert.ok(!serialized.includes('access-old')); assert.ok(!serialized.includes('refresh-old')); assert.ok(!serialized.includes('passwordHash'));
});

test('failed login preserves normalized error, initializes anonymous state, never refreshes', async t => {
  const calls = [];
  const app = setup(t, async url => { calls.push(url); return failure(401, 'INVALID_CREDENTIALS'); });
  const pending = app.run('login', { email: user.email, password: 'wrong' });
  const result = await pending;
  assert.equal(result.error.statusCode, 401); assert.equal(result.error.code, 'INVALID_CREDENTIALS');
  assert.deepEqual(result.error.details, { body: [] });
  assert.equal(app.api.endpoints.login.select(pending.requestId)(app.store.getState()).isError, true);
  assert.deepEqual(app.store.getState().auth, { user: null, isAuthenticated: false, initialized: true });
  assert.deepEqual(calls, ['/api/auth/login']);
});

test('register reflects backend auto-login and safe user shape', async t => {
  const app = setup(t, async (url, init) => {
    assert.equal(url, '/api/auth/register'); assert.equal(JSON.parse(init.body).name, user.name);
    return success({ user, tokens }, 'Account created', 201);
  });
  await app.run('register', { name: user.name, email: user.email, password: 'test-password' });
  assert.equal(app.store.getState().auth.isAuthenticated, true);
});

test('anonymous bootstrap requires no server; initial tokens restore through actual me contract', async t => {
  const anonymous = setup(t, async () => { throw Error('Unexpected request'); });
  assert.equal((await anonymous.run('me')).data.data, null);
  assert.equal(anonymous.store.getState().auth.initialized, true);
  const app = setup(t, async (url, init) => {
    assert.equal(url, '/api/auth/me'); assert.equal(init.headers.get('authorization'), 'Bearer access-old');
    return success(user, 'Authenticated user retrieved');
  }, { initialTokens: tokens });
  await app.run('me'); assert.deepEqual(app.store.getState().auth.user, user);
});

test('concurrent 401s share one rotating refresh then retry with the new access token', async t => {
  let refreshes = 0; let release; let oldRequests = 0; let retries = 0;
  const app = setup(t, async (url, init) => {
    if (url === '/api/auth/refresh') {
      refreshes++;
      assert.deepEqual(JSON.parse(init.body), { refreshToken: 'refresh-old' });
      await new Promise(resolve => { release = resolve; });
      return success({ tokens: rotated }, 'Tokens refreshed');
    }
    if (init.headers.get('authorization') === 'Bearer access-old') { oldRequests++; return failure(); }
    assert.equal(init.headers.get('authorization'), 'Bearer access-new'); retries++;
    return success({ id: url });
  }, { initialTokens: tokens });
  const api = app.api.injectEndpoints({ endpoints: b => ({ resource: b.query({ query: id => `/books/${id}` }) }) });
  const pending = [1, 2, 3].map(id => app.store.dispatch(api.endpoints.resource.initiate(id)));
  while (oldRequests < 3 || !release) await new Promise(resolve => setImmediate(resolve));
  release(); const results = await Promise.all(pending);
  assert.equal(refreshes, 1); assert.equal(retries, 3); assert.ok(results.every(result => result.isSuccess));
});

test('expired me restores via refresh and failed refresh clears session/cache', async t => {
  const app = setup(t, async (url, init) => {
    if (url.endsWith('/refresh')) return success({ tokens: rotated });
    return init.headers.get('authorization') === 'Bearer access-new' ? success(user) : failure();
  }, { initialTokens: tokens });
  await app.run('me'); assert.equal(app.store.getState().auth.isAuthenticated, true);
  let requests = 0;
  const denied = setup(t, async () => { requests++; return failure(); }, { initialTokens: tokens });
  await denied.run('me');
  assert.equal(requests, 2);
  assert.deepEqual(denied.store.getState().auth, { user: null, isAuthenticated: false, initialized: true });
  assert.ok(!JSON.stringify(denied.store.getState()).includes('user-1'));
});

test('logout sends rotated refresh credential and clears all cached private data', async t => {
  const app = setup(t, async (url, init) => {
    if (url.endsWith('/refresh')) return success({ tokens: rotated });
    if (url.endsWith('/logout')) {
      assert.deepEqual(JSON.parse(init.body), { refreshToken: 'refresh-new' });
      return new Response(null, { status: 204 });
    }
    return success(user);
  }, { initialTokens: tokens });
  await app.run('me'); await app.run('refresh'); await app.run('logout');
  assert.equal(app.store.getState().auth.user, null);
  assert.deepEqual(app.store.getState().tilcayoApi.queries, {});
  assert.equal(app.store.getState().auth.initialized, true);
});

test('logout clears local session even when backend is unreachable', async t => {
  const app = setup(t, async () => { throw new TypeError('offline'); }, { initialTokens: tokens });
  const result = await app.run('logout'); assert.equal(result.error.kind, 'network');
  assert.equal(app.store.getState().auth.isAuthenticated, false);
  assert.deepEqual(app.store.getState().tilcayoApi.queries, {});
});

test('a late login cannot restore a session after logout', async t => {
  let release;
  const app = setup(t, async () => {
    await new Promise(resolve => { release = resolve; });
    return success({ user, tokens });
  });
  const pending = app.run('login', { email: user.email, password: 'test-password' });
  while (!release) await new Promise(resolve => setImmediate(resolve));
  await app.run('logout'); release(); await pending;
  assert.equal(app.store.getState().auth.isAuthenticated, false);
  assert.ok(!JSON.stringify(app.store.getState()).includes('user-1'));
});

test('401 after retry stops and clears authentication instead of looping', async t => {
  let refreshes = 0; let reads = 0;
  const app = setup(t, async url => {
    if (url.endsWith('/refresh')) { refreshes++; return success({ tokens: rotated }); }
    reads++; return failure();
  }, { initialTokens: tokens });
  await app.run('me'); assert.equal(refreshes, 1); assert.equal(reads, 2);
  assert.equal(app.store.getState().auth.isAuthenticated, false);
});

test('custom auth prefixes match backend configuration and app instances stay isolated', async t => {
  const app = setup(t, async url => { assert.equal(url, 'https://example.test/custom/login'); return success({ user, tokens }); }, { baseUrl: 'https://example.test', authPath: '/custom' });
  await app.run('login', { email: user.email, password: 'test-password' });
  const other = setup(t, async () => { throw Error('Unexpected request'); });
  await other.run('me'); assert.equal(other.store.getState().auth.user, null);
  assert.equal(app.store.getState().auth.user.id, user.id);
});

test('auth endpoints track actual backend route registration', () => {
  const router = createRouter();
  const handler = () => {};
  createAuthRoutes({ prefix: '/api/auth' }, { middleware: handler, user: () => user },
    { login: handler, register: handler, refresh: handler, logout: handler, forgotPassword: handler, verifyResetCode: handler, resetPassword: handler }, [])(router);
  assert.deepEqual(router.all().map(route => [route.method, route.path]), [
    ['POST', '/api/auth/register'], ['POST', '/api/auth/login'], ['POST', '/api/auth/refresh'],
    ['POST', '/api/auth/logout'], ['POST', '/api/auth/forgot-password'],
    ['POST', '/api/auth/verify-reset-code'], ['POST', '/api/auth/reset-password'], ['GET', '/api/auth/me'],
  ]);
});

test('useAuth reflects Redux across renders and exposes operations; bootstrap gates initialization', async t => {
  const app = setup(t, async () => success({ user, tokens }));
  let observed;
  function Probe() {
    observed = app.useAuth();
    return createElement('span', null, observed.user?.name ?? 'Anonymous');
  }
  const render = () => renderToString(createElement(Provider, { store: app.store }, createElement(Probe)));
  assert.match(render(), /Anonymous/);
  assert.equal(observed.initialized, false);
  for (const name of ['login', 'register', 'logout', 'restoreSession', 'forgotPassword', 'verifyResetCode', 'resetPassword']) assert.equal(typeof observed[name], 'function');
  const bootstrap = () => renderToString(createElement(Provider, { store: app.store },
    createElement(app.AuthBootstrap, { fallback: 'Checking' }, 'Ready')));
  assert.equal(bootstrap(), 'Checking');
  await app.run('login', { email: user.email, password: 'test-password' });
  assert.match(render(), /Reader/); assert.equal(observed.isAuthenticated, true); assert.equal(observed.initialized, true);
  assert.equal(bootstrap(), 'Ready');
});

test('logout waits for in-flight rotation and revokes the replacement token', async t => {
  let release; let revoked;
  const app = setup(t, async (url, init) => {
    if (url.endsWith('/refresh')) {
      await new Promise(resolve => { release = resolve; });
      return success({ tokens: rotated });
    }
    revoked = JSON.parse(init.body).refreshToken;
    return new Response(null, { status: 204 });
  }, { initialTokens: tokens });
  const rotation = app.run('refresh');
  while (!release) await new Promise(resolve => setImmediate(resolve));
  const logout = app.run('logout'); release();
  await Promise.all([rotation, logout]);
  assert.equal(revoked, 'refresh-new'); assert.equal(app.store.getState().auth.isAuthenticated, false);
});

test('temporary me failure preserves existing user/cache agreement and exposes error', async t => {
  let offline = false;
  const app = setup(t, async () => { if (offline) throw new TypeError('offline'); return success(user); }, { initialTokens: tokens });
  await app.run('me'); offline = true;
  const result = await app.store.dispatch(app.api.endpoints.me.initiate(undefined, { forceRefetch: true }));
  assert.equal(result.error.kind, 'network');
  assert.equal(app.store.getState().auth.user.id, user.id);
  assert.equal(app.api.endpoints.me.select()(app.store.getState()).data.data.id, user.id);
  assert.equal(app.store.getState().auth.initialized, true);
});

test('login after anonymous bootstrap keeps initialized true so the form stays mounted', async t => {
  let release;
  const app = setup(t, async () => {
    await new Promise(resolve => { release = resolve; });
    return success({ user, tokens });
  });
  await app.run('me');
  const pending = app.run('login', { email: user.email, password: 'test-password' });
  assert.equal(app.store.getState().auth.initialized, true);
  while (!release) await new Promise(resolve => setImmediate(resolve));
  release(); await pending;
  assert.equal(app.store.getState().auth.isAuthenticated, true);
});

test('aborting one protected query does not cancel shared rotation for another', async t => {
  let release; let refreshes = 0; let rejected = 0;
  const app = setup(t, async (url, init) => {
    if (url.endsWith('/refresh')) {
      refreshes++;
      await new Promise(resolve => { release = resolve; });
      return success({ tokens: rotated });
    }
    if (init.headers.get('authorization') === 'Bearer access-old') { rejected++; return failure(); }
    return success({ id: url });
  }, { initialTokens: tokens });
  const api = app.api.injectEndpoints({ endpoints: b => ({ book: b.query({ query: id => `/books/${id}` }) }) });
  const first = app.store.dispatch(api.endpoints.book.initiate('1'));
  const second = app.store.dispatch(api.endpoints.book.initiate('2'));
  while (rejected < 2 || !release) await new Promise(resolve => setImmediate(resolve));
  first.abort(); release();
  assert.ok((await first).isError); assert.ok((await second).isSuccess);
  assert.equal(refreshes, 1);
});


test('password recovery sends the expected inputs without starting a session or refreshing on failure', async t => {
  const calls = [];
  const app = setup(t, async (url, init) => {
    calls.push([url, JSON.parse(init.body)]);
    if (url.endsWith('/verify-reset-code')) return success({ resetToken: 'reset-only' });
    return success(null, 'Password recovery');
  });
  await app.run('forgotPassword', { email: user.email }).unwrap();
  const verified = await app.run('verifyResetCode', { email: user.email, code: '012345' }).unwrap();
  await app.run('resetPassword', { resetToken: verified.data.resetToken, password: 'new-password' }).unwrap();
  assert.deepEqual(calls, [
    ['/api/auth/forgot-password', { email: user.email }],
    ['/api/auth/verify-reset-code', { email: user.email, code: '012345' }],
    ['/api/auth/reset-password', { resetToken: 'reset-only', password: 'new-password' }],
  ]);
  assert.equal(app.store.getState().auth.isAuthenticated, false);
  const failedCalls = [];
  const failed = setup(t, async url => { failedCalls.push(url); return failure(); }, { initialTokens: tokens });
  const result = await failed.run('verifyResetCode', { email: user.email, code: '999999' });
  assert.equal(result.error.statusCode, 401);
  assert.deepEqual(failedCalls, ['/api/auth/verify-reset-code']);
});
