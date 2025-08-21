import { createApi } from '@reduxjs/toolkit/query/react';
// import { clerkBaseQuery } from './clerkBaseQuery'; // Original version
// import { clerkBaseQueryV2 } from './clerkBaseQueryV2'; // Has server-only import issue
import { clerkBaseQueryV3 } from './clerkBaseQueryV3'; // Client-safe version

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: clerkBaseQueryV3,
  tagTypes: [
    'User',
    'UserProfile',
    'Module',
    'Role',
    'Permission',
    'PermissionGroup',
    'UserPermission',
    'Position',
    'Department',
    'School',
    'Request',
    'Notification',
    'AuditLog',
    'Hierarchy',
    'UserPosition',
    'Impersonation',
  ],
  endpoints: () => ({}),
});