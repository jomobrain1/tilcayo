import type { GeneratedSource } from './frontend.js';

export function adminOrderFiles(): GeneratedSource[] {
  return [
    { folder: 'models', name: 'Order.ts', source: `import mongoose from 'mongoose';
import { mongoModel } from '@tilcayo/core';

const schema = new mongoose.Schema({
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

export const Order = mongoModel('Order', schema);
` },
    { folder: 'routes', name: 'admin-orders.routes.ts', source: String.raw`import { defineRoutes } from '@tilcayo/core';
import { z } from 'zod';
import { auth } from '../auth.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';

const id = z.string().regex(/^[a-f0-9]{24}$/i);
const status = z.enum(['pending', 'fulfilled', 'cancelled']);
const querySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).default(''),
  status: z.enum(['all', 'pending', 'fulfilled', 'cancelled']).default('all'),
});
const createSchema = z.strictObject({ productSku: z.string().trim().min(1).max(60), customerEmail: z.email().max(254), quantity: z.number().int().min(1).max(10000) });

// Manual order records: no payment processing or automatic stock adjustments.
export default defineRoutes(router => {
  router.group({ prefix: '/api/admin/orders', middleware: [...auth.requestMiddleware, auth.middleware, auth.requireRole('admin')] }, () => {
    router.get('/', async ctx => {
      const query = ctx.query as z.output<typeof querySchema>;
      const literal = query.search.replace(/[.*+?^$()|{}[]\]/g, '\$&');
      const filter = {
        ...(literal ? { $or: ['customerEmail', 'productName', 'sku'].map(field => ({ [field]: { $regex: literal, $options: 'i' } })) } : {}),
        ...(query.status === 'all' ? {} : { status: query.status }),
      };
      const [page, totalOrders, pending, fulfilled, cancelled] = await Promise.all([
        Order.paginate(query, { filter, sort: { createdAt: -1 } }),
        Order.count(), Order.count({ status: 'pending' }), Order.count({ status: 'fulfilled' }), Order.count({ status: 'cancelled' }),
      ]);
      return ctx.response.success({ ...page, stats: { totalOrders, pending, fulfilled, cancelled } });
    }, { validate: { query: querySchema } });
    router.post('/', async ctx => {
      const body = ctx.body as z.output<typeof createSchema>;
      const product = await Product.firstOrFail({ sku: body.productSku });
      const unitPrice = Math.round(product.price * 100) / 100;
      const order = await Order.create({
        productId: product._id, quantity: body.quantity, customerEmail: body.customerEmail,
        productName: product.name, sku: product.sku, unitPrice,
        total: Math.round(unitPrice * 100) * body.quantity / 100, currency: product.currency, status: 'pending',
      });
      return ctx.response.success(order);
    }, { validate: { body: createSchema } });
    router.put('/:id', async ctx => {
      await Order.findOrFail(ctx.params.id);
      return ctx.response.success(await Order.update(ctx.params.id, ctx.body as { status: z.output<typeof status> }));
    }, { validate: { params: z.object({ id }), body: z.strictObject({ status }) } });
  });
});
` },
  ];
}
