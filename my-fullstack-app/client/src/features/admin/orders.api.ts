import type { TilcayoResponse } from '@tilcayo/react';
import { tilcayoApi } from '../../app/api';

export type OrderStatus = 'pending' | 'fulfilled' | 'cancelled';
export interface Order { _id: string; productName: string; sku: string; customerEmail: string; quantity: number; total: number; currency: string; status: OrderStatus; createdAt: string }
export interface OrdersResponse {
  items: Order[];
  pagination: { total: number; lastPage: number; hasPreviousPage: boolean; hasNextPage: boolean };
  stats: { totalOrders: number; pending: number; fulfilled: number; cancelled: number };
}
export const ordersApi = tilcayoApi.enhanceEndpoints({ addTagTypes: ['AdminOrders'] }).injectEndpoints({
  endpoints: builder => ({
    deleteAdminOrder: builder.mutation<unknown, string>({ query: id => ({ url: '/admin/orders/' + encodeURIComponent(id), method: 'DELETE' }), invalidatesTags: ['AdminOrders'] }),
    restoreAdminOrder: builder.mutation<unknown, string>({ query: id => ({ url: '/admin/orders/' + encodeURIComponent(id) + '/restore', method: 'POST', body: {} }), invalidatesTags: ['AdminOrders'] }),
    getAdminOrders: builder.query<TilcayoResponse<OrdersResponse>, { page: number; deleted?: 'active' | 'trash'; search: string; status: 'all' | OrderStatus }>({
      query: query => ({ url: '/admin/orders', query: { ...query, perPage: 10 } }), providesTags: ['AdminOrders'],
    }),
    createAdminOrder: builder.mutation<TilcayoResponse<Order>, { productSku: string; customerEmail: string; quantity: number }>({
      query: body => ({ url: '/admin/orders', method: 'POST', body }), invalidatesTags: ['AdminOrders'],
    }),
    updateAdminOrder: builder.mutation<TilcayoResponse<Order>, { id: string; status: OrderStatus }>({
      query: ({ id, status }) => ({ url: '/admin/orders/' + encodeURIComponent(id), method: 'PUT', body: { status } }), invalidatesTags: ['AdminOrders'],
    }),
  }),
});
export const { useDeleteAdminOrderMutation, useRestoreAdminOrderMutation, useGetAdminOrdersQuery, useCreateAdminOrderMutation, useUpdateAdminOrderMutation } = ordersApi;
