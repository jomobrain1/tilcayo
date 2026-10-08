import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, Input, FormField, Table, Modal, Pagination, Spinner, Alert, Select, Textarea, Badge, Card } from '../dist/index.js';

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
