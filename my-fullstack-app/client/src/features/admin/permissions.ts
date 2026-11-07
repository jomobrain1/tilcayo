import { useAuth } from '../../app/auth';

export const tabLabels: Record<string, string> = { overview: 'Dashboard', users: 'Users', catalog: 'Catalog', inventory: 'Inventory', categories: 'Categories', orders: 'Orders', access: 'Roles & access', trash: 'Trash', tenants: 'Tenants' };
export function useAdminAccess() {
  const { user } = useAuth();
  const can = (tab: string) => tab === 'tenants' ? user?.platformRole === 'superadmin' && !user?.tenant : user?.roles?.includes('admin') || !!user?.adminTabs?.includes(tab);
  return { can, isAdmin: (user?.platformRole === 'superadmin' && !user?.tenant) || !!user?.roles?.includes('admin') };
}
