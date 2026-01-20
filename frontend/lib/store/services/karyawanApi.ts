// lib/store/services/karyawanApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getCSRFToken } from '@/lib/utils/csrf';
import {
  DataKaryawan,
  DataKaryawanListItem,
  CreateKaryawanRequest,
  UpdateKaryawanRequest,
  KaryawanFilter,
  PaginatedResponse,
} from '@/lib/types/karyawan';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Create API with RTK Query
export const karyawanApi = createApi({
  reducerPath: 'karyawanApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: 'include', // Send httpOnly cookies automatically
    prepareHeaders: (headers) => {
      // Inject CSRF token for state-changing requests
      const csrfToken = getCSRFToken();
      if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken);
      }
      return headers;
    },
  }),
  tagTypes: ['Karyawan', 'KaryawanDetail'],
  endpoints: (builder) => ({
    // Get all karyawan with filters
    getKaryawans: builder.query<PaginatedResponse<DataKaryawanListItem>, KaryawanFilter | void>({
      query: (filters) => {
        if (!filters) {
          return '/employees';
        }
        const params = new URLSearchParams();
        if (filters.bagian_kerja) params.append('bagian_kerja', filters.bagian_kerja);
        if (filters.jenis_karyawan) params.append('jenis_karyawan', filters.jenis_karyawan);
        if (filters.status_aktif) params.append('status_aktif', filters.status_aktif);
        if (filters.search) params.append('search', filters.search);
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());

        return `/employees${params.toString() ? `?${params.toString()}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ nip }) => ({ type: 'Karyawan' as const, id: nip })),
              { type: 'Karyawan', id: 'LIST' },
            ]
          : [{ type: 'Karyawan', id: 'LIST' }],
    }),

    // Get karyawan by NIP
    getKaryawanByNip: builder.query<DataKaryawan, string>({
      query: (nip) => `/employees/${nip}`,
      providesTags: (result, error, nip) => [{ type: 'KaryawanDetail', id: nip }],
    }),

    // Create new karyawan
    createKaryawan: builder.mutation<DataKaryawan, CreateKaryawanRequest>({
      query: (body) => ({
        url: '/employees',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Karyawan', id: 'LIST' }],
    }),

    // Update karyawan
    updateKaryawan: builder.mutation<DataKaryawan, { nip: string; data: UpdateKaryawanRequest }>({
      query: ({ nip, data }) => ({
        url: `/employees/${nip}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { nip }) => [
        { type: 'Karyawan', id: 'LIST' },
        { type: 'KaryawanDetail', id: nip },
        { type: 'Karyawan', id: nip },
      ],
    }),

    // Delete karyawan
    deleteKaryawan: builder.mutation<{ message: string }, string>({
      query: (nip) => ({
        url: `/employees/${nip}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, nip) => [
        { type: 'Karyawan', id: 'LIST' },
        { type: 'KaryawanDetail', id: nip },
      ],
    }),

    // Get unique values for filters
    getKaryawanFilterOptions: builder.query<{
      bagian_kerja: string[];
      jenis_karyawan: string[];
      status_aktif: string[];
    }, void>({
      query: () => '/employees/filter-options',
    }),
  }),
});

// Export auto-generated hooks
export const {
  useGetKaryawansQuery,
  useGetKaryawanByNipQuery,
  useCreateKaryawanMutation,
  useUpdateKaryawanMutation,
  useDeleteKaryawanMutation,
  useGetKaryawanFilterOptionsQuery,
} = karyawanApi;
