import { useSearchParams } from 'react-router';
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
