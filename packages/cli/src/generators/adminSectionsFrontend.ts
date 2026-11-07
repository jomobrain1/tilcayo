import type { GeneratedSource } from "./frontend.js";

export function adminSectionFiles(): GeneratedSource[] {
  const file = (name: string, source: string): GeneratedSource => ({ folder: "features/admin", name, source });
  return [
    file("overview.page.tsx", `import { Link, useSearchParams } from 'react-router';
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
`),
    file("overview-activity.ts", `import type { AdminDirectoryUser, AdminIconKind, AdminTone } from '@tilcayo/admin';
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
`),
    file("categories.section.tsx", `import { useSearchParams } from 'react-router';
import { AdminMetricCard, ResourceLayout } from '@tilcayo/admin';
import { Alert, Button, Table, TableSkeleton } from '@tilcayo/ui';
import { useAdminAccess } from './permissions';
import { useGetAdminCategoriesQuery } from './products.api';

export function CategoriesSection() {
  const { can } = useAdminAccess();
  const [, setParams] = useSearchParams();
  const { data, isError, isFetching, refetch } = useGetAdminCategoriesQuery();
  return <ResourceLayout title="Categories" description="Product counts and stock grouped across your entire catalog." actions={<Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>Refresh</Button>}>
    <div className="tl-admin-stats">
      <AdminMetricCard loading={!data && !isError} label="Categories" value={isError ? undefined : data?.data.length} note="Groups in your catalog" icon="box" tone="purple" />
      <AdminMetricCard loading={!data && !isError} label="Total products" value={isError ? undefined : data?.data.reduce((total, category) => total + category.totalProducts, 0)} note="Across all categories" icon="box" tone="blue" />
      <AdminMetricCard loading={!data && !isError} label="Stock units" value={isError ? undefined : data?.data.reduce((total, category) => total + category.stock, 0)} note="Across the full catalog" icon="check" tone="green" />
    </div>
    <section className="tl-admin-directory" aria-label="Product categories">
      {isError ? <div className="tl-admin-empty"><Alert variant="danger">Unable to load categories.</Alert></div> : !data ? <TableSkeleton label="Loading categories" columns={5} /> : <Table>
        <caption className="tl-sr-only">Categories across the catalog</caption>
        <thead><tr><th scope="col">Category</th><th scope="col">Products</th><th scope="col">Active</th><th scope="col">Stock units</th><th scope="col">Actions</th></tr></thead>
        <tbody>{data.data.map(category => <tr key={category.name}><td><strong>{category.name || 'Uncategorized'}</strong></td><td>{category.totalProducts}</td><td>{category.activeProducts}</td><td>{category.stock}</td><td><Button variant="ghost" disabled={!can('catalog')} onClick={() => setParams({ section: 'catalog', category: category.name })}>View products</Button></td></tr>)}
          {!data.data.length && <tr><td colSpan={5}><div className="tl-admin-empty">No categories yet. Add a product to get started.</div></td></tr>}
        </tbody>
      </Table>}
    </section>
  </ResourceLayout>;
}
`),
    file("orders.api.ts", `import type { TilcayoResponse } from '@tilcayo/react';
import { tilcayoApi } from '../../app/api';

export type OrderStatus = 'pending' | 'fulfilled' | 'cancelled';
export interface Order { _id: string; productName: string; sku: string; customerEmail: string; quantity: number; total: number; currency: string; status: OrderStatus; createdAt: string }
export interface OrdersResponse {
  items: Order[];
  pagination: { total: number; lastPage: number; hasPreviousPage: boolean; hasNextPage: boolean };
  stats: { totalOrders: number; pending: number; fulfilled: number; cancelled: number };
}
export const ordersApi = tilcayoApi.enhanceEndpoints({ addTagTypes: ['AdminOrders'] }).injectEndpoints({
  endpoints: builder => ({
    deleteAdminOrder: builder.mutation<unknown, string>({ query: id => ({ url: '/admin/orders/' + encodeURIComponent(id), method: 'DELETE' }), invalidatesTags: ['AdminOrders'] }),
    restoreAdminOrder: builder.mutation<unknown, string>({ query: id => ({ url: '/admin/orders/' + encodeURIComponent(id) + '/restore', method: 'POST', body: {} }), invalidatesTags: ['AdminOrders'] }),
    getAdminOrders: builder.query<TilcayoResponse<OrdersResponse>, { page: number; deleted?: 'active' | 'trash'; search: string; status: 'all' | OrderStatus }>({
      query: query => ({ url: '/admin/orders', query: { ...query, perPage: 10 } }), providesTags: ['AdminOrders'],
    }),
    createAdminOrder: builder.mutation<TilcayoResponse<Order>, { productSku: string; customerEmail: string; quantity: number }>({
      query: body => ({ url: '/admin/orders', method: 'POST', body }), invalidatesTags: ['AdminOrders'],
    }),
    updateAdminOrder: builder.mutation<TilcayoResponse<Order>, { id: string; status: OrderStatus }>({
      query: ({ id, status }) => ({ url: '/admin/orders/' + encodeURIComponent(id), method: 'PUT', body: { status } }), invalidatesTags: ['AdminOrders'],
    }),
  }),
});
export const { useDeleteAdminOrderMutation, useRestoreAdminOrderMutation, useGetAdminOrdersQuery, useCreateAdminOrderMutation, useUpdateAdminOrderMutation } = ordersApi;
`),
    file("orders.section.tsx", `import { useState, type FormEvent } from 'react';
import { AdminMetricCard, ResourceLayout } from '@tilcayo/admin';
import { Alert, Button, FormField, Input, Modal, Select, Table, TableSkeleton } from '@tilcayo/ui';
import { DeleteButton } from './delete-button';
import { useGetAdminOrdersQuery, useDeleteAdminOrderMutation, useCreateAdminOrderMutation, useUpdateAdminOrderMutation, type OrderStatus } from './orders.api';

function errorMessage(error: unknown) {
  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : 'Unable to save the order. Try again.';
}

export function OrdersSection() {
  const [query, setQuery] = useState<{ page: number; search: string; status: 'all' | OrderStatus }>({ page: 1, search: '', status: 'all' });
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const { currentData, isError, isFetching, refetch } = useGetAdminOrdersQuery(query, { refetchOnMountOrArgChange: true });
  const [remove] = useDeleteAdminOrderMutation();
  const [create, { isLoading: creating }] = useCreateAdminOrderMutation();
  const [update, { isLoading: updating }] = useUpdateAdminOrderMutation();
  const data = isError ? undefined : currentData?.data;
  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFormError('');
    try {
      await create({ productSku: String(form.get('sku')).trim(), customerEmail: String(form.get('email')).trim(), quantity: Number(form.get('quantity')) }).unwrap();
      setOpen(false);
    } catch (error) { setFormError(errorMessage(error)); }
  }
  return <ResourceLayout title="Orders" description="Track manually entered product orders and their fulfillment status." actions={<Button onClick={() => { setFormError(''); setOpen(true); }}>Add order</Button>}>
    <div className="tl-admin-stats tl-admin-product-stats">{[
      { icon: 'box' as const, tone: 'blue' as const, note: 'Recorded orders', label: 'Total orders', value: data?.stats.totalOrders }, { icon: 'alert' as const, tone: 'amber' as const, note: 'Awaiting fulfillment', label: 'Pending', value: data?.stats.pending },
      { icon: 'check' as const, tone: 'green' as const, note: 'Completed orders', label: 'Fulfilled', value: data?.stats.fulfilled }, { icon: 'close' as const, tone: 'red' as const, note: 'Cancelled orders', label: 'Cancelled', value: data?.stats.cancelled },
    ].map(stat => <AdminMetricCard loading={!data && !isError} key={stat.label} {...stat} />)}</div>
    {error && <Alert variant="danger">{error}</Alert>}
    <section className="tl-admin-directory" aria-label="Product orders" aria-busy={isFetching}>
      <form className="tl-admin-toolbar tl-admin-orders-toolbar" role="search" onSubmit={event => { event.preventDefault(); setQuery({ ...query, search: search.trim(), page: 1 }); }}>
        <Input aria-label="Search orders" placeholder="Search customer email, product, or SKU" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} />
        <Select aria-label="Filter order status" value={query.status} onChange={event => setQuery({ ...query, status: event.target.value as typeof query.status, page: 1 })}><option value="all">All orders</option><option value="pending">Pending</option><option value="fulfilled">Fulfilled</option><option value="cancelled">Cancelled</option></Select>
        <Button type="submit">Search</Button><Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>Refresh</Button>
      </form>
      {isError ? <div className="tl-admin-empty"><Alert variant="danger">Unable to load orders. Try Refresh.</Alert></div> : !data ? <TableSkeleton label="Loading orders" columns={6} /> : <>
        <Table><caption className="tl-sr-only">Orders and fulfillment status</caption><thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Product</th><th scope="col">Quantity</th><th scope="col">Total</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
          <tbody>{data.items.map(order => <tr key={order._id}>
            <td title={order._id}><strong>#{order._id.slice(-8).toUpperCase()}</strong><small className="tl-admin-product-sku">{new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(order.createdAt))}</small></td>
            <td>{order.customerEmail}</td><td><strong>{order.productName}</strong><small className="tl-admin-product-sku">{order.sku}</small></td><td>{order.quantity}</td>
            <td>{new Intl.NumberFormat('en', { style: 'currency', currency: order.currency }).format(order.total)}</td>
            <td><Select className={'tl-admin-status-select tl-admin-status-' + order.status} aria-label={'Status for order ' + order._id} value={order.status} disabled={updating} onChange={async event => {
              setError('');
              try { await update({ id: order._id, status: event.target.value as OrderStatus }).unwrap(); }
              catch (error) { setError(errorMessage(error)); }
            }}><option value="pending">Pending</option><option value="fulfilled">Fulfilled</option><option value="cancelled">Cancelled</option></Select></td>
            <td><DeleteButton iconOnly name={'Order #' + order._id.slice(-8)} onDelete={() => remove(order._id).unwrap()} /></td>
          </tr>)}{!data.items.length && <tr><td colSpan={7}><div className="tl-admin-empty"><strong>No orders found</strong><p>Add an order or adjust your filters.</p></div></td></tr>}</tbody>
        </Table>
        <footer className="tl-admin-directory-footer"><span>{data.pagination.total} matching orders · Page {query.page} of {data.pagination.lastPage}</span><nav aria-label="Order pages" className="tl-flex tl-gap-2"><Button variant="outline" disabled={isFetching || !data.pagination.hasPreviousPage} onClick={() => setQuery({ ...query, page: query.page - 1 })}>Previous</Button><Button variant="outline" disabled={isFetching || !data.pagination.hasNextPage} onClick={() => setQuery({ ...query, page: query.page + 1 })}>Next</Button></nav></footer>
      </>}
    </section>
    <Modal open={open} title="Add order" onClose={() => { if (!creating) setOpen(false); }}>
      {open && <form className="tl-stack" onSubmit={submitOrder}>
        {formError && <Alert variant="danger">{formError}</Alert>}
        <FormField label="Product SKU" id="order-sku">{props => <Input {...props} name="sku" required maxLength={60} />}</FormField>
        <FormField label="Customer email" id="order-email">{props => <Input {...props} name="email" type="email" required maxLength={254} />}</FormField>
        <FormField label="Quantity" id="order-quantity">{props => <Input {...props} name="quantity" type="number" min={1} max={10000} step={1} required defaultValue={1} />}</FormField>
        <p className="tl-help-text">Price and currency are taken from the product when the order is saved.</p>
        <Button type="submit" disabled={creating}>{creating ? 'Saving...' : 'Save order'}</Button>
      </form>}
    </Modal>
  </ResourceLayout>;
}
`),
  ];
}
