# Tilcayo

A TypeScript toolkit for building APIs and full-stack applications with Node.js, Express, MongoDB, Zod and React.

Tilcayo uses plain functions, explicit routes and editable generated code. It includes authentication, tenant workspaces, admin screens, a reusable component library and Cloudinary uploads. MongoDB is the supported database adapter.

## Contents

- [Quick start](#quick-start)
- [Create an application](#create-an-application)
- [Project structure](#project-structure)
- [Development commands](#development-commands)
- [Generators](#generators)
- [Routes and validation](#routes-and-validation)
- [Authentication and administration](#authentication-and-administration)
- [Tenant workspaces](#tenant-workspaces)
- [Environment configuration](#environment-configuration)
- [Uploads](#uploads)
- [Troubleshooting](#troubleshooting)
- [Package guides](#package-guides)

## Quick start

Use Node.js **22.12+ or 24+**, npm and an accessible MongoDB database. Install from npm; no framework checkout or separate package setup is required.

Commands use `npm` and `npx`. If Windows PowerShell blocks them, use `npm.cmd` and `npx.cmd` instead.

```bash
# Create the complete app: API, React, auth, admin and tenants
npm create tilcayo-app@latest my-app -- --full-app
```

```bash
# Enter your app
cd my-app
```

`--full-app` installs dependencies and builds the app without requiring `--yes`. It includes dashboards, profile settings, Elements and upload support.

Edit **`api/.env` inside your newly generated app**. The installer includes blank Super Admin fields; fill them before setup. Editing the framework repository's `.env`, another example app, or `.env.example` will not configure this app. Replace these placeholders:

```ini
MONGODB_URI=your_mongodb_connection_string
TENANCY_BASE_DOMAIN=localhost
TENANCY_SUPERADMIN_EMAIL=your_email
TENANCY_SUPERADMIN_PASSWORD=your_chosen_strong_password
```

Keep the generated `AUTH_ACCESS_SECRET` and `AUTH_REFRESH_SECRET` values.

```bash
# Create your initial Super Admin
npm run tenancy:setup
```

```bash
# Start the API and frontend together
npm run dev
```

Open the frontend URL printed by Vite. Sign in with your Super Admin account, open **Tenant administration** from the profile menu, then create tenants and assign their administrators. No default tenant is created.

The API defaults to port `9149`; the frontend proxies `/api` to it. Configure Cloudinary when you want real uploads and SMTP when you want password recovery emails.

## Create an application

Choose one preset. Each command creates a separate app; existing directories are never overwritten.

```bash
# API only
npm create tilcayo-app@latest my-api -- --api --yes
```

```bash
# API with authentication
npm create tilcayo-app@latest secure-api -- --api --auth --yes
```

```bash
# Minimal server without MongoDB
npm create tilcayo-app@latest tiny-server -- --type minimal --no-auth --yes
```

```bash
# React frontend only
npm create tilcayo-app@latest my-web -- --type react --yes
```

```bash
# Fullstack with auth and admin, without tenancy
npm create tilcayo-app@latest managed-app -- --fullstack --auth --admin --yes
```

Additional presets:

```bash
# React frontend with authentication pages; connect a compatible API
npm create tilcayo-app@latest auth-web -- --type react --auth --yes
```

```bash
# React frontend with auth and admin screens; connect a compatible API
npm create tilcayo-app@latest admin-web -- --type react --auth --admin --yes
```

```bash
# Fullstack without authentication or admin
npm create tilcayo-app@latest basic-app -- --fullstack --yes
```

```bash
# Complete app using the individual options
npm create tilcayo-app@latest tenant-app -- --fullstack --auth --admin --tenancy --yes
```

### Creator options

| Option | Purpose |
| --- | --- |
| `--full-app` | Fullstack, auth, admin and tenancy; npm by default, no prompts |
| `--type api|minimal|react|fullstack` | Choose the app type; default is `api` |
| `--api`, `--fullstack` | Shortcuts for the corresponding app type |
| `--auth`, `--no-auth` | Include or exclude authentication |
| `--admin` | Include admin screens; requires auth and React/fullstack |
| `--tenancy` | Include tenant workspaces; requires fullstack, auth and admin |
| `--package-manager npm|pnpm|yarn` | Choose a package manager |
| `--no-install` | Generate files without installation or automatic build |
| `--yes`, `-y` | Use defaults for unanswered choices |
| `--help` | Show creator help |

`--full-app` accepts package-manager and installation options. It rejects incompatible choices such as `--no-auth` or `--type react`.

```bash
# Use pnpm for the complete app
npm create tilcayo-app@latest team-app -- --full-app --package-manager pnpm
```

```bash
# Generate the complete app, but install and build later
npm create tilcayo-app@latest draft-app -- --full-app --no-install
cd draft-app
npm install
npm run build
```

```bash
# Show all creator options
npm create tilcayo-app@latest -- --help
```

## Project structure

A complete generated app contains:

```text
my-app/
  api/
    src/app.ts          # Register API routes and middleware
    src/index.ts        # Database connection and server lifecycle
    src/auth.ts         # Authentication configuration
    src/storage.ts      # Cloudinary upload profiles
    src/models/
    src/controllers/
    src/routes/
    src/validators/
    src/services/
    .env                # Private backend configuration
  client/
    src/app/            # API, auth and Redux setup
    src/components/
    src/features/
    src/pages/
    src/routes.tsx      # Frontend routes
  scripts/dev.mjs       # Start both halves
  package.json
```

Edit your generated application's source. Its npm dependencies supply the reusable framework; you do not run the nine packages separately.

## Development commands

### Full-stack app root

Run inside `my-app/`. The separate dev commands are alternatives to the combined command.

```bash
# Start API and frontend together
npm run dev
```

```bash
# Start only the API
npm run dev:api
```

```bash
# Start only the frontend in a separate terminal
npm run dev:client
```

```bash
# Build both API and frontend
npm run build
```

```bash
# Start the built API
npm start
```

```bash
# List registered backend routes after building
npm run routes
```

```bash
# Lint frontend code
npm run lint --workspace client
```

`npm start` runs the API only. Host `client/dist` separately with SPA fallback and an `/api` proxy for production.

### API directory

Run inside `my-app/api/`, or the root of a standalone API app.

```bash
# Compile, start, watch and restart the API
npx tilcayo dev
```

```bash
# Compile the API to dist/
npx tilcayo build
```

```bash
# Start the compiled API with .env
npx tilcayo start
```

```bash
# Build once and start without watching
npx tilcayo dev:serve
```

```bash
# Show CLI commands
npx tilcayo --help
```

Stop an existing API before starting another on the same port.

### Frontend directory

Run inside `my-app/client/`, or the root of a standalone React app.

```bash
# Start the frontend dev server
npm run dev
```

```bash
# Build the frontend to dist/
npm run build
```

```bash
# Check frontend code
npm run lint
```

```bash
# Preview an existing production build locally
npm run preview
```

### Inspect API routes

Run inside the API directory after building.

```bash
# List all routes
npx tilcayo routes:list
```

```bash
# Filter by HTTP method
npx tilcayo routes:list --method GET
```

```bash
# Filter by URL path
npx tilcayo routes:list --path /api/auth
```

```bash
# Output JSON
npx tilcayo routes:list --json
```

```bash
# Choose the compiled app and environment file explicitly
npx tilcayo routes:list --entry dist/app.js --env-file .env
```

`--entry` defaults to `dist/app.js`. That module must export the app without connecting MongoDB or starting a listener.

## Generators

Generators create editable source and print registration steps. They refuse existing target files.

### Generate both API and frontend

Run from the full-stack app root.

```bash
# Generate a complete Project CRUD feature
npx tilcayo make:resource Project title:string active:boolean --fullstack
```

Register the generated API route in `api/src/app.ts` and the frontend route array in `client/src/routes.tsx`, following the printed instructions.

### Generate backend resources

Run inside the API directory. Choose resources that do not already exist; the admin preset already includes a product catalog.

```bash
# Generate a model, controller, validator and routes
npx tilcayo make:resource Article title:string published:boolean
```

```bash
# Generate related resources
npx tilcayo make:resource Author name:string
npx tilcayo make:resource Book title:string author:ref:Author "year:number?"
```

```bash
# Explicitly select MongoDB
npx tilcayo make:resource InventoryItem name:string quantity:number --mongodb
```

### Generate individual backend files

These commands are an alternative to generating the same feature with `make:resource`.

```bash
# Generate a model
npx tilcayo make:model Customer name:string email:string
```

```bash
# Generate a working CRUD controller for that model
npx tilcayo make:controller customers --resource name:string email:string
```

```bash
# Generate request validation
npx tilcayo make:validator customers name:string email:string
```

```bash
# Generate a resource route module
npx tilcayo make:route customers --resource
```

```bash
# Generate a service
npx tilcayo make:service reports
```

```bash
# Generate a plain controller with placeholder handlers
npx tilcayo make:controller reports
```

### Generate frontend files

Run inside a React app. These examples are alternatives when they target the same files.

```bash
# Generate resource types only
npx tilcayo make:types Book title:string "year:number?" author:ref:Author
```

```bash
# Generate types, API integration, forms and CRUD pages
npx tilcayo make:frontend Book title:string "year:number?" author:ref:Author
```

Register frontend routes and connect the matching backend API.

### Field syntax

| Syntax | Meaning |
| --- | --- |
| `name:string` | Required nonempty string |
| `price:number` | JSON number |
| `active:boolean` | JSON boolean |
| `publishedAt:date` | ISO timestamp with timezone |
| `"year:number?"` or `"year?:number"` | Optional field |
| `author:ref:Author` | One MongoDB ObjectId reference |
| `tags:refs:Tag` | Array of ObjectId references |
| `"author:ref:Author?"` | Optional reference |

Quote optional fields containing `?`. Referenced models use PascalCase. References validate ID shape; they do not enforce target existence or cascade deletion.

```bash
# Use comma-separated fields instead of positional fields
npx tilcayo make:model Customer --fields "name:string,email:string"
```

Do not combine `--fields` with positional fields. `--resource` applies to controllers/routes; `--fullstack` applies to resource generation. Legacy `--mongo` and `--crud` aliases remain supported.

## Routes and validation

Register a generated backend route module in `src/app.ts`:

```typescript
import articlesRoutes from './routes/articles.routes.js';

app.routes(articlesRoutes);
```

Backend resources provide `GET /articles`, `POST /articles`, and `GET`, `PUT`, `DELETE /articles/:id`. Full-stack generation prefixes API routes with `/api`.

Generated resource routes need server middleware for authentication and authorization. In tenant-enabled apps, tenant middleware also enforces workspace access and model scope.

Example custom route with Zod validation:

```typescript
import { defineRoutes } from '@tilcayo/core';
import { z } from 'zod';

export default defineRoutes(router => {
  router.post<{ name: string }>('/greet', ctx => ctx.response.success({
    greeting: `Hello, ${ctx.body.name}`,
  }), {
    validate: { body: z.object({ name: z.string().min(1) }) },
  });
});
```

See the [core guide](packages/core/README.md) for middleware, errors, pagination and MongoDB helpers.

## Authentication and administration

The complete app already includes auth and admin. For smaller generated apps, add them explicitly:

```bash
# Add authentication to a recognized API, React or full-stack starter
npx tilcayo add:auth
npm install
npm run build
```

```bash
# Add admin screens to an auth-enabled React or full-stack starter
npx tilcayo add:admin
npm install
npm run build
```

Installers refuse collisions and customized integration files. Run them from the relevant generated app root.

For low-level backend auth scaffolding instead of `add:auth`:

```bash
# Install backend auth and storage dependencies in your API app
npm install @tilcayo/auth @tilcayo/cloudinary
```

```bash
# Generate auth configuration, controllers, validators and routes
npx tilcayo make:auth
```

Register the generated routes as printed. Do not also register `auth.routes`. Missing auth secrets are generated; existing nonempty values are preserved.

Registration creates ordinary users. Administrator roles must be assigned through trusted server code or authorized management screens. Permission checks belong on the API as well as the frontend.

Full-stack starters restore sessions using an HttpOnly refresh cookie; access tokens stay in memory. Standalone API/frontend combinations need matching cookie-session settings and a suitable same-origin proxy.

## Tenant workspaces

The `--full-app` preset includes tenancy. There is no separate `add:tenancy` command.

After setting the setup credentials in `api/.env`, run from the app root:

```bash
# Provision the initial Super Admin
npm run tenancy:setup
```

Re-running setup resets that account's password and revokes its existing sessions. It does not create a default tenant or migrate records. Remove the bootstrap password from persistent configuration after setup.

1. Sign in on the main frontend address printed by Vite.
2. Open **Tenant administration** from the profile menu at `/admin/workspaces`.
3. Create a tenant and assign its administrator.
4. Open its address, such as `http://sunrise.localhost:5173`, using Vite's actual port.

Users can register on the main site or a tenant site. Tenant registration grants ordinary membership; existing accounts join using their existing password. Membership roles are separate for each tenant. A Super Admin needs assigned membership to enter a tenant workspace.

Tenant administrators manage their own users, roles, products, orders and Trash. Suspending a membership affects that workspace; suspending a global account affects all workspaces. Soft deletion retains records for restoration.

Optional demo data commands, from the app root:

```powershell
# Select an existing tenant for demo data
$env:TENANCY_SEED_SLUG = "sunrise"
```

```powershell
# Add demo records
npm run seed:demo
```

```powershell
# Remove demo records
npm run seed:demo:remove
```

For production, configure wildcard DNS, HTTPS and a Host-preserving same-origin `/api` proxy. Each workspace hostname has its own session cookie.

## Environment configuration

Backend settings belong in `api/.env` for full-stack apps or `.env` for standalone APIs. Commit safe placeholders in `.env.example`, not actual credentials.

| Variable | Purpose |
| --- | --- |
| `PORT` | API port; default `9149` |
| `MONGODB_URI` | MongoDB connection string |
| `AUTH_ACCESS_SECRET` | Generated access-token signing secret |
| `AUTH_REFRESH_SECRET` | Different generated refresh-token signing secret |
| `AUTH_COOKIE_SESSION` | Cookie-session setting in standalone generated auth APIs |
| `MAIL_USER`, `MAIL_PASS` | Password recovery email credentials |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_FROM` | SMTP settings |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary environment name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET_KEY` | Cloudinary secret; storage config also accepts `CLOUDINARY_API_SECRET` |
| `TENANCY_BASE_DOMAIN` | Workspace base domain; local default `localhost` |
| `TENANCY_SUPERADMIN_EMAIL`, `TENANCY_SUPERADMIN_PASSWORD` | Initial Super Admin setup credentials |
| `TENANCY_SEED_SLUG` | Existing tenant for optional demo data |

`VITE_API_URL` is public frontend configuration, normally `/api`. `API_PROXY_TARGET` changes the dev proxy's backend target from `http://127.0.0.1:9149`. Keep signing, mail and Cloudinary secrets out of `VITE_*` variables.

## Uploads

Set these backend values to enable Cloudinary uploads:

```ini
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET_KEY=your_api_secret
```

Restart the API after changing configuration. Upload profiles live in `api/src/storage.ts` in a full-stack app.

| Default profile | Usage |
| --- | --- |
| `avatar` | Public JPG/PNG/WebP profile photos, up to 2 MB |
| `productImage` | Public product images, up to 5 MB |
| `document` | Authenticated PDF/DOCX/XLSX/ZIP documents, up to 20 MB |

Profile-photo uploads are connected to Profile & settings and admin profiles. The other profiles are available for your own features. Elements includes local upload demos with copyable code; demo files stay in the browser.

The backend package exposes `validateFile`, `authorizeUpload`, `completeUpload`, `upload`, `getDownloadUrl` and `delete`. See the [Cloudinary guide](packages/cloudinary/README.md) and [UI guide](packages/ui/README.md).

## Troubleshooting

| Problem | Check |
| --- | --- |
| PowerShell blocks npm | Use `npm.cmd` / `npx.cmd` |
| Creator does not recognize `--full-app` | Use `create-tilcayo-app@latest`; the shortcut requires version `0.0.4` or newer |
| Tenancy setup reports missing settings | Fill the named variables in this generated app's `api/.env`, then rerun setup |
| MongoDB connection fails | Check the connection string, database availability and network access |
| API port is occupied | Stop the previous API or change `PORT` and `API_PROXY_TARGET` |
| A generated route returns 404 | Register the backend/frontend routes and rebuild |
| Generator reports an existing file | Edit that feature or choose another name |
| Existing app still has older UI | Creating an app does not upgrade an existing app's source files |
| Refresh returns to login | Check cookie-session settings and the same-origin proxy |
| Upload reports storage is not configured | Set backend Cloudinary variables and restart the API |
| Tenant page is forbidden | Check hostname, tenant status, membership and permissions |

## Package guides

| Package | Guide |
| --- | --- |
| `@tilcayo/core` | [API runtime and MongoDB](packages/core/README.md) |
| `@tilcayo/auth` | [Authentication and tenancy](packages/auth/README.md) |
| `@tilcayo/cloudinary` | [Cloudinary storage](packages/cloudinary/README.md) |
| `@tilcayo/react` | [React API and auth integration](packages/react/README.md) |
| `@tilcayo/ui` | [Reusable React components](packages/ui/README.md) |
| `@tilcayo/styles` | [Shared CSS](packages/styles/README.md) |
| `@tilcayo/admin` | [Admin components](packages/admin/README.md) |
| `@tilcayo/cli` | [Commands and generators](packages/cli/README.md) |
| `create-tilcayo-app` | [App creator](packages/create-tilcayo-app/README.md) |
