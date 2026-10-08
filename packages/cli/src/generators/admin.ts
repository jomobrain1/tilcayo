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

export const authRoutesSource = `import type { RouteObject } from 'react-router';
import { AuthLayout } from '../../layouts/auth-layout';
import { RequireAuth, GuestOnly } from '../../middleware/auth';
import { LoginPage } from '../../pages/login.page';
import { RegisterPage } from '../../pages/register.page';
import { ForgotPasswordPage } from '../../pages/forgot-password.page';
import { DashboardPage } from '../../pages/dashboard.page';
import { ForbiddenPage } from '../../pages/forbidden.page';

export const authRoutes: RouteObject[] = [
  { element: <GuestOnly />, children: [{ element: <AuthLayout />, children: [
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> },
    { path: '/forgot-password', element: <ForgotPasswordPage /> },
  ] }] },
  { element: <RequireAuth />, children: [
    { path: '/dashboard', element: <DashboardPage /> },
    { path: '/profile', element: <DashboardPage /> },
  ] },
  { path: '/forbidden', element: <ForbiddenPage /> },
];
`;
