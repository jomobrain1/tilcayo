import { WorkspaceGate, WorkspaceIdentity } from '../tenancy/workspace-switcher';
import { AdminLayout } from '@tilcayo/admin';
import { useAuth } from '../../app/auth';
import { Outlet, useLocation } from 'react-router';
import { useAdminAccess } from './permissions';

export function ManagementLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const { can } = useAdminAccess();
  const sections = pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/dashboard'
    ? [{ id: 'summary', label: 'Summary', tab: 'overview' }, { id: 'users', label: 'Users', tab: 'users' }, { id: 'inventory', label: 'Inventory', tab: 'inventory' }]
    : pathname === '/admin/products'
      ? [{ id: 'catalog', label: 'Catalog', tab: 'catalog' }, { id: 'inventory', label: 'Inventory', tab: 'inventory' }, { id: 'categories', label: 'Categories', tab: 'categories' }, { id: 'orders', label: 'Orders', tab: 'orders' }]
      : pathname === '/admin/settings'
        ? [{ id: 'users', label: 'Users', tab: 'users' }, { id: 'access', label: 'Roles & access', tab: 'access' }, { id: 'trash', label: 'Trash', tab: 'trash' }]
        : [];
  return <AdminLayout accountContent={<WorkspaceIdentity />} user={user} onLogout={logout} showGroupHeadings={false} links={[
    ...(can('tenants') || can('users') || can('access') || can('trash') ? [{ label: 'Settings', to: '/admin/settings', group: 'Account' }] : [])
  ]} sections={sections.filter(section => can(section.tab))}><WorkspaceGate><Outlet /></WorkspaceGate></AdminLayout>;
}
