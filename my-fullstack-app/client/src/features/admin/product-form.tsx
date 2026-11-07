import { useState, type FormEvent } from 'react';
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
