# my-fullstack-app

Tilcayo MongoDB API + React/Vite client with authentication and admin pages.

Visit `/elements` for 36 interactive component examples in nine searchable
sections. Each example has a collapsed code panel, syntax highlighting and a
Copy code button. The copied React/TypeScript source includes imports, state,
handlers and Tilcayo styles; previews run that same source. Form examples use
local state without changing your account or sending API requests.

Use Node.js 22.12+ or 24+. Start MongoDB and configure api/.env (MONGODB*URI,
PORT and private auth/mail settings when enabled). Never put secrets in VITE*\*.

```sh
npm install
npm run dev
```

The client runs on Vite's printed URL and proxies /api to port 9149. If you change
the API port, set API_PROXY_TARGET for the client dev process or edit
client/vite.config.ts. Visit /notes for sample CRUD, /login to sign in, /register to create an account, /dashboard for your overview and /profile for profile and settings, and /admin for management.
An HttpOnly refresh cookie restores your session on reload; access tokens stay in memory. Production requires HTTPS (NODE_ENV=production) and a same-origin API proxy preserving Host. Configure backend SMTP settings for password recovery.
Provision the admin role through trusted server code; registration never grants it.

Generate both halves from this directory:

```sh
npx tilcayo make:resource Author name:string --fullstack
npx tilcayo make:resource Book title:string author:ref:Author year:number? --fullstack
```

Register backend routes in api/src/app.ts and spread frontend route arrays into
client/src/routes.tsx layout children. For admin resources, add their links in
client/src/features/admin/admin-layout.tsx and nest createBooksRoutes('books',
'/admin/books') in the admin route module. Tenant resource routes require membership and use tenant-scoped models. Add role guards for privileged actions.

Run npm run build to build both halves. Production uses
api/dist/index.js and client/dist; serve the client with SPA fallback and proxy
/api to the API. npm run start starts the API only. Configure HTTPS on your host.
The dev runner requires npm on PATH; npm ships with Node.js even if dependencies
are installed with pnpm or Yarn. Stop both processes with Ctrl+C. Separate
dev:api and dev:client scripts are available.

Dependencies link to this source checkout. Keep it available, or replace file/link dependencies with published package versions before sharing the app.

Admin updates: use `/admin/access` to create roles and choose visible tabs,
then assign roles in `/admin/users` -> Roles. The built-in admin role manages
access. Delete actions move users, products and orders to `/admin/trash`; Restore
returns them to active lists. Sidebar headings are off by default; enable them
from the top account dropdown -> Sidebar headings.

Open the profile icon for My dashboard and Profile & settings. Super Admin also sees Platform administration and Tenant administration; tenant admins see Workspace administration. Profile editing saves your display name; security includes password reset and browser sign-out.

Admin Settings / Users lists accounts and supports Add user, Roles, Suspend / Reactivate, and Delete to Trash. New users receive an initial password entered by the administrator; the app does not email it.

Tenant mode is enabled. Use `http://localhost:5174/admin/workspaces` for the Super Admin (adjust the Vite port if needed). Setup provisions only the Super Admin. Create tenant names, subdomains and administrator assignments in Tenant administration. There is no default tenant or automatic record migration; existing tenants and their records remain available through management. Each tenant has its own sign-in address and session. Users may have a main-site account and separate memberships in multiple tenants. Tenant signup creates a normal membership, while administrators assign admin roles. There is no Main app workspace selector. Anyone can register on the main site for a personal dashboard. Super Admin manages platform users, tenants and tenant administrators. Tenant administrators manage their own users, roles, products, inventory, categories and orders. New tenant administrators must be existing accounts; create one in platform Users first.

Tenant administration owns tenant cards and creation. Suspend/Resume controls sign-in availability. Delete moves a tenant to Platform administration > Settings > Trash > Tenants, retaining all data. Restore returns its saved status; tenant sessions revoked by suspension/deletion must sign in again.

Platform administration includes Products with the same Catalog, Inventory, Categories, Orders and add/edit forms as tenant administration. Its records use dedicated platform collections; tenant catalog data stays within each tenant.


Reloads show a layout-aware skeleton while the HttpOnly session is checked.
Refresh returns the verified user with the rotated tokens, avoiding a second
identity request. Workspace metadata loads in parallel. Reusable card, table,
list and form skeletons cover initial data loading; background refreshes retain
existing content. Browser storage is not used to cache credentials or roles.

## File uploads

Set backend `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET_KEY` in `api/.env`, then restart the API. Never put them in frontend variables. Profile & settings and the admin profile support photo uploads and removal. Upload profiles are in `api/src/storage.ts`; avatars allow JPG/PNG/WebP up to 2 MB. Elements has local image and document upload demos with reusable code.
