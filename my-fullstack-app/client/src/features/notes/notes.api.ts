import type { TilcayoResponse } from '@tilcayo/react';
import { tilcayoApi } from '../../app/api';
import type { Note, CreateNoteInput, UpdateNoteInput } from './notes.types';

export const noteApi = tilcayoApi.enhanceEndpoints({ addTagTypes: ['Note'] }).injectEndpoints({
  endpoints: builder => ({
    getNotes: builder.query<TilcayoResponse<Note[]>, void>({
      query: () => ({ url: '/notes' }),
      providesTags: result => [{ type: 'Note', id: 'LIST' }, ...(result?.data ?? []).map(item => ({ type: 'Note' as const, id: item._id }))],
    }),
    getNote: builder.query<TilcayoResponse<Note>, string>({
      query: id => ({ url: '/notes/' + encodeURIComponent(id) }),
      providesTags: (_result, _error, id) => [{ type: 'Note', id }],
    }),
    createNote: builder.mutation<TilcayoResponse<Note>, CreateNoteInput>({
      query: body => ({ url: '/notes', method: 'POST', body }),
      invalidatesTags: [{ type: 'Note', id: 'LIST' }],
    }),
    updateNote: builder.mutation<TilcayoResponse<Note>, { id: string; changes: UpdateNoteInput }>({
      query: ({ id, changes }) => ({ url: '/notes/' + encodeURIComponent(id), method: 'PUT', body: changes }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Note', id }, { type: 'Note', id: 'LIST' }],
    }),
    deleteNote: builder.mutation<null, string>({
      query: id => ({ url: '/notes/' + encodeURIComponent(id), method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Note', id }, { type: 'Note', id: 'LIST' }],
    }),
  }),
});

export const { useGetNotesQuery, useGetNoteQuery, useCreateNoteMutation, useUpdateNoteMutation, useDeleteNoteMutation } = noteApi;
