import { defineRoutes, conflict, createHttpError } from '@tilcayo/core';
import { z } from 'zod';
import { auth } from '../auth.js';
import { Product as TenantProduct, PlatformProduct } from '../models/Product.js';

const productModel = (ctx: Parameters<typeof auth.user>[0]) => {
  const user = auth.user(ctx);
  return user.tenancyEnabled && user.platformRole === 'superadmin' && !user.tenant ? PlatformProduct : TenantProduct;
};

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
  deleted: z.enum(['active', 'trash']).default('active'),
});
const params = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i) });

export default defineRoutes(router => {
  router.group({ prefix: '/api/admin/products', middleware: [...auth.requestMiddleware, auth.middleware, auth.requireAdminTab(['catalog', 'inventory', 'categories'])] }, () => {
    router.get('/categories', async ctx => {
      const Product = productModel(ctx);
      const items = await Product.raw.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: { $ifNull: ['$category', ''] }, totalProducts: { $sum: 1 }, stock: { $sum: '$stock' }, activeProducts: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, name: '$_id', totalProducts: 1, stock: 1, activeProducts: 1 } },
      ]);
      return ctx.response.success(items);
    }, { middleware: [auth.requireAdminTab('categories')] });
    router.get('/', async ctx => {
      const Product = productModel(ctx);
      const query = ctx.query as z.output<typeof querySchema>;
      if (query.deleted === 'trash' && (!auth.user(ctx).adminTabs?.includes('trash') || !auth.user(ctx).adminTabs?.includes('catalog'))) throw createHttpError(403, 'FORBIDDEN', 'Access denied');
      const literal = query.search.replace(/[.*+?^$()|{}[\]\\]/g, '\\$&');
      const filter = {
        deletedAt: query.deleted === 'trash' ? { $ne: null } : null,
        ...(literal ? { $or: ['name', 'sku', 'category'].map(field => ({ [field]: { $regex: literal, $options: 'i' } })) } : {}),
        ...(query.status === 'all' ? {} : { status: query.status }),
        ...(query.stock === 'low' ? { stock: { $gt: 0, $lte: 5 } } : query.stock === 'out' ? { stock: 0 } : {}),
        ...(query.category === undefined ? {} : { category: query.category }),
      };
      const [page, totalProducts, activeProducts, lowStock, outOfStock] = await Promise.all([
        Product.paginate(query, { filter, sort: { createdAt: -1 } }),
        Product.count({ deletedAt: null }), Product.count({ deletedAt: null, status: 'active' }),
        Product.count({ deletedAt: null, status: 'active', stock: { $gt: 0, $lte: 5 } }),
        Product.count({ deletedAt: null, status: 'active', stock: 0 }),
      ]);
      return ctx.response.success({ ...page, stats: { totalProducts, activeProducts, lowStock, outOfStock } });
    }, { validate: { query: querySchema } });
    router.post('/', async ctx => {
      const Product = productModel(ctx);
      try { return ctx.response.success(await Product.create(ctx.body as z.output<typeof input>)); }
      catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 11000) throw conflict('This SKU already exists.');
        throw error;
      }
    }, { middleware: [auth.requireAdminTab('catalog')], validate: { body: input } });
    router.put('/:id', async ctx => {
      const Product = productModel(ctx);
      await Product.firstOrFail({ _id: ctx.params.id, deletedAt: null });
      try { return ctx.response.success(await Product.update(ctx.params.id, ctx.body as z.output<typeof input>)); }
      catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 11000) throw conflict('This SKU already exists.');
        throw error;
      }
    }, { middleware: [auth.requireAdminTab('catalog')], validate: { params, body: input } });
    router.delete('/:id', async ctx => {
      const Product = productModel(ctx);
      await Product.firstOrFail({ _id: ctx.params.id, deletedAt: null });
      await Product.raw.updateOne({ _id: ctx.params.id, deletedAt: null }, { $set: { deletedAt: new Date() } });
      return ctx.response.noContent();
    }, { middleware: [auth.requireAdminTab('catalog')], validate: { params } });
    router.post('/:id/restore', async ctx => {
      const Product = productModel(ctx);
      await Product.findOrFail(ctx.params.id);
      await Product.raw.updateOne({ _id: ctx.params.id }, { $set: { deletedAt: null } });
      return ctx.response.noContent();
    }, { middleware: [auth.requireAdminTab('catalog'), auth.requireAdminTab('trash')], validate: { params } });
  });
});
