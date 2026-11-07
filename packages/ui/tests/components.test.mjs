import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, Input, FormField, Table, Modal, Pagination, Spinner, Alert, Select, Textarea, Badge, Card, IconButton, LoadingButton, PasswordInput, Checkbox, RadioGroup, Switch, EmptyState, StatCard, Divider, Tabs, Breadcrumbs, DropdownMenu, ConfirmDialog, ToastProvider, useToast, Skeleton, TableSkeleton, CardsSkeleton, ListSkeleton, FormSkeleton, PageSkeleton } from '../dist/index.js';

test('primitives preserve native props and accessible labels', () => {
  const field = renderToStaticMarkup(h(FormField, { id: 'title', label: 'Title', error: 'Required' }, props => h(Input, { ...props, name: 'title', required: true })));
  for (const text of ['for="title"', 'id="title"', 'aria-describedby="title-description"', 'aria-invalid="true"', 'role="alert"', 'name="title"']) assert.ok(field.includes(text), text);
  assert.match(renderToStaticMarkup(h(Button, { disabled: true }, 'Save')), /type="button".*class="tl-btn tl-btn-primary"/);
  assert.match(renderToStaticMarkup(h(Table, null, h('caption', null, 'Books'))), /<table.*<caption>Books<\/caption>/);
  assert.match(renderToStaticMarkup(h(Spinner)), /role="status"/);
  assert.match(renderToStaticMarkup(h(Alert, { variant: 'danger' }, 'Error')), /tl-alert-danger/);
  assert.match(renderToStaticMarkup(h(Select, { name: 'role' }, h('option', null, 'Member'))), /name="role"/);
  assert.match(renderToStaticMarkup(h(Textarea, { name: 'body' })), /tl-textarea/);
  assert.match(renderToStaticMarkup(h(Badge, { variant: 'success' }, 'Active')), /tl-badge-success/);
  assert.match(renderToStaticMarkup(h(Card, null, 'Profile')), /tl-card/);
  const modal = renderToStaticMarkup(h(Modal, { open: false, title: 'Confirm', onClose() {} }, 'Content'));
  assert.match(modal, /<dialog.*aria-labelledby=/);
  assert.ok(!modal.includes('open=""'));
});

test('pagination handles first, last and empty results', () => {
  const render = (page, totalPages) => renderToStaticMarkup(h(Pagination, { page, totalPages, onChange() {} }));
  assert.match(render(1, 3), /disabled=""[^>]*>Previous/);
  assert.match(render(3, 3), /disabled=""[^>]*>Next/);
  assert.equal((render(1, 0).match(/disabled=""/g) ?? []).length, 2);
  assert.throws(() => render(0, 3), /Invalid pagination/);
});


test('library components expose accessible native controls and complete composition APIs', () => {
  const render = (component, props, children) => renderToStaticMarkup(h(component, props, children));
  assert.match(render(IconButton, { label: 'Save bookmark' }, 'Icon'), /aria-label="Save bookmark"/);
  const loading = render(LoadingButton, { loading: true, loadingText: 'Saving' }, 'Save');
  assert.match(loading, /disabled=""/); assert.match(loading, /aria-busy="true"/); assert.match(loading, /Saving/);
  assert.match(render(PasswordInput, { id: 'secret', name: 'password' }), /type="password"/);
  assert.match(render(PasswordInput, { id: 'secret' }), /aria-controls="secret"/);
  assert.match(render(Checkbox, { label: 'Email updates', defaultChecked: true }), /type="checkbox".*checked=""/);
  assert.match(render(RadioGroup, { label: 'Billing', value: 'monthly', onChange() {}, options: [{ value: 'monthly', label: 'Monthly' }] }), /<legend>Billing<\/legend>/);
  assert.match(render(Switch, { label: 'Notifications', defaultChecked: true }), /role="switch".*aria-checked="true"/);
  assert.match(render(EmptyState, { title: 'No projects', description: 'Create one.', action: h(Button, null, 'Create') }), /No projects/);
  assert.match(render(StatCard, { label: 'Projects', value: 12, note: 'Example' }), /<strong>12<\/strong>/);
  assert.match(render(Divider), /<hr/);
  const tabs = render(Tabs, { label: 'Project details', tabs: [{ id: 'one', label: 'Overview', content: 'First panel' }, { id: 'two', label: 'Activity', content: 'Second panel' }] });
  assert.equal((tabs.match(/aria-selected="true"/g) ?? []).length, 1);
  assert.match(tabs, /role="tabpanel".*aria-labelledby=/);
  assert.match(render(Breadcrumbs, { items: [{ label: 'Home', href: '/' }, { label: 'Elements' }] }), /aria-current="page"/);
  assert.match(render(DropdownMenu, { label: 'Actions', items: [{ label: 'Rename', onSelect() {} }] }), /aria-haspopup="menu".*aria-expanded="false"/);
  assert.match(render(ConfirmDialog, { open: false, title: 'Delete?', message: 'Confirm deletion.', onConfirm() {}, onClose() {}, confirmText: 'Delete' }), /Delete/);
  function ToastConsumer() { const notify = useToast(); return h('span', null, typeof notify); }
  assert.match(render(ToastProvider, {}, h(ToastConsumer)), /function/);
  assert.throws(() => render(ToastConsumer), /ToastProvider/);
});


test('skeleton patterns announce loading once and keep placeholder content noninteractive', () => {
  for (const Component of [TableSkeleton, CardsSkeleton, ListSkeleton, FormSkeleton, PageSkeleton]) {
    const markup = renderToStaticMarkup(h(Component, { label: 'Loading account data' }));
    assert.equal((markup.match(/role="status"/g) ?? []).length, 1);
    assert.match(markup, /aria-busy="true"/);
    assert.match(markup, /aria-label="Loading account data"/);
    assert.match(markup, /class="tl-skeleton-visual" aria-hidden="true"/);
    assert.doesNotMatch(markup, /<(button|input|select|a)\b/);
  }
  assert.match(renderToStaticMarkup(h(Skeleton, { width: 80, height: 20 })), /aria-hidden="true"/);
});
