import type { GeneratedSource } from "./frontend.js";

export function adminOrderFiles(): GeneratedSource[] {
  return [
    { folder: "models", name: "Order.ts", source: `import mongoose from 'mongoose';
import { mongoModel } from '@tilcayo/core';

const schema = new mongoose.Schema({
  deletedAt: { type: Date, default: null, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  demoBatch: { type: String },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  customerEmail: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: ['KES', 'USD'], required: true },
  status: { type: String, enum: ['pending', 'fulfilled', 'cancelled'], default: 'pending' },
}, { timestamps: true });

const platformSchema = schema.clone();
platformSchema.set('collection', 'tilcayo_platform_orders');
platformSchema.path('productId').options.ref = 'PlatformProduct';
export const PlatformOrder = mongoModel('PlatformOrder', platformSchema);

export const Order = mongoModel('Order', schema);
` },
    { folder: "routes", name: "admin-orders.routes.ts", source: `import { defineRoutes, createHttpError } from '@tilcayo/core';
import { z } from 'zod';
import { auth } from '../auth.js';
import { Product as TenantProduct, PlatformProduct } from '../models/Product.js';
import { Order as TenantOrder, PlatformOrder } from '../models/Order.js';

const platformCatalog = (ctx: Parameters<typeof auth.user>[0]) => {
  const user = auth.user(ctx);
  return user.tenancyEnabled && user.platformRole === 'superadmin' && !user.tenant;
};

const id = z.string().regex(/^[a-f0-9]{24}$/i);
const status = z.enum(['pending', 'fulfilled', 'cancelled']);
const querySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).default(''),
  status: z.enum(['all', 'pending', 'fulfilled', 'cancelled']).default('all'),
  deleted: z.enum(['active', 'trash']).default('active'),
});
const createSchema = z.strictObject({ productSku: z.string().trim().min(1).max(60), customerEmail: z.email().max(254), quantity: z.number().int().min(1).max(10000) });

// Manual order records: no payment processing or automatic stock adjustments.
export default defineRoutes(router => {
  router.group({ prefix: '/api/admin/orders', middleware: [...auth.requestMiddleware, auth.middleware, auth.requireAdminTab('orders')] }, () => {
    router.get('/', async ctx => {
      const Order = platformCatalog(ctx) ? PlatformOrder : TenantOrder;
      const query = ctx.query as z.output<typeof querySchema>;
      if (query.deleted === 'trash' && !auth.user(ctx).adminTabs?.includes('trash')) throw createHttpError(403, 'FORBIDDEN', 'Access denied');
      const literal = query.search.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
      const filter = {
        deletedAt: query.deleted === 'trash' ? { $ne: null } : null,
        ...(literal ? { $or: ['customerEmail', 'productName', 'sku'].map(field => ({ [field]: { $regex: literal, $options: 'i' } })) } : {}),
        ...(query.status === 'all' ? {} : { status: query.status }),
      };
      const [page, totalOrders, pending, fulfilled, cancelled] = await Promise.all([
        Order.paginate(query, { filter, sort: { createdAt: -1 } }),
        Order.count({ deletedAt: null }), Order.count({ deletedAt: null, status: 'pending' }), Order.count({ deletedAt: null, status: 'fulfilled' }), Order.count({ deletedAt: null, status: 'cancelled' }),
      ]);
      return ctx.response.success({ ...page, stats: { totalOrders, pending, fulfilled, cancelled } });
    }, { validate: { query: querySchema } });
    router.post('/', async ctx => {
      const Product = platformCatalog(ctx) ? PlatformProduct : TenantProduct;
      const Order = platformCatalog(ctx) ? PlatformOrder : TenantOrder;
      const body = ctx.body as z.output<typeof createSchema>;
      const product = await Product.firstOrFail({ sku: body.productSku, deletedAt: null });
      const unitPrice = Math.round(product.price * 100) / 100;
      const order = await Order.create({
        productId: product._id, quantity: body.quantity, customerEmail: body.customerEmail,
        productName: product.name, sku: product.sku, unitPrice,
        total: Math.round(unitPrice * 100) * body.quantity / 100, currency: product.currency, status: 'pending',
      });
      return ctx.response.success(order);
    }, { validate: { body: createSchema } });
    router.put('/:id', async ctx => {
      const Order = platformCatalog(ctx) ? PlatformOrder : TenantOrder;
      await Order.firstOrFail({ _id: ctx.params.id, deletedAt: null });
      return ctx.response.success(await Order.update(ctx.params.id, ctx.body as { status: z.output<typeof status> }));
    }, { validate: { params: z.object({ id }), body: z.strictObject({ status }) } });
    router.delete('/:id', async ctx => {
      const Order = platformCatalog(ctx) ? PlatformOrder : TenantOrder;
      await Order.firstOrFail({ _id: ctx.params.id, deletedAt: null });
      await Order.raw.updateOne({ _id: ctx.params.id, deletedAt: null }, { $set: { deletedAt: new Date() } });
      return ctx.response.noContent();
    }, { validate: { params: z.object({ id }) } });
    router.post('/:id/restore', async ctx => {
      const Order = platformCatalog(ctx) ? PlatformOrder : TenantOrder;
      await Order.findOrFail(ctx.params.id);
      await Order.raw.updateOne({ _id: ctx.params.id }, { $set: { deletedAt: null } });
      return ctx.response.noContent();
    }, { middleware: [auth.requireAdminTab('trash')], validate: { params: z.object({ id }) } });
  });
});
` },
  ];
}
