import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getCSRFToken } from '@/lib/utils/csrf';
import {
  AuditLog,
  AuditLogListResponse,
  AuditLogResponse,
  AuditLogFilter,
  PaginatedAuditLogsResponse,
} from '@/lib/types/audit';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export const auditApi = createApi({
  reducerPath: 'auditApi',
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
  tagTypes: ['AuditLog', 'AuditLogDetail'],
  endpoints: (builder) => ({
    // Audit Logs
    getAuditLogs: builder.query<PaginatedAuditLogsResponse, AuditLogFilter | void>({
      query: (filters) => ({
        url: '/audit-logs',
        params: filters || undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'AuditLog' as const, id })),
              { type: 'AuditLog', id: 'LIST' },
            ]
          : [{ type: 'AuditLog', id: 'LIST' }],
    }),
    getAuditLogById: builder.query<AuditLogResponse, string>({
      query: (id) => `/audit-logs/${id}`,
      providesTags: (result, error, id) => [{ type: 'AuditLogDetail', id }],
    }),

    // Get audit logs for specific entity
    getEntityAuditLogs: builder.query<PaginatedAuditLogsResponse, { entityType: string; entityId: string; filters?: AuditLogFilter }>({
      query: ({ entityType, entityId, filters }) => ({
        url: `/audit-logs/entity/${entityType}/${entityId}`,
        params: filters || undefined,
      }),
      providesTags: (result, error, { entityId }) => [
        { type: 'AuditLog', id: `entity-${entityId}` },
      ],
    }),

    // Get audit logs for specific user (actor)
    getUserAuditLogs: builder.query<PaginatedAuditLogsResponse, { userId: string; filters?: AuditLogFilter }>({
      query: ({ userId, filters }) => ({
        url: `/audit-logs/user/${userId}`,
        params: filters || undefined,
      }),
      providesTags: (result, error, { userId }) => [
        { type: 'AuditLog', id: `user-${userId}` },
      ],
    }),
  }),
});

export const {
  useGetAuditLogsQuery,
  useGetAuditLogByIdQuery,
  useGetEntityAuditLogsQuery,
  useGetUserAuditLogsQuery,
} = auditApi;
