import { Types } from 'mongoose';
import { currentTenantScope, createHttpError, type TilcayoContext } from '@tilcayo/core';
import { User } from './models/User.js';
import { Membership } from './models/Membership.js';
import { AdminRole } from './models/AdminRole.js';
import { RefreshToken } from './models/RefreshToken.js';
import { hashPassword } from './password.js';
import { toAuthUser } from './toAuthUser.js';
import type { createGuard } from './guard.js';

export const roleScope = () => ({ tenantId: currentTenantScope()?.tenantId ?? null });
export async function validateWorkspaceRoles(roles: string[]) {
  if (roles.includes('superadmin')) throw createHttpError(422, 'VALIDATION_ERROR', 'Super Admin is a platform role');
  const custom = roles.filter(role => role !== 'admin');
  if (await AdminRole.raw.countDocuments({ ...roleScope(), key: { $in: custom } }) !== custom.length) throw createHttpError(422, 'VALIDATION_ERROR', 'Unknown role');
}
export function tenantUserHandlers(auth: ReturnType<typeof createGuard>, rounds: number) {
  const tenantId = () => currentTenantScope()!.tenantId!;
  const member = async (userId: unknown) => {
    const record = await Membership.first({ tenantId: tenantId(), userId: String(userId) });
    if (!record) throw createHttpError(404, 'NOT_FOUND', 'Member not found');
    return record;
  };
  const revoke = (userId: Types.ObjectId) => RefreshToken.raw.updateMany({ tenantId: tenantId(), userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  const editable = (ctx: TilcayoContext) => { if (auth.user(ctx).id === ctx.params.id) throw createHttpError(409, 'CONFLICT', 'You cannot change your own membership'); };
  const present = async (record: Awaited<ReturnType<typeof member>>) => {
    const user = await User.find(String(record.userId));
    if (!user) throw createHttpError(404, 'NOT_FOUND', 'User not found');
    return { ...toAuthUser(user), roles: record.roles, suspendedAt: record.suspendedAt, deletedAt: record.deletedAt };
  };
  return {
    async list(ctx: TilcayoContext) {
      const q = ctx.query as { page: number; perPage: number; search: string; role: string; status: string; deleted: string };
      if (q.deleted === 'trash' && !auth.user(ctx).adminTabs?.includes('trash')) throw createHttpError(403, 'FORBIDDEN', 'Access denied');
      const memberships = await Membership.where({ tenantId: tenantId(), deletedAt: q.deleted === 'trash' ? { $ne: null } : null });
      const ids = memberships.map(item => item.userId);
      const literal = q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const accounts = await User.where({ _id: { $in: ids }, deletedAt: null, ...(literal ? { $or: [{ name: { $regex: literal, $options: 'i' } }, { email: { $regex: literal, $options: 'i' } }] } : {}) });
      const membershipByUser = new Map(memberships.map(item => [String(item.userId), item]));
      const rows = accounts.map(account => { const membership = membershipByUser.get(String(account._id))!; return { ...toAuthUser(account), roles: membership.roles, suspendedAt: membership.suspendedAt ?? account.suspendedAt, deletedAt: membership.deletedAt }; });
      const filtered = rows.filter(item => (q.role === 'all' || (q.role === 'admin' ? item.roles.includes('admin') : !item.roles.includes('admin'))) && (q.status === 'all' || (q.status === 'suspended' ? !!item.suspendedAt : !item.suspendedAt)));
      const total = filtered.length, lastPage = Math.max(1, Math.ceil(total / q.perPage));
      return ctx.response.success({ items: filtered.slice((q.page - 1) * q.perPage, q.page * q.perPage), pagination: { page: q.page, perPage: q.perPage, total, lastPage, hasPreviousPage: q.page > 1, hasNextPage: q.page < lastPage }, stats: { totalUsers: rows.length, adminUsers: rows.filter(item => item.roles.includes('admin')).length, recentUsers: rows.filter(item => item.createdAt && new Date(item.createdAt).getTime() > Date.now() - 604800000).length } });
    },
    async create(ctx: TilcayoContext) {
      const body = ctx.body as { name: string; email: string; password: string; roles: string[] };
      await validateWorkspaceRoles(body.roles);
      let user = await User.first({ email: body.email });
      if (user?.deletedAt || user?.suspendedAt) throw createHttpError(409, 'CONFLICT', 'This account is unavailable');
      if (!user) {
        await User.raw.init();
        user = await User.create({ name: body.name, email: body.email, passwordHash: await hashPassword(body.password, rounds), roles: [] }).catch(error => { if (error?.code === 11000) throw createHttpError(409, 'CONFLICT', 'Account already exists; try again'); throw error; });
      }
      const existing = await Membership.first({ tenantId: tenantId(), userId: user._id });
      if (existing) throw createHttpError(409, 'CONFLICT', 'Already a member; use Roles, Reactivate, or Trash to manage this membership');
      const record = await Membership.create({ tenantId: new Types.ObjectId(tenantId()), userId: user._id, roles: body.roles });
      return ctx.response.created(await present(record), 'Member added');
    },
    async status(ctx: TilcayoContext) {
      editable(ctx); const target = await member(ctx.params.id);
      await Membership.raw.updateOne({ _id: target._id, deletedAt: null }, { $set: { suspendedAt: (ctx.body as { suspended: boolean }).suspended ? new Date() : null }, $inc: { sessionVersion: 1 } });
      await revoke(target.userId); return ctx.response.success(null);
    },
    async roles(ctx: TilcayoContext) {
      editable(ctx); const roles = (ctx.body as { roles: string[] }).roles; await validateWorkspaceRoles(roles);
      const target = await member(ctx.params.id);
      await Membership.raw.updateOne({ _id: target._id, deletedAt: null }, { $set: { roles }, $inc: { sessionVersion: 1 } });
      await revoke(target.userId); return ctx.response.success(null);
    },
    async remove(ctx: TilcayoContext) {
      editable(ctx); const target = await member(ctx.params.id);
      if (target.roles.includes('admin') && !auth.user(ctx).roles?.includes('admin')) throw createHttpError(403, 'FORBIDDEN', 'Only tenant administrators can remove administrators');
      await Membership.raw.updateOne({ _id: target._id }, { $set: { deletedAt: new Date() }, $inc: { sessionVersion: 1 } });
      await revoke(target.userId); return ctx.response.noContent();
    },
    async restore(ctx: TilcayoContext) {
      const target = await member(ctx.params.id);
      if (target.roles.includes('admin') && !auth.user(ctx).roles?.includes('admin')) throw createHttpError(403, 'FORBIDDEN', 'Only tenant administrators can restore administrators');
      await Membership.raw.updateOne({ _id: target._id }, { $set: { deletedAt: null }, $inc: { sessionVersion: 1 } });
      return ctx.response.noContent();
    },
  };
}
