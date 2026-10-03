# @tilcayo/core

Tilcayo's TypeScript API runtime: routing, typed request contexts, Zod validation,
middleware, and MongoDB helpers built on Express and Mongoose.

## Start a project

Use Node.js 22.9+ and run this outside the framework repository:

```sh
npm create tilcayo-app@latest my-api -- --type api --no-auth --yes
cd my-api
```

Set `MONGODB_URI` in `.env` to a running MongoDB instance, then run `npm run dev`.
The health endpoint is `http://localhost:9149/health`. For a database-free starter,
use `--type minimal --no-auth`.

## Use the runtime directly

```sh
npm install @tilcayo/core zod
```

Save this as `server.mjs` and run `node server.mjs`:

```js
import { createApp, defineRoutes, requestId, securityHeaders } from "@tilcayo/core";
import { z } from "zod";

const app = createApp({ middleware: [requestId(), securityHeaders()] });

app.routes(defineRoutes((router) => {
  router.get("/health", (ctx) => ctx.response.success({ status: "ok" }));
  router.post("/greet", (ctx) => ctx.response.success({
    greeting: `Hello, ${ctx.body.name}`,
  }), { validate: { body: z.object({ name: z.string().min(1) }) } });
}));

app.listen(9149);
```

Send `POST /greet` with JSON `{"name":"Ada"}`. Invalid input returns HTTP 422.
TypeScript apps can use `TilcayoContext<Body>` for separate typed controllers.

## Routing and responses

Register modules with `app.routes()`. Routers support `get`, `post`, `put`,
`patch`, `delete`, `group`, and `resource`. Resources provide list, create,
read, update (PUT), and delete endpoints. Add PATCH explicitly when needed.

Route options accept `validate: { body, query, params }` and `middleware: [...]`.
Response helpers include `ctx.response.success(data)`, `created(data)`, and
`noContent()`. Throw `badRequest()`, `notFound()`, `unauthorized()`, or
`forbidden()` for HTTP errors.

## MongoDB

Install `mongoose` in your application when importing it directly:

```sh
npm install mongoose
```

Save as `database.mjs` and run `node --env-file=.env database.mjs`, with a valid
`MONGODB_URI` in your environment:

```js
import mongoose from "mongoose";
import { connectMongo, disconnectMongo, mongoModel } from "@tilcayo/core";

const Product = mongoModel("Product", new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
}, { timestamps: true }));

await connectMongo(process.env.MONGODB_URI);
await Product.create({ name: "Notebook", price: 250 });
const products = await Product.all();
const page = await Product.paginate({ page: 1, perPage: 20 });
await disconnectMongo();
```

In an API, keep the connection open until shutdown. The generated starter handles
that lifecycle. Models also offer filtering, sorting, selection, population,
cursor pagination, bulk operations, aggregation, and `.raw` for Mongoose queries.
Pagination is opt-in: a query parameter alone does not change `all()` behavior.
Keep query filters and bulk operations under application control.

## Middleware

| Export | Purpose |
| --- | --- |
| `requestId` | Request identifiers |
| `requestLogger` | Request logging |
| `securityHeaders` | Basic HTTP security headers |
| `cors` | Cross-origin requests |
| `rateLimit` | Limits held in the current process |
| `bodyLimit` | Request body limits |
| `cache` | HTTP cache headers, not server-side storage |

Rate limits do not share state across servers and do not trust proxy forwarding
headers. The MongoDB connection helper configures public DNS servers before
connecting. Authentication is available separately in `@tilcayo/auth`.

## More guides

[Project overview](https://github.com/jomobrain1/tilcayo#readme) ·
[Create an app](https://www.npmjs.com/package/create-tilcayo-app) ·
[CLI](https://www.npmjs.com/package/@tilcayo/cli) ·
[Authentication](https://www.npmjs.com/package/@tilcayo/auth)

