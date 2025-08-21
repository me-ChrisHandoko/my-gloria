import { apiSlice } from './apiSlice';
import { mockApiProvider } from '@/lib/mock-data/mock-api-provider';
import {
  School,
  CreateSchoolDto,
  UpdateSchoolDto,
  SchoolFilterDto,
  Department,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  MoveDepartmentDto,
  DepartmentFilterDto,
  DepartmentTreeDto,
  Position,
  CreatePositionDto,
  UpdatePositionDto,
  PositionFilterDto,
  PositionAvailabilityDto,
  UserPosition,
  CreateUserPositionDto,
  UpdateUserPositionDto,
  UserPositionFilterDto,
  HierarchyNode,
  HierarchyFilterDto,
} from '@/types/organization';

// Helper type for API responses from backend
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
  path?: string;
}

export const organizationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // School Endpoints
    getSchools: builder.query<School[], SchoolFilterDto | void>({
      query: (filters = {}) => ({
        url: '/v1/schools',
        method: 'GET',
        params: filters,
      }),
      transformResponse: (response: ApiResponse<School[]>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'School' as const, id })),
              { type: 'School', id: 'LIST' },
            ]
          : [{ type: 'School', id: 'LIST' }],
    }),

    getSchoolById: builder.query<School, string>({
      query: (id) => ({
        url: `/v1/schools/${id}`,
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<School>) => response.data,
      providesTags: (result, error, id) => [{ type: 'School', id }],
    }),

    getAvailableSchoolCodes: builder.query<{ value: string; label: string }[], void>({
      query: () => ({
        url: '/v1/schools/available-codes',
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<{ value: string; label: string }[]>) => response.data,
      providesTags: [{ type: 'School', id: 'CODES' }],
    }),

    createSchool: builder.mutation<School, CreateSchoolDto>({
      query: (school) => ({
        url: '/v1/schools',
        method: 'POST',
        body: school,
      }),
      transformResponse: (response: ApiResponse<School>) => response.data,
      invalidatesTags: [{ type: 'School', id: 'LIST' }],
    }),

    updateSchool: builder.mutation<School, { id: string; data: UpdateSchoolDto }>({
      query: ({ id, data }) => ({
        url: `/v1/schools/${id}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: ApiResponse<School>) => response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: 'School', id },
        { type: 'School', id: 'LIST' },
      ],
    }),

    deleteSchool: builder.mutation<void, string>({
      query: (id) => ({
        url: `/v1/schools/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'School', id },
        { type: 'School', id: 'LIST' },
      ],
    }),

    // Department Endpoints
    getDepartments: builder.query<Department[], DepartmentFilterDto | void>({
      query: (filters = {}) => ({
        url: '/v1/departments',
        method: 'GET',
        params: Object.keys(filters).length > 0 ? filters : undefined,
      }),
      transformResponse: (response: ApiResponse<Department[]>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Department' as const, id })),
              { type: 'Department', id: 'LIST' },
            ]
          : [{ type: 'Department', id: 'LIST' }],
    }),

    getDepartmentById: builder.query<Department, string>({
      query: (id) => ({
        url: `/v1/departments/${id}`,
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<Department>) => response.data,
      providesTags: (result, error, id) => [{ type: 'Department', id }],
    }),

    getDepartmentTree: builder.query<DepartmentTreeDto[], string | void>({
      query: (schoolId) => ({
        url: '/v1/departments/tree',
        method: 'GET',
        params: schoolId ? { schoolId } : undefined,
      }),
      transformResponse: (response: ApiResponse<DepartmentTreeDto[]>) => response.data,
      providesTags: [{ type: 'Department', id: 'TREE' }],
    }),

    createDepartment: builder.mutation<Department, CreateDepartmentDto>({
      query: (department) => ({
        url: '/v1/departments',
        method: 'POST',
        body: department,
      }),
      transformResponse: (response: ApiResponse<Department>) => response.data,
      invalidatesTags: [
        { type: 'Department', id: 'LIST' },
        { type: 'Department', id: 'TREE' },
      ],
    }),

    updateDepartment: builder.mutation<Department, { id: string; data: UpdateDepartmentDto }>({
      query: ({ id, data }) => ({
        url: `/v1/departments/${id}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: ApiResponse<Department>) => response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: 'Department', id },
        { type: 'Department', id: 'LIST' },
        { type: 'Department', id: 'TREE' },
      ],
    }),

    moveDepartment: builder.mutation<Department, MoveDepartmentDto>({
      query: (data) => ({
        url: '/v1/departments/move',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiResponse<Department>) => response.data,
      invalidatesTags: [
        { type: 'Department', id: 'LIST' },
        { type: 'Department', id: 'TREE' },
      ],
    }),

    deleteDepartment: builder.mutation<void, string>({
      query: (id) => ({
        url: `/v1/departments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Department', id },
        { type: 'Department', id: 'LIST' },
        { type: 'Department', id: 'TREE' },
      ],
    }),

    // Position Endpoints
    getPositions: builder.query<Position[], PositionFilterDto | void>({
      query: (filters = {}) => ({
        url: '/v1/positions',
        method: 'GET',
        params: filters,
      }),
      transformResponse: (response: ApiResponse<Position[]>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Position' as const, id })),
              { type: 'Position', id: 'LIST' },
            ]
          : [{ type: 'Position', id: 'LIST' }],
    }),

    getPositionById: builder.query<Position, string>({
      query: (id) => ({
        url: `/v1/positions/${id}`,
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<Position>) => response.data,
      providesTags: (result, error, id) => [{ type: 'Position', id }],
    }),

    getPositionAvailability: builder.query<PositionAvailabilityDto, string>({
      query: (id) => ({
        url: `/v1/positions/${id}/availability`,
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<PositionAvailabilityDto>) => response.data,
      providesTags: (result, error, id) => [{ type: 'Position', id: `${id}-availability` }],
    }),

    createPosition: builder.mutation<Position, CreatePositionDto>({
      query: (position) => ({
        url: '/v1/positions',
        method: 'POST',
        body: position,
      }),
      transformResponse: (response: ApiResponse<Position>) => response.data,
      invalidatesTags: [{ type: 'Position', id: 'LIST' }],
    }),

    updatePosition: builder.mutation<Position, { id: string; data: UpdatePositionDto }>({
      query: ({ id, data }) => ({
        url: `/v1/positions/${id}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: ApiResponse<Position>) => response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: 'Position', id },
        { type: 'Position', id: 'LIST' },
        { type: 'Position', id: `${id}-availability` },
      ],
    }),

    deletePosition: builder.mutation<void, string>({
      query: (id) => ({
        url: `/v1/positions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Position', id },
        { type: 'Position', id: 'LIST' },
      ],
    }),

    // User Position Endpoints
    getUserPositions: builder.query<UserPosition[], UserPositionFilterDto | void>({
      query: (filters = {}) => ({
        url: '/v1/user-positions',
        method: 'GET',
        params: filters,
      }),
      transformResponse: (response: ApiResponse<UserPosition[]>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'UserPosition' as const, id })),
              { type: 'UserPosition', id: 'LIST' },
            ]
          : [{ type: 'UserPosition', id: 'LIST' }],
    }),

    getUserPositionById: builder.query<UserPosition, string>({
      query: (id) => ({
        url: `/v1/user-positions/${id}`,
        method: 'GET',
      }),
      transformResponse: (response: ApiResponse<UserPosition>) => response.data,
      providesTags: (result, error, id) => [{ type: 'UserPosition', id }],
    }),

    assignUserPosition: builder.mutation<UserPosition, CreateUserPositionDto>({
      query: (assignment) => ({
        url: '/v1/user-positions',
        method: 'POST',
        body: assignment,
      }),
      transformResponse: (response: ApiResponse<UserPosition>) => response.data,
      invalidatesTags: [
        { type: 'UserPosition', id: 'LIST' },
        { type: 'Position', id: 'LIST' },
      ],
    }),

    updateUserPosition: builder.mutation<UserPosition, { id: string; data: UpdateUserPositionDto }>({
      query: ({ id, data }) => ({
        url: `/v1/user-positions/${id}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: ApiResponse<UserPosition>) => response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: 'UserPosition', id },
        { type: 'UserPosition', id: 'LIST' },
        { type: 'Position', id: 'LIST' },
      ],
    }),

    removeUserPosition: builder.mutation<void, string>({
      query: (id) => ({
        url: `/v1/user-positions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'UserPosition', id },
        { type: 'UserPosition', id: 'LIST' },
        { type: 'Position', id: 'LIST' },
      ],
    }),

    // Hierarchy Endpoints
    getOrganizationHierarchy: builder.query<HierarchyNode, HierarchyFilterDto | void>({
      queryFn: async (filters = {}, api, extraOptions, baseQuery) => {
        // Check if mock data is enabled
        if (mockApiProvider.isMockDataEnabled()) {
          try {
            const data = await mockApiProvider.getOrganizationHierarchy(filters);
            return { data };
          } catch (error: any) {
            return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          }
        }
        // If mock data is disabled, use the real API
        const result = await baseQuery({
          url: '/v1/hierarchy/org-chart',
          method: 'GET',
          params: filters,
        });
        
        if (result.error) {
          return { error: result.error };
        }
        
        return { data: (result.data as ApiResponse<HierarchyNode>).data };
      },
      providesTags: [{ type: 'Hierarchy', id: 'TREE' }],
      // Add caching and prefetching
      keepUnusedDataFor: 300, // Keep cached data for 5 minutes
    }),

    getUserHierarchy: builder.query<HierarchyNode, string>({
      queryFn: async (userId, api, extraOptions, baseQuery) => {
        // Check if mock data is enabled
        if (mockApiProvider.isMockDataEnabled()) {
          try {
            const data = await mockApiProvider.getUserHierarchy(userId);
            return { data };
          } catch (error: any) {
            return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          }
        }
        // If mock data is disabled, use the real API
        const result = await baseQuery({
          url: `/v1/hierarchy/user/${userId}`,
          method: 'GET',
        });
        
        if (result.error) {
          return { error: result.error };
        }
        
        return { data: (result.data as ApiResponse<HierarchyNode>).data };
      },
      providesTags: (result, error, userId) => [{ type: 'Hierarchy', id: `USER-${userId}` }],
      keepUnusedDataFor: 300, // Keep cached data for 5 minutes
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  // School hooks
  useGetSchoolsQuery,
  useGetSchoolByIdQuery,
  useGetAvailableSchoolCodesQuery,
  useCreateSchoolMutation,
  useUpdateSchoolMutation,
  useDeleteSchoolMutation,

  // Department hooks
  useGetDepartmentsQuery,
  useGetDepartmentByIdQuery,
  useGetDepartmentTreeQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useMoveDepartmentMutation,
  useDeleteDepartmentMutation,

  // Position hooks
  useGetPositionsQuery,
  useGetPositionByIdQuery,
  useGetPositionAvailabilityQuery,
  useCreatePositionMutation,
  useUpdatePositionMutation,
  useDeletePositionMutation,

  // User Position hooks
  useGetUserPositionsQuery,
  useGetUserPositionByIdQuery,
  useAssignUserPositionMutation,
  useUpdateUserPositionMutation,
  useRemoveUserPositionMutation,

  // Hierarchy hooks
  useGetOrganizationHierarchyQuery,
  useGetUserHierarchyQuery,
} = organizationApi;