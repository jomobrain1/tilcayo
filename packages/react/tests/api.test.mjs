import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApiClient, isTilcayoApiError, isTilcayoNetworkError } from '../dist/index.js';
import { createContext } from '../../core/dist/context/createContext.js';
import { handleError } from '../../core/dist/errors/errorHandler.js';
import { notFound, validationError } from '../../core/dist/errors/httpErrors.js';

function mock(config = {}, respond = () => Response.json({ ok: true })) {
  const calls = [];
  const api = createApiClient({ ...config, fetch: async (url, init) => {
    calls.push({ url, ...init });
    return respond();
  } });
  return { api, calls };
}

test('URL slash variants, relative paths, query arrays and existing search/fragment', async () => {
  for (const [baseUrl, path, expected] of [
    ['http://localhost:9149/api', '/books', 'http://localhost:9149/api/books'],
    ['https://example.test/api/', '/books', 'https://example.test/api/books'],
    ['/api', 'books', '/api/books'], ['/api/', 'books', '/api/books'],
    ['', '/books', '/books'], ['', 'books', 'books'], ['/', '/books', '/books'],
  ]) {
    const { api, calls } = mock({ baseUrl });
    await api.get(path);
    assert.equal(calls[0].url, expected);
  }
  const { api, calls } = mock({ baseUrl: '/api' });
  await api.get('/books?sort=title#list', { query: {
    page: 2, limit: 20, search: 'orwell & books', active: true,
    missing: undefined, empty: null, tag: ['one', null, 'two'], zero: 0, disabled: false,
  } });
  assert.equal(calls[0].url, '/api/books?sort=title&page=2&limit=20&search=orwell+%26+books&active=true&tag=one&tag=two&zero=0&disabled=false#list');
  await assert.rejects(api.get('https://other.test/books'), TypeError);
  await assert.rejects(api.get('//other.test/books'), TypeError);
  await assert.rejects(mock({ baseUrl: '/api?token=x' }).api.get('books'), TypeError);
});

test('GET uses injected fetch and preserves real core success envelopes', async () => {
  const ctx = createContext({}, {});
  const payload = ctx.response.success([{ title: '1984' }]);
  const { api, calls } = mock({}, () => Response.json(payload));
  assert.deepEqual(await api.get('/books'), payload);
  assert.equal(calls[0].method, 'GET');
  assert.equal(calls[0].body, undefined);
  assert.equal(calls[0].headers.get('accept'), 'application/json');
  assert.equal(calls[0].headers.has('content-type'), false);
  await assert.rejects(api.request('/books', { method: 'get', body: {} }), /cannot have a body/);
  await assert.rejects(api.request('/books', { method: 'HEAD', body: {} }), /cannot have a body/);
});

test('POST, PUT, PATCH share JSON serialization; generic request and DELETE support empty bodies', async () => {
  const { api, calls } = mock();
  for (const method of ['post', 'put', 'patch']) {
    await api[method]('/books', { title: '1984' });
    const call = calls.at(-1);
    assert.equal(call.method, method.toUpperCase());
    assert.equal(call.body, '{"title":"1984"}');
    assert.equal(call.headers.get('content-type'), 'application/json');
  }
  await api.request('/books', { method: 'delete', body: { id: 1 } });
  assert.equal(calls.at(-1).method, 'DELETE');
  const empty = mock({}, () => new Response(null, { status: 204 }));
  assert.equal(await empty.api.delete('/books/1'), undefined);
  assert.equal(empty.calls[0].method, 'DELETE');
});

test('native bodies are not serialized and FormData receives no forced content type', async () => {
  const form = new FormData(); form.append('name', 'Book');
  const { api, calls } = mock();
  for (const body of [form, new Blob(['hi']), new ArrayBuffer(4), new Uint8Array([1]), new URLSearchParams({ a: 'b' }), 'text', new ReadableStream()]) {
    await api.post('/upload', body);
    assert.equal(calls.at(-1).body, body);
    assert.equal(calls.at(-1).headers.has('content-type'), false);
  }
});

test('case-insensitive header priority, all HeadersInit formats and credentials', async () => {
  const { api, calls } = mock({ headers: new Headers({ 'X-App': 'Tilcayo', Accept: 'text/plain', 'Content-Type': 'client/json' }), credentials: 'include' });
  await api.post('/books', {}, { headers: [['x-request', 'books'], ['content-type', 'custom/json']], credentials: 'omit' });
  const call = calls[0];
  assert.equal(call.headers.get('x-app'), 'Tilcayo');
  assert.equal(call.headers.get('x-request'), 'books');
  assert.equal(call.headers.get('accept'), 'text/plain');
  assert.equal(call.headers.get('content-type'), 'custom/json');
  assert.equal([...call.headers.keys()].filter(k => k === 'content-type').length, 1);
  assert.equal(call.credentials, 'omit');
  await api.get('/books'); assert.equal(calls[1].credentials, 'include');
});

test('sync and async dynamic headers are evaluated for every request', async () => {
  for (const asyncHeaders of [false, true]) {
    let version = 0;
    const headers = () => ({ 'X-Version': String(++version) });
    const { api, calls } = mock({ headers: asyncHeaders ? async () => headers() : headers });
    await api.get('/'); await api.get('/');
    assert.deepEqual(calls.map(c => c.headers.get('x-version')), ['1', '2']);
  }
});

test('parses JSON media types, text, empty responses and malformed JSON predictably', async () => {
  for (const [body, contentType, expected] of [['{"a":1}', 'application/problem+json', { a: 1 }], ['hello', 'text/plain', 'hello'], ['', 'application/json', undefined]]) {
    assert.deepEqual(await mock({}, () => new Response(body, { headers: { 'Content-Type': contentType } })).api.get('/'), expected);
  }
  await assert.rejects(mock({}, () => new Response('{', { headers: { 'Content-Type': 'application/json' } })).api.get('/'), SyntaxError);
  assert.equal(await mock({}, () => new Response('ignored')).api.request('/', { method: 'HEAD' }), undefined);
});

function coreError(error) {
  let status;
  let payload;
  handleError(error, {}, { setHeader() {}, status(value) { status = value; return this; }, json(value) { payload = value; } }, () => {});
  return { status, payload };
}

test('actual core 404 and 422 errors retain status, code, full payload and validation details', async () => {
  const details = { body: [{ path: ['title'], message: 'Title is required', code: 'too_small' }] };
  for (const error of [notFound('Book not found'), validationError(details)]) {
    const { status, payload } = coreError(error);
    await assert.rejects(mock({}, () => Response.json(payload, { status })).api.get('/'), actual => {
      assert.ok(isTilcayoApiError(actual));
      assert.equal(actual.statusCode, status);
      assert.equal(actual.code, error.code);
      assert.equal(actual.message, error.message);
      assert.deepEqual(actual.details, error.details);
      assert.deepEqual(actual.response, payload);
      return true;
    });
  }
});

test('actual core unexpected 500 error is normalized', async (t) => {
  t.mock.method(console, 'error', () => {});
  const { status, payload } = coreError(new Error('private internals'));
  await assert.rejects(mock({}, () => Response.json(payload, { status })).api.get('/'), error => {
    assert.equal(error.statusCode, 500);
    assert.equal(error.code, 'INTERNAL_SERVER_ERROR');
    assert.equal(error.message, 'Internal server error');
    return true;
  });
});

test('ordinary HTTP failures, invalid error JSON and mismatched payload status', async () => {
  for (const response of [Response.json({ message: 'Oops', statusCode: 200 }, { status: 400 }), new Response('Oops', { status: 400 }), new Response('Oops', { status: 400, headers: { 'Content-Type': 'application/json' } })]) {
    await assert.rejects(mock({}, () => response).api.get('/'), error => {
      assert.ok(isTilcayoApiError(error)); assert.equal(error.statusCode, 400); assert.equal(error.message, 'Oops'); return true;
    });
  }
  await assert.rejects(mock({}, () => new Response(null, { status: 503 })).api.get('/'), /HTTP 503/);
});

test('network errors preserve causes and have no invented HTTP status', async () => {
  const cause = new TypeError('Failed to fetch');
  await assert.rejects(mock({}, () => { throw cause; }).api.get('/'), error => {
    assert.ok(isTilcayoNetworkError(error)); assert.ok(!isTilcayoApiError(error));
    assert.equal(error.cause, cause); assert.equal(error.statusCode, undefined); return true;
  });
});

test('abort signals are passed through and cancellation stays native', async () => {
  const controller = new AbortController();
  const { api, calls } = mock();
  await api.get('/', { signal: controller.signal });
  assert.equal(calls[0].signal, controller.signal);
  controller.abort();
  await assert.rejects(mock({}, () => { throw controller.signal.reason; }).api.get('/', { signal: controller.signal }), error => error === controller.signal.reason);
});

test('body read failures are transport errors and local serialization failures are not', async () => {
  const cause = new TypeError('Connection lost');
  const response = new Response(new ReadableStream({ start(controller) { controller.error(cause); } }));
  await assert.rejects(mock({}, () => response).api.get('/'), isTilcayoNetworkError);
  const circular = {}; circular.self = circular;
  const { api, calls } = mock();
  await assert.rejects(api.post('/', circular), error => error instanceof TypeError && !isTilcayoNetworkError(error));
  assert.equal(calls.length, 0);
});
