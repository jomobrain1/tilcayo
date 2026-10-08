# @tilcayo/react

Tilcayo's native-fetch API client. F2-F6 provide networking, REST resources, Redux, RTK Query and opt-in authentication.
CRUD generators live in `@tilcayo/cli`; React primitives and management layouts live
in `@tilcayo/ui` and `@tilcayo/admin`. These frontend packages are local/unpublished.
The root transport/resource entry has no runtime imports from React or Redux.
The optional `/redux` entry requires the React, React Redux and Redux Toolkit peers. TypeScript is
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
later supply Authorization. The optional auth integration below centralizes token handling and refresh;
the low-level client itself does not retry.

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

## Redux and RTK Query (F4-F5)

Install @reduxjs/toolkit, react-redux, and react alongside this package to use
@tilcayo/react/redux. React 18/19, React Redux 9.1+, and Toolkit 2.2+ are supported.
The starter installs these automatically. The root entry stays framework-independent.

```ts
import { createTilcayoApi, createTilcayoStore } from '@tilcayo/react/redux';
export const tilcayoApi = createTilcayoApi({ baseUrl: '/api', tagTypes: ['Book'] });
export const store = createTilcayoStore({ api: tilcayoApi });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

Create one API per application/store, then use its injectEndpoints method for
resource queries/mutations. There is no package-global mutable API configuration.
The store registers its reducer and middleware; pass additional client-state
reducers through reducers. Do not store server results in ordinary slices.
For advanced middleware, preloaded state or other options, use configureStore
directly with the API's reducer and middleware.

The base query delegates to createApiClient. Pass a preconfigured client through
createTilcayoBaseQuery({ client: api }) or configure baseUrl/headers/fetch directly.
Queries use { url, method, body, query, headers }; RTK Query owns the abort signal.
Responses preserve envelopes. HTTP 204 becomes null because RTK requires a
defined data value. Errors are serializable objects with kind, message, and
optional statusCode, code, details. Network errors have no fabricated HTTP status.

Injected endpoints expose standard generated hooks: query data/isLoading/isFetching/
isSuccess/isError/error, and mutation trigger plus status. The transport/resource
layers do not duplicate those flags.

Tag convention: Book/LIST for lists; Book/id for individual records. Creation
invalidates LIST; updates/deletes invalidate both id and LIST. Declare Book in
tagTypes (or enhanceEndpoints) and use providesTags/invalidatesTags normally.

The starter adds src/app/api.ts, store.ts, hooks.ts and a React Redux Provider.
Typed hooks use useDispatch.withTypes<AppDispatch>() and
useSelector.withTypes<RootState>(); these types belong to the app, not the library.
No endpoint is requested at startup.

Implementation follows the official [custom base query](https://redux.js.org/toolkit/rtk-query/usage/customizing-queries)
and [endpoint injection](https://redux.js.org/toolkit/rtk-query/usage/code-splitting) patterns.

## Frontend authentication (F6, opt-in)

The backend uses bearer tokens, not cookies. Default routes are POST
/api/auth/register, /login, /refresh, /logout and GET /api/auth/me. Login and
registration return { success, message, data: { user, tokens } }; registration
authenticates immediately. Refresh returns data.tokens and rotates the refresh
token. Logout accepts { refreshToken } and returns 204. Me returns data.user
fields directly (data is the user). The default frontend baseUrl is /api and
authPath is /auth; change both to match a custom backend prefix.

```ts
// src/app/auth.ts ? create once, not inside a component
import { createTilcayoAuth } from '@tilcayo/react/auth';
export const auth = createTilcayoAuth({ baseUrl: '/api' });
export const { useAuth, AuthBootstrap } = auth;
export const tilcayoApi = auth.api;

// src/app/store.ts
import { createTilcayoStore } from '@tilcayo/react/redux';
export const store = createTilcayoStore({
  api: auth.api,
  reducers: { auth: auth.authReducer },
  devTools: false,
});
```

Use this API **instead of** the plain starter API, and inject resource endpoints
into auth.api. Mount AuthBootstrap beneath the React Redux Provider and above
the app, optionally supplying a fallback. There is no additional context.
The auth reducer must be mounted at auth. Create a new auth instance/store for
each app or SSR request; never share sessions across users on the server.

```tsx
<Provider store={store}>
  <AuthBootstrap fallback={<p>Checking session?</p>}>
    <App />
  </AuthBootstrap>
</Provider>
```

```ts
const { user, isAuthenticated, initialized, loading, error,
  login, register, logout, restoreSession, loginStatus } = useAuth();
await login({ email, password });
await register({ name, email, password });
await logout();
await restoreSession();
// loginStatus.isLoading / isSuccess / isError / error are normal RTK values.
```

Operation promises reject on errors; catch them in event handlers. The hook also
exposes registerStatus, logoutStatus and restoreStatus. Loading is derived from
RTK Query, while the auth slice contains only user, isAuthenticated and initialized.
Normalized errors preserve kind, statusCode, code, message and validation details.
API cache reset on logout/session expiry also resets cached request statuses.

Tokens live only in the auth instance's memory, never Redux, RTK response caches,
localStorage or sessionStorage. Auth mutation results intentionally contain only
a safe user envelope; tokens are consumed centrally before caching. User fields
are id, name, email, optional ISO createdAt/updatedAt. No password hashes are exposed.
Login inputs still pass through normal RTK mutation actions, so avoid persisting
Redux actions or recording credentials with production DevTools/logging middleware.

A reload starts anonymous unless initialTokens is explicitly supplied by the
application. No durable session is promised: the current backend has no HttpOnly
refresh cookie. With credentials in memory, bootstrap requests /auth/me, refreshing
once if necessary; without credentials it initializes anonymously without a request.
A normal invalid session clears user/cache. A temporary /me network failure exposes
an error and preserves an already known user rather than contradicting cached data.
All VITE_* values must remain public configuration, never tokens or server secrets.

Authorization is injected centrally. Cookies/credentials: include are not enabled
by default; explicit transport credentials settings are honored. A protected 401
shares one refresh promise with concurrent requests and retries at most once.
Login/register/logout/refresh failures never recursively refresh. Refresh failure
or a second 401 clears the session and cache. Aborting one waiter does not cancel
a shared rotation needed by others. Logout waits for an active rotation, revokes
the replacement refresh token, clears local user/cache even on revocation failure,
and rejects that failure to the caller. Log out before starting another session.
Late responses cannot resurrect a logged-out user.

The React creator supports `--type react --auth` for login/register pages,
a protected dashboard, guest/auth route guards, session bootstrap and logout.
Without `--auth`, the starter remains standalone. Auth scaffolding connects to a
separate backend; its generated README explains setup and the in-memory session
limitation. Run node packages/react/tests/pack-consumer.mjs to verify a clean
React/TypeScript package consumer, and node tests/react-starter-consumer.mjs to
verify fresh generation, installation, build, lint and Vite startup.

### Email OTP password recovery

`useAuth()` exposes `forgotPassword({ email })`,
`verifyResetCode({ email, code })`, and `resetPassword({ resetToken, password })`,
plus each method's mutation status. Verification returns `data.resetToken`.
Keep this credential in component memory, then return to login after reset.
Recovery never logs the user in. Configure mail delivery in `@tilcayo/auth` on
the backend; the React auth starter includes a `/forgot-password` page.

### Protected routing (F7)

Auth starters group guest pages, authenticated `/dashboard` and `/profile`, and
optional role-protected `/admin` routes in separate nested modules.
`RequireAuth` (also exported as `ProtectedRoute` from the generated middleware)
waits for initialization and consumes `useAuth()`. Its optional `role` checks the
current user's `roles` array. A denied role navigates to `/forbidden`.
Backend guards enforce authorization with
`[auth.middleware, auth.requireRole('admin')]` using current database roles.
Assign roles through trusted server code; registration never grants them.
