import { useGetTenantsQuery, useRestoreTenantMutation } from '../tenancy/tenancy.api';
import { useState } from 'react';
import { ResourceLayout } from '@tilcayo/admin';
import { Alert, Button, Table, TableSkeleton } from '@tilcayo/ui';
import { useAdminAccess } from './permissions';
import { actionError } from './action-error';
import { useGetAdminUsersQuery, useRestoreAdminUserMutation } from './admin.api';
import { useGetAdminProductsQuery, useRestoreAdminProductMutation } from './products.api';
import { useGetAdminOrdersQuery, useRestoreAdminOrderMutation } from './orders.api';

export function TrashPage() {
  const { can } = useAdminAccess();
  const kinds = [{ key: 'tenants', label: 'Tenants', enabled: can('tenants') }, { key: 'users', label: 'Users', enabled: can('users') }, { key: 'products', label: 'Products', enabled: can('catalog') }, { key: 'orders', label: 'Orders', enabled: can('orders') }].filter(kind => kind.enabled);
  const [kind, setKind] = useState(kinds[0]?.key ?? '');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const users = useGetAdminUsersQuery({ page, search: '', role: 'all', deleted: 'trash' }, { skip: kind !== 'users' });
  const products = useGetAdminProductsQuery({ page, search: '', stock: 'all', status: 'all', deleted: 'trash' }, { skip: kind !== 'products' });
  const orders = useGetAdminOrdersQuery({ page, search: '', status: 'all', deleted: 'trash' }, { skip: kind !== 'orders' });
  const tenants = useGetTenantsQuery({ page, search: '', deleted: 'trash' }, { skip: kind !== 'tenants' });
  const [restoreTenant, tenantStatus] = useRestoreTenantMutation();
  const [restoreUser, userStatus] = useRestoreAdminUserMutation();
  const [restoreProduct, productStatus] = useRestoreAdminProductMutation();
  const [restoreOrder, orderStatus] = useRestoreAdminOrderMutation();
  const busy = tenantStatus.isLoading || userStatus.isLoading || productStatus.isLoading || orderStatus.isLoading;
  const result = kind === 'tenants' ? tenants : kind === 'users' ? users : kind === 'products' ? products : orders;
  const rows = kind === 'tenants' ? tenants.currentData?.data.items.map(item => ({ id: item.id, name: item.name, detail: item.slug + ' (' + item.status + ')' })) : kind === 'users' ? users.currentData?.data.items.map(item => ({ id: item.id, name: item.name, detail: item.email })) : kind === 'products' ? products.currentData?.data.items.map(item => ({ id: item._id, name: item.name, detail: item.sku })) : orders.currentData?.data.items.map(item => ({ id: item._id, name: item.productName, detail: item.customerEmail }));
  const pagination = result.currentData?.data.pagination;
  return <ResourceLayout title="Trash" description="Deleted records stay here until you restore them. Nothing is permanently erased.">
    {error && <Alert variant="danger">{error}</Alert>}
    {!kinds.length ? <p>You need access to Users, Catalog or Orders to view deleted records.</p> : <section className="tl-admin-directory">
      <div className="tl-admin-tabs" role="group" aria-label="Deleted record type">{kinds.map(item => <Button key={item.key} variant="ghost" aria-pressed={kind === item.key} onClick={() => { setKind(item.key); setPage(1); setError(''); }}>{item.label}</Button>)}</div>
      {result.isError ? <Alert variant="danger">Unable to load deleted records.</Alert> : result.isFetching && !result.currentData ? <TableSkeleton label="Loading trash" columns={3} /> : <Table><thead><tr><th>Name</th><th>Details</th><th>Action</th></tr></thead><tbody>
        {rows?.map(item => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.detail}</td><td><Button variant="outline" disabled={busy} onClick={async () => {
          setError(''); try { await (kind === 'tenants' ? restoreTenant(item.id) : kind === 'users' ? restoreUser(item.id) : kind === 'products' ? restoreProduct(item.id) : restoreOrder(item.id)).unwrap(); } catch (error) { setError(actionError(error)); }
        }}>Restore</Button></td></tr>)}
        {!rows?.length && <tr><td colSpan={3}><div className="tl-admin-empty"><strong>Trash is empty</strong><p>Deleted {kind} will appear here.</p></div></td></tr>}
      </tbody></Table>}
      {pagination && <footer className="tl-admin-directory-footer"><span>{pagination.total} deleted records ? Page {page} of {pagination.lastPage}</span><div className="tl-flex tl-gap-2"><Button variant="outline" disabled={result.isFetching || !pagination.hasPreviousPage} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" disabled={result.isFetching || !pagination.hasNextPage} onClick={() => setPage(page + 1)}>Next</Button></div></footer>}
    </section>}
  </ResourceLayout>;
}
