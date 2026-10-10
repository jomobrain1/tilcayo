import type { GeneratedSource } from "./frontend.js";
import { adminOrderFiles } from './adminOrders.js';
import { adminDemoFiles } from './adminDemo.js';

export function adminBackendFiles(): GeneratedSource[] {
  return [
    ...adminOrderFiles(),
    ...adminDemoFiles(),
    { folder: "models", name: "Product.ts", source: `import mongoose from 'mongoose';
import { mongoModel } from '@tilcayo/core';

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, trim: true },
  category: { type: String, default: '', trim: true },
  imageUrl: { type: String, default: '' },
  demoBatch: { type: String },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: ['KES', 'USD'], default: 'KES' },
  stock: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
}, { timestamps: true });

export const Product = mongoModel('Product', schema);
` },
    { folder: "routes", name: "admin-products.routes.ts", source: String.raw`import { defineRoutes, conflict } from '@tilcayo/core';
import { z } from 'zod';
import { auth } from '../auth.js';
import { Product } from '../models/Product.js';

const status = z.enum(['draft', 'active', 'archived']);
const input = z.strictObject({
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().min(1).max(60),
  category: z.string().trim().max(80),
  imageUrl: z.string().max(2000).refine(value => value === '' || /^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value), 'Use an HTTP(S) URL or a local image path.').optional(),
  price: z.number().finite().min(0).max(1_000_000_000),
  currency: z.enum(['KES', 'USD']),
  stock: z.number().int().min(0).max(1_000_000_000),
  status,
});
const querySchema = z.strictObject({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).default(''),
  status: z.enum(['all', 'draft', 'active', 'archived']).default('all'),
  stock: z.enum(['all', 'low', 'out']).default('all'),
  category: z.string().trim().max(80).optional(),
});
const params = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i) });

export default defineRoutes(router => {
  router.group({ prefix: '/api/admin/products', middleware: [...auth.requestMiddleware, auth.middleware, auth.requireRole('admin')] }, () => {
    router.get('/categories', async ctx => {
      const items = await Product.raw.aggregate([
        { $group: { _id: { $ifNull: ['$category', ''] }, totalProducts: { $sum: 1 }, stock: { $sum: '$stock' }, activeProducts: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, name: '$_id', totalProducts: 1, stock: 1, activeProducts: 1 } },
      ]);
      return ctx.response.success(items);
    });
    router.get('/', async ctx => {
      const query = ctx.query as z.output<typeof querySchema>;
      const literal = query.search.replace(/[.*+?^$()|{}[\]\\]/g, '\\$&');
      const filter = {
        ...(literal ? { $or: ['name', 'sku', 'category'].map(field => ({ [field]: { $regex: literal, $options: 'i' } })) } : {}),
        ...(query.status === 'all' ? {} : { status: query.status }),
        ...(query.stock === 'low' ? { stock: { $gt: 0, $lte: 5 } } : query.stock === 'out' ? { stock: 0 } : {}),
        ...(query.category === undefined ? {} : { category: query.category }),
      };
      const [page, totalProducts, activeProducts, lowStock, outOfStock] = await Promise.all([
        Product.paginate(query, { filter, sort: { createdAt: -1 } }),
        Product.count(), Product.count({ status: 'active' }),
        Product.count({ status: 'active', stock: { $gt: 0, $lte: 5 } }),
        Product.count({ status: 'active', stock: 0 }),
      ]);
      return ctx.response.success({ ...page, stats: { totalProducts, activeProducts, lowStock, outOfStock } });
    }, { validate: { query: querySchema } });
    router.post('/', async ctx => {
      try { return ctx.response.success(await Product.create(ctx.body as z.output<typeof input>)); }
      catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 11000) throw conflict('This SKU already exists.');
        throw error;
      }
    }, { validate: { body: input } });
    router.put('/:id', async ctx => {
      await Product.findOrFail(ctx.params.id);
      try { return ctx.response.success(await Product.update(ctx.params.id, ctx.body as z.output<typeof input>)); }
      catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 11000) throw conflict('This SKU already exists.');
        throw error;
      }
    }, { validate: { params, body: input } });
  });
});
` },
  ];
}
