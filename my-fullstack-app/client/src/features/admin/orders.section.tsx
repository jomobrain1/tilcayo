import { useState, type FormEvent } from 'react';
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
