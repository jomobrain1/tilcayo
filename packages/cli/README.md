# @tilcayo/cli

Development commands and TypeScript generators for Tilcayo API applications.

## Start

Use Node.js 22.9+. The creator installs the CLI locally:

```sh
npm create tilcayo-app@latest my-api -- --type api --auth --yes
cd my-api
```

Set `MONGODB_URI` in `.env`, ensure MongoDB is available, then run `npm run dev`.
To add the CLI to an existing Tilcayo app, run `npm install --save-dev @tilcayo/cli`.

Run commands inside your app. On PowerShell, use `npm.cmd` / `npx.cmd` if script
execution is blocked.

## Develop and inspect

| Command | Purpose |
| --- | --- |
| `npx tilcayo dev` | Compile, start, watch, and restart |
| `npx tilcayo build` | Compile TypeScript into dist |
| `npx tilcayo start` | Run compiled code with .env |
| `npx tilcayo routes:list` | Inspect routes in dist/app.js |

Generated scripts also provide `npm run dev`, `npm run build`, `npm start`,
and `npm run routes`. Build before listing changed routes or running compiled
code. Stop dev before starting another server on the same port. The starter
includes the required TypeScript compiler and nodemon watcher.

```sh
npx tilcayo routes:list --method GET
npx tilcayo routes:list --path /api/auth
npx tilcayo routes:list --json
npx tilcayo routes:list --entry dist/app.js --env-file .env
```

## Generate a feature

```sh
npx tilcayo make:resource Product name:string price:number "description:string?"
```

Creates the model, controller, validator, and routes. Add this import and
registration to `src/app.ts` before its default export:

```ts
import productsRoutes from "./routes/products.routes.js";

app.routes(productsRoutes);
```

Test `POST /products` with JSON `{"name":"Notebook","price":250}`.
The generated routes also support `GET /products` and `GET`, `PUT`, and
`DELETE /products/:id`. They are public until you add auth middleware.

## Fields

| Syntax | Meaning |
| --- | --- |
| `name:string` | Required nonempty string |
| `price:number` | JSON number |
| `active:boolean` | JSON boolean |
| `publishedAt:date` | ISO timestamp with timezone |
| `"description:string?"` | Optional field |
| `author:ref:Author` | One Author ObjectId |
| `tags:refs:Tag` | Array of Tag ObjectIds |
| `"author:ref:Author?"` | Optional reference |

The optional form `"description?:string"` also works. Quote fields containing
`?`. MongoDB is the supported adapter; `--mongodb` selects it explicitly.

## Individual generators

These are alternatives to `make:resource`; do not run them against the same
already-generated files:

```sh
npx tilcayo make:model Product name:string price:number
npx tilcayo make:controller products --resource name:string price:number
npx tilcayo make:validator products name:string price:number
npx tilcayo make:route products
npx tilcayo make:service reports
npx tilcayo make:auth
```

Generators refuse collisions and print integration steps. Auth needs
`@tilcayo/auth`, MongoDB, environment configuration, and route registration.

## Relationships

```sh
npx tilcayo make:resource Author name:string
npx tilcayo make:resource Book title:string author:ref:Author
```

Register both generated route modules. Relationship resources also create a
service, such as `src/services/books.service.ts`. Population is explicit:

```ts
import { getBooks } from "./services/books.service.js";

await getBooks({ populate: ["author"] });
```

References validate ID shape, not target existence, and do not cascade deletes.
Load referenced models before populating, for example by registering their routes.

## Troubleshooting

- Run commands in the app directory containing package.json and tsconfig.json.
- Missing compiled output: run `npm run build`.
- API startup failure: check MongoDB connectivity and environment values.
- Missing new routes: register them in src/app.ts, then rebuild.
- File collision: edit the existing feature or choose a new name.

## More guides

[Project overview](https://github.com/jomobrain1/tilcayo#readme) ·
[Create an app](https://www.npmjs.com/package/create-tilcayo-app) ·
[CLI](https://www.npmjs.com/package/@tilcayo/cli) ·
[Authentication](https://www.npmjs.com/package/@tilcayo/auth)

