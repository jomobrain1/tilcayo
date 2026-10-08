# Tilcayo React auth starter

React, TypeScript, Vite, React Router, Redux Toolkit, and Tilcayo styles/auth.
Use Node.js 22.12+ or 24+. Dependencies and the production build are prepared by
the creator unless `--no-install` was supplied.

```sh
npm run dev
```

Open `/register` to create an account or `/login` to sign in. An authenticated
user is sent to `/dashboard`, or back to the protected URL they requested.
The header provides logout. Forms include pending states, native validation,
password confirmation on registration, and server error feedback.

## Connect the backend

This is a frontend application. A Tilcayo backend with authentication and MongoDB
must be running for registration and login to work. From the framework checkout's
`examples` directory you can create a separate backend:

```sh
node ../packages/create-tilcayo-app/dist/bin.js my-api --type api --auth --yes
cd my-api
```

Configure its private `.env` (`MONGODB_URI`), start MongoDB, and run `npm run dev`.
Keep generated auth secrets on the backend only. It listens on port 9149.

The frontend's Vite development proxy sends `/api` to `http://127.0.0.1:9149`.
Edit `vite.config.ts` if your backend listens elsewhere. `src/app/auth.ts` uses
`VITE_API_URL` or `/api`; `.env.example` contains only this public setting.
With a different frontend API origin, configure backend CORS appropriately.

The backend must expose:

| Method | Path |
| --- | --- |
| POST | `/api/auth/register` |
| POST | `/api/auth/login` |
| POST | `/api/auth/logout` |
| POST | `/api/auth/refresh` |
| GET | `/api/auth/me` |

## Routes and frontend middleware

- `src/App.tsx`: router and authentication bootstrap.
- `src/routes.tsx`: public, guest-only, and authenticated route objects.
- `src/layouts/app-layout.tsx`: shared page layout.
- `src/components/navigation.tsx`: responsive navigation and logout.
- `src/middleware/auth.tsx`: `RequireAuth` and `GuestOnly` navigation guards.
- `src/pages/login.page.tsx`, `register.page.tsx`: authentication pages.
- `src/components/auth-form.tsx`: shared editable form.
- `src/pages/dashboard.page.tsx`: protected account page.
- `src/app/auth.ts`: configured auth instance, hook, and session bootstrap.
- `src/app/api.ts`: inject resource endpoints into this shared authenticated API.
- `src/app/store.ts`, `hooks.ts`: Redux store and application-specific typed hooks.

Add protected routes beneath the `RequireAuth` group in `src/routes.tsx`. These guards
control navigation; backend authentication middleware must still authorize data
requests. The frontend never contains database credentials or JWT signing secrets.

Tokens are kept in memory, not browser storage. Refresh handles access-token
expiry within a running session, but reloading the page signs you out. Persistent
sessions require a separate, explicitly designed storage/cookie strategy; no
"remember me" behavior is provided. Login/register screens render without a
backend; submitting them requires the API.

## Build and deploy

```sh
npm run build
npm run lint
npm run preview
```

Deploy `dist/` with client routes falling back to `index.html`. Vite's proxy runs
only during development: production must route `/api` to your backend or use a
public `VITE_API_URL` when building. Local generation links the framework's styles
and React packages, so keep the checkout available and rebuild packages after edits.

## Toasts

Login and registration show one success toast for five seconds, with a dismiss button.
Messages use `successMessage`, then the backend response message, then a default.
For example, `<AuthForm mode="login" successMessage="Welcome back!" />`.
Form errors stay inline. The shared layout keeps the toast visible across navigation.

Elsewhere, import `toast` from `src/lib/toast` and call
`toast.success("Profile saved")`, `toast.error("Unable to save")`, or `toast.dismiss()`.
Use `toast.warning("Check your details")` or `toast.info("Update available")` for other notices.
Success is green, errors red, warnings amber, and information blue.
A new toast replaces the previous one. No extra package is required.

Customize the shared `Toaster` in `src/layouts/app-layout.tsx`:

```tsx
<Toaster duration={4000} position="top-right" compact className="my-toast" />
```

`duration` is in milliseconds (default 5000; 0 disables automatic dismissal).
`position` accepts `top-left`, `top-right`, `bottom-left`, or `bottom-right` (default).
`compact` reduces spacing and font size while keeping the close button easy to tap.
`className` applies to the outer notification container. Style it in `src/App.css`:

```css
.my-toast {
  --toast-background: #fff;
  --toast-radius: 8px;
  --toast-padding: 8px 12px;
}
```

These CSS variables override the defaults, including compact padding.

## Forgot password

Choose **Forgot password?** on `/login`, or open `/forgot-password`. Enter your
email, verify the six-digit code, then choose and confirm a new password. Reset
credentials stay in memory; refreshing the page starts recovery again.

On the backend, configure `sendPasswordResetCode`. Generated APIs and the
basic-api example support SMTP through backend-only `MAIL_USER` and
`MAIL_PASS` settings. Gmail is the default; change `MAIL_HOST` and `MAIL_PORT`
for another provider. Never put either value in a `VITE_` variable.
The backend must expose `/api/auth/forgot-password`, `/api/auth/verify-reset-code`,
and `/api/auth/reset-password` (all POST). Without mail configuration, the form
shows that password recovery is unavailable.
