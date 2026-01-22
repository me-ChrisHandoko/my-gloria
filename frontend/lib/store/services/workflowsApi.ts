// lib/store/services/workflowsApi.ts
/**
 * Workflows API Service
 *
 * RTK Query service for workflow instance and bulk operation management.
 * Uses shared baseQueryWithReauth for consistent authentication handling.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseApi';
import {
  Workflow,
  WorkflowListResponse,
  WorkflowFilter,
  PaginatedWorkflowsResponse,
  BulkOperationProgress,
  BulkOperationProgressResponse,
  BulkOperationFilter,
  PaginatedBulkOperationsResponse,
} from '@/lib/types/workflow';

export const workflowsApi = createApi({
  reducerPath: 'workflowsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Workflow', 'WorkflowDetail', 'BulkOperation', 'BulkOperationDetail'],
  endpoints: (builder) => ({
    // Workflow Instances
    getWorkflows: builder.query<PaginatedWorkflowsResponse, WorkflowFilter | void>({
      query: (filters) => ({
        url: '/workflows',
        params: filters || undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Workflow' as const, id })),
              { type: 'Workflow', id: 'LIST' },
            ]
          : [{ type: 'Workflow', id: 'LIST' }],
    }),
    getWorkflowById: builder.query<Workflow, string>({
      query: (id) => `/workflows/${id}`,
      providesTags: (result, error, id) => [{ type: 'WorkflowDetail', id }],
    }),

    // Bulk Operations
    getBulkOperations: builder.query<PaginatedBulkOperationsResponse, BulkOperationFilter | void>({
      query: (filters) => ({
        url: '/bulk-operations',
        params: filters || undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'BulkOperation' as const, id })),
              { type: 'BulkOperation', id: 'LIST' },
            ]
          : [{ type: 'BulkOperation', id: 'LIST' }],
    }),
    getBulkOperationById: builder.query<BulkOperationProgressResponse, string>({
      query: (id) => `/bulk-operations/${id}`,
      providesTags: (result, error, id) => [{ type: 'BulkOperationDetail', id }],
    }),
  }),
});

export const {
  useGetWorkflowsQuery,
  useGetWorkflowByIdQuery,
  useGetBulkOperationsQuery,
  useGetBulkOperationByIdQuery,
} = workflowsApi;
