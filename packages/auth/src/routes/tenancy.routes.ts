import { defineRoutes, createHttpError, currentTenantScope } from '@tilcayo/core';
import { Types } from 'mongoose';
import { z } from 'zod';
import { TenantAudit } from '../models/TenantAudit.js';
import { Tenant } from '../models/Tenant.js';
import { Membership } from '../models/Membership.js';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { tenantFromContext, tenantSlugPattern, reservedTenantSlugs } from '../tenancy.js';
import type { createGuard } from '../guard.js';
import type { ResolvedAuthConfig } from '../types.js';

const id = z.string().regex(/^[a-f\d]{24}$/i);
const slug = z.string().regex(tenantSlugPattern).refine(value => !reservedTenantSlugs.includes(value), 'Reserved subdomain');
const state = z.enum(['active', 'suspended', 'archived']);
const tenantInput = z.strictObject({ name: z.string().trim().min(2).max(100), slug, adminEmail: z.email().trim().toLowerCase().max(254) });
const memberInput = z.strictObject({ email: z.email().trim().toLowerCase().max(254), role: z.enum(['admin', 'member']) });
const parameters = z.object({ id });
const publicTenant = (record: { _id: unknown; name: string; slug: string; status: string; deletedAt?: Date | null; createdAt?: Date }) => ({ id: String(record._id), name: record.name, slug: record.slug, status: record.status, deletedAt: record.deletedAt ?? null, createdAt: record.createdAt });

export function createTenancyRoutes(config: ResolvedAuthConfig, auth: ReturnType<typeof createGuard>, requestMiddleware: ReturnType<typeof import('./auth.routes.js').authRequestMiddleware>) {
  return defineRoutes(router => {
    router.group({ prefix: config.prefix, middleware: requestMiddleware }, () => {
      router.get('/workspace', ctx => ctx.response.success({ enabled: !!config.tenancy, baseDomain: config.tenancy ? config.tenancy.baseDomain : null, tenant: tenantFromContext(ctx) ?? null }));
      router.get('/workspaces', async ctx => {
        const user = auth.user(ctx);
        const memberships = await Membership.where({ userId: user.id, deletedAt: null, suspendedAt: null });
        const items = await Tenant.where({ _id: { $in: memberships.map(item => item.tenantId) }, status: 'active', deletedAt: null });
        return ctx.response.success({ platformRole: user.platformRole ?? null, items: items.map(publicTenant) });
      }, { middleware: [auth.middleware] });
    });
    const platformOnly = (ctx: Parameters<typeof auth.user>[0], next: () => unknown) => {
      if (!config.tenancy || currentTenantScope()?.tenantId || auth.user(ctx).platformRole !== 'superadmin') throw createHttpError(403, 'FORBIDDEN', 'Platform Super Admin access required');
      return next();
    };
    router.group({ prefix: '/api/platform/tenants', middleware: [...requestMiddleware, auth.middleware, platformOnly] }, () => {
      router.get('/', async ctx => {
        const q = ctx.query as { page: number; search: string; deleted: 'active' | 'trash' };
        const escaped = q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const page = await Tenant.paginate({ page: q.page, perPage: 12 }, { filter: { deletedAt: q.deleted === 'trash' ? { $ne: null } : null, ...(escaped ? { $or: [{ name: { $regex: escaped, $options: 'i' } }, { slug: { $regex: escaped, $options: 'i' } }] } : {}) }, sort: { createdAt: -1 } });
        return ctx.response.success({ items: page.items.map(publicTenant), pagination: page.pagination });
      }, { validate: { query: z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), search: z.string().trim().max(100).default(''), deleted: z.enum(['active', 'trash']).default('active') }) } });
      router.post('/', async ctx => {
        const body = ctx.body as z.output<typeof tenantInput>;
        const owner = await User.first({ email: body.adminEmail, deletedAt: null, suspendedAt: null });
        if (!owner) throw createHttpError(422, 'VALIDATION_ERROR', 'Create the administrator account in Users first');
        await Tenant.raw.init();
        const record = await Tenant.create({ name: body.name, slug: body.slug, createdBy: new Types.ObjectId(auth.user(ctx).id) }).catch(error => { if (error?.code === 11000) throw createHttpError(409, 'CONFLICT', 'Subdomain already exists'); throw error; });
        try { await Membership.create({ tenantId: record._id, userId: owner._id, roles: ['admin'] }); }
        catch (error) { await Tenant.raw.deleteOne({ _id: record._id }); throw error; }
        await TenantAudit.create({ tenantId: record._id, actorId: new Types.ObjectId(auth.user(ctx).id), action: 'tenant.created', subjectId: owner._id });
        return ctx.response.created(publicTenant(record), 'Workspace created');
      }, { validate: { body: tenantInput } });
      router.put('/:id', async ctx => {
        const record = await Tenant.raw.findOneAndUpdate({ _id: ctx.params.id, deletedAt: null }, { $set: ctx.body as { name: string; status: z.output<typeof state> } }, { returnDocument: 'after', runValidators: true });
        if (!record) throw createHttpError(404, 'NOT_FOUND', 'Workspace not found');
        if (record.status !== 'active') {
          await Membership.raw.updateMany({ tenantId: record._id }, { $inc: { sessionVersion: 1 } });
          await RefreshToken.raw.updateMany({ tenantId: record._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
        }
        await TenantAudit.create({ tenantId: record._id, actorId: new Types.ObjectId(auth.user(ctx).id), action: 'tenant.' + record.status });
        return ctx.response.success(publicTenant(record));
      }, { validate: { params: parameters, body: z.strictObject({ name: z.string().trim().min(2).max(100), status: state }) } });
      router.delete('/:id', async ctx => {
        const record = await Tenant.raw.findOneAndUpdate({ _id: ctx.params.id, deletedAt: null }, { $set: { deletedAt: new Date() } }, { returnDocument: 'after' });
        if (!record) throw createHttpError(404, 'NOT_FOUND', 'Workspace not found');
        await Membership.raw.updateMany({ tenantId: record._id }, { $inc: { sessionVersion: 1 } });
        await RefreshToken.raw.updateMany({ tenantId: record._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
        await TenantAudit.create({ tenantId: record._id, actorId: new Types.ObjectId(auth.user(ctx).id), action: 'tenant.deleted' });
        return ctx.response.noContent();
      }, { validate: { params: parameters } });
      router.post('/:id/restore', async ctx => {
        const record = await Tenant.raw.findOneAndUpdate({ _id: ctx.params.id, deletedAt: { $ne: null } }, { $set: { deletedAt: null } }, { returnDocument: 'after' });
        if (!record) throw createHttpError(404, 'NOT_FOUND', 'Deleted workspace not found');
        await TenantAudit.create({ tenantId: record._id, actorId: new Types.ObjectId(auth.user(ctx).id), action: 'tenant.restored' });
        return ctx.response.success(publicTenant(record), 'Workspace restored');
      }, { validate: { params: parameters } });
      router.get('/:id/members', async ctx => {
        if (!await Tenant.first({ _id: ctx.params.id, deletedAt: null })) throw createHttpError(404, 'NOT_FOUND', 'Workspace not found');
        const memberships = await Membership.where({ tenantId: ctx.params.id });
        const users = await User.where({ _id: { $in: memberships.map(item => item.userId) } });
        return ctx.response.success(memberships.map(item => { const account = users.find(user => String(user._id) === String(item.userId)); return { id: String(item.userId), name: account?.name ?? 'Unavailable account', email: account?.email ?? '', roles: item.roles, suspended: !!item.suspendedAt || !!item.deletedAt || !!account?.suspendedAt || !!account?.deletedAt }; }));
      }, { validate: { params: parameters } });
      router.post('/:id/members', async ctx => {
        if (!await Tenant.first({ _id: ctx.params.id, deletedAt: null })) throw createHttpError(404, 'NOT_FOUND', 'Workspace not found');
        const body = ctx.body as z.output<typeof memberInput>;
        const user = await User.first({ email: body.email, deletedAt: null, suspendedAt: null });
        if (!user) throw createHttpError(422, 'VALIDATION_ERROR', 'Create this user account in Users first');
        const membership = await Membership.raw.findOneAndUpdate({ tenantId: ctx.params.id, userId: user._id }, { $set: { roles: body.role === 'admin' ? ['admin'] : [], suspendedAt: null, deletedAt: null }, $inc: { sessionVersion: 1 } }, { upsert: true, returnDocument: 'after' });
        await RefreshToken.raw.updateMany({ tenantId: ctx.params.id, userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
        await TenantAudit.create({ tenantId: membership.tenantId, actorId: new Types.ObjectId(auth.user(ctx).id), subjectId: membership.userId, action: 'membership.' + body.role });
        return ctx.response.success({ id: String(membership.userId) });
      }, { validate: { params: parameters, body: memberInput } });
    });
  });
}
