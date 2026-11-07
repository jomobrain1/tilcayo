import type { AdminUsersResponse } from '@tilcayo/admin';
import type { TilcayoResponse } from '@tilcayo/react';
import { tilcayoApi } from '../../app/api';

export interface AdminRole { key: string; name: string; tabs: string[]; builtIn?: boolean }
export interface UsersQuery { page: number; search: string; role: 'all' | 'admin' | 'member'; status?: 'all' | 'active' | 'suspended'; deleted?: 'active' | 'trash' }
export const adminApi = tilcayoApi.enhanceEndpoints({ addTagTypes: ['AdminUsers', 'AdminRoles'] }).injectEndpoints({
  endpoints: builder => ({
    getAdminRoles: builder.query<TilcayoResponse<AdminRole[]>, void>({ query: () => '/admin/roles', providesTags: ['AdminRoles'] }),
    saveAdminRole: builder.mutation<unknown, { key: string; name: string; tabs: string[] }>({
      query: body => ({ url: '/admin/roles/' + encodeURIComponent(body.key), method: 'PUT', body }), invalidatesTags: ['AdminRoles'],
    }),
    assignAdminRoles: builder.mutation<unknown, { id: string; roles: string[] }>({
      query: ({ id, roles }) => ({ url: '/admin/users/' + encodeURIComponent(id) + '/roles', method: 'PUT', body: { roles } }), invalidatesTags: ['AdminUsers'],
    }),
    createAdminUser: builder.mutation<unknown, { name: string; email: string; password: string; roles: string[] }>({ query: body => ({ url: '/admin/users', method: 'POST', body }), invalidatesTags: ['AdminUsers'] }),
    setAdminUserStatus: builder.mutation<unknown, { id: string; suspended: boolean }>({ query: ({ id, suspended }) => ({ url: '/admin/users/' + encodeURIComponent(id) + '/status', method: 'PUT', body: { suspended } }), invalidatesTags: ['AdminUsers'] }),
    deleteAdminUser: builder.mutation<unknown, string>({ query: id => ({ url: '/admin/users/' + encodeURIComponent(id), method: 'DELETE' }), invalidatesTags: ['AdminUsers'] }),
    restoreAdminUser: builder.mutation<unknown, string>({ query: id => ({ url: '/admin/users/' + encodeURIComponent(id) + '/restore', method: 'POST', body: {} }), invalidatesTags: ['AdminUsers'] }),
    getAdminUsers: builder.query<TilcayoResponse<AdminUsersResponse>, UsersQuery>({
      query: query => ({ url: '/admin/users', query: { ...query, perPage: 10 } }), providesTags: ['AdminUsers'],
    }),
  }),
});
export const { useCreateAdminUserMutation, useSetAdminUserStatusMutation, useGetAdminUsersQuery, useGetAdminRolesQuery, useSaveAdminRoleMutation, useAssignAdminRolesMutation, useDeleteAdminUserMutation, useRestoreAdminUserMutation } = adminApi;
