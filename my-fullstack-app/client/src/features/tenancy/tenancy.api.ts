import { tilcayoApi } from '../../app/api';
import type { TilcayoResponse } from '@tilcayo/react';
export interface Tenant { id: string; name: string; slug: string; status: 'active' | 'suspended' | 'archived'; createdAt?: string; deletedAt?: string | null }
export interface Member { id: string; name: string; email: string; roles: string[]; suspended: boolean }
export const tenancyApi = tilcayoApi.enhanceEndpoints({ addTagTypes: ['Tenants', 'Memberships'] }).injectEndpoints({ endpoints: builder => ({
  getWorkspace: builder.query<TilcayoResponse<{ enabled: boolean; baseDomain: string | null; tenant: Tenant | null }>, void>({ query: () => '/auth/workspace' }),
  getWorkspaces: builder.query<TilcayoResponse<{ platformRole: string | null; items: Tenant[] }>, void>({ query: () => '/auth/workspaces', providesTags: ['Memberships'] }),
  getTenants: builder.query<TilcayoResponse<{ items: Tenant[]; pagination: { page: number; total: number; lastPage: number; hasNextPage: boolean; hasPreviousPage: boolean } }>, { page: number; search: string; deleted?: 'active' | 'trash' }>({ query: query => ({ url: '/platform/tenants', query }), providesTags: ['Tenants'] }),
  deleteTenant: builder.mutation<unknown, string>({ query: id => ({ url: '/platform/tenants/' + id, method: 'DELETE' }), invalidatesTags: ['Tenants', 'Memberships'] }),
  restoreTenant: builder.mutation<unknown, string>({ query: id => ({ url: '/platform/tenants/' + id + '/restore', method: 'POST', body: {} }), invalidatesTags: ['Tenants', 'Memberships'] }),
  createTenant: builder.mutation<unknown, { name: string; slug: string; adminEmail: string }>({ query: body => ({ url: '/platform/tenants', method: 'POST', body }), invalidatesTags: ['Tenants', 'Memberships'] }),
  updateTenant: builder.mutation<unknown, { id: string; name: string; status: Tenant['status'] }>({ query: ({ id, ...body }) => ({ url: '/platform/tenants/' + id, method: 'PUT', body }), invalidatesTags: ['Tenants', 'Memberships'] }),
  getTenantMembers: builder.query<TilcayoResponse<Member[]>, string>({ query: id => '/platform/tenants/' + id + '/members', providesTags: ['Memberships'] }),
  saveTenantMember: builder.mutation<unknown, { id: string; email: string; role: 'admin' | 'member' }>({ query: ({ id, ...body }) => ({ url: '/platform/tenants/' + id + '/members', method: 'POST', body }), invalidatesTags: ['Memberships'] }),
}) });
export const { useGetWorkspaceQuery, useGetWorkspacesQuery, useGetTenantsQuery, useDeleteTenantMutation, useRestoreTenantMutation, useCreateTenantMutation, useUpdateTenantMutation, useGetTenantMembersQuery, useSaveTenantMemberMutation } = tenancyApi;
export function workspaceUrl(slug: string | null, baseDomain: string, path = '/dashboard') {
  if (slug && !/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error('Invalid workspace');
  const url = new URL(window.location.origin);
  url.hostname = slug ? slug + '.' + baseDomain : baseDomain;
  url.pathname = path;
  return url.href;
}
