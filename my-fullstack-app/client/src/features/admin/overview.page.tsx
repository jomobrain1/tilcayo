import { Link, useSearchParams } from 'react-router';
import { ResourceLayout, AdminUsersTable, AdminIcon, AdminMetricCard } from '@tilcayo/admin';
import { Alert, ListSkeleton, TableSkeleton } from '@tilcayo/ui';
import { useAdminAccess } from './permissions';
import { useGetAdminUsersQuery } from './admin.api';
import { useGetAdminProductsQuery } from './products.api';
import { useGetAdminOrdersQuery } from './orders.api';
import { recentActivity, activityTime } from './overview-activity';
import { UsersPage } from './users.page';
import { ProductsPage } from './products.page';

function Summary() {
  const { can } = useAdminAccess();
  const canProducts = ['catalog', 'inventory', 'categories'].some(can);
  const users = useGetAdminUsersQuery({ page: 1, search: '', role: 'all' }, { skip: !can('users') });
  const products = useGetAdminProductsQuery({ page: 1, search: '', status: 'all', stock: 'all' }, { skip: !canProducts });
  const orders = useGetAdminOrdersQuery({ page: 1, search: '', status: 'all' }, { skip: !can('orders') });
  const activity = recentActivity(users.isError ? [] : users.data?.data.items ?? [], products.isError ? [] : products.data?.data.items ?? [], orders.isError ? [] : orders.data?.data.items ?? []).slice(0, 5);
  const loading = users.isLoading || products.isLoading || orders.isLoading;
  const error = users.isError || products.isError || orders.isError;
  const userStats = users.isError ? undefined : users.data?.data.stats;
  const productStats = products.isError ? undefined : products.data?.data.stats;
  return <ResourceLayout title="Dashboard" description="A quick look at your application.">
    <div className="tl-admin-stats tl-admin-overview-stats">
      {can('users') && <AdminMetricCard loading={loading} label="Users" value={userStats?.totalUsers} note="Registered accounts" icon="users" />}
      {canProducts && <AdminMetricCard loading={loading} label="Products" value={productStats?.totalProducts} note="Across your catalog" icon="box" />}
      {can('orders') && <AdminMetricCard loading={loading} label="Orders" value={orders.isError ? undefined : orders.data?.data.stats.totalOrders} note="Recorded orders" icon="check" />}
      {canProducts && <AdminMetricCard loading={loading} label="Low stock" value={productStats?.lowStock} note="Products needing attention" icon="alert" />}
    </div>
    <div className="tl-admin-overview-grid">
      {can('users') && <section className="tl-admin-directory" aria-label="Recent users">
        <header className="tl-admin-directory-heading"><div><h2>Recent users</h2><p>The latest people to join.</p></div><Link className="tl-btn tl-btn-ghost" to="/admin/users">View all ?</Link></header>
        {users.isError ? <Alert variant="danger">Unable to load recent users.</Alert> : users.data ? <AdminUsersTable users={users.data.data.items.slice(0, 5)} /> : <TableSkeleton label="Loading recent users" columns={4} />}
      </section>}
      <section className="tl-admin-directory" aria-label="Recent activity" aria-busy={loading}>
        <header className="tl-admin-directory-heading"><div><h2>Recent activity</h2><p>Latest updates in your workspace.</p></div></header>
        <div className="tl-admin-activity-list">
          {error && <Alert variant="danger">Some activity could not be loaded.</Alert>}
          {loading ? <ListSkeleton label="Loading activity" rows={4} /> : activity.map(item => <Link className="tl-admin-activity-row" key={item.id} to={item.to}>
            <AdminIcon kind={item.icon} /><div><strong>{item.name}</strong><small>{item.description}</small></div>
            <time dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString()}>{activityTime(item.createdAt)}</time>
          </Link>)}
          {!loading && !activity.length && <div className="tl-admin-empty"><strong>No recent activity</strong><p>Updates from your available sections will appear here.</p></div>}
        </div>
      </section>
    </div>
  </ResourceLayout>;
}
export function OverviewPage() {
  const [params] = useSearchParams();
  if (params.get('section') === 'users') return <UsersPage />;
  if (params.get('section') === 'inventory') return <ProductsPage inventoryOnly />;
  return <Summary />;
}
