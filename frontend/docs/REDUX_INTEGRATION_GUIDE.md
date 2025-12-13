# Redux Integration Quick Reference Guide

## 🎯 Core Pattern: useAuthQuery Wrapper

### Problem
Cannot use React hooks inside RTK Query baseQuery:
```typescript
// ❌ This DOES NOT work
const baseQuery = fetchBaseQuery({
  prepareHeaders: async (headers) => {
    const { getToken } = useAuth(); // Error: Hooks only work in components!
  }
});
```

### Solution
Wrapper hook pattern with `extraOptions`:
```typescript
// ✅ This works
export function useAuthQuery(useQueryHook, args, options) {
  const { getToken } = useAuth(); // In component - OK!
  const token = await getToken();

  return useQueryHook(args, {
    extraOptions: { token } // Injected here
  });
}

// baseQuery reads from extraOptions
prepareHeaders: (headers, { extra }) => {
  const token = extra?.token;
  headers.set('Authorization', `Bearer ${token}`);
}
```

---

## 📚 Usage Patterns

### Pattern 1: Get Current User
```typescript
import { useCurrentUser } from '@/hooks/use-current-user';

function Component() {
  const { user, permissions, roles, isLoading } = useCurrentUser();

  if (isLoading) return <Loading />;
  return <div>Welcome, {user?.display_name}</div>;
}
```

### Pattern 2: Fetch Data with Auth
```typescript
import { useAuthQuery } from '@/hooks/use-auth-query';
import { useGetUsersQuery } from '@/store/api/apiSlice';

function Component() {
  const { data, isLoading } = useAuthQuery(useGetUsersQuery);
  // Token automatically injected!
}
```

### Pattern 3: Query with Arguments
```typescript
const { data } = useAuthQuery(
  useGetUserByIdQuery,
  userId // Pass args
);
```

### Pattern 4: Access Redux State
```typescript
import { useAppSelector } from '@/store/hooks';
import { selectPermissions } from '@/store/slices/authSlice';

function Component() {
  const permissions = useAppSelector(selectPermissions);
}
```

---

## 🏗️ Architecture

### Provider Hierarchy
```
ClerkProvider (auth)
  └─ ReduxProvider (state)
      └─ ThemeProvider (UI)
          └─ Your App
```

### Data Flow
```
1. Component calls useCurrentUser()
2. useCurrentUser() → useAuthQuery()
3. useAuthQuery() → getToken() from Clerk
4. useAuthQuery() → calls RTK Query with extraOptions: { token }
5. RTK Query baseQuery reads token from extra
6. baseQuery adds Authorization header
7. API request sent with Bearer token
8. Response cached in Redux store
9. Component receives data
```

---

## 🔍 Available Hooks

### Primary Hook
```typescript
useCurrentUser() // Get current user + permissions + roles
```

### Wrapper Hook
```typescript
useAuthQuery(useQueryHook, args?, options?)
```

### Redux Hooks
```typescript
useAppDispatch() // Typed dispatch
useAppSelector(selector) // Typed selector
```

---

## 📦 Available Endpoints

### User Context
```typescript
useGetCurrentUserQuery() // GET /api/v1/me
useGetMyPermissionsQuery() // GET /api/v1/me/permissions
useGetMyModulesQuery() // GET /api/v1/me/modules
```

### User Management
```typescript
useGetUsersQuery() // GET /api/v1/web/user-profiles
useGetUserByIdQuery(id) // GET /api/v1/web/user-profiles/:id
```

### Roles
```typescript
useGetRolesQuery() // GET /api/v1/web/roles
```

---

## 🎨 Selectors

```typescript
import {
  selectUserContext,
  selectPermissions,
  selectRoles,
  selectModules,
  selectIsLoading,
  selectIsInitialized,
  selectError,
} from '@/store/slices/authSlice';
```

---

## ⚠️ Common Mistakes

### ❌ Using RTK Query hooks directly
```typescript
// ❌ No token!
const { data } = useGetUsersQuery();
```

### ✅ Using wrapper hook
```typescript
// ✅ Token injected
const { data } = useAuthQuery(useGetUsersQuery);
```

### ❌ Wrong provider order
```typescript
<ReduxProvider>
  <ClerkProvider> {/* Wrong! */}
```

### ✅ Correct provider order
```typescript
<ClerkProvider>
  <ReduxProvider> {/* Correct! */}
```

---

## 🧪 Testing Checklist

- [ ] Redux DevTools shows `api` and `auth` slices
- [ ] useCurrentUser returns user data
- [ ] API requests have `Authorization: Bearer <token>` header
- [ ] Data caching works (check Network tab)
- [ ] Error states handled properly

---

## 📖 See Also

- `docs/PHASE_2_IMPLEMENTATION_SUMMARY.md` - Detailed implementation guide
- `scripts/verify-phase-2.sh` - Automated verification
- `docs/AUTHENTICATION_DESIGN.md` - Full design document
