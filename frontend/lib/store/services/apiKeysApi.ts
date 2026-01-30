// lib/store/services/apiKeysApi.ts
/**
 * API Keys Service
 *
 * RTK Query service for API key management operations.
 * Used for managing external API access (n8n, third-party integrations).
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseApi';
import {
  ApiKey,
  ApiKeyListResponse,
  PaginatedApiKeysResponse,
  CreateApiKeyRequest,
  CreateApiKeyApiResponse,
  ApiKeyFilter,
} from '@/lib/types/apikey';

export const apiKeysApi = createApi({
  reducerPath: 'apiKeysApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['ApiKey', 'ApiKeyDetail'],
  endpoints: (builder) => ({
    // Get all API keys with filters
    getApiKeys: builder.query<PaginatedApiKeysResponse, ApiKeyFilter | void>({
      query: (filters) => {
        if (!filters) {
          return '/api-keys';
        }
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.page_size) params.append('page_size', filters.page_size.toString());
        if (filters.search) params.append('search', filters.search);
        if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
        if (filters.sort_by) params.append('sort_by', filters.sort_by);
        if (filters.sort_order) params.append('sort_order', filters.sort_order);

        return `/api-keys${params.toString() ? `?${params.toString()}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'ApiKey' as const, id })),
              { type: 'ApiKey', id: 'LIST' },
            ]
          : [{ type: 'ApiKey', id: 'LIST' }],
    }),

    // Get single API key by ID
    getApiKeyById: builder.query<ApiKey, string>({
      query: (id) => `/api-keys/${id}`,
      providesTags: (result, error, id) => [{ type: 'ApiKeyDetail', id }],
    }),

    // Create new API key
    createApiKey: builder.mutation<CreateApiKeyApiResponse, CreateApiKeyRequest>({
      query: (body) => ({
        url: '/api-keys',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ApiKey', id: 'LIST' }],
    }),

    // Revoke (deactivate) API key
    revokeApiKey: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/api-keys/${id}/revoke`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'ApiKey', id },
        { type: 'ApiKeyDetail', id },
        { type: 'ApiKey', id: 'LIST' },
      ],
    }),

    // Delete API key permanently
    deleteApiKey: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/api-keys/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'ApiKey', id },
        { type: 'ApiKeyDetail', id },
        { type: 'ApiKey', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetApiKeysQuery,
  useGetApiKeyByIdQuery,
  useCreateApiKeyMutation,
  useRevokeApiKeyMutation,
  useDeleteApiKeyMutation,
} = apiKeysApi;
