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
