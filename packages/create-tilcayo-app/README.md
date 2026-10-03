# create-tilcayo-app

Create a Tilcayo API with an interactive setup wizard:

```sh
create-tilcayo-app
```

Once published to your registry, bootstrap without a global install:

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

Setup installs dependencies and builds unless `--no-install` is supplied. The
selected package manager must be installed. Running the creator from a built
Tilcayo source checkout automatically links the local framework packages and
their shared Zod and Mongoose dependencies. Keep that checkout available while
developing the generated app. The published creator uses registry versions of
`@tilcayo/core`, `@tilcayo/auth`, and `@tilcayo/cli` instead.
Installation failures retain the generated project and report recovery steps.
MongoDB must be running before starting an API that uses it.

Inside the generated project, use `tilcayo dev`, `tilcayo build`, `tilcayo start`,
and `tilcayo routes:list`. If the CLI is installed only in the project, invoke
it through `npx tilcayo`, `pnpm exec tilcayo`, or `yarn exec tilcayo`.
