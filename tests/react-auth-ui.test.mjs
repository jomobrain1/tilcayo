import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const ts = createRequire(new URL('../examples/react-starter/package.json', import.meta.url))('typescript');
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route, useRoutes } from 'react-router';
import { createTilcayoStore } from '../packages/react/dist/redux/index.js';
import { templates } from '../packages/create-tilcayo-app/dist/templates.js';

test('generated auth forms, guards and safe return paths render against the real auth store', async t => {
  const repo = fileURLToPath(new URL('../', import.meta.url));
  const root = await mkdtemp(path.join(repo, '.auth-ui-test-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(repo));
    assert.ok(path.basename(root).startsWith('.auth-ui-test-'));
    await rm(root, { recursive: true, force: true });
  });
  await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
  const files = templates({ name: 'auth-test', type: 'react', auth: true, install: false, packageManager: 'npm' });
  for (const [filename, source] of Object.entries(files)) {
    if (!filename.startsWith('src/') || !/\.tsx?$/.test(filename)) continue;
    const destination = path.join(root, filename.replace(/\.tsx?$/, '.js'));
    const prepared = source.replaceAll('import.meta.env.VITE_API_URL', 'undefined')
      .replace(/from (['"])(\.[^'"]+)\1/g, (_match, quote, specifier) => `from ${quote}${specifier.replace(/\.tsx?$/, '')}.js${quote}`)
      .replace(/^import ['"].*\.css['"]\s*;?$/gm, '');
    const output = ts.transpileModule(prepared, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    await mkdir(path.dirname(destination), { recursive: true }); await writeFile(destination, output);
  }
  const load = filename => import(pathToFileURL(path.join(root, 'src', filename)).href);
  const { auth } = await load('app/auth.js');
  const { RequireAuth, GuestOnly } = await load('middleware/auth.js');
  const { LoginPage } = await load('pages/login.page.js');
  const { RegisterPage } = await load('pages/register.page.js');
  const { returnPath, authErrorMessage } = await load('lib/auth-feedback.js');
  const { routes } = await load('routes.js');
  function AppRoutes() { return useRoutes(routes); }
  function render(component, state, pathname = '/') {
    const store = createTilcayoStore({ api: auth.api, reducers: { auth: () => state } });
    try { return renderToString(h(Provider, { store }, h(MemoryRouter, { initialEntries: [pathname] }, component))); }
    finally { store.dispatch(auth.api.util.resetApiState()); }
  }
  const guest = { user: null, isAuthenticated: false, initialized: true };
  const member = { user: { id: '1', name: 'Reader', email: 'reader@example.test' }, isAuthenticated: true, initialized: true };
  assert.match(render(h(AppRoutes), guest, '/login'), /Welcome back/);
  assert.match(render(h(AppRoutes), guest, '/register'), /Create your account/);
  assert.ok(!render(h(AppRoutes), guest, '/dashboard').includes('Your account'));
  assert.match(render(h(AppRoutes), member, '/dashboard'), /Your account/);
  assert.match(render(h(AppRoutes), guest, '/missing'), /404 - Page not found/);
  const protectedRoute = h(Routes, null, h(Route, { element: h(RequireAuth) }, h(Route, { path: '/', element: h('p', null, 'Private content') })));
  assert.ok(!render(protectedRoute, guest).includes('Private content'));
  assert.match(render(protectedRoute, member), /Private content/);
  assert.match(render(protectedRoute, { ...guest, initialized: false }), /Checking your session/);
  const guestRoute = h(Routes, null, h(Route, { element: h(GuestOnly) }, h(Route, { path: '/', element: h(LoginPage) })));
  assert.match(render(guestRoute, guest), /Welcome back/);
  assert.ok(!render(guestRoute, member).includes('Welcome back'));
  const registration = render(h(RegisterPage), guest);
  for (const text of ['Create your account', 'Confirm password', 'type="email"', 'autoComplete="new-password"']) assert.ok(registration.includes(text), text);
  assert.equal(returnPath({ from: '/dashboard?tab=profile#details' }), '/dashboard?tab=profile#details');
  for (const from of ['https://evil.test', '//evil.test', '/\\evil.test', '/login', '/register?next=x', null]) assert.equal(returnPath({ from }), '/dashboard');
  assert.match(authErrorMessage({ kind: 'network' }), /Unable to reach/);
  assert.equal(authErrorMessage({ message: 'Email already registered' }), 'Email already registered');
});
