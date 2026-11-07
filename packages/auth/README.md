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
| `PATCH /profile` | Bearer access token and JSON `name`; updates only your display name |
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
Use auth.requireRole("admin") or auth.requireAdminTab("catalog") after auth.middleware. Resource ownership remains application-specific.

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
Roles and admin tab permissions are supported. Email verification is not implemented.

## More guides

[Project overview](https://github.com/jomobrain1/tilcayo#readme) ·
[Create an app](https://www.npmjs.com/package/create-tilcayo-app) ·
[CLI](https://www.npmjs.com/package/@tilcayo/cli) ·
[Authentication](https://www.npmjs.com/package/@tilcayo/auth)


## Password recovery

Enable email OTP recovery by passing a delivery callback to `createAuth`:

```ts
sendPasswordResetCode: async ({ email, code, expiresAt }) => {
  await yourMailer.send({ to: email, subject: "Password reset",
    text: `Your code is ${code}. It expires at ${expiresAt.toISOString()}.` });
},
```

The generated API and basic-api example include an SMTP adapter. Set
`MAIL_USER` and `MAIL_PASS` (a Gmail app password) in the backend `.env`. Gmail
defaults to `smtp.gmail.com:465`. Change `MAIL_HOST`, `MAIL_PORT`, and optionally
`MAIL_FROM` / `MAIL_SECURE` to use another provider, or replace the delivery callback. These values never
belong in frontend environment files. Without a callback, requesting recovery
returns `503 RESET_UNAVAILABLE`; login and registration continue to work.

| Endpoint | JSON input |
| --- | --- |
| `POST /api/auth/forgot-password` | `email` |
| `POST /api/auth/verify-reset-code` | `email`, six-digit `code` |
| `POST /api/auth/reset-password` | `resetToken`, `password` |

Verification returns `data.resetToken`, a random, single-use credential restricted
to resetting the password. Codes and reset tokens share a ten-minute expiry;
verification does not extend it. Codes are keyed hashes in MongoDB, with five
attempts, a sixty-second resend cooldown, and IP rate limits. Request responses
are identical for known and unknown emails. Delivery runs in the background to
keep provider latency out of the response; failures log a generic message and
allow a retry. For a serverless deployment, have the callback enqueue a durable
email job instead.

A successful reset increments the user's session version, immediately invalidating
existing access and refresh tokens, and revokes stored refresh tokens. Users must
log in again. Old users/tokens without a version are treated as version zero.

SMTP convenience helper (uses Nodemailer):

```ts
import { createSmtpPasswordResetSender } from "@tilcayo/auth";

const sendPasswordResetCode = createSmtpPasswordResetSender({
  user: process.env.MAIL_USER!,
  password: process.env.MAIL_PASS!,
  // host: "smtp.your-provider.com", port: 587,
});
// Pass sendPasswordResetCode to createAuth; call only when credentials are set.
```

Port 465 uses TLS immediately; other ports require STARTTLS. Connections retain
certificate validation. Keep mail credentials private and out of source control.


## Persistent sessions and admin access

Enable `cookieSession: true` in `createAuth()` and `createTilcayoAuth()` for a
same-origin API. Full-stack starters enable this automatically through
`AUTH_COOKIE_SESSION=true` in `api/.env`. Access tokens stay in memory; a rotating
HttpOnly, SameSite=Strict refresh cookie restores the session after a reload.
The cookie expires after the configured refresh-token lifetime (7 days by default).
Production (`NODE_ENV=production`) adds Secure; serve over HTTPS and preserve the
original Host through the same-origin reverse proxy. Cross-origin cookie session
requests are rejected. Body-token authentication remains the default for API clients.

Mount `app.routes(auth.adminRoutes)` to expose Roles & access, user role assignment,
and user soft delete/restore. The built-in `admin` role always has full access and
is provisioned through trusted server code. Administrators create other roles at
`/admin/access`, selecting tabs, then assign them from Users -> Roles. Multiple
roles combine their tabs. Only the built-in admin can manage roles; custom roles
cannot grant access management. Permissions are loaded from MongoDB on each
protected request and returned as `adminTabs` in the public session user.

Deleted users cannot sign in, refresh, or use an existing access token. Deleting
an account increments its session version and revokes refresh tokens; restoring
it requires a new login. Users cannot delete or demote themselves. Custom roles
with Users access cannot delete or restore full administrators.

Admin user management: `POST /api/admin/users` creates a user with `name`, `email`, `password`, and optional `roles`. `PUT /api/admin/users/:id/status` accepts `{ suspended: boolean }`. Both require the built-in admin role. Suspension revokes refresh sessions and invalidates access tokens; reactivation requires a fresh login. Administrators cannot suspend their own account.

Tenant mode accepts `createAuth({ tenancy: { baseDomain: "localhost" }, ... })`. Register `auth.tenantMiddleware` and `auth.tenantAccessMiddleware` globally, and mount `auth.tenancyRoutes`. Host-bound tokens and current membership checks prevent cross-workspace sessions. Tenant roles use a compound `(tenantId, key)` index; membership changes invalidate that workspace session. Platform tenant and membership changes are recorded in `tilcayo_tenant_audit`.

Public registration works on the main domain and tenant subdomains. Main-site
signup creates an ordinary account without a tenant. Tenant signup creates an
ordinary membership for that hostname. An existing account can join another
tenant by registering there with its existing password; this never replaces its
credentials or changes existing roles. Suspended or deleted memberships remain
inactive. Super Admin assigns tenant administrators through tenant membership
management. Setup creates no default tenant.
