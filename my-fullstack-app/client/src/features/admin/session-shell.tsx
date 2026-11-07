import { AdminLayout } from '@tilcayo/admin';

/** Navigation is presentation only; protected routes and queries stay unmounted. */
export function AdminSessionShell() {
  return <AdminLayout pending links={[{ label: 'Settings', to: '/admin/settings', group: 'Account' }]} />;
}
