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
