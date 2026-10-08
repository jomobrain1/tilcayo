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
