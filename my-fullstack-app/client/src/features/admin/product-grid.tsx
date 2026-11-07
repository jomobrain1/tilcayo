import { useState } from 'react';
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
