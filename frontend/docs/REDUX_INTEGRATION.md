# Redux Toolkit & RTK Query Integration Guide

## Overview

This guide explains how the frontend is connected to the backend using Redux Toolkit (RTK) and RTK Query with best practices implementation.

## Architecture

### 1. Technology Stack
- **Redux Toolkit**: State management with modern Redux patterns
- **RTK Query**: Powerful data fetching and caching
- **Clerk**: Authentication provider
- **TypeScript**: Type safety throughout

### 2. Directory Structure
```
src/
├── store/
│   ├── store.ts                 # Redux store configuration
│   ├── api/
│   │   ├── apiSlice.ts         # Base API slice with auth headers
│   │   ├── authApi.ts          # Authentication endpoints
│   │   ├── userApi.ts          # User management endpoints
│   │   ├── requestApi.ts       # Request/approval endpoints
│   │   └── notificationApi.ts  # Notification endpoints
│   └── features/
│       ├── auth/authSlice.ts   # Auth state management
│       ├── notification/       # Notification state
│       └── ui/uiSlice.ts       # UI state (modals, loading, etc.)
├── hooks/
│   ├── redux.ts                # Typed Redux hooks
│   ├── useAuth.ts              # Authentication hook
│   └── usePermissions.ts       # Permission checking hook
├── providers/
│   └── ReduxProvider.tsx       # Redux provider wrapper
└── types/
    ├── auth.ts                 # Authentication types
    └── user.ts                 # User-related types
```

## Core Components

### 1. Store Configuration (`store/store.ts`)
- Configures Redux store with RTK Query middleware
- Sets up Redux DevTools for development
- Handles serialization checks for dates and special objects
- Exports typed hooks for TypeScript support

### 2. Base API Slice (`store/api/apiSlice.ts`)
- Central configuration for all API calls
- Automatic Clerk token injection in headers
- Tag-based cache invalidation
- Credentials handling for cookies

### 3. Authentication Flow

#### Clerk Integration
- Frontend uses Clerk for authentication
- Token automatically attached to API requests
- Backend validates token using Clerk SDK

#### Auth Hook (`hooks/useAuth.ts`)
```typescript
const {
  user,              // Current user profile
  isAuthenticated,   // Auth status
  syncUserData,      // Sync with backend
  refreshUser        // Refresh user data
} = useAuth();
```

### 4. RTK Query API Slices

#### Authentication API
- `getCurrentUser`: Fetch authenticated user profile
- `syncUser`: Sync Clerk user with backend
- `getUserPermissions`: Get module-specific permissions
- `getUserModules`: Get accessible modules

#### User Management API
- CRUD operations for users
- Position and role assignment
- Pagination and filtering support

#### Request/Approval API
- Create and manage requests
- Handle approval workflows
- Track request status

#### Notification API
- Real-time notification support
- Read/unread management
- WebSocket integration ready

## Best Practices Implementation

### 1. Type Safety
All API responses and Redux state are fully typed using TypeScript interfaces.

### 2. Error Handling
```typescript
try {
  const result = await createRequest(data).unwrap();
  // Handle success
} catch (error) {
  // Error is typed and contains response data
  dispatch(addNotification({
    title: 'Error',
    message: error.data?.message || 'Operation failed',
    severity: 'error'
  }));
}
```

### 3. Cache Management
RTK Query automatically caches API responses and provides:
- Tag-based invalidation
- Optimistic updates
- Automatic refetching
- Cache lifetime configuration

### 4. Loading States
```typescript
const { data, isLoading, error, refetch } = useGetMyRequestsQuery(params);
```

### 5. Permissions System
```typescript
const { canCreate, canRead, canApprove, hasPermission } = usePermissions('MODULE_CODE');

// Check specific permission with scope
if (hasPermission('DELETE', 'DEPARTMENT')) {
  // User can delete department-level data
}
```

## Usage Examples

### 1. Fetching Data
```typescript
// Automatic caching and background refetching
const { data: myRequests } = useGetMyRequestsQuery({
  page: 1,
  limit: 10,
  status: 'PENDING'
});
```

### 2. Mutations
```typescript
const [createRequest, { isLoading }] = useCreateRequestMutation();

const handleSubmit = async (formData) => {
  try {
    const result = await createRequest(formData).unwrap();
    // Success handling
  } catch (error) {
    // Error handling
  }
};
```

### 3. Global State Management
```typescript
// UI State
dispatch(setLoading({ key: 'operation', value: true }));
dispatch(openModal('modalName'));

// Notifications
dispatch(addNotification({
  title: 'Success',
  message: 'Operation completed',
  severity: 'success'
}));
```

### 4. Authentication Check
```typescript
const { isAuthenticated, user } = useAuth();

if (!isAuthenticated) {
  return <SignInPrompt />;
}
```

## API Integration Pattern

### 1. Request Flow
1. User action triggers API call
2. Clerk token automatically attached
3. Request sent to backend
4. Backend validates token with Clerk
5. Backend processes request with user context
6. Response cached by RTK Query
7. UI updates automatically

### 2. Real-time Updates
- WebSocket support prepared in notification API
- Polling available for real-time data
- Automatic cache invalidation on mutations

## Environment Configuration

### Required Environment Variables
```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...

# Backend (.env)
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...
```

## Development Workflow

### 1. Adding New API Endpoints

Create new API slice:
```typescript
// store/api/newFeatureApi.ts
export const newFeatureApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getFeatures: builder.query<Feature[], void>({
      query: () => '/features',
      providesTags: ['Feature'],
    }),
  }),
});
```

### 2. Adding New Redux Slice
```typescript
// store/features/newFeature/newFeatureSlice.ts
const newFeatureSlice = createSlice({
  name: 'newFeature',
  initialState,
  reducers: {
    // Reducers here
  },
});
```

### 3. Using in Components
```typescript
import { useGetFeaturesQuery } from '@/store/api/newFeatureApi';

function MyComponent() {
  const { data, isLoading } = useGetFeaturesQuery();
  // Use data
}
```

## Performance Optimizations

1. **Selective Subscriptions**: Components only subscribe to needed data
2. **Automatic Deduplication**: Multiple components can request same data
3. **Background Refetching**: Keep data fresh without blocking UI
4. **Optimistic Updates**: Immediate UI feedback for better UX
5. **Lazy Loading**: API slices injected on demand

## Testing

### Unit Testing Hooks
```typescript
import { renderHook } from '@testing-library/react-hooks';
import { useAuth } from '@/hooks/useAuth';

test('useAuth returns user data', () => {
  const { result } = renderHook(() => useAuth());
  expect(result.current.isAuthenticated).toBe(false);
});
```

### Integration Testing
```typescript
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('/api/auth/me', (req, res, ctx) => {
    return res(ctx.json({ /* mock data */ }));
  })
);
```

## Troubleshooting

### Common Issues

1. **Token not attached to requests**
   - Ensure Clerk is properly initialized
   - Check if user is signed in
   - Verify NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

2. **CORS errors**
   - Backend CORS configuration in main.ts
   - Check allowed origins match frontend URL

3. **Cache not updating**
   - Verify tags are properly configured
   - Check invalidatesTags in mutations

4. **TypeScript errors**
   - Run `npm run build` to check types
   - Ensure all imports have proper types

## Next Steps

1. Implement WebSocket for real-time updates
2. Add offline support with Redux Persist
3. Implement optimistic updates for better UX
4. Add request retry logic for network failures
5. Implement request cancellation for long-running operations