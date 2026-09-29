# Tilcayo

An opinionated full-stack TypeScript framework for modern web applications with less repetitive setup and clearer conventions.

**KISS — keep it simple:** plain functions, readable controllers, reusable database methods, and short generator commands. Built on TypeScript, Node.js, Express, Mongoose, and Zod, with the underlying tools still accessible.

> **Current scope:** API routing, validation, MongoDB, error handling, and CLI generators. React integration, authentication, and MySQL are not implemented yet.

## Why the name?

Tilcayo takes its name from *Leopardus tilcayo*, a small wild cat from Bolivia’s Yungas cloud forest recognized as a distinct species in 2026 through genomic research. Its name comes from local communities. Small, focused, and distinct—the inspiration behind this framework. [Read the story at National Geographic](https://news.nationalgeographic.org/photos-new-wild-cat-species/).

## Quick start

Use Node.js 22.9+ and npm. From the repository root:

```sh
npm install
npm run build
```

Create a root `.env` beside `package.json`:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/tilcayo
```

Use a running local MongoDB instance or your Atlas connection string. `.env` is ignored by Git.

```sh
npm run dev
```

The example connects to MongoDB, then listens at **http://localhost:9149**. Source changes rebuild and restart it. `npm start` does the same thing.

## Generate a resource

Run generators **inside your application directory**:

```sh
cd examples/basic-api
npx tilcayo make:resource Notebook title:string price:number active:boolean
```

This creates working CRUD with matching model fields, controller body types, and validation:

```text
src/
├── models/Notebook.ts
├── controllers/notebooks.controller.ts
├── validators/notebooks.validator.ts
└── routes/notebooks.routes.ts
```

Add the printed registration to `src/index.ts`, after creating the app:

```typescript
import notebooksRoutes from "./routes/notebooks.routes.js";

app.routes(notebooksRoutes);
```

| Request | Action |
| --- | --- |
| `GET /notebooks` | List all |
| `POST /notebooks` | Create |
| `GET /notebooks/:id` | Fetch one |
| `PUT /notebooks/:id` | Update supplied fields |
| `DELETE /notebooks/:id` | Delete |

Existing files are never overwritten. A resource checks all four targets before writing. Choose a fresh name: the example already contains Book, Product, and Article files.

### Individual commands

```sh
npx tilcayo make:model Book
npx tilcayo make:controller books
npx tilcayo make:controller books --resource
npx tilcayo make:validator books
npx tilcayo make:route books
npx tilcayo make:service books
```

These are alternatives, not a sequence to run against existing files. A plain controller contains placeholders; `--resource` generates working CRUD and requires its model first. Routes detect the existing controller’s action names and attach available validators.

### Fields

Resource, model, controller, and validator commands accept fields:

```sh
npx tilcayo make:resource Event title:string "capacity?:number" startsAt:date
```

| Syntax | Meaning |
| --- | --- |
| `title:string` | Required, nonempty string |
| `price:number` | Required JSON number |
| `active:boolean` | Required JSON boolean |
| `startsAt:date` | ISO timestamp with timezone, parsed into a Date |
| `"year?:number"` | Optional number; quotes protect `?` from shell expansion |

Updates make all fields optional. Individual commands without fields leave a schema or body type to complete. Fill in an empty validator before using writes—it strips unspecified fields.

### Database default

The example configures Mongo once in its application `package.json`:

```json
{
  "tilcayo": {
    "database": "mongo"
  }
}
```

Mongo is also the default if omitted. Other adapters are not implemented. Older `--mongo`, `--crud`, and `--fields "title:string,year?:number"` options remain supported.

To select MongoDB explicitly (overriding the project default), use `--mongodb`:

```sh
npx tilcayo make:resource Notebook title:string price:number active:boolean --mongodb
```

`--mongodb` is an alias for `--mongo` and also works with model and controller commands.

### Command not found?

The CLI is installed locally in this workspace. Use **`npx tilcayo`**, rather than a bare `tilcayo` command.

```sh
# From the repository root
npm install
npm run build -w @tilcayo/cli
cd examples/basic-api
npx tilcayo --help
```

Direct alternative from the app directory:

```sh
node ../../packages/cli/dist/bin.js --help
```

If PowerShell blocks npm scripts, use `npm.cmd` and `npx.cmd` in that shell.

## Models and controllers

Define a schema and give it a name:

```typescript
import mongoose from "mongoose";
import { mongoModel } from "@tilcayo/core";

const notebookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  active: { type: Boolean, required: true },
}, { timestamps: true });

export const Notebook = mongoModel("Notebook", notebookSchema);
```

Keep plain body types beside the controller:

```typescript
import type { TilcayoContext } from "@tilcayo/core";
import { Notebook } from "../models/Notebook.js";

type CreateNotebookBody = {
  title: string;
  price: number;
  active: boolean;
};

type UpdateNotebookBody = Partial<CreateNotebookBody>;

export const index = async (ctx: TilcayoContext) => {
  const notebooks = await Notebook.all();
  return ctx.response.success(notebooks, "Notebooks retrieved");
};

export const store = async (ctx: TilcayoContext<CreateNotebookBody>) => {
  const notebook = await Notebook.create(ctx.body);
  return ctx.response.created(notebook, "Notebook created");
};
```

Controllers receive `params`, `query`, `body`, `headers`, `method`, `path`, `ip`, and response helpers through `ctx`. No Express request or response imports are needed.

## Routes and validation

Zod validates requests before the controller runs. TypeScript body types provide compile-time checks; keep them aligned with the validator.

```typescript
import { z } from "zod";

export const createNotebookSchema = z.object({
  title: z.string().min(1),
  price: z.number(),
  active: z.boolean(),
});

export const updateNotebookSchema = createNotebookSchema.partial();
```

Attach validation to individual routes:

```typescript
import { defineRoutes } from "@tilcayo/core";
import * as NotebookController from "../controllers/notebooks.controller.js";
import { createNotebookSchema } from "../validators/notebooks.validator.js";

export default defineRoutes((router) => {
  router.get("/notebooks", NotebookController.index);
  router.post("/notebooks", NotebookController.store, {
    validate: { body: createNotebookSchema },
  });
});
```

The router supports `get`, `post`, `put`, `patch`, `delete`, prefix groups, and `resource`. Generated resource routes attach body and Mongo ID validators to the appropriate actions. Validation can also target `query` and `params`.

## Middleware

Attach reusable functions to routes, groups, or resources:

```typescript
import { defineRoutes, rateLimit, bodyLimit } from "@tilcayo/core";

export default defineRoutes((router) => {
  router.group({
    prefix: "/api",
    middleware: [rateLimit({ windowMs: 60_000, max: 100 })],
  }, () => {
    router.resource("/notebooks", NotebookController, {
      store: {
        middleware: [rateLimit({ windowMs: 60_000, max: 20 }), bodyLimit(16 * 1024)],
        validate: { body: createNotebookSchema },
      },
    });
  });
});
```

Import your controller and validator as in the route examples above. Execution order:

```text
App middleware → Group → Resource → Route → JSON parsing → Validation → Controller
```

| Helper | Purpose |
| --- | --- |
| `rateLimit({ windowMs: 60_000, max: 100 })` | Requests per IP per time window; returns 429 and `Retry-After` |
| `cors({ origin: "http://localhost:5173" })` | Allowed browser origin and OPTIONS preflight handling |
| `requestId()` | Generates `ctx.requestId` and an `X-Request-Id` response header |
| `requestLogger()` | Logs ID, method, path, status, and duration; accepts a custom log callback |
| `securityHeaders()` | Sets nosniff, frame denial, and no-referrer headers |
| `bodyLimit(16 * 1024)` | Limits JSON bytes before parsing; returns 413 |
| `cache({ maxAge: 30 })` | Browser/proxy cache headers for explicitly public GET routes; seconds |

For all matched routes, use app-level middleware:

```typescript
const app = createApp({
  middleware: [requestId(), requestLogger(), securityHeaders()],
  bodyLimit: 102400,
});
```

Import these helpers from `@tilcayo/core`. The default JSON limit is 100 KB;
route and group limits can lower it. CORS belongs before rate limiting so
preflight requests do not consume the limit. Credentials require explicit origins.

Each limiter has its own counter. Reusing one shares the quota across routes;
group and route limits both apply. Counters are process-local, reset on restart,
and track at most 10,000 IPs by default (`maxKeys` is configurable). At capacity,
new IPs receive 429 until slots expire. Proxy forwarding headers are not trusted;
behind a proxy, requests currently share the proxy IP's quota.

Caching is opt-in for public data; it does not store responses on the server.
Authorization/cookie requests, responses setting cookies, and errors use `no-store`.
Use request logging for matched routes; unmatched 404s are handled separately.
Authentication and authorization will be added later.

Custom middleware stays a plain function:

```typescript
import type { Middleware } from "@tilcayo/core";

const addVersion: Middleware = async (ctx, next) => {
  ctx.header("X-API-Version", "1");
  return next();
};
```

Call and return `next()` once to continue, return a response to stop, or throw
a framework error. The middleware body is unparsed; access validated bodies in
controllers. See `examples/basic-api/src/routes/api.routes.ts` for working examples.

## Database methods


| Method | Returns |
| --- | --- |
| `all()` / `where(filter, options?)` | Records |
| `find(id)` / `first(filter?)` | One record or null |
| `findOrFail(id)` / `firstOrFail(filter?)` | One record or a 404 error |
| `create(data)` / `createMany(items)` | Created records |
| `update(id, data)` / `delete(id)` | Updated/deleted record or null |
| `count(filter?)` / `exists(filter)` | Number / boolean |
| `paginate(query?, options?)` | Items and page metadata |
| `cursorPaginate(options?)` | Items and next cursor |
| `updateMany(filter, data)` / `deleteMany(filter)` | Affected count |
| `upsert(filter, data)` | Updated or inserted record |
| `distinct(field, filter?)` / `aggregate(pipeline)` | Reporting results |

Filtering and sorting stay explicit:

```typescript
const notebooks = await Notebook.where(
  { active: true },
  { sort: { price: 1 }, select: ["title", "price"], limit: 10 },
);
```

Read options also support `populate` for schema references. Advanced Mongoose queries and transactions remain available through `Notebook.raw`.

Bulk update/delete and upsert require nonempty filters. Keep filters server-controlled. Updates run Mongoose validation; bulk creation is not transactional.

## Pagination

Index actions use `all()` by default. To paginate, replace that call:

```typescript
const notebooks = await Notebook.paginate(ctx.query);
return ctx.response.success(notebooks, "Notebooks retrieved");
```

Request:

```http
GET /notebooks?page=2&perPage=10
```

Result inside the response’s `data` field:

```json
{
  "items": [],
  "pagination": {
    "page": 2,
    "perPage": 10,
    "total": 0,
    "lastPage": 1,
    "hasNextPage": false,
    "hasPreviousPage": true
  }
}
```

- Defaults: page **1**, **20** records. Maximum page size: **100**.
- Invalid page values return **400**; pages beyond the end return an empty list.
- Only page parameters are read from the request; filters go in the second argument.

```typescript
await Notebook.paginate(ctx.query, {
  filter: { active: true },
  sort: { createdAt: -1 },
});
```

For forward cursor pagination:

```typescript
const first = await Notebook.cursorPaginate({ perPage: 20 });

if (first.pagination.nextCursor) {
  const next = await Notebook.cursorPaginate({
    after: first.pagination.nextCursor,
    perPage: 20,
  });
}
```

Cursors use ascending Mongo ObjectIds, with no total count or custom sort. Offset pagination adds `_id` as a sorting tie-breaker; counts and items can differ during concurrent writes.

## Responses and errors

| Helper | HTTP status |
| --- | --- |
| `ctx.response.success(data, message)` | 200 |
| `ctx.response.created(data, message)` | 201 |
| `ctx.response.noContent()` | 204 |
| `throw badRequest(message)` | 400 |
| `throw notFound(message)` | 404 |
| Route validation failure | 422 |

Import error helpers from `@tilcayo/core`. Unexpected errors return a sanitized 500 response.

## Mongo connection

```typescript
import { connectMongo, createApp } from "@tilcayo/core";

await connectMongo(process.env.MONGODB_URI ?? "");

const app = createApp();
// Register your routes here.
app.listen(9149);
```

The connection layer configures DNS (`8.8.8.8`, `1.1.1.1`) before connecting and logs success. Core also exports `disconnectMongo()` and typed `getMongoState()`.

## Project layout

```text
packages/core/       Routing, context, validation, errors, Mongo helpers
packages/cli/        Resource and individual file generators
examples/basic-api/  Runnable API example
tests/              Runtime, type-checking, and generator tests
```

The existing Book API is at `/api/books`. Its body requires `title` and `author`, with optional `publishedYear`. The example Product endpoints use sample data and placeholder writes.

## Build and test

From the repository root:

```sh
npm run build
node --test tests/*.test.mjs
```

Run live MongoDB tests with the root `.env`:

```sh
node --env-file-if-exists=.env --test tests/books-mongo.test.mjs
```

Live tests use and remove a temporary database. Without a URI, they are skipped.

Production startup, with environment variables supplied externally:

```sh
npm run build
npm run start:prod -w @tilcayo/basic-api
```
