import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router';
import { AdminLayout, AdminDashboard, AdminProfile, AdminUsersTable } from '../dist/index.js';

test('admin shell renders nested routes, resource links, profile and accessible navigation', () => {
  const user = { name: 'Reader', email: 'reader@example.test' };
  const render = (page, pathname) => renderToStaticMarkup(h(MemoryRouter, { initialEntries: [pathname] }, h(Routes, null,
    h(Route, { path: '/admin', element: h(AdminLayout, { user, onLogout() {}, links: [{ label: 'Books', to: '/admin/books' }] }) },
      h(Route, { index: true, element: page }), h(Route, { path: 'profile', element: page })) )));
  const shell = render(h(AdminDashboard, { user }), '/admin');
  for (const value of ['Skip to content', 'aria-controls=', 'aria-expanded="false"', 'aria-label="Admin navigation"', 'href="/admin/books"', 'Dashboard', 'Sign out', 'id="admin-main"']) assert.ok(shell.includes(value), value);
  const profile = render(h(AdminProfile, { user }), '/admin/profile');
  assert.match(profile, /reader@example.test/);
  assert.match(profile, /aria-current="page"[^>]*>.*?<span>Profile<\/span>/);
});

test('directory renders custom roles, member fallback, safe text and empty results', () => {
  const markup = renderToStaticMarkup(h(AdminUsersTable, { users: [
    { id: '1', name: '<script>unsafe</script>', email: 'reader@example.test', roles: ['admin', 'editor'], createdAt: '2026-10-08T10:00:00Z' },
    { id: '2', name: 'Member', email: 'member@example.test', roles: [] },
  ] }));
  for (const text of ['Registered users and their roles', 'reader@example.test', 'admin', 'editor', 'member', 'Oct 8, 2026']) assert.ok(markup.includes(text), text);
  assert.ok(!markup.includes('<script>'));
  assert.match(markup, /&lt;script&gt;/);
  assert.match(renderToStaticMarkup(h(AdminUsersTable, { users: [] })), /No users found/);
  const dashboard = renderToStaticMarkup(h(AdminDashboard, { stats: { totalUsers: 12, adminUsers: 2, recentUsers: 4 } }));
  for (const text of ['Total users', 'Administrators', 'New this week', '>12<', '>2<', '>4<']) assert.ok(dashboard.includes(text), text);
});


test('sidebar headings are opt-in and restricted links are absent while section tabs remain', () => {
  function render(props) { return renderToStaticMarkup(h(MemoryRouter, null, h(AdminLayout, props))); }
  const user = { name: 'Operator', email: 'operator@example.test', adminTabs: ['catalog', 'inventory'] };
  const props = { user, sections: [{ id: 'catalog', label: 'Catalog' }, { id: 'inventory', label: 'Inventory' }], links: [{ label: 'Roles & access', to: '/admin/access', tab: 'access' }] };
  const compact = render(props);
  assert.match(compact, /aria-label="Tilcayo home" href="\/"/);
  assert.ok(!compact.includes('tl-admin-nav-heading'));
  assert.ok(!compact.includes('href="/admin/users"'));
  assert.ok(!compact.includes('href="/admin/access"'));
  assert.ok(compact.includes('href="/admin/products"'));
  assert.ok(compact.includes('aria-label="Page sections"'));
  assert.match(render({ ...props, showGroupHeadings: true }), /tl-admin-nav-heading/);
});


test('pending shell keeps navigation while protected outlets stay unmounted', () => {
  function PrivatePage() { throw new Error('Protected content mounted during verification'); }
  const markup = renderToStaticMarkup(h(MemoryRouter, { initialEntries: ['/admin/products'] }, h(Routes, null,
    h(Route, { path: '/admin', element: h(AdminLayout, { pending: true }) }, h(Route, { path: 'products', element: h(PrivatePage) }))
  )));
  for (const text of ['Admin navigation', 'href="/admin/products"', 'Tilcayo home', 'Checking your session']) assert.ok(markup.includes(text), text);
  assert.ok(!markup.includes('Open account menu'));
});
