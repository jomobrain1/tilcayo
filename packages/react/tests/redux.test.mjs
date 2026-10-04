import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTilcayoApi, createTilcayoStore, createTilcayoBaseQuery } from '../dist/redux/index.js';

test('store registers API, custom reducer, query lifecycle, cache, mutation and invalidation', async () => {
  let release;
  let reads = 0;
  const api = createTilcayoApi({ baseUrl: '/v1', tagTypes: ['Book'], fetch: async (url, init) => {
    assert.equal(url, '/v1/books');
    assert.ok(init.signal instanceof AbortSignal);
    if (init.method === 'GET') {
      reads++;
      if (reads === 1) await new Promise(resolve => { release = resolve; });
      return Response.json({ success: true, message: 'Success', data: [{ title: 'Test' }] });
    }
    return Response.json({ success: true, message: 'Created', data: JSON.parse(init.body) });
  } });
  const endpoints = api.injectEndpoints({ endpoints: builder => ({
    books: builder.query({ query: () => '/books', providesTags: [{ type: 'Book', id: 'LIST' }] }),
    create: builder.mutation({ query: body => ({ url: '/books', method: 'POST', body }), invalidatesTags: [{ type: 'Book', id: 'LIST' }] }),
  }) });
  const store = createTilcayoStore({ api, reducers: { count: (state = 0, action) => action.type === 'increment' ? state + 1 : state } });
  try {
    store.dispatch({ type: 'increment' }); assert.equal(store.getState().count, 1);
    assert.ok(store.getState().tilcayoApi);
    const pending = store.dispatch(endpoints.endpoints.books.initiate());
    assert.equal(endpoints.endpoints.books.select()(store.getState()).isLoading, true);
    release(); await pending;
    assert.equal(endpoints.endpoints.books.select()(store.getState()).isSuccess, true);
    await store.dispatch(endpoints.endpoints.books.initiate()); assert.equal(reads, 1);
    const mutation = store.dispatch(endpoints.endpoints.create.initiate({ title: 'New' }));
    assert.equal(endpoints.endpoints.create.select(mutation.requestId)(store.getState()).isLoading, true);
    await mutation;
    assert.equal(endpoints.endpoints.create.select(mutation.requestId)(store.getState()).isSuccess, true);
    await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()));
    assert.equal(reads, 2);
    assert.equal(typeof endpoints.useBooksQuery, 'function');
    assert.equal(typeof endpoints.useCreateMutation, 'function');
  } finally { store.dispatch(api.util.resetApiState()); }
});

test('normalized serializable HTTP errors retain validation fields', async () => {
  const details = { body: [{ path: ['title'], message: 'Required' }] };
  const api = createTilcayoApi({ fetch: async () => Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid', details } }, { status: 422 }) });
  const injected = api.injectEndpoints({ endpoints: b => ({ fail: b.query({ query: () => '/fail' }) }) });
  const store = createTilcayoStore({ api });
  try {
    const result = await store.dispatch(injected.endpoints.fail.initiate());
    assert.equal(result.isError, true);
    assert.deepEqual(result.error, { kind: 'http', statusCode: 422, code: 'VALIDATION_ERROR', message: 'Invalid', details });
    assert.deepEqual(JSON.parse(JSON.stringify(result.error)), result.error);
  } finally { store.dispatch(api.util.resetApiState()); }
});

test('base query respects RTK signal, network errors and HTTP 204', async () => {
  const controller = new AbortController();
  const context = { signal: controller.signal };
  const base = createTilcayoBaseQuery({ fetch: async (_url, options) => {
    assert.equal(options.signal, controller.signal); return new Response(null, { status: 204 });
  } });
  assert.deepEqual(await base('/delete', context, {}), { data: null });
  const failed = createTilcayoBaseQuery({ fetch: async () => { throw new TypeError('offline'); } });
  assert.deepEqual(await failed('/', context, {}), { error: { kind: 'network', message: 'offline' } });
  const aborted = createTilcayoBaseQuery({ fetch: async () => { throw new DOMException('cancelled', 'AbortError'); } });
  assert.equal((await aborted('/', context, {})).error.kind, 'abort');
});

test('API configuration is isolated per app and reserved reducer collisions are rejected', async () => {
  const calls = [];
  for (const baseUrl of ['/one', '/two']) {
    const api = createTilcayoApi({ baseUrl, fetch: async url => { calls.push(url); return Response.json({}); } });
    const injected = api.injectEndpoints({ endpoints: b => ({ test: b.query({ query: () => '/item' }) }) });
    const store = createTilcayoStore({ api });
    await store.dispatch(injected.endpoints.test.initiate()); store.dispatch(api.util.resetApiState());
    assert.throws(() => createTilcayoStore({ api, reducers: { tilcayoApi: () => ({}) } }), /reserved/);
  }
  assert.deepEqual(calls, ['/one/item', '/two/item']);
});
