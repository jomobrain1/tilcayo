import type { GeneratedSource } from "./frontend.js";

export function adminProductFiles(): GeneratedSource[] {
  const file = (name: string, source: string): GeneratedSource => ({ folder: "features/admin", name, source });
  return [
    file("products.api.ts", `import type { TilcayoResponse } from '@tilcayo/react';
import { tilcayoApi } from '../../app/api';

export interface ProductInput {
  imageUrl?: string;
  name: string; sku: string; category: string; price: number;
  currency: 'KES' | 'USD'; stock: number; status: 'draft' | 'active' | 'archived';
}
export interface Product extends ProductInput { _id: string; demoBatch?: string; createdAt?: string }
export interface ProductsQuery { page: number; deleted?: 'active' | 'trash'; search: string; status: 'all' | ProductInput['status']; stock: 'all' | 'low' | 'out'; category?: string }
export interface ProductsResponse {
  items: Product[];
  pagination: { total: number; lastPage: number; hasNextPage: boolean; hasPreviousPage: boolean };
  stats: { totalProducts: number; activeProducts: number; lowStock: number; outOfStock: number };
}
export const productsApi = tilcayoApi.enhanceEndpoints({ addTagTypes: ['AdminProducts'] }).injectEndpoints({
  endpoints: builder => ({
    deleteAdminProduct: builder.mutation<unknown, string>({ query: id => ({ url: '/admin/products/' + encodeURIComponent(id), method: 'DELETE' }), invalidatesTags: ['AdminProducts'] }),
    restoreAdminProduct: builder.mutation<unknown, string>({ query: id => ({ url: '/admin/products/' + encodeURIComponent(id) + '/restore', method: 'POST', body: {} }), invalidatesTags: ['AdminProducts'] }),
    getAdminCategories: builder.query<TilcayoResponse<{ name: string; totalProducts: number; activeProducts: number; stock: number }[]>, void>({
      query: () => ({ url: '/admin/products/categories' }), providesTags: ['AdminProducts'],
    }),
    getAdminProducts: builder.query<TilcayoResponse<ProductsResponse>, ProductsQuery>({
      query: query => ({ url: '/admin/products', query: { ...query, perPage: 10 } }),
      providesTags: ['AdminProducts'],
    }),
    saveAdminProduct: builder.mutation<TilcayoResponse<Product>, { id?: string; input: ProductInput }>({
      query: ({ id, input }) => ({ url: '/admin/products' + (id ? '/' + encodeURIComponent(id) : ''), method: id ? 'PUT' : 'POST', body: input }),
      invalidatesTags: ['AdminProducts'],
    }),
  }),
});
export const { useDeleteAdminProductMutation, useRestoreAdminProductMutation, useGetAdminProductsQuery, useSaveAdminProductMutation, useGetAdminCategoriesQuery } = productsApi;
`),
    file("product-form.tsx", `import { useState, type FormEvent } from 'react';
import { Alert, Button, FormField, Input, Select } from '@tilcayo/ui';
import type { Product, ProductInput } from './products.api';

export function ProductForm({ product, busy, onSave, onCancel }: { product?: Product; busy: boolean; onSave: (input: ProductInput) => Promise<unknown>; onCancel?: () => void }) {
  const [error, setError] = useState('');
  const [status, setStatus] = useState<ProductInput['status']>(product?.status ?? 'draft');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: ProductInput = {
      name: String(form.get('name')).trim(), sku: String(form.get('sku')).trim(), category: String(form.get('category')).trim(),
      price: Number(form.get('price')), stock: Number(form.get('stock')),
      imageUrl: String(form.get('imageUrl') ?? '').trim(),
      currency: form.get('currency') as ProductInput['currency'], status: form.get('status') as ProductInput['status'],
    };
    setError('');
    try { await onSave(input); }
    catch (error) { setError(error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : 'Unable to save this product. Please try again.'); }
  }
  return <form onSubmit={submit} className="tl-admin-product-form">
    <p className="tl-admin-form-intro">Manage the details, pricing, and availability of your product.</p>
    {error && <Alert variant="danger">{error}</Alert>}
    <fieldset className="tl-admin-form-section" disabled={busy}>
      <legend>Product details</legend>
      <div className="tl-admin-product-fields">
        <div className="tl-admin-field-wide"><FormField label="Product name" id="product-name">{props => <Input {...props} name="name" autoFocus required maxLength={120} defaultValue={product?.name} placeholder="e.g. Classic leather watch" />}</FormField></div>
        <FormField label="SKU" id="product-sku">{props => <Input {...props} name="sku" required maxLength={60} defaultValue={product?.sku} placeholder="e.g. WATCH-001" />}</FormField>
        <FormField label="Category" id="product-category">{props => <Input {...props} name="category" maxLength={80} defaultValue={product?.category} placeholder="e.g. Accessories" />}</FormField>
        <div className="tl-admin-field-wide"><FormField label="Product image" id="product-image" hint="Paste an image URL or a local image path.">{props => <Input {...props} name="imageUrl" maxLength={2000} defaultValue={product?.imageUrl ?? ''} placeholder="https://example.com/product.jpg" />}</FormField></div>
      </div>
    </fieldset>
    <fieldset className="tl-admin-form-section" disabled={busy}>
      <legend>Pricing &amp; inventory</legend>
      <div className="tl-admin-product-pricing">
        <FormField label="Price" id="product-price">{props => <Input {...props} name="price" type="number" required min={0} max={1000000000} step="0.01" defaultValue={product?.price ?? 0} />}</FormField>
        <FormField label="Currency" id="product-currency">{props => <Select {...props} name="currency" defaultValue={product?.currency ?? 'KES'}><option value="KES">KES</option><option value="USD">USD</option></Select>}</FormField>
        <FormField label="Stock quantity" id="product-stock">{props => <Input {...props} name="stock" type="number" required min={0} max={1000000000} step={1} defaultValue={product?.stock ?? 0} />}</FormField>
      </div>
    </fieldset>
    <fieldset className="tl-admin-form-section tl-admin-product-publishing" disabled={busy}>
      <legend>Publishing</legend>
      <FormField label="Status" id="product-status">{props => <Select {...props} className={'tl-admin-status-select tl-admin-status-' + status} name="status" value={status} onChange={event => setStatus(event.target.value as ProductInput['status'])}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></Select>}</FormField>
      <p className="tl-help-text">{status === 'draft' ? 'Keep this product as a draft until it is ready.' : status === 'active' ? 'This product is available in your active catalog.' : 'This product stays in the catalog as an archived record.'}</p>
    </fieldset>
    <footer className="tl-admin-product-form-actions">
      {onCancel && <Button variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button>}
      <Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save product'}</Button>
    </footer>
  </form>;
}
`),
    file("products.page.tsx", `import { useState, type FormEvent } from 'react';
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
`),
    file("product-grid.tsx", `import { useState } from 'react';
import { Badge, Button } from '@tilcayo/ui';
import { DeleteButton } from './delete-button';
import type { Product } from './products.api';

export function ProductImage({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  return product.imageUrl && !failed
    ? <img src={product.imageUrl} alt={product.name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    : <div className="tl-admin-product-placeholder" aria-label={'No image for ' + product.name}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true"><path d="m12 3 9 5v8l-9 5-9-5V8Zm0 10v8M3 8l9 5 9-5M7.5 5.5l9 5" /></svg></div>;
}

export function ProductGrid({ products, onEdit, onDelete }: { products: Product[]; onEdit?: (product: Product) => void; onDelete?: (product: Product) => Promise<unknown> }) {
  if (!products.length) return <div className="tl-admin-empty"><strong>No products found</strong><p>Add your first product or adjust your filters.</p></div>;
  return <div className="tl-admin-product-grid">{products.map(product => <article className="tl-admin-product-card" key={product._id}>
    <div className="tl-admin-product-media">
      <ProductImage key={product.imageUrl} product={product} />
      <div className="tl-admin-product-labels"><Badge className={'tl-admin-status tl-admin-status-' + product.status} variant={product.status === 'active' ? 'success' : product.status === 'draft' ? 'warning' : 'neutral'}>{product.status}</Badge>{product.demoBatch && <Badge>Demo</Badge>}</div>
    </div>
    <div className="tl-admin-product-card-body">
      <small>{product.category || 'Uncategorized'}</small><h3>{product.name}</h3><span className="tl-admin-product-sku">{product.sku}</span>
      <strong className="tl-admin-product-card-price">{new Intl.NumberFormat('en', { style: 'currency', currency: product.currency }).format(product.price)}</strong>
      <footer><span>{product.stock === 0 ? 'Out of stock' : product.stock + ' in stock'}{product.stock > 0 && product.stock <= 5 ? ' · Low stock' : ''}</span><div className="tl-admin-row-actions">{onEdit && <Button variant="outline" aria-label={'Edit ' + product.name} onClick={() => onEdit(product)}>Edit</Button>}{onDelete && <DeleteButton iconOnly name={product.name} onDelete={() => onDelete(product)} />}</div></footer>
    </div>
  </article>)}</div>;
}
`),
  ];
}
