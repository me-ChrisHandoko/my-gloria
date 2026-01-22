// lib/store/services/organizationApi.ts
/**
 * Organization API Service
 *
 * RTK Query service for organization structure management.
 * Includes schools, departments, positions, and workflow rules.
 * Uses shared baseQueryWithReauth for consistent authentication handling.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseApi';
import {
  School,
  SchoolListResponse,
  PaginatedSchoolsResponse,
  CreateSchoolRequest,
  UpdateSchoolRequest,
  SchoolFilter,
  Department,
  DepartmentListResponse,
  DepartmentTreeResponse,
  PaginatedDepartmentsResponse,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  DepartmentFilter,
  Position,
  PositionListResponse,
  PaginatedPositionsResponse,
  CreatePositionRequest,
  UpdatePositionRequest,
  PositionFilter,
  WorkflowRule,
  WorkflowRuleListResponse,
  PaginatedWorkflowRulesResponse,
  CreateWorkflowRuleRequest,
  UpdateWorkflowRuleRequest,
  WorkflowRuleFilter,
  WorkflowTypesResponse,
  WorkflowRuleLookupParams,
  WorkflowType,
  BulkCreateWorkflowRulesRequest,
  BulkCreateWorkflowRulesResult,
} from '@/lib/types/organization';

export const organizationApi = createApi({
  reducerPath: 'organizationApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['School', 'SchoolDetail', 'Department', 'DepartmentDetail', 'DepartmentTree', 'Position', 'PositionDetail', 'WorkflowRule', 'WorkflowRuleDetail'],
  endpoints: (builder) => ({
    // ============================================
    // SCHOOLS
    // ============================================
    getSchools: builder.query<PaginatedSchoolsResponse, SchoolFilter | void>({
      query: (filters) => {
        if (!filters) {
          return '/schools';
        }
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.page_size) params.append('page_size', filters.page_size.toString());
        if (filters.search) params.append('search', filters.search);
        if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
        if (filters.lokasi) params.append('lokasi', filters.lokasi);
        if (filters.sort_by) params.append('sort_by', filters.sort_by);
        if (filters.sort_order) params.append('sort_order', filters.sort_order);

        return `/schools${params.toString() ? `?${params.toString()}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'School' as const, id })),
              { type: 'School', id: 'LIST' },
            ]
          : [{ type: 'School', id: 'LIST' }],
    }),

    getSchoolById: builder.query<School, string>({
      query: (id) => `/schools/${id}`,
      providesTags: (result, error, id) => [{ type: 'SchoolDetail', id }],
    }),

    createSchool: builder.mutation<School, CreateSchoolRequest>({
      query: (body) => ({
        url: '/schools',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'School', id: 'LIST' }],
    }),

    updateSchool: builder.mutation<School, { id: string; data: UpdateSchoolRequest }>({
      query: ({ id, data }) => ({
        url: `/schools/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'School', id },
        { type: 'SchoolDetail', id },
        { type: 'School', id: 'LIST' },
      ],
    }),

    deleteSchool: builder.mutation<void, string>({
      query: (id) => ({
        url: `/schools/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'School', id },
        { type: 'SchoolDetail', id },
        { type: 'School', id: 'LIST' },
      ],
    }),

    getAvailableSchoolCodes: builder.query<{ codes: string[] }, void>({
      query: () => '/schools/available-codes',
    }),

    // ============================================
    // DEPARTMENTS
    // ============================================
    getDepartments: builder.query<PaginatedDepartmentsResponse, DepartmentFilter | void>({
      query: (filters) => {
        if (!filters) {
          return '/departments';
        }
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.page_size) params.append('page_size', filters.page_size.toString());
        if (filters.search) params.append('search', filters.search);
        if (filters.school_id) params.append('school_id', filters.school_id);
        if (filters.parent_id) params.append('parent_id', filters.parent_id);
        if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
        if (filters.sort_by) params.append('sort_by', filters.sort_by);
        if (filters.sort_order) params.append('sort_order', filters.sort_order);

        return `/departments${params.toString() ? `?${params.toString()}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Department' as const, id })),
              { type: 'Department', id: 'LIST' },
            ]
          : [{ type: 'Department', id: 'LIST' }],
    }),

    getDepartmentById: builder.query<Department, string>({
      query: (id) => `/departments/${id}`,
      providesTags: (result, error, id) => [{ type: 'DepartmentDetail', id }],
    }),

    getDepartmentTree: builder.query<DepartmentTreeResponse[], void>({
      query: () => '/departments/tree',
      providesTags: [{ type: 'DepartmentTree', id: 'TREE' }],
    }),

    createDepartment: builder.mutation<Department, CreateDepartmentRequest>({
      query: (body) => ({
        url: '/departments',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Department', id: 'LIST' }, { type: 'DepartmentTree', id: 'TREE' }],
    }),

    updateDepartment: builder.mutation<Department, { id: string; data: UpdateDepartmentRequest }>({
      query: ({ id, data }) => ({
        url: `/departments/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Department', id },
        { type: 'DepartmentDetail', id },
        { type: 'Department', id: 'LIST' },
        { type: 'DepartmentTree', id: 'TREE' },
      ],
    }),

    deleteDepartment: builder.mutation<void, string>({
      query: (id) => ({
        url: `/departments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Department', id },
        { type: 'DepartmentDetail', id },
        { type: 'Department', id: 'LIST' },
        { type: 'DepartmentTree', id: 'TREE' },
      ],
    }),

    getAvailableDepartmentCodes: builder.query<{ codes: string[] }, void>({
      query: () => '/departments/available-codes',
    }),

    // ============================================
    // POSITIONS
    // ============================================
    getPositions: builder.query<PaginatedPositionsResponse, PositionFilter | void>({
      query: (filters) => {
        if (!filters) {
          return '/positions';
        }
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.page_size) params.append('page_size', filters.page_size.toString());
        if (filters.search) params.append('search', filters.search);
        if (filters.department_id) params.append('department_id', filters.department_id);
        if (filters.school_id) params.append('school_id', filters.school_id);
        if (filters.hierarchy_level !== undefined) params.append('hierarchy_level', filters.hierarchy_level.toString());
        if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
        if (filters.sort_by) params.append('sort_by', filters.sort_by);
        if (filters.sort_order) params.append('sort_order', filters.sort_order);

        return `/positions${params.toString() ? `?${params.toString()}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Position' as const, id })),
              { type: 'Position', id: 'LIST' },
            ]
          : [{ type: 'Position', id: 'LIST' }],
    }),

    getPositionById: builder.query<Position, string>({
      query: (id) => `/positions/${id}`,
      providesTags: (result, error, id) => [{ type: 'PositionDetail', id }],
    }),

    createPosition: builder.mutation<Position, CreatePositionRequest>({
      query: (body) => ({
        url: '/positions',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Position', id: 'LIST' }],
    }),

    updatePosition: builder.mutation<Position, { id: string; data: UpdatePositionRequest }>({
      query: ({ id, data }) => ({
        url: `/positions/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Position', id },
        { type: 'PositionDetail', id },
        { type: 'Position', id: 'LIST' },
      ],
    }),

    deletePosition: builder.mutation<void, string>({
      query: (id) => ({
        url: `/positions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Position', id },
        { type: 'PositionDetail', id },
        { type: 'Position', id: 'LIST' },
      ],
    }),

    // ============================================
    // WORKFLOW RULES
    // ============================================
    getWorkflowRules: builder.query<PaginatedWorkflowRulesResponse, WorkflowRuleFilter | void>({
      query: (filters) => {
        if (!filters) {
          return '/workflow-rules';
        }
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.page_size) params.append('page_size', filters.page_size.toString());
        if (filters.workflow_type) params.append('workflow_type', filters.workflow_type);
        if (filters.position_id) params.append('position_id', filters.position_id);
        if (filters.school_id) params.append('school_id', filters.school_id);
        if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
        if (filters.sort_by) params.append('sort_by', filters.sort_by);
        if (filters.sort_order) params.append('sort_order', filters.sort_order);

        return `/workflow-rules${params.toString() ? `?${params.toString()}` : ''}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'WorkflowRule' as const, id })),
              { type: 'WorkflowRule', id: 'LIST' },
            ]
          : [{ type: 'WorkflowRule', id: 'LIST' }],
    }),

    getWorkflowRuleById: builder.query<WorkflowRule, string>({
      query: (id) => `/workflow-rules/${id}`,
      providesTags: (result, error, id) => [{ type: 'WorkflowRuleDetail', id }],
    }),

    getWorkflowTypes: builder.query<WorkflowTypesResponse, void>({
      query: () => '/workflow-rules/types',
    }),

    getWorkflowRuleLookup: builder.query<WorkflowRule, WorkflowRuleLookupParams>({
      query: ({ position_id, workflow_type }) => {
        const params = new URLSearchParams();
        params.append('position_id', position_id);
        params.append('workflow_type', workflow_type);
        return `/workflow-rules/lookup?${params.toString()}`;
      },
    }),

    createWorkflowRule: builder.mutation<WorkflowRule, CreateWorkflowRuleRequest>({
      query: (body) => ({
        url: '/workflow-rules',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'WorkflowRule', id: 'LIST' }],
    }),

    updateWorkflowRule: builder.mutation<WorkflowRule, { id: string; data: UpdateWorkflowRuleRequest }>({
      query: ({ id, data }) => ({
        url: `/workflow-rules/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'WorkflowRule', id },
        { type: 'WorkflowRuleDetail', id },
        { type: 'WorkflowRule', id: 'LIST' },
      ],
    }),

    deleteWorkflowRule: builder.mutation<void, string>({
      query: (id) => ({
        url: `/workflow-rules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'WorkflowRule', id },
        { type: 'WorkflowRuleDetail', id },
        { type: 'WorkflowRule', id: 'LIST' },
      ],
    }),

    bulkCreateWorkflowRules: builder.mutation<BulkCreateWorkflowRulesResult, BulkCreateWorkflowRulesRequest>({
      query: (body) => ({
        url: '/workflow-rules/bulk',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'WorkflowRule', id: 'LIST' }],
    }),
  }),
});

export const {
  // Schools
  useGetSchoolsQuery,
  useGetSchoolByIdQuery,
  useCreateSchoolMutation,
  useUpdateSchoolMutation,
  useDeleteSchoolMutation,
  useGetAvailableSchoolCodesQuery,
  // Departments
  useGetDepartmentsQuery,
  useGetDepartmentByIdQuery,
  useGetDepartmentTreeQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useGetAvailableDepartmentCodesQuery,
  // Positions
  useGetPositionsQuery,
  useGetPositionByIdQuery,
  useCreatePositionMutation,
  useUpdatePositionMutation,
  useDeletePositionMutation,
  // Workflow Rules
  useGetWorkflowRulesQuery,
  useGetWorkflowRuleByIdQuery,
  useGetWorkflowTypesQuery,
  useGetWorkflowRuleLookupQuery,
  useCreateWorkflowRuleMutation,
  useUpdateWorkflowRuleMutation,
  useDeleteWorkflowRuleMutation,
  useBulkCreateWorkflowRulesMutation,
} = organizationApi;
