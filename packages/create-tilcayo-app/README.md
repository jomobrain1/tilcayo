# create-tilcayo-app

Create a Tilcayo API or React client with an interactive setup wizard:

```sh
create-tilcayo-app
```

Use Node.js 22.9+. Create your app outside the framework checkout, without a global install:

```sh
npm create tilcayo-app@latest
pnpm create tilcayo-app
yarn create tilcayo-app
```

For local development in the Tilcayo repository, build the workspace and run
`node packages/create-tilcayo-app/dist/bin.js my-api`, or link this package to expose
`create-tilcayo-app` on PATH.

```sh
create-tilcayo-app my-api --type api --auth --package-manager npm --yes
create-tilcayo-app tiny-api --type minimal --no-auth --no-install --yes
```

The wizard offers project name, package manager (npm, pnpm, or Yarn), application
type, and authentication. Use the arrow keys and Enter to choose from colored
menus; project name remains a text field. Ctrl+C cancels before files are created.
`api` includes MongoDB-backed note CRUD; `minimal`
includes a health endpoint. Enabling authentication adds MongoDB to either type.
Noninteractive runs use defaults for omitted options. Existing paths are refused.

Generated projects contain controllers, routes, models, services, validators,
separate app and startup modules, TypeScript configuration, `.gitignore`,
`.env.example`, and a private `.env`. Authentication gets independent random
secrets in `.env`; the example file leaves secrets blank.

## Start your API

For a MongoDB API with authentication:

```sh
npm create tilcayo-app@latest my-api -- --type api --auth --yes
cd my-api
```

In your new app's `.env`, configure the database:

```dotenv
PORT=9149
MONGODB_URI=mongodb://127.0.0.1:27017/my_api
```

Keep the generated authentication secret entries. Start MongoDB locally or replace
the URI with your Atlas connection string. Then run:

```sh
npm run dev
```

Open `http://localhost:9149/health`:

```json
{"success":true,"message":"Success","data":{"status":"ok"}}
```

The `api` and `minimal` starters are backend APIs. On PowerShell, use
`npm.cmd` / `npx.cmd` if script execution is blocked.

## Options

With `npm create`, place creator flags after `--`.

| Option | Purpose |
| --- | --- |
| `[project-name]` | New directory and package name |
| `--type api\|minimal\|react` | MongoDB API, minimal API, or React client |
| `--auth` / `--no-auth` | Include or omit authentication |
| `--package-manager npm\|pnpm\|yarn` | Installation tool |
| `--no-install` | Write files without installation or compilation |
| `--yes` | Use defaults for unanswered choices |
| `--help` | Command help |

Defaults are `my-api`, npm, `api`, and no authentication. A minimal app needs no
database unless authentication is enabled:

```sh
npm create tilcayo-app@latest tiny-api -- --type minimal --no-auth --yes
```

## Continue building

For a React client, select React in the wizard or pass `--type react --yes`.
Use Node.js 22.12+ or 24+. The client includes the current Tilcayo starter pages,
responsive hamburger menu, TypeScript, Vite, React Router, and `@tilcayo/styles`.
Run `npm run dev`, `npm run build`, `npm run preview`, or `npm run lint` in the
generated client. Add `--auth` for login/register pages, a protected dashboard,
guest/auth route guards, auth bootstrap and logout navigation. This frontend connects
to a separate Tilcayo auth API; its Vite proxy targets port 9149.

To test from the repository root:

```sh
npm run build
cd examples
node ../packages/create-tilcayo-app/dist/bin.js my-react-app --type react --yes
cd my-react-app
npm run dev
```

The build bundles the `client` source into `dist/react-starter.json`, so the packed
creator does not need the checkout to generate a React app. Local generation
links the checkout styles package; published generation uses `@tilcayo/styles`
from npm. Publish the styles package and this updated creator before testing
`npm create tilcayo-app@latest my-react-app -- --type react --yes`.

For backend starters:

| Location | Purpose |
| --- | --- |
| `src/app.ts` | Register routes and middleware |
| `src/index.ts` | Database connection and server lifecycle |
| `src/config.ts` | Configuration |
| `src/models/` | Database schemas |
| `src/controllers/` | Request handlers |
| `src/validators/` | Zod validation |
| `src/routes/` | URLs and middleware |
| `src/services/` | Business logic |

In another terminal inside the app, generate a feature:

```sh
npx tilcayo make:resource Product name:string price:number "description:string?"
```

Add the import and registration to `src/app.ts`, before its default export:

```ts
import productsRoutes from "./routes/products.routes.js";

app.routes(productsRoutes);
```

Send `POST http://localhost:9149/products` with `Content-Type: application/json`
and body `{"name":"Notebook","price":250}` using Postman or Thunder Client.
Use `GET /products` to list records and `GET`, `PUT`, or `DELETE /products/:id`
to read, update, or delete one. Replace `:id` with the returned `data._id`.

Edit the generated files as your feature grows. Dev rebuilds and restarts on
source changes. Generators refuse to overwrite files and do not register routes
automatically.

## Authentication

For backend starters with `--auth`, these endpoints are registered:

| Endpoint | Input |
| --- | --- |
| `POST /api/auth/register` | JSON `name`, `email`, `password` |
| `POST /api/auth/login` | JSON `email`, `password` |
| `POST /api/auth/refresh` | JSON `refreshToken` |
| `POST /api/auth/logout` | JSON `refreshToken` |
| `GET /api/auth/me` | Bearer access token |

Registration and login return tokens under `data.tokens`. Send the access token
in `Authorization: Bearer <accessToken>`. Generated notes and other CRUD routes
remain public until you add auth middleware. See the
[authentication guide](https://www.npmjs.com/package/@tilcayo/auth).

## Build and run

| Command | Purpose |
| --- | --- |
| `npm run dev` | Develop with rebuilds and restarts |
| `npm run build` | Compile into dist |
| `npm run routes` | List routes from compiled code |
| `npm start` | Start compiled code with .env |

Build before listing changed routes or starting compiled code. Stop dev before
starting another server on the same port. Deploy the application as a Node.js
service with its runtime dependencies, environment, and database connection.
Application feature changes do not require publishing to npm.

## Installation and local development

Setup installs dependencies and builds unless `--no-install` is supplied. The
selected package manager must be installed. Running the creator from a built
Tilcayo source checkout automatically links the local framework packages and
their shared Zod and Mongoose dependencies. Keep that checkout available while
developing the generated app. The published creator uses registry versions of
`@tilcayo/core`, `@tilcayo/auth`, and `@tilcayo/cli` instead.
Installation failures retain the generated project and report recovery steps.
MongoDB must be running before starting an API that uses it.

If installation fails or was skipped, enter the generated project and run
`npm install` then `npm run build`; do not regenerate the same directory.

Inside the generated project, use `tilcayo dev`, `tilcayo build`, `tilcayo start`,
and `tilcayo routes:list`. If the CLI is installed only in the project, invoke
it through `npx tilcayo`, `pnpm exec tilcayo`, or `yarn exec tilcayo`.

[Project guide](https://github.com/jomobrain1/tilcayo#readme) ·
[Generators](https://www.npmjs.com/package/@tilcayo/cli) ·
[Runtime](https://www.npmjs.com/package/@tilcayo/core)

Plain React starters include `@tilcayo/react` and `src/lib/api.ts`, configured with
public `VITE_API_URL` or `/api`. No API requests run on startup. Local generation
links both frontend packages; future published generation uses registry versions.
Publish `@tilcayo/react` as well before releasing this creator. Never put secrets
in VITE_* variables. See [API client](../react/README.md).

### React auth installation (local, unpublished)

From `examples`, after building the workspace:

```sh
node ../packages/create-tilcayo-app/dist/bin.js my-auth-app --type react --auth --yes
cd my-auth-app
npm run dev
```

Open `/register` or `/login`. The generated README explains creating a separate
auth backend and connecting MongoDB. Frontend files live in `src/app/auth.ts`,
`src/middleware/auth.tsx`, `src/components/auth-form.tsx`, and `src/pages/`.
The creator ships the auth overlay in `dist/react-auth.json`. Tokens remain in
memory. A standalone React app needs a compatible cookie-session backend and matching frontend configuration to restore login on reload; full-stack auth starters configure this automatically. No backend secrets are generated in the frontend.
Existing generated apps are not overwritten or upgraded by this command.
## Full-stack presets

From a built source checkout:

```sh
node packages/create-tilcayo-app/dist/bin.js bookstore --fullstack --auth --admin --yes
cd bookstore
npm run dev
```

`--api` preserves API-only creation. `--fullstack` creates `api/` and `client/`
workspaces with one dev command, separate dev scripts, both production builds,
an API proxy and generated Notes CRUD. Set MongoDB in `api/.env`. Auth adds
login/register/recovery/profile pages and protected routes; admin requires auth
and adds `/admin` management pages. Provision roles through trusted server code.

Run `tilcayo make:resource Book title:string author:ref:Author --fullstack` from
the generated root and follow the printed route registration steps. Production
hosts serve `client/dist` with SPA fallback and proxy `/api` to the Node API.
`npm run start` starts the API only. See the generated README for configuration.

The updated frontend packages and creator must be published before these flags
work through `npm create tilcayo-app@latest`. Verify packed artifacts externally
with `node tests/fullstack-starter-consumer.mjs` before release.


## Tenant workspaces

Create a local full-stack auth/admin app with `--tenancy`:

```sh
node packages/create-tilcayo-app/dist/bin.js my-saas --fullstack --auth --admin --tenancy --yes
```

From the generated application, set `TENANCY_SUPERADMIN_EMAIL` and
`TENANCY_SUPERADMIN_PASSWORD` for the setup process, then run `npm run tenancy:setup`.
This explicit command provisions only a Super Admin. It does not create a default
tenant, assign memberships or migrate existing records. Re-running it updates
the designated account password and revokes its existing sessions. No bootstrap
password is generated into source files or run automatically on startup.

Run the app and use `http://localhost:5173/admin/workspaces` for
platform management. Create tenants and assign their administrators in Tenant administration. Open `<tenant-slug>.localhost` with the port printed by Vite.
Users can register on the main site or at a tenant address. Tenant signup creates a normal membership in that tenant. An existing account can join another tenant using its existing password; signup never grants an admin role. There is no default tenant or Main app workspace switcher. The main site supports ordinary users and public registration; tenant administrators manage their own users, roles and product catalog.
Each hostname has its own HttpOnly session cookie; sign in once per workspace.

Super Admin manages tenants and global accounts. Tenant roles belong to Memberships,
not global Users. A Super Admin must be explicitly added to enter a workspace.
Tenant administrators manage their own members, custom roles, products, orders and
Trash. Suspending a membership affects only that workspace; global user suspension
affects all workspaces. Suspended or archived tenants retain data but reject access.

`TENANCY_BASE_DOMAIN` defaults to `localhost`. Production needs wildcard DNS and
HTTPS for that domain, with a same-origin `/api` proxy preserving Host. Subdomains
are resolved from Host; forwarded tenant headers are not trusted.

Tenant-owned models use `mongoModel(name, schema, { tenantScoped: true })`.
The generator applies this to existing models and future `make:model` and
`make:resource` output. Queries, writes, counts, distinct, population and supported
aggregations use the request's tenant context. Platform requests cannot read these
records. Native `raw.collection` operations bypass Mongoose and are reserved for
explicit setup/migration code. Bulk writes, replacement updates and cross-collection
aggregate stages are rejected unless implemented with their own isolation checks.

## Complete command reference

See the [main README](../../README.md#create-an-application) for every creator flag, app preset, generator command, environment setting and framework development command. Source checkout builds use the current code; registry creation uses the packages that have been published.

## Initial tenant configuration

Tenant-enabled starters include `TENANCY_BASE_DOMAIN=localhost` and blank `TENANCY_SUPERADMIN_EMAIL` / `TENANCY_SUPERADMIN_PASSWORD` fields in `api/.env` and `api/.env.example`. Fill the actual generated app's `api/.env`, configure `MONGODB_URI`, then run `npm run tenancy:setup` from its root. Keep the generated auth secrets. Editing `.env.example` or another app's `.env` does not configure the running app. Setup reports missing/invalid variable names without printing their values.
