# @tilcayo/auth

JWT authentication for Tilcayo, with bcrypt passwords, MongoDB-backed users and
refresh tokens, refresh rotation, and route protection.

## Start with authentication

Use Node.js 22.9+:

```sh
npm create tilcayo-app@latest my-api -- --type api --auth --yes
cd my-api
```

Set `MONGODB_URI` in `.env`. Keep the generated, distinct random
`AUTH_ACCESS_SECRET` and `AUTH_REFRESH_SECRET` values private.
Ensure MongoDB is available, then start with `npm run dev`.

## Add auth to an existing Tilcayo MongoDB app

```sh
npm install @tilcayo/auth
npx tilcayo make:auth
```

The generator creates `src/auth.ts`, controllers, validators, and routes.
It fills missing secrets in `.env`, adds blank placeholders to `.env.example`,
and updates environment ignore rules. Existing source collisions stop generation.

Add the import and registration to `src/app.ts` before its default export:

```ts
import authRoutes from "./routes/auth.routes.js";

app.routes(authRoutes);
```

Load the environment and connect MongoDB before starting the server. For a minimal
app without MongoDB, also install `mongoose`, set `tilcayo.database` to `mongo`
in `package.json`, configure `MONGODB_URI`, and add database startup/shutdown
handling. The generator prints instructions but does not edit startup.

## Endpoints

The default base URL is `http://localhost:9149/api/auth`.

| Method and path | Input |
| --- | --- |
| `POST /register` | JSON `name`, `email`, `password` |
| `POST /login` | JSON `email`, `password` |
| `POST /refresh` | JSON `refreshToken` |
| `POST /logout` | JSON `refreshToken` |
| `GET /me` | `Authorization: Bearer <accessToken>` |

Register with `Content-Type: application/json`:

```json
{"name":"Ada","email":"ada@example.com","password":"ChangeThisExample123!"}
```

Registration and login return tokens under `data.tokens`. Send the access token
as a Bearer token on protected requests. Refresh returns a replacement token pair:
save both new tokens and stop using the old refresh token.

## Protect your routes

Auth setup does not automatically protect generated CRUD routes. In a route module:

```ts
import { defineRoutes } from "@tilcayo/core";
import { auth } from "../auth.js";

export default defineRoutes((router) => {
  router.get("/account", (ctx) => ctx.response.success(auth.user(ctx)), {
    middleware: [auth.middleware],
  });
});
```

Register the module with `app.routes()`. Use `middleware: [auth.middleware]`
in a `router.resource()` call's options to protect all its operations.
Implement resource ownership and roles in application code when needed.

## Direct configuration

```ts
import { createAuth } from "@tilcayo/auth";

export const auth = createAuth({
  accessTokenSecret: process.env.AUTH_ACCESS_SECRET ?? "",
  refreshTokenSecret: process.env.AUTH_REFRESH_SECRET ?? "",
  accessTokenTtlSeconds: 900,
  refreshTokenTtlSeconds: 604800,
});
```

Secrets must differ and each contain at least 32 bytes. Configuration also accepts
`issuer`, `audience`, `passwordRounds`, and a route `prefix`. To use built-in
routes, register `app.routes(auth.routes)` instead of the generated auth module.
Register only one set of auth endpoints.

Defaults: access tokens last 15 minutes and refresh tokens 7 days. Logout revokes
the supplied refresh token; issued access tokens remain usable until expiry.
Password reset, email verification, and roles/permissions are not implemented.

## More guides

[Project overview](https://github.com/jomobrain1/tilcayo#readme) ·
[Create an app](https://www.npmjs.com/package/create-tilcayo-app) ·
[CLI](https://www.npmjs.com/package/@tilcayo/cli) ·
[Authentication](https://www.npmjs.com/package/@tilcayo/auth)

