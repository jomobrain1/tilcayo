# Tilcayo testing and release guide

Use this checklist before publishing the four npm packages. It describes the
implemented features and expected results; unchecked items are tests to perform,
not claims that a release has already passed. Publishing packages and deploying
a running API server are separate operations. This guide covers package release.

## 1. Prepare the test environment

- Use Node.js 22.9 or later and a package manager: npm, pnpm, or Yarn.
- Use a test MongoDB instance for CRUD and authentication tests.
- Run one API at a time on port 9149, or change PORT in each app's .env.
- Use fresh project names. The creator and generators refuse existing targets.
- Use Postman or Thunder Client for the HTTP requests below.

There are two command locations:

| Location | What runs here |
| --- | --- |
| Framework repository root | Workspace builds, automated tests, creator, npm packaging |
| Generated app, such as `my` or `my-api` | `tilcayo dev`, `build`, `start`, `routes:list`, generators |

Application commands below use `tilcayo`. If it is installed only locally, use
`npx tilcayo`, `pnpm exec tilcayo`, or `yarn exec tilcayo` with the same arguments.
Package build and publishing operations use npm because they manage the npm packages.

## 2. Feature inventory

| Package | Implemented features |
| --- | --- |
| `@tilcayo/core` | App/server creation; reusable route registrars; GET, POST, PUT, PATCH, DELETE; groups and prefixes; resource routes; typed context; response helpers; errors; asynchronous Zod body/query/params validation |
| `@tilcayo/core` middleware | App/group/resource/route middleware; request IDs; logging; security headers; CORS; rate limiting; body limits; public cache headers |
| `@tilcayo/core` database | MongoDB connection management; Mongoose model wrapper; reads, CRUD, filtering, sorting, selection, population, pagination, bulk writes, upsert, distinct, aggregation; access to raw Mongoose models |
| `@tilcayo/auth` | Registration; login; bcrypt passwords; JWT access and refresh tokens; refresh rotation; logout; current user; route protection; reusable controllers, validators and built-in routes |
| `@tilcayo/cli` | Dev server with rebuild/restart; build; start; route inspection; resource, model, controller, validator, route, service and auth generators |
| `create-tilcayo-app` | Colored setup menus; project name; npm/pnpm/Yarn; MongoDB CRUD or minimal API; optional auth; standard folders; configuration; private .env and shareable .env.example; install/build; noninteractive flags |

Current limits: no frontend starter, MySQL adapter, role/permission system,
password-reset or email-verification flow. Sample CRUD routes are public even
when auth is selected. Rate limits are held in one process, not shared across
servers. Cache middleware sets HTTP headers; it is not a server-side response cache.

## 3. Build and run automated checks

From the repository root:

```sh
npm install
npm run build
node --test tests/*.test.mjs
```

Expected: all packages compile and no tests fail. Live MongoDB tests skip when
MONGODB_URI is not supplied. The root `npm test` currently delegates to workspace
test scripts; use the explicit `node --test` command to run the repository suite.

To include live database tests, put a test connection string in the root .env:

```sh
node --env-file=.env --test tests/*.test.mjs
```

The live tests create uniquely named databases and drop those databases afterward.
The test database account must have permission to create and drop them.

| Test file | Main coverage |
| --- | --- |
| `create-app.test.mjs` | Starter options, all four type/auth variants, compilation, HTTP health, local links, registry template versions, collision handling, dev restart |
| `cli-generators.test.mjs` | Generators, fields, compilation, invalid input, file collisions, auth scaffolding |
| `routes-list.test.mjs` | Route metadata, filtering, JSON, environment discovery |
| `defineRoutes.test.mjs`, `m3.test.mjs`, `m4.test.mjs` | Routing, context, validation, responses, errors |
| `middleware.test.mjs` | Middleware order, rate limits, CORS, size limits, request IDs, cache behavior |
| `mongo.test.mjs`, `mongo-model.test.mjs` | Connection handling and model helpers |
| `example-crud.test.mjs`, `books-mongo.test.mjs` | Example CRUD and live MongoDB operations |
| `auth.test.mjs`, `auth-mongo.test.mjs` | Auth configuration, hashing, JWTs, guards, validation, persistence, rotation races, revocation |

- [ ] Build passes.
- [ ] Automated tests pass.
- [ ] Live MongoDB tests pass rather than skip.

## 4. Test the project creator

From the repository root, open the wizard:

```sh
npx create-tilcayo-app
```

Choose a fresh name, package manager, application type and authentication choice.
Use arrow keys and Enter for menus. Project name is text. Ctrl+C should cancel
before creating any files. Invalid project names should show a validation message.

For explicit, repeatable setups:

```sh
npx create-tilcayo-app qa-api --type api --auth --package-manager npm --yes
npx create-tilcayo-app qa-public --type api --no-auth --package-manager npm --yes
npx create-tilcayo-app qa-minimal --type minimal --no-auth --package-manager npm --yes
npx create-tilcayo-app qa-minimal-auth --type minimal --auth --package-manager npm --yes
```

Run these independently. Each should install and build without needing a running
database; the database is needed when starting apps that use MongoDB.

| Option | Meaning |
| --- | --- |
| `[project-name]` | New folder and npm package name |
| `--type api` | Health endpoint plus MongoDB note CRUD |
| `--type minimal` | Health endpoint; MongoDB is added if auth is selected |
| `--auth` / `--no-auth` | Include or omit authentication |
| `--package-manager npm\|pnpm\|yarn` | Choose the dependency installer |
| `--no-install` | Write files, but skip dependency installation and compilation |
| `--yes` / `-y` | Use defaults for unanswered choices without menus |
| `--help` / `-h` | Show creator help |

Defaults: my-api, npm, api, no auth, installation enabled. Noninteractive runs
also use defaults for missing choices.

Expected structure:

```text
package.json
tsconfig.json
.gitignore
.env
.env.example
README.md
src/
  app.ts
  index.ts
  config.ts
  auth.ts              (when auth is enabled)
  controllers/
  routes/
  models/
  validators/
  services/
```

- [ ] App registration lives in app.ts; startup and database connection live in index.ts.
- [ ] .env.example has keys without real auth secrets or comments.
- [ ] Auth-enabled .env contains two distinct random secrets; they are not printed.
- [ ] .env is ignored by Git.
- [ ] Auth-disabled projects omit the auth package and auth routes.
- [ ] Minimal without auth has no MongoDB URI requirement.
- [ ] Repeat an existing project name: fail without changing its files.
- [ ] Try `--type web` or `--auth --no-auth`: fail before creating files.
- [ ] Repeat a creation with pnpm and Yarn installed and selected.

When the creator runs from this source checkout, generated dependencies link to
local framework packages and shared Zod/Mongoose. Keep the checkout available.
The published creator should generate registry versions instead. Local success
alone does not prove a published package works; perform section 10 too.

## 5. Test app lifecycle commands

Inside qa-api, configure MONGODB_URI in .env, then run:

```sh
tilcayo --help
tilcayo dev
```

Expected: compilation succeeds, MongoDB connects, and the API listens on PORT
(9149 by default). GET http://localhost:9149/health returns:

```json
{"success":true,"message":"Success","data":{"status":"ok"}}
```

- [ ] Edit the health controller: the dev server rebuilds and serves the change.
- [ ] Change PORT in .env: the dev server restarts using the new port.
- [ ] Introduce a TypeScript error: compilation fails visibly; fix it and recover.
- [ ] Ctrl+C stops the dev server and releases the port.

Stop dev, then test the compiled lifecycle:

```sh
tilcayo build
tilcayo start
```

Expected: start loads .env and serves the compiled app. `start` does not build;
missing dist/index.js should tell you to run `tilcayo build`.
`dev:serve` is an internal dev-server command, not a separate user workflow.

## 6. Test route inspection

From a second terminal inside the app, after building:

```sh
tilcayo routes:list
tilcayo routes:list --method GET
tilcayo routes:list --path /api/auth
tilcayo routes:list --json
tilcayo routes:list --entry dist/app.js --env-file .env
```

Expected: method, full path, handler, middleware and validation columns.
--method is case-insensitive; --path is a substring filter. --json returns an
array. Unnamed middleware may appear as anonymous. No database connection or
server startup should be needed to inspect the generated app.

Expected route counts before adding more routes:

| Starter | Count |
| --- | --- |
| api without auth | 6 |
| api with auth | 11 |
| minimal without auth | 1 |
| minimal with auth | 6 |

- [ ] Filters return only matching routes; an unmatched path returns no matches.
- [ ] Missing flag values and unsupported methods exit with an error.
- [ ] The nearest .env is discovered up to the repository/workspace boundary.
- [ ] Explicit --env-file overrides discovery; existing shell variables take precedence.
- [ ] Newly generated routes appear after registration in app.ts and rebuilding.

## 7. Test all generators

Inside a MongoDB-enabled test app, use fresh names:

| Command | Expected result |
| --- | --- |
| `tilcayo make:resource Gadget name:string price:number active:boolean` | Model, CRUD controller, validator and route files |
| `tilcayo make:model Entry title:string` | MongoDB model |
| `tilcayo make:controller entries --resource title:string` | Working CRUD using the previously created Entry model |
| `tilcayo make:validator entries title:string` | Create/update body schemas and ID schema |
| `tilcayo make:route entries` | Routes using the available controller and validators |
| `tilcayo make:controller reports` | Placeholder controller handlers |
| `tilcayo make:route reports` | Routes for those handlers |
| `tilcayo make:service reports` | Service file |
| `tilcayo make:route previews` | Standalone placeholder routes when no controller exists |
| `tilcayo make:auth` | Auth config, controllers, validators and routes; run in an app without existing auth files |

Register each route file you want to exercise in src/app.ts. For Gadget:

```ts
import gadgetRoutes from "./routes/gadgets.routes.js";

app.routes(gadgetRoutes);
```

Run `tilcayo build` and `tilcayo routes:list`. Generators print registration
instructions; they do not automatically modify app.ts.

Additional supported options:

| Option | Test |
| --- | --- |
| Field types | string, number, boolean, date |
| Optional field | `tilcayo make:resource Event title:string "startsAt?:date"` |
| Explicit database | `tilcayo make:resource Asset label:string --mongodb` |
| Resource-style standalone route | `tilcayo make:route samples --resource` |
| Legacy field syntax | `tilcayo make:model LegacyItem --fields "name:string,active:boolean"` |
| Legacy database alias | --mongo is an alias for --mongodb |
| Legacy controller option | --crud requests CRUD handlers and requires a matching model |

Date validators expect an ISO timestamp with an offset and convert it to Date.
Quote optional field arguments on shells that treat ? as a wildcard.

- [ ] Repeat a generator: it refuses to overwrite existing files.
- [ ] Invalid names, field types or flags fail without partial generation.
- [ ] --mongo and --mongodb together are rejected as duplicate aliases.
- [ ] A resource collision is detected before any of its four files are written.
- [ ] Adding auth to a minimal app also requires MongoDB dependencies/configuration,
      startup connection and route registration; make:auth prints the required steps.

## 8. Test HTTP behavior

Use base URL http://localhost:9149. For POST and PUT choose raw JSON and
Content-Type: application/json. Save returned IDs and tokens for later requests.

### Notes CRUD

Use an api starter. Note routes are public by default.

| Request | Body / setup | Expected |
| --- | --- | --- |
| GET /health | None | 200, data.status is ok |
| POST /notes | `{"title":"First note","content":"Hello"}` | 201; save data._id |
| GET /notes | None | 200; includes the new note |
| GET /notes/ID | Substitute saved ID | 200; matching note |
| PUT /notes/ID | `{"title":"Updated note"}` | 200; title updated and content retained |
| DELETE /notes/ID | Saved ID | 204, empty body |
| GET /notes/ID | Deleted ID | 404 |
| POST /notes | `{}` or `{"title":""}` | 422 validation error |
| GET /notes/not-an-id | Invalid ID shape | 422 from route validation |
| POST /notes | Malformed JSON text | 400 |
| GET /does-not-exist | None | 404 |

Restart the server before deleting a test note and confirm it persists in MongoDB.
Repeat the CRUD sequence against /gadgets with the generated fields.

### Authentication

Use an auth-enabled starter. Use a new email each time you test registration.

```json
{
  "name": "Release Tester",
  "email": "release-test@example.com",
  "password": "ReleaseTest123!"
}
```

| Request | Input | Expected |
| --- | --- | --- |
| POST /api/auth/register | JSON above | 201; safe user and data.tokens |
| POST /api/auth/register | Same email again | 409 |
| POST /api/auth/login | Same email and password, without name | 200; new token pair |
| POST /api/auth/login | Wrong password of at least 8 characters | 401 |
| GET /api/auth/me | Authorization: Bearer ACCESS_TOKEN | 200; user, no password hash |
| GET /api/auth/me | No token or an invalid token | 401 |
| POST /api/auth/refresh | `{"refreshToken":"CURRENT_REFRESH_TOKEN"}` | 200; replacement token pair |
| POST /api/auth/refresh | Reuse the consumed refresh token | 401 |
| POST /api/auth/logout | Supply the NEW refresh token | 204 |
| POST /api/auth/refresh | Use that logged-out token | 401 |
| POST /api/auth/logout | Repeat with the same token | 204 |
| POST /api/auth/register | Invalid email or short password | 422 |

After refreshing, save both new tokens. Access tokens last 15 minutes by default;
refresh tokens last 7 days. Logout revokes the supplied refresh token; an already
issued access token remains usable until expiry. Register/login share a limit
of 20 attempts per 15 minutes in generated routes; exceeding it returns 429.

## 9. Test library features beyond the starter defaults

These helpers need explicit use in routes/controllers. Run the automated tests
listed in section 3, then use temporary test routes if you want manual checks.

| Feature | Expected behavior |
| --- | --- |
| Groups/resources | Prefixes compose; resource expands to GET list, POST, GET item, PUT item, DELETE item |
| PATCH | A manually declared router.patch route dispatches correctly; resource does not generate PATCH |
| Middleware order | App, group, resource, route, parser, validation, controller |
| Custom middleware | Returning early stops the chain; next() twice fails |
| Zod validation | Body/query/params errors return 422; transformed values reach the controller |
| Response helpers | success 200; created 201; noContent 204 |
| Error helpers | badRequest 400, unauthorized 401, forbidden 403, notFound 404, conflict 409; unexpected errors return sanitized 500 |
| Request ID | X-Request-Id exists on matched starter endpoints |
| Security headers | Starter responses include nosniff, frame denial and referrer policy |
| Request logger | Opt-in logging receives request ID, method, path, status and duration |
| CORS | Explicit allowed origins receive headers; preflight runs relevant middleware without invoking a controller |
| Rate limiting | Excess requests return 429 and Retry-After; quotas recover after the configured window |
| Body limit | Over-limit JSON returns 413 before controller execution |
| Cache headers | Explicit public GET routes receive caching headers; auth/cookie requests and errors use no-store |
| Model reads | all, where, find, first, findOrFail, firstOrFail, count, exists; sort/select/populate/limit options |
| Model writes | create, createMany, update, delete, updateMany, deleteMany, upsert; invalid writes rejected |
| Bulk safety | Empty filters rejected for bulk update/delete and upsert |
| Reporting | distinct and aggregate return expected values; .raw exposes underlying Mongoose |
| Offset pagination | paginate returns items and metadata; defaults page 1 / 20 items, maximum page size 100 |
| Cursor pagination | cursorPaginate advances by ObjectId without repeating items |
| Connection helpers | connectMongo, disconnectMongo and getMongoState reflect connection lifecycle |
| Auth helpers | auth.middleware protects routes; auth.user(ctx) reads the authenticated user; auth.guard supports guarded handlers |

Pagination is opt-in. Generated list controllers use all(); adding ?page=2 does
not automatically paginate them. Change the controller to call paginate(ctx.query).

For production planning, note that the connection helper currently configures
public DNS servers, forwarding headers are not trusted for IP rate limits, and
authorization rules must be implemented by the application.

## 10. Verify actual package artifacts

From the framework root, rebuild before packing; package files come from dist:

```sh
npm run build
npm pack --workspace @tilcayo/core --dry-run
npm pack --workspace @tilcayo/auth --dry-run
npm pack --workspace @tilcayo/cli --dry-run
npm pack --workspace create-tilcayo-app --dry-run
```

Check for compiled JS, declaration files and valid CLI entrypoints. Ensure real
.env files, generated apps, database content and local dependency links are absent
from the distributable package manifests/files. The creator must include its
compiled templates and prompt dependencies. A dry run previews the package;
it does not publish it. See the [npm pack documentation](https://docs.npmjs.com/cli/v11/commands/npm-pack/).

Create tarballs for an isolated pre-release check:

```sh
npm pack --workspace @tilcayo/core
npm pack --workspace @tilcayo/auth
npm pack --workspace @tilcayo/cli
npm pack --workspace create-tilcayo-app
```

In a fresh folder OUTSIDE this repository, initialize a throwaway package and
install all four tarballs in one npm install command using their actual paths.
At version 0.0.1 the tarball names are tilcayo-core-0.0.1.tgz,
tilcayo-auth-0.0.1.tgz, tilcayo-cli-0.0.1.tgz and create-tilcayo-app-0.0.1.tgz.

Run the installed creator:

```sh
npx create-tilcayo-app packed-api --type api --auth --no-install --yes
```

Expected: the generated manifest has registry versions, not file: or link: paths
into the framework checkout. Before the first public release, replace the
generated app's three Tilcayo dependency versions with file: paths to the core,
auth and CLI TARBALLS, then install dependencies. This tests packaged code rather
than source-directory symlinks. Build the app, list routes and repeat health,
CRUD and auth tests. Do not keep the temporary tarball paths in release templates.

- [ ] All tarballs contain their required runtime files.
- [ ] Packed creator runs outside the checkout.
- [ ] A generated app compiles and runs using installed tarballs.
- [ ] Zod types compile and model operations use the connected Mongoose instance.
- [ ] Repeat clean installs using npm, pnpm and Yarn.
- [ ] Check menus, builds and dev restarts on Windows, macOS and Linux.

## 11. Publish only after the checks pass

Confirm the release versions, matching internal dependency ranges, package
metadata, and your publishing rights for the @tilcayo scope and creator name.
The repository root and generated apps are private; publish the four library/CLI
workspaces individually. Review the working tree so test apps and private files
are not accidentally included in the release commit.

From the framework root, publish in dependency order:

```sh
npm login
npm whoami
npm publish --workspace @tilcayo/core --access public
npm publish --workspace @tilcayo/auth --access public
npm publish --workspace @tilcayo/cli --access public
npm publish --workspace create-tilcayo-app --access public
```

These commands perform a real public release. npm does not allow reusing an
already published package name/version combination. Follow the account's
authentication requirements when prompted. See the
[npm publish documentation](https://docs.npmjs.com/cli/v11/commands/npm-publish/).

After all four packages are available, use a clean terminal and folder outside
the checkout to test the public installation path:

```sh
npm create tilcayo-app@latest release-smoke -- --type api --auth --yes
cd release-smoke
npx tilcayo routes:list
npx tilcayo dev
```

Configure the test MongoDB connection before dev. Confirm there are no local
framework links, then repeat /health, CRUD and auth requests. Use the exact release
version instead of latest when verifying a specific release or non-latest tag.

## Release record

| Check | Result / evidence |
| --- | --- |
| Version and commit | |
| Operating systems tested | |
| Package managers and versions tested | |
| Full build | |
| Automated suite | |
| Live MongoDB tests | |
| Interactive menus and cancellation | |
| All four starter variants | |
| Generators and collision handling | |
| HTTP CRUD and auth | |
| Packed standalone installation | |
| npm package contents | |
| Post-publish clean installation | |
