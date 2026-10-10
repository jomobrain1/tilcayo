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
  const files = templates({ name: 'auth-test', type: 'react', auth: true, admin: true, install: false, packageManager: 'npm' });
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
  assert.match(render(h(AppRoutes), guest, '/login'), /href="\/forgot-password"/);
  assert.match(render(h(AppRoutes), guest, '/forgot-password'), /Send reset code/);
  assert.ok(!render(h(AppRoutes), guest, '/dashboard').includes('Your account'));
  assert.match(render(h(AppRoutes), member, '/dashboard'), /Your account/);
  assert.match(render(h(AppRoutes), member, '/profile'), /Your account/);
  assert.ok(!render(h(AppRoutes), member, '/admin').includes('Manage your application resources'));
  const admin = { ...member, user: { ...member.user, roles: ['admin'] } };
  assert.ok(!render(h(AppRoutes), member, '/about').includes('href="/admin"'));
  assert.match(render(h(AppRoutes), admin, '/about'), /href="\/admin"/);
  assert.match(render(h(AppRoutes), admin, '/admin'), /Manage your application resources/);
  const overview = render(h(AppRoutes), admin, '/admin');
  for (const text of ['Total users', 'Administrators', 'New this week', 'Active products', 'Recent users', 'Recent activity', 'Loading recent activity']) assert.ok(overview.includes(text), text);
  assert.equal((overview.match(/class="[^"]*\btl-admin-metric\b[^"]*"/g) ?? []).length, 4);
  const { recentActivity, activityTime } = await load('features/admin/overview-activity.js');
  const activities = recentActivity(
    [{ id: '1', name: 'Reader', createdAt: '2026-10-10T10:00:00Z' }, { id: '2', name: 'Unknown date' }],
    [{ _id: '1', name: 'Watch', createdAt: '2026-10-10T11:00:00Z' }, { _id: '2', name: 'Old product', createdAt: '2026-01-01T00:00:00Z' }, { _id: '3', name: 'Invalid', createdAt: 'invalid' }],
    [{ _id: '1', productName: 'Watch', quantity: 2, createdAt: '2026-10-10T12:00:00Z' }, { _id: '2', productName: 'Headphones', quantity: 1, createdAt: '2026-10-10T09:00:00Z' }],
  );
  assert.deepEqual(activities.map(item => item.id), ['order-1', 'product-1', 'user-1', 'order-2']);
  assert.equal(activities[0].to, '/admin/products?section=orders');
  assert.match(activities[0].description, /2 units/);
  assert.equal(activityTime('2026-10-10T11:00:00Z', Date.parse('2026-10-10T12:00:00Z')), '1 hour ago');
  assert.equal(activityTime('2026-10-10T12:00:00Z', Date.parse('2026-10-10T12:00:30Z')), 'Just now');
  const directoryPage = render(h(AppRoutes), admin, '/admin/users');
  for (const text of ['User directory', 'Search users by name or email', 'Filter users by role', 'Loading users', 'Members', 'Featured profiles', 'Recent joins', 'Agnes Njeri', 'James Mwangi', 'Caroline Mesago', 'Joined 2 hours ago', 'View all']) assert.ok(directoryPage.includes(text), text);
  assert.equal((directoryPage.match(/class="[^"]*\btl-admin-metric\b[^"]*"/g) ?? []).length, 4);
  assert.ok(!render(h(AppRoutes), member, '/admin/users').includes('User directory'));
  const catalog = render(h(AppRoutes), admin, '/admin/products');
  for (const text of ['Product catalog', 'Total products', 'Active products', 'Low stock', 'Out of stock', 'All products', 'Add product', 'Loading products']) assert.ok(catalog.includes(text), text);
  assert.ok(!render(h(AppRoutes), member, '/admin/products').includes('Product catalog'));
  const { ProductGrid } = await load('features/admin/product-grid.js');
  const cards = render(h(ProductGrid, { products: [{ _id: 'demo', name: 'Demo Watch', sku: 'DEMO-001', category: 'Accessories', price: 6400, currency: 'KES', stock: 3, status: 'active', demoBatch: 'test', imageUrl: 'https://example.test/watch.jpg' }], onEdit() {} }), admin);
  for (const text of ['alt="Demo Watch"', 'referrerPolicy="no-referrer"', 'Demo Watch', 'Accessories', 'DEMO-001', 'Low stock', 'Edit Demo Watch']) assert.ok(cards.toLowerCase().includes(text.toLowerCase()), text);
  const overviewInventory = render(h(AppRoutes), admin, '/admin?section=inventory');
  assert.ok(overviewInventory.includes('Monitor active products'));
  assert.match(overviewInventory, /aria-pressed="true">Inventory/);
  assert.ok(!overviewInventory.includes('Recent users'));
  assert.ok(render(h(AppRoutes), admin, '/admin?section=users').includes('User directory'));
  const categories = render(h(AppRoutes), admin, '/admin/products?section=categories');
  assert.ok(categories.includes('Product categories'));
  assert.ok(categories.includes('Loading categories'));
  assert.match(categories, /aria-pressed="true">Categories/);
  assert.ok(!categories.includes('Product catalog"'));
  const orders = render(h(AppRoutes), admin, '/admin/products?section=orders');
  assert.ok(orders.includes('Product orders'));
  assert.ok(orders.includes('Add order'));
  assert.ok(orders.includes('Loading orders'));
  assert.match(orders, /aria-pressed="true">Orders/);
  assert.ok(!render(h(AppRoutes), member, '/admin/products?section=orders').includes('Product orders'));
  const { adminApi } = await load('features/admin/admin.api.js');
  let requested;
  t.mock.method(globalThis, 'fetch', async url => {
    requested = new URL(url, 'http://localhost');
    return Response.json({ success: true, message: 'Users', data: { items: [], stats: { totalUsers: 0, adminUsers: 0, recentUsers: 0 }, pagination: { page: 2, perPage: 10, total: 0, lastPage: 1, hasNextPage: false, hasPreviousPage: true } } });
  });
  const directoryStore = createTilcayoStore({ api: auth.api, reducers: { auth: () => admin } });
  try {
    const result = await directoryStore.dispatch(adminApi.endpoints.getAdminUsers.initiate({ page: 2, search: 'reader+name', role: 'admin' })).unwrap();
    assert.equal(requested.pathname, '/api/admin/users');
    assert.equal(requested.searchParams.get('page'), '2');
    assert.equal(requested.searchParams.get('perPage'), '10');
    assert.equal(requested.searchParams.get('search'), 'reader+name');
    assert.equal(requested.searchParams.get('role'), 'admin');
    assert.deepEqual(result.data.items, []);
  } finally { directoryStore.dispatch(auth.api.util.resetApiState()); }
  assert.match(render(h(AppRoutes), admin, '/admin/profile'), /Profile/);
  assert.match(render(h(AppRoutes), member, '/forbidden'), /Access denied/);
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
