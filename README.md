# Tilcayo

## Development

Install dependencies with `npm install`, then run from the repository root:

Set `MONGODB_URI` in your shell first. The example connects before listening on
port 9149. For a local MongoDB development database, PowerShell users can run
`$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/tilcayo'`.
Environment files are ignored and are not automatically loaded.

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

## CLI generators

Build `@tilcayo/cli`, then use its `tilcayo` executable from an application
directory containing `package.json`. Within this repository, from
`examples/basic-api`, the equivalent is `node ../../packages/cli/dist/bin.js`.

| Command | Output |
| --- | --- |
| `tilcayo make:model Book` | `src/models/Book.ts` |
| `tilcayo make:controller books` | `src/controllers/books.controller.ts` |
| `tilcayo make:controller books --resource` | Same file, with resource action names |
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
are rejected. This option creates model fields only, not request validators.

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
resource bundle. Controller bodies are placeholders for application logic.
