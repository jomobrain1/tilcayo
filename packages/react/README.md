# @tilcayo/react

Tilcayo's small native-fetch API client. F2/F3 provide networking and REST resources: no Redux,
RTK Query, authentication flow, CRUD generators, UI, or admin
dashboard. The package is local/unpublished. No runtime or peer dependencies are
required; React peers will be added when React-specific APIs exist. TypeScript is
provided by the repository root for development.

## Installation

Build the checkout with `npm run build`. Local React generation automatically
links this package and `@tilcayo/styles`. To install a local package in another
project, build it, run `npm pack` in `packages/react`, then install the resulting
tarball with `npm install /path/to/tilcayo-react-0.0.2.tgz`.
After publication, the command will be `npm install @tilcayo/react`.

## Requests

```ts
import { createApiClient, type TilcayoResponse } from '@tilcayo/react';

interface Book { title: string }
const api = createApiClient({ baseUrl: 'http://localhost:9149/api' });
const response = await api.get<TilcayoResponse<Book[]>>('/books');
console.log(response.data, response.message);
await api.post('/books', { title: '1984' });
await api.put('/books/123', { title: 'Animal Farm' });
await api.patch('/books/123', { title: '1984' });
await api.delete<void>('/books/123');
await api.request('/books', { method: 'GET' });
```

All methods share one engine. Responses are never unwrapped. For an API returning
a bare array, use `api.get<Book[]>('/books')`. Generic types describe expected
data; they do not validate it at runtime. Use `void` for an expected empty response.
`delete(path, options)` has no body parameter; use `request` for DELETE bodies.
GET and HEAD bodies are rejected before fetch.

`baseUrl` is optional and can be absolute or relative (`/api`). Boundary slashes
are normalized, so `/api/` plus `/books` becomes `/api/books`. Request paths must
be relative to the configured base; absolute and protocol-relative paths are
rejected. Configure the origin in `baseUrl`. Base URLs cannot contain queries or
fragments. Existing path queries and fragments are preserved; new query values
are appended. Server-side fetch generally requires an absolute base URL.

```ts
await api.get('/books', {
  query: { page: 2, limit: 20, active: true, tag: ['fiction', 'classic'] },
});
```

Queries use URLSearchParams encoding. Strings, numbers and booleans are supported;
null and undefined are omitted. Arrays use repeated keys and omit null/undefined
members. Existing keys are appended to, not replaced.

## Headers and request bodies

```ts
const api = createApiClient({
  baseUrl: '/api',
  headers: async () => ({ 'X-App': 'Tilcayo' }),
  credentials: 'include',
});
await api.post('/books', { title: '1984' }, {
  headers: { 'X-Request': 'books' },
  credentials: 'omit',
});
```

Headers may be static or produced synchronously/asynchronously on each request.
All HeadersInit formats work. Case-insensitive priority is defaults, client
headers, then request headers. Accept defaults to application/json. JSON data is
serialized and gets Content-Type application/json unless overridden. Native
strings, FormData, Blob, ArrayBuffer, typed-array views, URLSearchParams and
ReadableStream bodies pass through. Stream support depends on the fetch runtime
(some runtimes need extra options supplied by a custom fetch).

```ts
const form = new FormData();
form.append('name', 'Book');
form.append('image', file);
await api.post('/products', form);
```

No Content-Type is automatically set for native bodies. Do not configure a
Content-Type header yourself for FormData: fetch must supply its multipart
boundary. Explicit client/request headers are still honored.

## Responses and errors

JSON and `+json` content types are parsed. Other content types return text.
204, 205, HEAD and empty bodies return undefined. Malformed successful JSON
throws SyntaxError; malformed error JSON is retained as text in an HTTP error.

```ts
import { isTilcayoApiError, isTilcayoNetworkError } from '@tilcayo/react';
try {
  await api.get('/books');
} catch (error) {
  if (isTilcayoApiError(error)) {
    console.log(error.statusCode, error.code, error.message, error.details);
  } else if (isTilcayoNetworkError(error)) {
    console.log(error.message, error.cause);
  } else {
    throw error;
  }
}
```

Non-2xx responses throw TilcayoApiError using the actual HTTP status. Core/auth
`{ success: false, statusCode, error: { code, message, details } }` responses
preserve validation details unchanged. The full parsed body is available as
`response`. Ordinary `{ message }` and text errors work too; empty errors fall
back to statusText or `HTTP <status>`.

Fetch/body-read failures throw TilcayoNetworkError with a cause and no invented
HTTP status. Native cancellation passes through unchanged. Local header and
serialization errors are not mislabeled as network errors.

```ts
const controller = new AbortController();
const pending = api.get('/books', { signal: controller.signal });
controller.abort();
// Handle the native cancellation rejection from pending.
await pending;
```

Inject a fetch implementation for tests or another environment:

```ts
const api = createApiClient({ fetch: customFetch, baseUrl: '/api' });
```

The default is globalThis.fetch; window is never accessed. Dynamic headers can
later supply Authorization. Token storage, refresh, retries and auth hooks are
deliberately deferred.

## Starter configuration

`src/lib/api.ts` exports a configured client using `VITE_API_URL ?? '/api'`.
No request runs on startup, so the starter needs no backend. Set a public URL,
for example `VITE_API_URL=http://localhost:9149/api`, when connecting an API.
Cross-origin APIs must allow the frontend origin via CORS. Only public values
belong in VITE_* variables; never use JWT secrets or database credentials.

Public exports are createApiClient, TilcayoApiError, TilcayoNetworkError,
isTilcayoApiError, isTilcayoNetworkError and the ApiClient, ApiClientConfig,
ApiRequest, ApiRequestOptions, ApiQuery, ApiQueryValue and TilcayoResponse types.
Import everything from `@tilcayo/react`; internal helpers are not package exports.

## Resource client (F3)

```ts
import { createResourceClient } from "@tilcayo/react";
interface Book { id: string; title: string }
interface CreateBookInput { title: string }
type UpdateBookInput = Partial<CreateBookInput>;
const books = createResourceClient<Book, CreateBookInput, UpdateBookInput>({ api, path: "/books" });
const response = await books.all({ query: { page: 2 } });
await books.find("123");
await books.create({ title: "1984" });
await books.update("123", { title: "Animal Farm" });
await books.delete("123");
```

Methods map to GET collection, GET item, POST collection, PUT item, and DELETE
item. PUT matches the backend resource router. All methods accept ApiRequestOptions
(headers, query, signal, credentials). IDs are encoded as a single path segment.
Trailing collection slashes are trimmed; queries belong in options.
The entity generic describes data: all returns TilcayoResponse<Book[]> and
find/create/update return TilcayoResponse<Book>. Nothing is unwrapped at runtime.
Delete expects the backend 204 response. This client targets standard Tilcayo CRUD;
use the transport directly for other response contracts or pagination envelopes.
Create/update input generics may be FormData. There is no React state, loading
state, or Redux dependency in this layer.
