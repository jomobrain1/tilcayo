import type { AdminDirectoryUser, AdminIconKind, AdminTone } from '@tilcayo/admin';
import type { Product } from './products.api';
import type { Order } from './orders.api';

export interface OverviewActivity {
  id: string; name: string; description: string; createdAt: string;
  to: string; icon: AdminIconKind; tone: AdminTone;
}

// Each source is fetched newest first. Ten entries per source cover the latest four overall.
export function recentActivity(users: AdminDirectoryUser[], products: Product[], orders: Order[]): OverviewActivity[] {
  const events: OverviewActivity[] = [
    ...users.map(user => ({ id: 'user-' + user.id, name: user.name, description: 'Joined the application', createdAt: user.createdAt ?? '', to: '/admin/users', icon: 'users' as const, tone: 'purple' as const })),
    ...products.map(product => ({ id: 'product-' + product._id, name: product.name, description: 'Product added to the catalog', createdAt: product.createdAt ?? '', to: '/admin/products', icon: 'box' as const, tone: 'green' as const })),
    ...orders.map(order => ({ id: 'order-' + order._id, name: order.productName, description: 'Order recorded - ' + order.quantity + ' units', createdAt: order.createdAt, to: '/admin/products?section=orders', icon: 'check' as const, tone: 'blue' as const })),
  ];
  return events.filter(event => Number.isFinite(Date.parse(event.createdAt)))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id))
    .slice(0, 4);
}

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
export function activityTime(value: string, now = Date.now()): string {
  const seconds = (Date.parse(value) - now) / 1000;
  if (Math.abs(seconds) < 60) return 'Just now';
  if (Math.abs(seconds) < 3600) return relativeTime.format(Math.round(seconds / 60), 'minute');
  if (Math.abs(seconds) < 86400) return relativeTime.format(Math.round(seconds / 3600), 'hour');
  return relativeTime.format(Math.round(seconds / 86400), 'day');
}
