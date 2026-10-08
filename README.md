# Tilcayo

A TypeScript API framework built on Node.js, Express, Mongoose, and Zod.

**Keep it simple stupid:** plain functions, typed controllers, explicit routes, and short generator commands.

Includes MongoDB CRUD and references, request validation, JWT authentication,
middleware, pagination, and application scaffolding. A React starter is available
in this checkout; user roles and role guards are supported, while fine-grained permissions and SQL adapters are not implemented yet. The four backend/tooling packages are
available on npm. The CSS foundation, `@tilcayo/styles`, is available in this
checkout and has not been published yet.

| Package | Guide |
| --- | --- |
| [create-tilcayo-app](https://www.npmjs.com/package/create-tilcayo-app) | [Create and start a project](packages/create-tilcayo-app/README.md) |
| [@tilcayo/core](https://www.npmjs.com/package/@tilcayo/core) | [Runtime, validation, and MongoDB](packages/core/README.md) |
| [@tilcayo/auth](https://www.npmjs.com/package/@tilcayo/auth) | [Authentication](packages/auth/README.md) |
| [@tilcayo/cli](https://www.npmjs.com/package/@tilcayo/cli) | [Commands and generators](packages/cli/README.md) |
| @tilcayo/react (unpublished) | [API/resource clients, Redux, RTK Query, and opt-in auth](packages/react/README.md) |
| @tilcayo/styles (unpublished) | [CSS foundation and preview](packages/styles/README.md) |
| @tilcayo/ui (unpublished) | [Accessible React primitives](packages/ui/README.md) |
| @tilcayo/admin (unpublished) | [Protected management shell](packages/admin/README.md) |

## Why the name?

Tilcayo takes its name from *Leopardus tilcayo*, a small wild cat from Bolivia's
Yungas region. The cat's name comes from local communities.
Its small size and distinct identity inspired the framework's focus on simplicity.
[Read about the species](https://portal.pucrs.br/es/noticias/buscar/Nueva-especie-de-felino-Leopardus-tilcayo/).

## Create an application

### Full-stack starter (local checkout)

```sh
npm run build
node packages/create-tilcayo-app/dist/bin.js bookstore --fullstack --auth --admin --yes
cd bookstore
npm run dev
```

Configure MongoDB in `api/.env` first. The starter includes an API, a React/Vite
client, a shared dev command, an `/api` proxy, and Notes CRUD at `/notes`. Omit
`--admin` or both `--auth --admin` for smaller presets. Roles are provisioned
through trusted server code; registration does not assign admin rights.

Generate both halves from the app root:

```sh
npx tilcayo make:resource Author name:string --fullstack
npx tilcayo make:resource Book title:string author:ref:Author year:number? --fullstack
```

The commands print backend/frontend route registration steps. Existing apps can
use `tilcayo add:auth` and `tilcayo add:admin`; installers refuse collisions and
customized integration files. See [frontend milestones](FRONTEND-MILESTONES.md).
Build and publish the updated packages before using these options through the
registry creator. This command currently uses the local checkout.

### React starter (local checkout)

The local creator supports `--type react`. It generates the client with React,
TypeScript, Vite, Home/Elements/About pages, Tilcayo styles, and responsive
navigation. Use Node.js 22.12+ or 24+. From this repository:

```sh
npm run build
cd examples
node ../packages/create-tilcayo-app/dist/bin.js my-react-app --type react --yes
cd my-react-app
npm run dev
```

The checked-in `examples/react-starter` is a generated example. Run
`npm run dev -w react-starter` from the repository root to start it after installing
dependencies. Local generation links `@tilcayo/styles` from this checkout.
The creator build bundles the current `client` source into its distributable.
Publish `@tilcayo/styles`, `@tilcayo/react`, and the updated creator before using this option through
`npm create tilcayo-app@latest`. Add `--auth` to scaffold login/register pages, a protected dashboard, route guards,
and session bootstrap. Connect a separate Tilcayo auth API; the generated README
explains setup. Tokens are in memory, so reloading signs out. On PowerShell, use `npm.cmd` if script execution is blocked.

### Backend API

Use Node.js 22.9+ and npm. Open a terminal where you keep your projects, outside
this framework repository:

```sh
npm create tilcayo-app@latest
```

Follow the prompts to choose your project name, package manager, application type,
and whether to include authentication. For example, name your project `my-api`,
then enter its directory:

```sh
cd my-api
```

The creator installs dependencies, builds the app, and creates a private `.env`.
If you enable authentication, it also generates distinct random auth secrets.
For a MongoDB API or any app with authentication, configure the new app's `.env`:

```dotenv
PORT=9149
MONGODB_URI=mongodb://127.0.0.1:27017/my_api
```

Start MongoDB locally or use your Atlas connection string. Keep the generated
auth secrets if authentication is enabled. A minimal app without authentication
does not need MongoDB. Start your app:

```sh
npm run dev
```

Open `http://localhost:9149/health` in your browser. The API returns:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "status": "ok"
  }
}
```

This is a backend API. Connect your own frontend or test requests using Postman
or Thunder Client.

### Create without prompts

To create a MongoDB API with authentication without choosing options interactively:

```sh
npm create tilcayo-app@latest my-api -- --type api --auth --yes
```

Then enter `my-api`, configure `.env`, and run `npm run dev` as above.
Use `--no-auth` to omit authentication, `--type minimal --no-auth` for a
database-free starter, `--package-manager npm|pnpm|yarn` to choose the installer,
or `--no-install` to generate files without installing dependencies.

### Application commands

| App command | Purpose |
| --- | --- |
| `npx tilcayo dev` | Build, watch, and restart |
| `npx tilcayo build` | Compile the application |
| `npx tilcayo start` | Run the compiled app with `.env` |
| `npx tilcayo routes:list` | List registered routes from `dist/app.js` |

Route listing supports `--method GET`, `--path /api`, `--json`, `--entry`, and
`--env-file`.

Generated apps also provide `npm run dev`, `npm run build`, `npm start`, and
`npm run routes`. Build before listing routes so compiled output is current.

## Continue building your app

| Location | Purpose |
| --- | --- |
| `src/app.ts` | Register routes and middleware |
| `src/index.ts` | Database connection and server startup/shutdown |
| `src/config.ts` | Configuration |
| `src/models/` | Database schemas |
| `src/controllers/` | Request handlers and responses |
| `src/validators/` | Zod request validation |
| `src/services/` | Business logic |
| `src/routes/` | URLs and route middleware |
| `.env` | Private configuration; keep out of Git |

Generate a resource, register its routes, customize the files, and test the HTTP
endpoints. Dev rebuilds and restarts when source changes. Application changes do
not need npm publishing: build and run your API as a Node.js service.

## Generate resources

Run inside the application directory:

```sh
npx tilcayo make:resource Product name:string price:number active:boolean
```

This creates a model, CRUD controller, Zod validator, and route module:

```text
src/models/Product.ts
src/controllers/products.controller.ts
src/validators/products.validator.ts
src/routes/products.routes.ts
```

Register the generated routes in `src/app.ts`:

```ts
import productRoutes from "./routes/products.routes.js";

app.routes(productRoutes);
```

The routes provide `GET /products`, `POST /products`, and
`GET`, `PUT`, and `DELETE /products/:id`. Controllers use standalone
`index`, `store`, `show`, `update`, and `destroy` functions.
All target files are checked for collisions before generation.

Test `POST http://localhost:9149/products` with `Content-Type: application/json`:

```json
{
  "name": "Notebook",
  "price": 250,
  "active": true
}
```

Use the returned `data._id` in `/products/:id`. Generated CRUD routes are public
until you attach authentication middleware, even when auth was selected at setup.

| Field syntax | Meaning |
| --- | --- |
| `name:string` | Required nonempty string |
| `price:number` | Required JSON number |
| `active:boolean` | Required JSON boolean |
| `publishedAt:date` | ISO timestamp with timezone, converted to a Date |
| `"year:number?"` | Optional field; `"year?:number"` also works |
| `author:ref:Author` | One Author ObjectId |
| `tags:refs:Tag` | Array of Tag ObjectIds |
| `"author:ref:Author?"` / `"tags:refs:Tag?"` | Optional relationships |

Updates make every field optional. MongoDB is the default database;
`--mongodb` selects it explicitly. Individual generators are also available:
`make:model`, `make:controller`, `make:validator`, `make:route`, and `make:service`.
Use `make:controller books --resource` for CRUD after creating the model.

## Relationships

```sh
npx tilcayo make:resource Author name:string
npx tilcayo make:resource Book title:string author:ref:Author
```

Relationship resources also generate a typed service. Population is explicit:

```ts
import { getBooks, getBookById } from "./services/books.service.js";

await getBooks(); // Returns author IDs
await getBooks({ populate: ["author"] });
await getBookById(id, { populate: ["author"] });
```

Register the referenced models before populating them, for example by registering
their generated routes. Validators reject malformed IDs with HTTP 422. References
do not enforce document existence or cascade deletes. HTTP query strings do not
control population. See [MongoDB relationships](MONGODB-RELATIONSHIPS.md).

## Authentication

For an application without auth scaffolding:

```sh
npx tilcayo make:auth
```

The app needs `@tilcayo/core` and `@tilcayo/auth`. The command creates auth config,
controllers, validators, and routes. It also:

- Generates missing or empty auth secrets in `.env`, preserving nonempty values.
- Adds blank auth placeholders to `.env.example` and environment rules to `.gitignore`.
- Reuses an existing `createAuth()` config and refuses other source collisions.

Environment files use concise groups:

```dotenv
# Database
MONGODB_URI=mongodb://127.0.0.1:27017/my_api

# Authentication - private values belong in .env
AUTH_ACCESS_SECRET=
AUTH_REFRESH_SECRET=
```

Register the generated routes in `src/app.ts`:

```ts
import authRoutes from "./routes/auth.routes.js";

app.routes(authRoutes);
```

The generator updates environment files but does not edit application startup.
Load `.env` and connect MongoDB before listening. Register one set of auth routes.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/register` | Create a user with name, email, and password |
| `POST /api/auth/login` | Exchange email and password for tokens |
| `POST /api/auth/refresh` | Rotate a refresh token |
| `POST /api/auth/logout` | Revoke a refresh token |
| `GET /api/auth/me` | Read the user with a Bearer access token |

Protect routes with `middleware: [auth.middleware]` and read the user with
`auth.user(ctx)`. Access tokens last 15 minutes; refresh tokens last 7 days.
Logout revokes the refresh token; issued access tokens remain valid until expiry.
Use HTTPS and keep `.env` private.

## Middleware

Middleware runs before or around a route handler. Configure it for the whole app,
a route group, or an individual route. For example, in `src/app.ts`:

```ts
import { createApp, requestId, securityHeaders, rateLimit } from "@tilcayo/core";

const app = createApp({
  middleware: [
    requestId(),
    securityHeaders(),
    rateLimit({ windowMs: 60_000, max: 100 }),
  ],
});
```

| Middleware | Purpose |
| --- | --- |
| `requestId()` | Add a request ID and `X-Request-Id` header |
| `requestLogger()` | Log method, path, status, and duration |
| `securityHeaders()` | Set basic HTTP security headers |
| `cors({ origin })` | Allow requests from configured browser origins |
| `rateLimit({ windowMs, max })` | Limit requests per client IP |
| `bodyLimit(bytes)` | Limit request body size |
| `cache({ maxAge })` | Set cache headers for public GET responses |

For a single route, pass `{ middleware: [...] }` as its options. Middleware runs
in registration order. Rate limits are process-local and do not trust proxy
forwarding headers; `cache` sets HTTP headers rather than storing responses.

## Core APIs

- **Routing:** `createApp()`, `defineRoutes()`, `app.routes()`, route groups, and `router.resource()`.
- **Validation:** Zod schemas on route `body`, `query`, and `params`; invalid requests return 422.
- **Responses:** `ctx.response.success()`, `.created()`, and `.noContent()`; typed `TilcayoContext` without Express objects.
- **Database:** `mongoModel()` exposes CRUD, filtering, sorting, bulk operations, pagination, and `.raw` for Mongoose queries.

Pagination is opt-in: `Product.paginate(ctx.query)` or `Product.cursorPaginate()`.
Keep filters and bulk operations in application code. The Mongo connection helper currently
configures public DNS servers before connecting.

## Develop and test

These commands are for framework contributors working in this repository:

```sh
npm install
npm run build
node --test tests/*.test.mjs
```

To test the local creator after building:

```sh
node packages/create-tilcayo-app/dist/bin.js local-api --type api --auth --yes
```

Local generation links packages from this checkout; keep it available and rebuild
after framework changes. The published creator uses npm dependencies instead.

For live MongoDB tests, configure a root `.env` and run:

```sh
node --env-file=.env --test tests/books-mongo.test.mjs tests/auth-mongo.test.mjs tests/relationships.test.mjs
```

Live tests create and remove isolated test databases. Without `MONGODB_URI`, they
are skipped. To run the existing example, copy `.env.example` to `.env`, configure
MongoDB and two distinct auth secrets of at least 32 bytes each, then run `npm run dev`.
The example listens on port 9149; its auth source files already exist.

| Directory | Contents |
| --- | --- |
| `packages/core` | Runtime, routing, validation, middleware, Mongo helpers |
| `packages/react` | API/resource clients, Redux/RTK Query, and opt-in frontend auth |
| `packages/styles` | CSS tokens, components, responsive layouts, and utilities |
| `packages/auth` | Authentication and token management |
| `packages/cli` | Generators and application commands |
| `packages/create-tilcayo-app` | Application setup wizard |
| `examples/basic-api` | Working API example |
| `tests` | Runtime, generator, and compilation tests |

See the [creator guide](packages/create-tilcayo-app/README.md),
[relationship guide](MONGODB-RELATIONSHIPS.md), and
[testing and release guide](TESTING-AND-RELEASE.md) for detailed workflows.
