# Tilcayo

A TypeScript API framework built on Node.js, Express, Mongoose, and Zod.
**Keep it simple stupid:** plain functions, typed controllers, explicit routes, and short generator commands.

Includes MongoDB CRUD and references, request validation, JWT authentication,
middleware, pagination, and application scaffolding. React, roles/permissions,
and SQL adapters are not implemented yet. Package release verification is in progress.

## Why the name?

Tilcayo takes its name from *Leopardus tilcayo*, a small wild cat from Bolivia's
Yungas region. The cat's name comes from local communities.
Its small size and distinct identity inspired the framework's focus on simplicity.
[Read about the species](https://portal.pucrs.br/es/noticias/buscar/Nueva-especie-de-felino-Leopardus-tilcayo/).

## Create an application

Use Node.js 22.9+ and npm. From this repository:

```sh
npm install
npm run build
node packages/create-tilcayo-app/dist/bin.js my-api --type api --auth --yes
cd my-api
npx tilcayo dev
```

The creator installs dependencies, builds the app, and creates a private `.env`
with distinct random auth secrets. Set `MONGODB_URI` before starting.
Local generation links packages from this checkout; keep it available.

Run the creator without arguments for interactive setup. Options include
`--type minimal`, `--package-manager npm|pnpm|yarn`, and `--no-install`.
After publishing, the entry command will be `npm create tilcayo-app@latest`.

| App command | Purpose |
| --- | --- |
| `npx tilcayo dev` | Build, watch, and restart |
| `npx tilcayo build` | Compile the application |
| `npx tilcayo start` | Run the compiled app with `.env` |
| `npx tilcayo routes:list` | List registered routes from `dist/app.js` |

Route listing supports `--method GET`, `--path /api`, `--json`, `--entry`, and
`--env-file`. On PowerShell, use `npm.cmd` / `npx.cmd` if script execution is blocked.

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

## Core APIs

- **Routing:** `createApp()`, `defineRoutes()`, `app.routes()`, route groups, and `router.resource()`.
- **Validation:** Zod schemas on route `body`, `query`, and `params`; invalid requests return 422.
- **Responses:** `ctx.response.success()`, `.created()`, and `.noContent()`; typed `TilcayoContext` without Express objects.
- **Database:** `mongoModel()` exposes CRUD, filtering, sorting, bulk operations, pagination, and `.raw` for Mongoose queries.
- **Middleware:** `cors`, `rateLimit`, `requestId`, `requestLogger`, `securityHeaders`, `bodyLimit`, and `cache`.

Pagination is opt-in: `Product.paginate(ctx.query)` or `Product.cursorPaginate()`.
Keep filters and bulk operations in application code. Rate limits are process-local
and do not trust proxy forwarding headers. The Mongo connection helper currently
configures public DNS servers before connecting.

## Develop and test

```sh
npm run build
node --test tests/*.test.mjs
```

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
| `packages/auth` | Authentication and token management |
| `packages/cli` | Generators and application commands |
| `packages/create-tilcayo-app` | Application setup wizard |
| `examples/basic-api` | Working API example |
| `tests` | Runtime, generator, and compilation tests |

See the [creator guide](packages/create-tilcayo-app/README.md),
[relationship guide](MONGODB-RELATIONSHIPS.md), and
[testing and release guide](TESTING-AND-RELEASE.md) for detailed workflows.
