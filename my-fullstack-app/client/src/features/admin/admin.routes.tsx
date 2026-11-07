import { Navigate, type RouteObject } from 'react-router';
import { RequireAuth } from '../../middleware/auth';
import { NotFoundPage } from '../../pages/not-found.page';
import { ManagementLayout } from './admin-layout';
import { UsersPage } from './users.page';
import { ProfilePage } from './profile.page';
import { ProductsPage } from './products.page';
import { OverviewPage } from './overview.page';
import { AdminAccessGuard } from './access';
import { SettingsPage } from './settings.page';
import { TenantsPage } from '../tenancy/tenants.page';

export const adminRoutes: RouteObject[] = [{
  element: <RequireAuth />,
  children: [{ element: <AdminAccessGuard />, children: [{ path: '/admin', element: <ManagementLayout />, children: [
    { index: true, element: <OverviewPage /> },
    { path: 'dashboard', element: <OverviewPage /> },
    { path: 'users', element: <UsersPage /> },
    { path: 'products', element: <ProductsPage /> },
    { path: 'settings', element: <SettingsPage /> },
    { path: 'workspaces', element: <TenantsPage administrationOnly /> },
    { path: 'access', element: <Navigate to="/admin/settings?section=access" replace /> },
    { path: 'trash', element: <Navigate to="/admin/settings?section=trash" replace /> },
    { path: 'profile', element: <ProfilePage /> },
    // Spread createBooksRoutes('books', '/admin/books') here for resource pages.
    { path: '*', element: <NotFoundPage /> },
  ] }] }],
}];
