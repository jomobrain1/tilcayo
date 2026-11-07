import type { TilcayoResponse } from '@tilcayo/react';
import { tilcayoApi } from '../../app/api';

export interface ProductInput {
  imageUrl?: string;
  name: string; sku: string; category: string; price: number;
  currency: 'KES' | 'USD'; stock: number; status: 'draft' | 'active' | 'archived';
}
export interface Product extends ProductInput { _id: string; demoBatch?: string; createdAt?: string }
export interface ProductsQuery { page: number; deleted?: 'active' | 'trash'; search: string; status: 'all' | ProductInput['status']; stock: 'all' | 'low' | 'out'; category?: string }
export interface ProductsResponse {
  items: Product[];
  pagination: { total: number; lastPage: number; hasNextPage: boolean; hasPreviousPage: boolean };
  stats: { totalProducts: number; activeProducts: number; lowStock: number; outOfStock: number };
}
export const productsApi = tilcayoApi.enhanceEndpoints({ addTagTypes: ['AdminProducts'] }).injectEndpoints({
  endpoints: builder => ({
    deleteAdminProduct: builder.mutation<unknown, string>({ query: id => ({ url: '/admin/products/' + encodeURIComponent(id), method: 'DELETE' }), invalidatesTags: ['AdminProducts'] }),
    restoreAdminProduct: builder.mutation<unknown, string>({ query: id => ({ url: '/admin/products/' + encodeURIComponent(id) + '/restore', method: 'POST', body: {} }), invalidatesTags: ['AdminProducts'] }),
    getAdminCategories: builder.query<TilcayoResponse<{ name: string; totalProducts: number; activeProducts: number; stock: number }[]>, void>({
      query: () => ({ url: '/admin/products/categories' }), providesTags: ['AdminProducts'],
    }),
    getAdminProducts: builder.query<TilcayoResponse<ProductsResponse>, ProductsQuery>({
      query: query => ({ url: '/admin/products', query: { ...query, perPage: 10 } }),
      providesTags: ['AdminProducts'],
    }),
    saveAdminProduct: builder.mutation<TilcayoResponse<Product>, { id?: string; input: ProductInput }>({
      query: ({ id, input }) => ({ url: '/admin/products' + (id ? '/' + encodeURIComponent(id) : ''), method: id ? 'PUT' : 'POST', body: input }),
      invalidatesTags: ['AdminProducts'],
    }),
  }),
});
export const { useDeleteAdminProductMutation, useRestoreAdminProductMutation, useGetAdminProductsQuery, useSaveAdminProductMutation, useGetAdminCategoriesQuery } = productsApi;
