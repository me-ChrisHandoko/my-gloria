import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { getCSRFToken } from '@/lib/utils/csrf';
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

// Base query without auto-refresh
const baseQuery = fetchBaseQuery({
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
});

/**
 * RTK Query wrapper with automatic token refresh on 401 errors
 *
 * Client-Side Auto-Refresh (simpler than TIER 3 server-side):
 * - Browser automatically handles Set-Cookie headers
 * - No need to parse cookies manually
 * - Browser cookie jar auto-updates on refresh
 * - Retry automatically uses new cookies
 *
 * Flow:
 * 1. Initial request → 401 (expired token)
 * 2. Detect 401 → call /auth/refresh
 * 3. Browser receives Set-Cookie → auto-update cookie jar
 * 4. Retry original request → browser sends new cookies automatically
 * 5. Success or redirect to login if refresh fails
 */
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // 1. Try the initial request
  let result = await baseQuery(args, api, extraOptions);

  // 2. If we get a 401, attempt to refresh the token
  if (result.error && result.error.status === 401) {
    console.log('[RTK Query] 401 detected, attempting token refresh');

    try {
      // 3. Call refresh endpoint
      // Browser automatically sends refresh token cookie and receives new tokens via Set-Cookie
      const refreshResult = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Critical: Browser handles cookies automatically
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // 4. If refresh succeeded, retry the original request
      if (refreshResult.ok) {
        console.log('[RTK Query] Token refreshed successfully, retrying original request');

        // Browser cookie jar already updated with new tokens from Set-Cookie
        // Retry will automatically use the new cookies
        result = await baseQuery(args, api, extraOptions);

        if (result.error) {
          console.log('[RTK Query] Retry failed even after refresh');
        } else {
          console.log('[RTK Query] Retry successful after token refresh');
        }
      } else {
        // 5. Refresh failed (refresh token expired or invalid)
        console.log('[RTK Query] Token refresh failed, redirecting to login');

        // Redirect to login with returnUrl to preserve user's location
        const currentPath = window.location.pathname;
        const returnUrl = encodeURIComponent(currentPath);
        window.location.href = `/login?returnUrl=${returnUrl}`;
      }
    } catch (error) {
      console.error('[RTK Query] Exception during token refresh:', error);

      // On error, redirect to login
      const currentPath = window.location.pathname;
      const returnUrl = encodeURIComponent(currentPath);
      window.location.href = `/login?returnUrl=${returnUrl}`;
    }
  }

  return result;
};

export const organizationApi = createApi({
  reducerPath: 'organizationApi',
  baseQuery: baseQueryWithReauth, // Use auto-refresh wrapper instead of direct baseQuery
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
