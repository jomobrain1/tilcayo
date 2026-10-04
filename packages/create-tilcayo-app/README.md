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
generated client. `--auth` is rejected for React; connect a separate backend.

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

With `--auth`, these endpoints are registered:

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

React starters also include `@tilcayo/react` and `src/lib/api.ts`, configured with
public `VITE_API_URL` or `/api`. No API requests run on startup. Local generation
links both frontend packages; future published generation uses registry versions.
Publish `@tilcayo/react` as well before releasing this creator. Never put secrets
in VITE_* variables. See [API client](../react/README.md).
