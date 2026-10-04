import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApiClient, createResourceClient, isTilcayoApiError } from '../dist/index.js';

test('CRUD maps to backend routes, preserves envelopes, forwards query/options', async () => {
  const calls = [];
  const payload = { success: true, message: 'Success', data: { id: '1', title: 'Test' } };
  const api = createApiClient({ baseUrl: '/api', fetch: async (url, init) => {
    calls.push({ url, ...init });
    return init.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json(payload);
  } });
  const resource = createResourceClient({ api, path: '/books/' });
  const signal = new AbortController().signal;
  const options = { signal, headers: { 'X-Test': 'forwarded' }, query: { page: 2 }, credentials: 'include' };
  assert.deepEqual(await resource.all(options), payload);
  assert.deepEqual(await resource.find('a/b ?', options), payload);
  assert.deepEqual(await resource.create({ title: 'Create' }, options), payload);
  assert.deepEqual(await resource.update(0, { title: 'Update' }, options), payload);
  assert.equal(await resource.delete(1, options), undefined);
  assert.deepEqual(calls.map(c => [c.method, c.url]), [
    ['GET', '/api/books?page=2'], ['GET', '/api/books/a%2Fb%20%3F?page=2'],
    ['POST', '/api/books?page=2'], ['PUT', '/api/books/0?page=2'], ['DELETE', '/api/books/1?page=2'],
  ]);
  for (const call of calls) {
    assert.equal(call.signal, signal); assert.equal(call.headers.get('x-test'), 'forwarded'); assert.equal(call.credentials, 'include');
  }
  assert.equal(calls[2].body, '{"title":"Create"}');
  assert.equal(calls[3].body, '{"title":"Update"}');
});

test('resource forwards FormData and HTTP errors unchanged', async () => {
  const form = new FormData(); form.append('title', 'Test');
  let calls = 0;
  const api = createApiClient({ fetch: async (_url, init) => {
    calls++;
    assert.equal(init.body, form); assert.equal(init.headers.has('content-type'), false);
    return Response.json({ success: false, statusCode: 422, error: { code: 'VALIDATION_ERROR', message: 'Invalid', details: { body: [] } } }, { status: 422 });
  } });
  const resource = createResourceClient({ api, path: '/books' });
  await assert.rejects(resource.create(form), isTilcayoApiError);
  await assert.rejects(resource.update('1', form), isTilcayoApiError);
  assert.equal(calls, 2);
});

test('resource rejects ambiguous paths and IDs; propagates original errors', async () => {
  const cause = new Error('original');
  const resource = createResourceClient({ api: { get: async () => { throw cause; } }, path: '/books' });
  await assert.rejects(resource.all(), error => error === cause);
  for (const id of ['', ' ', '.', '..', Infinity]) assert.throws(() => resource.find(id), TypeError);
  for (const path of ['', '/', '/books?q=1', '/books#x']) assert.throws(() => createResourceClient({ api: {}, path }), TypeError);
});
