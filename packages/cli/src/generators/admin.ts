import type { GeneratedSource } from "./frontend.js";

export function adminFiles(): GeneratedSource[] {
  return [
    { folder: "features/admin", name: "admin-layout.tsx", source: `import { AdminLayout } from '@tilcayo/admin';
import { useAuth } from '../../app/auth';

export function ManagementLayout() {
  const { user, logout } = useAuth();
  return <AdminLayout user={user} onLogout={logout} links={[]} />;
}
` },
    { folder: "features/admin", name: "admin.routes.tsx", source: `import type { RouteObject } from 'react-router';
import { AdminDashboard, AdminProfile } from '@tilcayo/admin';
import { useAuth } from '../../app/auth';
import { RequireAuth } from '../../middleware/auth';
import { NotFoundPage } from '../../pages/not-found.page';
import { ManagementLayout } from './admin-layout';

function Dashboard() { const { user } = useAuth(); return <AdminDashboard user={user} />; }
function Profile() { const { user } = useAuth(); return <AdminProfile user={user} />; }

export const adminRoutes: RouteObject[] = [{
  element: <RequireAuth role="admin" />,
  children: [{ path: '/admin', element: <ManagementLayout />, children: [
    { index: true, element: <Dashboard /> },
    { path: 'dashboard', element: <Dashboard /> },
    { path: 'profile', element: <Profile /> },
    // Spread createBooksRoutes('books', '/admin/books') here for resource pages.
    { path: '*', element: <NotFoundPage /> },
  ] }],
}];
` },
  ];
}
