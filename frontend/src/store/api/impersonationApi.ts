import { apiSlice } from './apiSlice';

export interface ImpersonationUser {
  id: string;
  email: string;
  name: string;
  profileImageUrl?: string;
  organizationRole?: string;
}

export interface ImpersonationSession {
  isActive: boolean;
  originalUser: ImpersonationUser;
  impersonatedUser: ImpersonationUser;
  startedAt: string;
  expiresAt: string;
  remainingTime: number; // in seconds
}

export interface StartImpersonationDto {
  targetUserId: string;
  reason?: string;
}

export interface ImpersonationResponse {
  success: boolean;
  data: ImpersonationSession;
  message?: string;
}

export const impersonationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get current impersonation session
    getImpersonationSession: builder.query<ImpersonationSession | null, void>({
      query: () => ({
        url: '/v1/admin/impersonation/session',
        method: 'GET',
      }),
      providesTags: ['Impersonation'],
      transformResponse: (response: any) => {
        // Handle null or undefined response
        if (!response) {
          return null;
        }
        
        // Handle the backend response format
        if (response.active === false) {
          // No active session
          return null;
        }
        
        // Transform backend response to match our frontend interface
        if (response.active === true && response.session) {
          const session = response.session;
          const effectiveContext = response.effectivePermissions;
          
          // Map backend response to ImpersonationSession interface
          return {
            isActive: true,
            originalUser: effectiveContext?.originalUser || {
              id: effectiveContext?.clerkUserId || '',
              email: effectiveContext?.email || '',
              name: effectiveContext?.fullName || '',
            },
            impersonatedUser: {
              id: session.targetUserId || '',
              email: effectiveContext?.email || '',
              name: effectiveContext?.fullName || '',
            },
            startedAt: session.startedAt,
            expiresAt: session.expiresAt,
            remainingTime: session.remainingSeconds || 0,
          };
        }
        
        // Handle response with data property
        if (response.data !== undefined) {
          return response.data;
        }
        
        // If response is the session object directly
        if (response.isActive !== undefined) {
          return response;
        }
        
        // Default to null
        return null;
      },
    }),

    // Get list of users available for impersonation
    getImpersonatableUsers: builder.query<ImpersonationUser[], { search?: string; limit?: number }>({
      query: (params) => ({
        url: '/v1/admin/impersonation/users',
        method: 'GET',
        params,
      }),
      transformResponse: (response: any) => {
        // Handle null or undefined response
        if (!response) {
          return [];
        }
        // Handle response with data property
        if (response.data !== undefined) {
          return Array.isArray(response.data) ? response.data : [];
        }
        // Handle direct array response
        if (Array.isArray(response)) {
          return response;
        }
        // Default to empty array
        return [];
      },
      transformErrorResponse: (response: any) => {
        // Handle 404 gracefully - API not implemented yet
        if (response?.status === 404) {
          return [];
        }
        return response;
      },
    }),

    // Start impersonation
    startImpersonation: builder.mutation<ImpersonationSession, StartImpersonationDto>({
      query: (data) => ({
        url: '/v1/admin/impersonation/start',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Impersonation', 'User', 'UserProfile'],
      transformResponse: (response: ImpersonationResponse) => {
        if (!response || !response.data) {
          throw new Error('Invalid response from server');
        }
        return response.data;
      },
    }),

    // Stop impersonation
    stopImpersonation: builder.mutation<void, void>({
      query: () => ({
        url: '/v1/admin/impersonation/stop',
        method: 'POST',
      }),
      invalidatesTags: ['Impersonation', 'User', 'UserProfile'],
    }),

    // Refresh impersonation session
    refreshImpersonationSession: builder.mutation<ImpersonationSession, void>({
      query: () => ({
        url: '/v1/admin/impersonation/refresh',
        method: 'POST',
      }),
      invalidatesTags: ['Impersonation'],
      transformResponse: (response: ImpersonationResponse) => {
        if (!response || !response.data) {
          throw new Error('Invalid response from server');
        }
        return response.data;
      },
    }),
  }),
});

export const {
  useGetImpersonationSessionQuery,
  useGetImpersonatableUsersQuery,
  useStartImpersonationMutation,
  useStopImpersonationMutation,
  useRefreshImpersonationSessionMutation,
} = impersonationApi;