import { createHttpError, runInTenantScope, currentTenantScope, type Middleware, type TilcayoContext } from '@tilcayo/core';
import { Tenant } from './models/Tenant.js';
import { Membership } from './models/Membership.js';
import { withAdminAccess } from './adminAccess.js';
import type { AuthUser } from './types.js';

export interface TenancyConfig { baseDomain: string }
export const tenantSlugPattern = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
export const reservedTenantSlugs = ['www', 'api', 'admin', 'auth', 'app', 'localhost', 'platform', 'mail'];
const tenancyState = Symbol('tilcayo.tenant');
export interface TenantInfo { id: string; name: string; slug: string; status: string }
type Context = TilcayoContext & { [tenancyState]?: TenantInfo };
export function tenantFromContext(ctx: TilcayoContext) { return (ctx as Context)[tenancyState]; }
export function createTenantMiddleware(config: TenancyConfig): Middleware {
  const base = config.baseDomain.trim().toLowerCase();
  if (!/^(?:[a-z0-9-]+\.)*[a-z0-9-]+$/.test(base)) throw new Error('Invalid tenancy baseDomain');
  return async (ctx, next) => {
    if (typeof ctx.headers.host !== 'string' || /[\s/@?#\\]/.test(ctx.headers.host)) throw createHttpError(400, 'BAD_HOST', 'Invalid host');
    let hostname: string;
    try { hostname = new URL('http://' + String(ctx.headers.host)).hostname.toLowerCase(); } catch { throw createHttpError(400, 'BAD_HOST', 'Invalid host'); }
    const platform = hostname === base || (base === 'localhost' && ['127.0.0.1', '[::1]'].includes(hostname));
    let tenant: TenantInfo | undefined;
    if (!platform) {
      if (!hostname.endsWith('.' + base)) throw createHttpError(404, 'TENANT_NOT_FOUND', 'Workspace not found');
      const slug = hostname.slice(0, -(base.length + 1));
      if (!tenantSlugPattern.test(slug) || reservedTenantSlugs.includes(slug)) throw createHttpError(404, 'TENANT_NOT_FOUND', 'Workspace not found');
      const record = await Tenant.first({ slug });
      if (!record || record.deletedAt) throw createHttpError(404, 'TENANT_NOT_FOUND', 'Workspace not found');
      if (record.status !== 'active') throw createHttpError(403, 'TENANT_UNAVAILABLE', 'This workspace is ' + record.status);
      tenant = { id: String(record._id), name: record.name, slug: record.slug, status: record.status };
      (ctx as Context)[tenancyState] = tenant;
    }
    return runInTenantScope({ enabled: true, tenantId: tenant?.id }, next);
  };
}

export async function workspaceUser(user: AuthUser): Promise<AuthUser> {
  const scope = currentTenantScope();
  if (!scope?.enabled) return withAdminAccess(user);
  const platformRoles = user.roles?.includes('superadmin') ? ['superadmin'] : [];
  if (!scope.tenantId) return { ...user, roles: platformRoles, platformRole: platformRoles.length ? 'superadmin' : undefined, adminTabs: platformRoles.length ? ['tenants', 'users', 'catalog', 'inventory', 'categories', 'orders', 'trash'] : [], tenancyEnabled: true };
  const membership = await Membership.first({ tenantId: scope.tenantId, userId: user.id, deletedAt: null, suspendedAt: null });
  if (!membership) throw createHttpError(403, 'MEMBERSHIP_REQUIRED', 'You do not have access to this workspace');
  scope.membershipVersion = membership.sessionVersion ?? 0;
  const tenant = await Tenant.find(scope.tenantId);
  if (!tenant || tenant.deletedAt || tenant.status !== 'active') throw createHttpError(403, 'TENANT_UNAVAILABLE', 'Workspace unavailable');
  const scoped = await withAdminAccess({ ...user, roles: membership.roles });
  return { ...scoped, platformRole: platformRoles.length ? 'superadmin' : undefined, tenancyEnabled: true, tenant: { id: String(tenant._id), name: tenant.name, slug: tenant.slug } };
}

export function assertTokenTenant(tenantId?: string, membershipVersion?: number) {
  const scope = currentTenantScope();
  if (scope?.tenantId && membershipVersion !== undefined && membershipVersion !== scope.membershipVersion) throw createHttpError(401, "UNAUTHORIZED", "Sign in again to this workspace");
  if (scope?.enabled && (tenantId ?? undefined) !== scope.tenantId) throw createHttpError(401, 'UNAUTHORIZED', 'Sign in to this workspace');
}
