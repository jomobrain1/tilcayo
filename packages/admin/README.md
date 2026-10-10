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

The default starter includes an overview with live user counts and a searchable,
paginated directory at `/admin/users`. Users show their name, email, role badges,
and joined date. `AdminUsersTable` and `AdminDashboard` also work with data supplied
by your own API; this package has no Redux dependency.

Full-stack admin starters and `add:admin` mount the protected directory automatically.
For a separate API, register it explicitly:

```ts
app.routes(auth.adminRoutes);
```

`GET /api/admin/users` accepts `page`, `perPage`, `search`, and `role`
(`all`, `admin`, or `member`). It requires a valid admin session and returns public
user fields, pagination, and account counts. Member filtering means users without
the admin role. The directory displays roles; it does not grant or change them.

Users includes All users, Administrators, and Members filters on one page.
Full-stack admin starters and installers also include `/admin/products`, a catalog
with summary cards, status tabs, search, stock filters, and add/edit forms. Product
fields are name, SKU, category, price, currency (KES or USD), stock, and status
(draft, active, or archived). No demo records are inserted automatically. Low stock means an
active product with 1–5 units; out of stock means an active product with zero units.

The Product model and protected `/api/admin/products` routes live in the generated
API, so the auth package stays independent of commerce. Standalone React admin
apps need a backend implementing those routes. Full-stack generation wires both
sides automatically; the API rejects duplicate SKUs and invalid inventory values.

The top bar switches sections within the current page using `?section=`. Overview
has Summary, Users, and Inventory; Products has Catalog, Inventory, Categories,
and Orders. Sidebar links remain page navigation. Pass `sections` to AdminLayout
to configure the top bar for your own generated pages.

Categories aggregate counts and stock across the full catalog. Inventory defaults
to active products and displays stock-health labels. Orders are manual records:
enter a product SKU, customer email, and quantity, then track pending, fulfilled,
or cancelled status. The server snapshots the product name, SKU, price, and currency
and calculates the total; later product edits do not change existing orders.
These records do not charge payments or automatically adjust stock.

The catalog defaults to image cards and can switch to a compact table. Set an
image URL when adding or editing a product; unavailable images show a placeholder.
Inventory remains a table. Product images use no-referrer requests.

From a full-stack admin app, run `npm run seed:demo` to add eight marked sample
products, three categories, and six sample orders. Repeated runs preserve edits
and do not duplicate records. Run `npm run seed:demo:remove` to remove only those
marked records. Existing products, orders, users, and roles are preserved. Demo
photos are hosted on Unsplash and need an internet connection.

The default screens use a white background, white panels, compact tables, and
colored metric icons. `AdminMetricCard` accepts a label, optional numeric value,
note, icon, and tone; missing values display a dash. `AdminUserStats` renders the
three account totals. The profile shows only available account information and
assigned access. Quick actions link to existing management screens.

Product screens include live low-stock alerts and inventory health across all
active products. Catalog tables include image thumbnails; the Cards/Table toggle
and all top section tabs remain available. The sidebar keeps email and sign out
at the bottom on desktop.

Overview has four compact totals, recent users, and recent activity derived from
account registrations, product creation, and recorded orders. Users has a fourth
Members total. Its Featured profiles and Recent joins side panels contain
presentation-only fictional school accounts; View all expands those sample lists.
These samples do not create database users or change the real directory totals.

Profile includes personal information, account details, security, permissions,
and workspace shortcuts. Refresh session reloads current account information
through the app's existing auth flow. The top account dropdown links to profile
and signs out; the bell links to the overview activity section.
