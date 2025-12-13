import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { redirectOnce } from '@/lib/redirect-guard';

// Global token holder - set by useAuthQuery wrapper
let currentToken: string | null = null;

export const setApiToken = (token: string | null) => {
  console.log('🔑 setApiToken:', token ? `${token.substring(0, 20)}...` : 'NULL');
  currentToken = token;
};

// Base query with Clerk token injection
const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1',
  prepareHeaders: async (headers) => {
    console.log('🔑 prepareHeaders: currentToken =', currentToken ? `${currentToken.substring(0, 20)}...` : 'NULL');

    if (currentToken) {
      headers.set('Authorization', `Bearer ${currentToken}`);
      console.log('✅ prepareHeaders: Authorization header added');
    } else {
      console.log('❌ prepareHeaders: No token available');
    }

    // Add login email if available (from custom sign-in form)
    if (typeof window !== 'undefined') {
      const loginEmail = sessionStorage.getItem('clerk_login_email');
      if (loginEmail) {
        headers.set('X-Login-Email', loginEmail);
        console.log('📧 prepareHeaders: Login email added:', loginEmail);
      }
    }

    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

// Enhanced base query with automatic token refresh on 401 and logout on 403 inactive
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  // If we get 403 with "user account is inactive", trigger logout
  if (result.error && result.error.status === 403) {
    const errorData = (result.error as any).data;
    const errorMessage = errorData?.error?.toLowerCase() || '';

    if (
      errorMessage.includes('user account is inactive') ||
      errorMessage.includes('akun pengguna tidak aktif') ||
      errorMessage.includes('inactive')
    ) {
      console.log('🚫 [API] User account is inactive - triggering logout');

      // Use redirect guard to prevent duplicate redirects from multiple API calls
      // This ensures only ONE redirect occurs even when multiple queries fail
      redirectOnce('/sign-out?reason=account_deactivated');

      // Return error immediately to prevent further processing
      return result;
    }
    return result;
  }

  // If we get 401, the token might be expired
  // The wrapper hook will handle retry with fresh token
  if (result.error && result.error.status === 401) {
    // Return error - wrapper hook will handle refresh and retry
    return result;
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'CurrentUser', 'Permissions', 'Modules', 'Roles'],
  endpoints: (builder) => ({
    // Current user context
    getCurrentUser: builder.query<CurrentUserContext, void>({
      query: () => '/me',
      providesTags: ['CurrentUser'],
      transformResponse: (response: BackendResponse<BackendCurrentUserContext>) => {
        console.log('🔄 getCurrentUser transformResponse - raw:', response);
        // Unwrap backend response: {success, message, data} → data
        const data = response.data;
        console.log('🔄 getCurrentUser transformResponse - unwrapped:', data);

        // Transform backend structure to frontend expectation
        const nameParts = data.employee?.nama?.split(' ') || [];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

        return {
          user: {
            id: data.id,
            clerk_user_id: data.clerk_user_id,
            email: data.employee?.email || '',
            first_name: firstName,
            last_name: lastName,
            display_name: data.employee?.nama || 'User',
            avatar_url: undefined,
            phone: data.employee?.no_ponsel || undefined,
            is_active: data.is_active,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          employee: data.employee,
          roles: data.roles || [],
          permissions: data.permissions || [],
          modules: data.modules || [],
        } as CurrentUserContext;
      },
    }),

    // Permissions
    getMyPermissions: builder.query<string[], void>({
      query: () => '/me/permissions',
      providesTags: ['Permissions'],
      transformResponse: (response: BackendResponse<string[]>) => {
        console.log('🔄 getMyPermissions transformResponse:', response);
        // Unwrap backend response wrapper
        return response.data;
      },
    }),

    // Modules
    getMyModules: builder.query<Module[], void>({
      query: () => '/me/modules',
      providesTags: ['Modules'],
      transformResponse: (response: BackendResponse<Module[]>) => {
        console.log('🔄 getMyModules transformResponse:', response);
        // Unwrap backend response wrapper
        return response.data;
      },
    }),

    // User profiles
    getUsers: builder.query<UserProfile[], void>({
      query: () => '/web/user-profiles',
      providesTags: ['User'],
      transformResponse: (response: BackendResponse<UserProfile[]>) => {
        console.log('🔄 getUsers transformResponse:', response);
        // Unwrap backend response wrapper
        return response.data;
      },
    }),

    getUserById: builder.query<UserProfile, string>({
      query: (id) => `/web/user-profiles/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
      transformResponse: (response: BackendResponse<UserProfile>) => {
        console.log('🔄 getUserById transformResponse:', response);
        // Unwrap backend response wrapper
        return response.data;
      },
    }),

    // Roles
    getRoles: builder.query<Role[], void>({
      query: () => '/web/roles',
      providesTags: ['Roles'],
      transformResponse: (response: BackendResponse<Role[]>) => {
        console.log('🔄 getRoles transformResponse:', response);
        // Unwrap backend response wrapper
        return response.data;
      },
    }),
  }),
});

export const {
  useGetCurrentUserQuery,
  useGetMyPermissionsQuery,
  useGetMyModulesQuery,
  useGetUsersQuery,
  useGetUserByIdQuery,
  useGetRolesQuery,
} = apiSlice;

// Backend response wrapper type
interface BackendResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: string;
}

// Backend CurrentUserContext (before transformation)
interface BackendCurrentUserContext {
  id: string;
  clerk_user_id: string;
  nip: string;
  is_active: boolean;
  employee: Employee | null;
  roles: Role[];
  permissions: string[];
  modules: Module[];
}

// Types (will be imported from types/auth.ts later)
interface CurrentUserContext {
  user: UserProfile;
  employee: Employee | null;
  roles: Role[];
  permissions: string[];
  modules: Module[];
}

interface UserProfile {
  id: string;
  clerk_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Employee {
  nip: string;
  nama?: string | null;
  jenis_kelamin?: string | null;
  tgl_mulai_bekerja?: string | null;
  tgl_tetap?: string | null;
  status?: string | null;
  waktu_kerja_kependidikan?: string | null;
  bagian_kerja?: string | null;
  lokasi?: string | null;
  bidang_kerja?: string | null;
  jenis_karyawan?: string | null;
  status_aktif?: string | null;
  no_ponsel?: string | null;
  email?: string | null;
  birthdate?: string | null;
  rfid?: string | null;
}

interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  parent_id?: string;
}

interface Module {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  route?: string;
  parent_id?: string;
  is_active: boolean;
}
