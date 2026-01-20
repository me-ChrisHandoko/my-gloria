import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getCSRFToken } from '@/lib/utils/csrf';
import {
  Delegation,
  DelegationListResponse,
  DelegationResponse,
  CreateDelegationRequest,
  UpdateDelegationRequest,
  DelegationFilter,
  PaginatedDelegationsResponse,
} from '@/lib/types/delegation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export const delegationsApi = createApi({
  reducerPath: 'delegationsApi',
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
  tagTypes: ['Delegation', 'DelegationDetail', 'UserDelegations'],
  endpoints: (builder) => ({
    // Delegation CRUD Operations
    getDelegations: builder.query<PaginatedDelegationsResponse, DelegationFilter | void>({
      query: (filters) => ({
        url: '/delegations',
        params: filters || undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Delegation' as const, id })),
              { type: 'Delegation', id: 'LIST' },
            ]
          : [{ type: 'Delegation', id: 'LIST' }],
    }),
    getDelegationById: builder.query<DelegationResponse, string>({
      query: (id) => `/delegations/${id}`,
      providesTags: (result, error, id) => [{ type: 'DelegationDetail', id }],
    }),
    createDelegation: builder.mutation<Delegation, CreateDelegationRequest>({
      query: (data) => ({
        url: '/delegations',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Delegation'],
    }),
    updateDelegation: builder.mutation<Delegation, { id: string; data: UpdateDelegationRequest }>({
      query: ({ id, data }) => ({
        url: `/delegations/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Delegation', id: 'LIST' },
        { type: 'DelegationDetail', id },
      ],
    }),
    deleteDelegation: builder.mutation<void, string>({
      query: (id) => ({
        url: `/delegations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Delegation'],
    }),

    // User-specific delegations
    getDelegationsByDelegator: builder.query<DelegationListResponse[], string>({
      query: (delegatorId) => `/users/${delegatorId}/delegations/as-delegator`,
      providesTags: (result, error, delegatorId) => [
        { type: 'UserDelegations', id: `delegator-${delegatorId}` },
      ],
    }),
    getDelegationsByDelegate: builder.query<DelegationListResponse[], string>({
      query: (delegateId) => `/users/${delegateId}/delegations/as-delegate`,
      providesTags: (result, error, delegateId) => [
        { type: 'UserDelegations', id: `delegate-${delegateId}` },
      ],
    }),
  }),
});

export const {
  useGetDelegationsQuery,
  useGetDelegationByIdQuery,
  useCreateDelegationMutation,
  useUpdateDelegationMutation,
  useDeleteDelegationMutation,
  useGetDelegationsByDelegatorQuery,
  useGetDelegationsByDelegateQuery,
} = delegationsApi;
