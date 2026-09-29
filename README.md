# Tilcayo

## Development

Install dependencies with `npm install`, then run from the repository root:

Set `MONGODB_URI` in your shell or the root `.env` (loaded by the dev command).
For example: `MONGODB_URI=mongodb://127.0.0.1:27017/tilcayo`.
The example connects before listening on port 9149. Environment files are ignored
by Git. Production startup expects environment variables to be supplied externally.

```sh
npm start
```

`npm run dev` does the same thing. Both commands build core and the basic API,
then start the example at http://localhost:9149. Nodemon watches both source
directories and their TypeScript configuration. Saving a change rebuilds core
first, rebuilds the example, and restarts the server. Compilation errors stop
the launch; correct the error and save to retry. Press Ctrl+C to stop.

You can also use `npm start` from `examples/basic-api`.
In PowerShell environments that block `npm.ps1`, use `npm.cmd` instead of `npm`.

## Build and run without watching

```sh
npm run build
npm run start:prod -w @tilcayo/basic-api
```

## MongoDB

Core exports `connectMongo(uri, options)`, `disconnectMongo()`, and
`getMongoState()`. The connection layer configures DNS servers `8.8.8.8` and
`1.1.1.1` before connecting. `MongoConnectOptions` aliases Mongoose's connection
options; states are `disconnected`, `connected`, `connecting`, `disconnecting`,
or `unknown`.

Books demonstrate database CRUD through `/api/books`. Creation requires `title`
and `author`, with optional integer `publishedYear`. Item routes require a
24-character hexadecimal ObjectId. Products remain a simple array-backed read
example with placeholder write responses.

After building, run `node --test tests/*.test.mjs`. The live MongoDB test runs
only when `MONGODB_URI` is set, uses a unique temporary database, and drops only
that database on completion. Without a URI it is explicitly skipped.

### Simple Mongo model methods

Pass a name and schema to use Tilcayo methods in controllers:

```typescript
import mongoose from "mongoose";
import { mongoModel } from "@tilcayo/core";

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  year: { type: Number },
}, { timestamps: true });

export const Book = mongoModel("Book", bookSchema);
```

```typescript
const books = await Book.all();
const book = await Book.findOrFail(ctx.params.id);
const recent = await Book.where({ year: { $gte: 2020 } }, {
  sort: { year: -1 }, select: ["title", "year"], limit: 10,
});
```

| Method | Result |
| --- | --- |
| `all(options?)` | All matching records; unbounded unless a limit is supplied |
| `where(filter, options?)` | Records matching a Mongoose filter |
| `find(id)` / `findOrFail(id)` | Record or null / standard 404 |
| `first(filter?, options?)` / `firstOrFail(filter?, options?)` | First match or null / standard 404 |
| `create(data)` / `createMany(items)` | Created record / records |
| `update(id, data)` / `delete(id)` | Updated / deleted record, or null |
| `count(filter?)` / `exists(filter)` | Number / boolean |
| `paginate(query?, options?)` | Items and page metadata |
| `cursorPaginate(options?)` | Items and a forward ObjectId cursor |
| `updateMany(filter, data)` / `deleteMany(filter)` | Modified / deleted count |
| `upsert(filter, data)` | Updated or inserted record |
| `distinct(field, filter?)` | Unique field values |
| `aggregate(pipeline)` | Aggregation results; accepts an explicit result type |

Read options support `select`, `populate`, `sort`, and `limit`. Populate requires
schema references. The adapter preserves schema inference and the original model
as `Book.raw`, so advanced Mongoose queries, sessions, and transactions remain
available. `Book.find(id)` is a single-record lookup; `Book.raw.find(filter)` keeps
Mongoose's original meaning. Existing Mongoose methods are never overwritten.

```typescript
import type { TilcayoContext } from "@tilcayo/core";

export const index = async (ctx: TilcayoContext) => {
  const result = await Book.paginate(ctx.query);
  return ctx.response.success(result, "Books retrieved");
};
```

`?page=2&perPage=10` produces `{ items, pagination }`, with `page`, `perPage`,
`total`, `lastPage`, `hasNextPage`, and `hasPreviousPage`. Defaults are page 1 and
20 records; page size is capped at 100. Invalid values return 400. Pages beyond
the end return an empty list. Sorting adds `_id` as a unique tie-breaker. Counts
and items are separate queries and can differ during concurrent writes.

Generated index actions use `Book.all()` by default. To paginate, replace it with
`Book.paginate(ctx.query)`. The helper reads and validates only `page` and `perPage`
from the query. Put developer-controlled filters, sorting, and selection in the
optional second argument, such as `Book.paginate(ctx.query, { sort: { createdAt: -1 } })`.

`cursorPaginate({ after, perPage, filter, select, populate })` sorts by ascending
ObjectId and returns `{ items, pagination: { perPage, hasNextPage, nextCursor } }`.
Omit `after` for the first page and pass `nextCursor` for the next. There is no
total count or custom sort; `_id` must stay selected. These ID helpers assume
the normal MongoDB ObjectId schema.

Writes accept plain fields and updates apply `$set` with Mongoose validators
enabled. Validate and allowlist HTTP bodies in route validators; TypeScript body
types are not runtime validation. Filters and aggregation pipelines are
developer-controlled, not raw request bodies. Bulk update/delete and upsert reject
empty filters. `createMany` is ordered but not transactional; use `raw` and a
transaction if partial insertion is unacceptable. Upsert filters should have a
unique index when uniqueness matters. Request validators should enforce required
fields for upserts, since Mongoose update validation checks updated paths only.

The database choice lives in the model factory. Controllers use simple method
names and pagination shapes that a future MySQL adapter can also implement.
Mongo filters, population, cursors, and aggregation remain Mongo-specific;
MySQL support is not implemented.

### Typed controller bodies

Keep a plain request type at the top of the controller:

```typescript
type CreateBookBody = {
  title: string;
  author: string;
  publishedYear?: number;
};

type UpdateBookBody = Partial<CreateBookBody>;

export const store = async (ctx: TilcayoContext<CreateBookBody>) => {
  const book = await Book.create(ctx.body);
  return ctx.response.created(book, "Book created");
};
```

Use `TilcayoContext<UpdateBookBody>` for updates. No extra type folder, schema
inference expressions, or body casts are needed in controllers. An unparameterized
`TilcayoContext` still has an `unknown` body. Route registration accepts typed
handlers and checks the output type of supplied body validators against them.
Keep these manually written types aligned with your validators and attach the
validators to your routes; a type annotation alone does not validate requests.

## CLI generators

Build `@tilcayo/cli`, then use its `tilcayo` executable from an application
directory containing `package.json`. Within this repository, from
`examples/basic-api`, the equivalent is `node ../../packages/cli/dist/bin.js`.

| Command | Output |
| --- | --- |
| `tilcayo make:model Book` | `src/models/Book.ts` |
| `tilcayo make:model Book --mongo` | Model wrapped with Tilcayo Mongo methods |
| `tilcayo make:controller books` | `src/controllers/books.controller.ts` |
| `tilcayo make:controller books --resource` | Same file, with resource action names |
| `tilcayo make:controller books --resource --crud --mongo` | Working Mongo CRUD controller with `all()` in index |
| `tilcayo make:validator books` | `src/validators/books.validator.ts` |
| `tilcayo make:route books` | `src/routes/books.routes.ts` |
| `tilcayo make:route books --resource` | Same file, using `router.resource()` |
| `tilcayo make:service books` | `src/services/books.service.ts` |

Add model fields during generation with:

```sh
npx tilcayo make:model Customer --fields "name:string,email:string,age:number,active:boolean,birthday:date"
```

Supported types are `string`, `number`, `boolean`, and `date`. Fields are optional
by default; edit the generated schema to add `required`, defaults, or validation.
Omit `--fields` for an empty schema. Duplicate field names and invalid definitions
are rejected. Model `--fields` creates model fields only, not request validators.

Controllers also accept `--fields` to generate plain request types:

```sh
npx tilcayo make:controller books --resource --crud --mongo --fields "title:string,author:string,publishedYear?:number"
```

Controller fields are required unless marked `?`; `date` generates `Date`, so
the corresponding validator must parse incoming dates into Date objects.
The generated update type is `Partial<CreateBookBody>`. Without `--fields`, a
comment marks the empty body type for you to fill in. This works with both
placeholder and Mongo CRUD controllers. Existing files are not overwritten.

For Mongo CRUD, run inside the application directory (use a new resource name
if these files already exist):

```sh
npx tilcayo make:model Article --mongo --fields "title:string,year:number"
npx tilcayo make:controller articles --resource --crud --mongo
npx tilcayo make:validator articles
npx tilcayo make:route articles --resource
```

Fill in the generated validator's fields before sending requests: its initial
empty object schema strips all body fields. Register the route with
`app.routes(articleRoutes)` and connect MongoDB during startup. Generated routes
use `/articles`; the example's existing Book routes use `/api/books`.

`--mongo` selects the model adapter and enables CRUD controller generation.
`--crud` requires a supported database option; currently only `--mongo` exists.
`--mongo` on a controller alone also enables CRUD. `--resource` controls action
names (`index`, `store`, `show`, `update`, `destroy`), not the database backend.
Generate the wrapped model before its Mongo controller. Existing raw models can
use `mongoModel("Book", bookSchema)` instead of `mongoose.model("Book", bookSchema)`.
Without `--mongo`, models remain plain
Mongoose models and controllers remain placeholders.

Generate the controller and validator before the route to wire their imports
automatically. Match `--resource` on the controller and route commands. A route
generated without those files uses inline placeholder handlers and omits
validation, printing instructions for attaching them later. Existing controller
and validator files must use the demonstrated named export declarations.
Register new route files explicitly using `app.routes(bookRoutes)`.

Names accept letters and digits, starting with a letter. Standard suffixes are
supported (`Book`/`book`/`books`, `Product`, `User`, `Category`/`categories`);
irregular English plurals are not inferred. Models keep singular PascalCase
names, while resource filenames are lowercase and plural. Templates require
`@tilcayo/core`, `mongoose` (models), and `zod` (validators) in the application.

Generators create missing directories and refuse existing files, path traversal,
and symlinked source directories. They never edit bootstrap or generate a whole
resource bundle. Controller bodies are placeholders unless `--mongo` is selected.
