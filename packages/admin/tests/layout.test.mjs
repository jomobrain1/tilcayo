import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router';
import { AdminLayout, AdminDashboard, AdminProfile } from '../dist/index.js';

test('admin shell renders nested routes, resource links, profile and accessible navigation', () => {
  const user = { name: 'Reader', email: 'reader@example.test' };
  const render = (page, pathname) => renderToStaticMarkup(h(MemoryRouter, { initialEntries: [pathname] }, h(Routes, null,
    h(Route, { path: '/admin', element: h(AdminLayout, { user, onLogout() {}, links: [{ label: 'Books', to: '/admin/books' }] }) },
      h(Route, { index: true, element: page }), h(Route, { path: 'profile', element: page })) )));
  const shell = render(h(AdminDashboard, { user }), '/admin');
  for (const value of ['Skip to content', 'aria-controls=', 'aria-expanded="false"', 'aria-label="Admin navigation"', 'href="/admin/books"', 'Welcome, Reader', 'Sign out', 'id="admin-main"']) assert.ok(shell.includes(value), value);
  const profile = render(h(AdminProfile, { user }), '/admin/profile');
  assert.match(profile, /reader@example.test/);
  assert.match(profile, /aria-current="page"[^>]*>Profile/);
});
