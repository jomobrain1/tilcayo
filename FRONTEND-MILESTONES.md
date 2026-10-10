# Frontend milestones

Milestones are built, checked, committed and pushed separately. Generated code
uses React Router for navigation and RTK Query for server state.

## F7: routing and protected layouts

Auth starters include public, guest, authenticated and admin route groups, a
profile route, 404 and access-denied pages. `ProtectedRoute` (`RequireAuth`)
consumes `useAuth()` and accepts an optional `role`. Auth and admin layouts use
nested outlets.

Backend users have an empty `roles` array by default. Assign roles through trusted
server code or database administration; registration never accepts roles.
Protect an admin API with `[auth.middleware, auth.requireRole("admin")]`.
Frontend guards control navigation; the server guard checks current database roles.

Sessions remain in memory. Reloading signs out unless the application supplies
bootstrap credentials through the existing auth configuration.

## F8: frontend resource types

`tilcayo make:types Book title:string year:number? author:ref:Author` creates
`src/features/books/books.types.ts`. Entity types use Mongo's `_id` and ISO string
timestamps. Dates are strings; unpopulated references are string IDs (or arrays).
Create inputs omit server fields; update inputs use `Partial`. The generator
shares the backend field parser and refuses to overwrite files.

## F9: frontend CRUD generation

`tilcayo make:frontend Book title:string year:number? author:ref:Author` generates
types, injected RTK Query endpoints, a form, list/detail/create/edit pages and a
route module under `src/features/books`. Spread `booksRoutes` into a layout's
children in `src/routes.tsx`. Endpoints use the existing `src/app/api.ts` API,
including its central auth transport. List/detail tags invalidate on mutations.

The API base URL plus `/books` must match the backend mount. Forms use labeled
native controls, ISO date conversion, unpopulated relation IDs, and disabled
controls during saves. Blank optional inputs are omitted; customize the backend
contract and form if a field needs an explicit clear operation. Pages provide
loading/error/empty states, deletion confirmation and success navigation.

## F10: full-stack resources

Run `tilcayo make:resource Book title:string author:ref:Author --fullstack` from
an app containing `api/package.json` and `client/package.json`. It generates
backend model/service/controller/validator/routes in `api/src` and F9's frontend
files in `client/src`. All target collisions are checked before either side is
written. Backend resource paths use `/api/books` and the frontend base URL is
`/api`. Registration instructions name both route integration points.

Generated resource routes are public. Add `[auth.middleware]` or
`[auth.middleware, auth.requireRole("admin")]` to backend route options for
private resources and put their frontend routes under the corresponding guard.

## F11: React UI primitives

`@tilcayo/ui` provides Button, Input, Select, Textarea, Card, Alert, Badge, Table,
Spinner, FormField, Modal and Pagination on `@tilcayo/styles`. It preserves native
HTML props and semantic markup, forwards input/button refs, connects field labels
and descriptions, and uses native dialog focus behavior. It has no Redux coupling.

## F12: admin dashboard

`@tilcayo/admin` exports a responsive AdminLayout, AdminDashboard, AdminProfile
and ResourceLayout. Pass the current user and logout action from `useAuth()`, add
resource links, and nest routes beneath the F7 admin guard. The package has no
store singleton. Its sidebar collapses on mobile; the page includes a skip link,
semantic navigation and a dedicated main area. Backend authorization is required.

## F13: explicit auth/admin installers

`tilcayo add:auth` supports API, React and full-stack apps. It registers backend
auth routes, prepares secrets and adds dependencies; on React it installs auth
pages, nested routes, store/API integration and session bootstrap. The three
frontend integration files must still match the plain starter; customized files
are refused before writing. Other routes and pages are preserved. Add navigation
links yourself. Backend apps must already have a MongoDB startup connection.

`tilcayo add:admin` requires frontend auth. It adds a separate protected admin
route module, dashboard/profile routes and shell, preserving existing navigation.
Both commands preflight source collisions and integration points, report all
changed files, update dependency manifests, and leave dependency installation
explicit. No npm lifecycle scripts generate application files.

## F14: full-stack starter

`create-tilcayo-app bookstore --fullstack --auth --admin` creates ordinary API
and React workspaces. The root has one dev command and builds both apps. Vite
proxies `/api` to the backend. Notes CRUD is generated and registered on both
sides. Auth and admin are optional; admin requires auth. API-only and standalone
React creation remain available. Environment and production hosting instructions
live in the generated README. The CLI and creator bundle their templates into
package artifacts, so installed commands do not read the framework source tree.

Verification covers all three full-stack presets, strict generated TypeScript,
relationship generation, HTTP CRUD with isolated model doubles, RTK cache
invalidation, installer collisions and rendered protected routes. The external
consumer script packs all eight packages, uses them in a fresh temporary app,
generates Author/Book resources, builds, lints and lists routes.

F15 release work remains: live MongoDB and browser verification, cross-platform
and package-manager checks, then publication. Sessions remain in memory.

Validation on October 8, 2026: all eight workspaces build; the complete suite has
127 passing tests and four skipped live MongoDB tests. A packed external npm app
passes installation, both builds, frontend lint, route listing and Vite startup.
The in-app browser connection was unavailable, so visual verification is pending.
Windows dev restart passes when the runner may stop its own child processes.

## Admin default update

The default admin now includes a responsive monochrome sidebar, account panel,
live user summary cards, and a directory with name/email search, role filters,
role badges, joined dates, and pagination. Both `/admin` and `/admin/users` use
the shared application API and auth session. Profiles and generated resource
pages use the same shell.

Full-stack admin starters and `add:admin` register `auth.adminRoutes` on the API.
Standalone React apps require their API to mount it explicitly. The read-only
`GET /api/admin/users` endpoint verifies the current admin role against MongoDB,
validates its query, and returns public fields only. Roles are displayed rather
than edited; admin provisioning remains a trusted server operation.

The current `my-fullstack-app` is updated alongside the package and templates.
Verification covers API access, filtering, safe responses, rendered roles, query
transport, starter/installer compilation, and a packed external app's install,
build, lint, route listing, and startup. In-app browser verification and the live
MongoDB connection were unavailable in this environment.

The catalog addition puts administrators inside the Users filters and adds a
Products page with real inventory cards, status tabs, search, pagination, and
add/edit forms. Generated full-stack APIs include a Product model and admin-only
catalog routes. Products start empty; admins add records through the UI. The
account footer contains only the email and Sign out button. Cards/controls use
4px corners, role labels use 2px corners, and user avatars remain circular.

Top navigation now switches sections on the current page rather than navigating
between pages. Overview includes Summary, Users, and Inventory. Products includes
Catalog, Inventory, Categories, and Orders. Categories use full-catalog aggregation
and link back to a filtered catalog. Manual orders are persisted with price/currency
snapshots, server-calculated totals, and fulfillment status; they do not process
payments or adjust inventory. API access, validation, category filtering, order
creation/status changes, and section rendering are covered by automated checks.

Catalog cards now include product photography, category, SKU, price, stock, and
status, with a Cards/Table switch. An image URL can be added or edited on products;
missing images use a placeholder. Explicit `seed:demo` and `seed:demo:remove`
commands add/remove marked sample products and orders without altering user data.
Seeding preserves demo edits on repeated runs and preflights ID/SKU collisions.
The current app has eight demo products, three categories, and six demo orders.

## Admin screen refinements (October 10, 2026)

All metric cards now use compact padding, icons and typography. The shell uses
white backgrounds, small corner radii, a narrow sidebar, and a bottom email/logout
section. The top section tabs remain; account controls include a profile dropdown.
Quick actions use chevrons on circular backgrounds.

Overview has four totals and recent users/activity panels. Users has four totals
and compact fictional Featured profiles/Recent joins panels with expandable
View all controls; the directory and its counts remain backed by the API.
Products includes stock alerts, inventory health and image thumbnails. Profile
has an identity card, four information panels and session refresh.

Validation: all workspaces build and all 22 targeted tests pass, covering React
provider deduplication, UI primitives, protected APIs, seed behavior, starter and
installer compilation, and route rendering. Live browser preview remains pending
because the in-app browser connection is unavailable.
