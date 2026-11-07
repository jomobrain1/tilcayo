import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { AdminMetricCard, ResourceLayout } from '@tilcayo/admin';
import { Alert, Badge, Button, Card, Input, Modal, Select, Table, TableSkeleton, ListSkeleton } from '@tilcayo/ui';
import { DeleteButton } from './delete-button';
import { useAdminAccess } from './permissions';
import { useDeleteAdminProductMutation } from './products.api';
import { ProductForm } from './product-form';
import { ProductGrid, ProductImage } from './product-grid';
import { CategoriesSection } from './categories.section';
import { OrdersSection } from './orders.section';
import { useGetAdminProductsQuery, useSaveAdminProductMutation, type Product, type ProductsQuery } from './products.api';

export function ProductsPage({ inventoryOnly = false }: { inventoryOnly?: boolean }) {
  const [params] = useSearchParams();
  const section = inventoryOnly ? 'inventory' : params.get('section') ?? 'catalog';
  if (section === 'categories') return <CategoriesSection />;
  if (section === 'orders') return <OrdersSection />;
  return <CatalogSection key={section} inventoryOnly={section === 'inventory'} />;
}

function CatalogSection({ inventoryOnly }: { inventoryOnly: boolean }) {
  const [view, setView] = useState<'cards' | 'table'>('table');
  const { can } = useAdminAccess();
  const canEdit = can('catalog');
  const [remove] = useDeleteAdminProductMutation();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? undefined;
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState<ProductsQuery>({ page: 1, search: '', status: inventoryOnly ? 'active' : 'all', stock: 'all' });
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const { currentData, isError, isFetching, refetch } = useGetAdminProductsQuery({ ...query, category }, { refetchOnMountOrArgChange: true });
  const [save, { isLoading: saving }] = useSaveAdminProductMutation();
  const data = isError ? undefined : currentData?.data;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery({ ...query, search: search.trim(), page: 1 });
  }
  return <ResourceLayout title={inventoryOnly ? 'Inventory' : 'Products'} description={inventoryOnly ? 'Monitor active products, stock levels, and availability.' : 'Your catalog, availability, and stock at a glance.'} actions={canEdit ? <Button onClick={() => setEditing('new')}>Add product</Button> : undefined}>
    <div className="tl-admin-stats tl-admin-product-stats">
      {[
        { icon: 'box' as const, tone: 'green' as const, label: 'Total products', value: data?.stats.totalProducts, note: 'Across your catalog' },
        { icon: 'check' as const, tone: 'blue' as const, label: 'Active products', value: data?.stats.activeProducts, note: 'Available in your catalog' },
        { icon: 'alert' as const, tone: 'amber' as const, label: 'Low stock', value: data?.stats.lowStock, note: 'Active products with 1-5 units' },
        { icon: 'close' as const, tone: 'red' as const, label: 'Out of stock', value: data?.stats.outOfStock, note: 'Active products with no units' },
      ].map(stat => <AdminMetricCard loading={!data && !isError} key={stat.label} {...stat} />)}
    </div>
    {inventoryOnly && <InventoryPanels />}
    <section className="tl-admin-directory" aria-label="Product catalog" aria-busy={isFetching}>
      {!inventoryOnly && <header className="tl-admin-directory-heading"><div><h2>Product catalog</h2><p>Browse your products or switch to a compact table.</p></div><div className="tl-admin-view-toggle" role="group" aria-label="Product display"><Button variant="ghost" aria-pressed={view === 'cards'} onClick={() => setView('cards')}>Cards</Button><Button variant="ghost" aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</Button></div></header>}
      {category !== undefined && <div className="tl-admin-directory-heading"><span>Category: {category || 'Uncategorized'}</span><Button variant="ghost" onClick={() => { setQuery({ ...query, page: 1 }); setParams({ section: 'catalog' }); }}>Clear category</Button></div>}
      {!inventoryOnly && <div className="tl-admin-tabs" role="group" aria-label="Product status">
        {(['all', 'active', 'draft', 'archived'] as const).map(status => <Button key={status} variant="ghost" aria-pressed={query.status === status} onClick={() => setQuery({ ...query, status, page: 1 })}>{status === 'all' ? 'All products' : status[0].toUpperCase() + status.slice(1)}</Button>)}
      </div>}
      <form className="tl-admin-toolbar tl-admin-product-toolbar" role="search" onSubmit={submit}>
        <Input aria-label="Search products" placeholder="Search name, SKU, or category" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} />
        <Select aria-label="Filter product stock" value={query.stock} onChange={event => setQuery({ ...query, stock: event.target.value as ProductsQuery['stock'], page: 1 })}><option value="all">All stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></Select>
        <Button type="submit">Search</Button><Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>Refresh</Button>
      </form>
      {isError ? <div className="tl-admin-empty"><Alert variant="danger">Unable to load products. Try Refresh.</Alert></div> : !data ? <TableSkeleton label="Loading products" columns={6} /> : <>
        {!inventoryOnly && view === 'cards' ? <ProductGrid products={data.items} onEdit={canEdit ? setEditing : undefined} onDelete={canEdit ? product => remove(product._id).unwrap() : undefined} /> : <Table><caption className="tl-sr-only">Product catalog and inventory</caption>
          <thead><tr><th scope="col">Product</th><th scope="col">Category</th><th scope="col">Price</th><th scope="col">Stock</th>{inventoryOnly && <th scope="col">Stock health</th>}<th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
          <tbody>{data.items.map(product => <tr key={product._id}>
            <td><div className="tl-admin-product-cell"><div className="tl-admin-product-thumb"><ProductImage key={product.imageUrl} product={product} /></div><div><strong>{product.name}</strong><small className="tl-admin-product-sku">{product.sku}</small></div></div></td><td>{product.category || '—'}</td>
            <td className="tl-admin-product-price">{new Intl.NumberFormat('en', { style: 'currency', currency: product.currency }).format(product.price)}</td>
            <td>{product.stock.toLocaleString()}</td>{inventoryOnly && <td><Badge variant={product.stock === 0 ? 'danger' : product.stock <= 5 ? 'warning' : 'success'}>{product.stock === 0 ? 'Out of stock' : product.stock <= 5 ? 'Low stock' : 'In stock'}</Badge></td>}<td><Badge className={'tl-admin-status tl-admin-status-' + product.status} variant={product.status === 'active' ? 'success' : product.status === 'draft' ? 'warning' : 'neutral'}>{product.status}</Badge></td>
            <td>{canEdit && <div className="tl-admin-row-actions"><Button variant="ghost" aria-label={'Edit ' + product.name} onClick={() => setEditing(product)}>Edit</Button><DeleteButton iconOnly name={product.name} onDelete={() => remove(product._id).unwrap()} /></div>}</td>
          </tr>)}{!data.items.length && <tr><td colSpan={inventoryOnly ? 7 : 6}><div className="tl-admin-empty"><strong>No products found</strong><p>Add your first product or adjust your filters.</p></div></td></tr>}</tbody>
        </Table>}
        <footer className="tl-admin-directory-footer"><span>{data.pagination.total} matching products · Page {query.page} of {data.pagination.lastPage}</span>
          <nav aria-label="Product catalog pages" className="tl-flex tl-gap-2"><Button variant="outline" disabled={isFetching || !data.pagination.hasPreviousPage} onClick={() => setQuery({ ...query, page: query.page - 1 })}>Previous</Button><Button variant="outline" disabled={isFetching || !data.pagination.hasNextPage} onClick={() => setQuery({ ...query, page: query.page + 1 })}>Next</Button></nav>
        </footer>
      </>}
    </section>
    <Modal className="tl-admin-product-modal" open={editing !== null} title={editing === 'new' ? 'Add product' : 'Edit product'} onClose={() => { if (!saving) setEditing(null); }}>
      {editing !== null && <ProductForm key={editing === 'new' ? 'new' : editing._id} product={editing === 'new' ? undefined : editing} busy={saving} onCancel={() => setEditing(null)} onSave={async input => {
        await save({ id: editing === 'new' ? undefined : editing._id, input }).unwrap();
        setEditing(null);
      }} />}
    </Modal>
  </ResourceLayout>;
}

function InventoryPanels() {
  const low = useGetAdminProductsQuery({ page: 1, search: '', status: 'active', stock: 'low' });
  const stats = low.isError ? undefined : low.data?.data.stats;
  const levels = [
    { label: 'In stock', value: stats ? stats.activeProducts - stats.lowStock - stats.outOfStock : 0, tone: 'green' },
    { label: 'Low stock', value: stats?.lowStock ?? 0, tone: 'amber' },
    { label: 'Out of stock', value: stats?.outOfStock ?? 0, tone: 'red' },
  ];
  return <div className="tl-admin-inventory-panels">
    <Card className="tl-admin-detail-panel"><header><div><h2>Low stock alerts</h2><p>Active products with 1-5 units remaining.</p></div></header>
      {low.isError ? <Alert variant="danger">Unable to load stock alerts.</Alert> : !low.data ? <ListSkeleton label="Loading stock alerts" rows={3} /> : <>
        {low.data.data.items.slice(0, 3).map(product => <div className="tl-admin-stock-row" key={product._id}><div className="tl-admin-product-thumb"><ProductImage key={product.imageUrl} product={product} /></div><div><strong>{product.name}</strong><small>{product.sku}</small></div><Badge variant="warning">{product.stock} left</Badge></div>)}
        {!low.data.data.items.length && <p className="tl-admin-panel-note">No low stock alerts. Your active inventory is healthy.</p>}
        {low.data.data.pagination.total > 3 && <small className="tl-admin-panel-note">Showing 3 of {low.data.data.pagination.total} alerts. Use the Low stock filter below to see all.</small>}
      </>}
    </Card>
    <Card className="tl-admin-detail-panel"><header><div><h2>Inventory health</h2><p>Availability across active products.</p></div></header>
      {low.isError ? <Alert variant="danger">Unable to load inventory health.</Alert> : !stats ? <ListSkeleton label="Loading inventory health" rows={3} /> : levels.map(level => <div className="tl-admin-health-row" key={level.label}><span>{level.label}</span><meter className={'tl-admin-tone-' + level.tone} aria-label={level.label} min={0} max={Math.max(stats.activeProducts, 1)} value={level.value} /><strong>{level.value}</strong></div>)}
    </Card>
  </div>;
}
