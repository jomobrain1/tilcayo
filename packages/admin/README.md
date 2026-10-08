# @tilcayo/admin

Responsive management shell with navigation, logout, dashboard, profile and
resource-page layouts. Import `@tilcayo/styles` once. This package has no store
or authentication singleton: pass the current user and your central logout action.

```tsx
import { AdminLayout } from '@tilcayo/admin';
import { useAuth } from '../app/auth';

export function ManagementLayout() {
  const { user, logout } = useAuth();
  return <AdminLayout user={user} onLogout={logout}
    links={[{ label: 'Books', to: '/admin/books' }]} />;
}
```

Put the layout beneath `<RequireAuth role="admin" />`. Its children render through
React Router's Outlet (or an explicit children prop). Use AdminDashboard and
AdminProfile with the current user, and ResourceLayout for resource headings.
Generated CRUD routes can be nested with `createBooksRoutes('books', '/admin/books')`.

The sidebar collapses on narrow screens and has an accessible toggle. The shell
does not grant permissions. Protect corresponding backend endpoints with
`auth.middleware` and `auth.requireRole('admin')`; provision roles through trusted
server code. Registration never assigns admin rights.
