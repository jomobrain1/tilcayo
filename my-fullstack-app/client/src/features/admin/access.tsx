import { Navigate, Outlet, useLocation } from 'react-router';
import { useAdminAccess, tabLabels } from './permissions';

export function AdminAccessGuard() {
  const { pathname, search } = useLocation();
  const { can } = useAdminAccess();
  if (!Object.keys(tabLabels).some(can)) return <Navigate to="/forbidden" replace />;
  const section = new URLSearchParams(search).get('section');
  if (pathname === '/admin/settings' && section === 'tenants') return <Navigate to={can('tenants') ? '/admin/workspaces' : '/forbidden'} replace />;
  const settingsTab = can('users') ? 'users' : can('access') ? 'access' : can('trash') ? 'trash' : null;
  if (pathname === '/admin/settings' && !section && settingsTab) return <Navigate to={'/admin/settings?section=' + settingsTab} replace />;
  const productTabs = ['catalog', 'inventory', 'categories', 'orders'];
  const first = productTabs.find(can);
  if (pathname === '/admin/products' && !section && first && first !== 'catalog') return <Navigate to={'/admin/products?section=' + first} replace />;
  if ((pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/dashboard') && !section && !can('overview')) {
    const destination = can('users') ? '/admin/users' : first ? '/admin/products?section=' + first : settingsTab ? '/admin/settings?section=' + settingsTab : null;
    return <Navigate to={destination ?? '/forbidden'} replace />;
  }
  let tab: string | null = null;
  if (pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/dashboard') tab = section === 'users' ? 'users' : section === 'inventory' ? 'inventory' : 'overview';
  if (pathname === '/admin/products') tab = productTabs.includes(section ?? '') ? section : 'catalog';
  if (pathname === '/admin/settings') tab = section === 'tenants' ? 'tenants' : section === 'users' ? 'users' : section === 'trash' ? 'trash' : 'access';
  if (pathname === '/admin/users') tab = 'users';
  if (pathname === '/admin/workspaces') tab = 'tenants';
  if (pathname === '/admin/access') tab = 'access';
  if (pathname === '/admin/trash') tab = 'trash';
  if (tab && !can(tab)) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}
