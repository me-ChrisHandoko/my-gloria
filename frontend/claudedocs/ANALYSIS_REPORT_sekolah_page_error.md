# Analysis Report: Sekolah Page Error (http://localhost:3000/organisasi/sekolah)

**Analysis Date**: 2026-01-13
**Severity**: 🔴 **CRITICAL**
**Status**: Multiple cascading failures
**Analysis Method**: UltraThink Deep Analysis with Sequential Reasoning

---

## Executive Summary

The `/organisasi/sekolah` page experiences cascading failures due to three interconnected architectural issues:

1. **Expired JWT Token** - Authentication token in cookies has expired
2. **React Server/Client Boundary Violation** - Server Component passing non-serializable data to Client Component
3. **Auth Timing Mismatch** - Server-side cookie auth vs client-side Redux auth state synchronization

**Impact**: Complete page failure, poor user experience, multiple error messages obscuring root cause

**Recommended Action**: Three-tier fix (Immediate → Short-term → Long-term)

---

## Error Analysis

### Primary Error Log

```
Server [Schools Page] Failed to fetch initial data: Error: invalid or expired token
```

**Location**: `app/(protected)/organisasi/sekolah/page.tsx:46`
**Trigger**: Server Component calling `getSchools()` with expired access token
**Root Cause**: No token refresh mechanism in server-side API calls

### Secondary Error Cascade

```
Error: Only plain objects can be passed to Client Components from Server Components.
Classes or other objects with methods are not supported.

<EmptyState icon={AlertCircle} iconClassName=... >
            ^^^^^^^^^^^^^^^^^^
```

**Location**: `app/(protected)/organisasi/sekolah/page.tsx:58-93`
**Trigger**: Server Component trying to render `EmptyState` with non-serializable props
**Root Cause**: React 19 RSC architecture violation

```
Error: Event handlers cannot be passed to Client Component props.
{label: ..., onClick: function onClick, variant: ...}
                      ^^^^^^^^^^^^^^^^
```

**Location**: Same component, lines 82, 88
**Trigger**: Passing function callbacks across Server/Client boundary
**Root Cause**: React RSC serialization constraints

---

## Root Cause Analysis

### Root Cause 1: Expired JWT Token

**Issue**: Server-side API (`lib/server/api.ts`) uses `gloria_access_token` from cookies without refresh mechanism.

**Code Path**:
```typescript
// lib/server/api.ts:25-36
const cookieStore = await cookies();
const accessToken = cookieStore.get('gloria_access_token')?.value;

if (requireAuth && accessToken) {
  headers['Authorization'] = `Bearer ${accessToken}`;
}
```

**Problem**:
- Token has finite lifetime (typically 15-60 minutes)
- When expired, backend returns 401 "invalid or expired token"
- Server Component has no recovery mechanism
- User must manually log in again

**Impact**: ⚡ High - Affects all server-rendered protected pages

---

### Root Cause 2: React Server/Client Component Boundary Violation

**Issue**: Server Component (`page.tsx`) attempting to pass non-serializable data to Client Component (`EmptyState.tsx`).

**Violated Props**:

1. **Icon Component** (Line 59):
   ```typescript
   icon={AlertCircle}  // LucideIcon is a React component class
   ```

2. **Icon Component** (Line 85):
   ```typescript
   icon: RefreshCw  // Another LucideIcon component
   ```

3. **Event Handlers** (Lines 84, 89):
   ```typescript
   onClick: () => window.location.reload()
   onClick: () => window.location.href = '/dashboard'
   ```

**React 19 RSC Constraints**:
- ✅ Can pass: Strings, numbers, booleans, null, undefined, plain objects, arrays
- ❌ Cannot pass: Functions, class instances, symbols, non-serializable objects

**Why It Fails**:
```
Server Component (page.tsx)
    ↓ serialization boundary
    ✗ LucideIcon components (classes with methods)
    ✗ Arrow functions (onClick handlers)
    ↓
Client Component (EmptyState.tsx)
```

**Impact**: 🔴 Critical - Causes complete page render failure

---

### Root Cause 3: Auth Timing Mismatch

**Issue**: Architectural inconsistency between server-side and client-side authentication checks.

**Current Flow**:
```
1. User navigates to /organisasi/sekolah
   ↓
2. Server Component (page.tsx) executes on server
   - Reads gloria_access_token from cookies
   - Token is expired
   - Fetch fails with 401
   ↓
3. Client hydration begins
   - ProtectedRoute checks Redux auth state
   - Redux state may be stale (thinks user is authenticated)
   ↓
4. Timing conflict: Server knows auth failed, client thinks auth succeeded
```

**Code Evidence**:
- `app/(protected)/layout.tsx:2` - Marked "use client"
- `lib/auth/ProtectedRoute.tsx:15` - Uses Redux `isAuthenticated` state
- `app/(protected)/organisasi/sekolah/page.tsx` - Server Component (no "use client")

**Problem**: Server Component executes **before** client-side ProtectedRoute can redirect to login.

**Impact**: ⚠️ Medium - Creates confusing error states and poor UX

---

## Technical Deep Dive

### Authentication Flow Breakdown

**Normal Flow** (Token Valid):
```
User → /organisasi/sekolah
  ↓
Server Component: getSchools() with valid token
  ↓
Backend: Returns school data
  ↓
SchoolsClient: Receives initialData
  ↓
✅ Page renders successfully
```

**Failure Flow** (Token Expired):
```
User → /organisasi/sekolah
  ↓
Server Component: getSchools() with expired token
  ↓
Backend: Returns 401 "invalid or expired token"
  ↓
Error Handler: Tries to render EmptyState
  ↓
React: Serialization error (cannot pass LucideIcon/functions)
  ↓
❌ Multiple cascading errors
```

### Component Architecture Issue

**File Structure**:
```
app/(protected)/organisasi/sekolah/
├── page.tsx                    # Server Component (no "use client")
│   └── Uses: EmptyState        # Client Component ("use client")
│       └── Receives: icon (LucideIcon), onClick (function)
│           ❌ VIOLATION: Non-serializable props
```

**Comparison with Working Usage**:
```typescript
// ✅ WORKS: SchoolsClient.tsx (Client Component)
"use client";
export default function SchoolsClient() {
  return (
    <EmptyState
      icon={RefreshCw}           // Same client context, OK
      primaryAction={{
        onClick: () => refetch()  // Same client context, OK
      }}
    />
  );
}

// ❌ FAILS: page.tsx (Server Component)
export default async function SchoolsPage() {  // No "use client"
  return (
    <EmptyState
      icon={AlertCircle}          // Cross boundary, ERROR
      primaryAction={{
        onClick: () => window.location.reload()  // Cross boundary, ERROR
      }}
    />
  );
}
```

---

## Impact Assessment

### User Impact
- 🔴 **Complete page failure** - Users cannot access school management
- 🔴 **Confusing error messages** - Multiple React errors obscure real issue
- 🟡 **No automatic recovery** - Must manually log in again
- 🟡 **Lost context** - Navigation state not preserved after re-login

### Developer Impact
- 🔴 **Difficult debugging** - Cascading errors obscure root cause
- 🟡 **Architecture inconsistency** - Hybrid SSR/CSR pattern not fully implemented
- 🟡 **Pattern replication risk** - Other protected pages may have same issue

### System Impact
- 🟢 **No data loss** - Error is presentational only
- 🟢 **No security breach** - Token validation working correctly
- 🟡 **Poor reliability** - Users experience failures when tokens expire

---

## Solution Architecture

### Three-Tier Fix Strategy

#### TIER 1: Immediate Fix (Critical) 🔴
**Goal**: Stop the error cascade and restore basic functionality

**Solution**: Create dedicated Client Component for error handling

**Implementation**:

1. **Create `components/schools/SchoolsErrorFallback.tsx`**:
```typescript
"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

interface SchoolsErrorFallbackProps {
  error: string;
}

export default function SchoolsErrorFallback({
  error
}: SchoolsErrorFallbackProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sekolah</h1>
        <p className="text-muted-foreground">
          Kelola data sekolah dalam organisasi YPK Gloria
        </p>
      </div>

      <EmptyState
        icon={AlertCircle}
        iconClassName="text-destructive"
        title="Gagal Memuat Data Sekolah"
        description={
          <div className="space-y-2">
            <p className="font-medium">{error}</p>
            <p className="text-sm">Hal ini bisa disebabkan oleh:</p>
            <ul className="text-xs space-y-1 list-disc list-inside text-left bg-muted/50 p-3 rounded-md">
              <li>Masalah koneksi jaringan</li>
              <li>Server backend tidak merespons</li>
              <li>Sesi autentikasi telah berakhir</li>
              <li>Gangguan sementara pada sistem</li>
            </ul>
            <p className="text-xs mt-2">
              Jika masalah berlanjut setelah refresh, hubungi administrator sistem.
            </p>
          </div>
        }
        primaryAction={{
          label: "Muat Ulang Halaman",
          onClick: () => window.location.reload(),
          variant: "default",
          icon: RefreshCw,
        }}
        secondaryAction={{
          label: "Kembali ke Dashboard",
          onClick: () => window.location.href = '/dashboard',
          variant: "outline",
        }}
      />
    </div>
  );
}
```

2. **Update `app/(protected)/organisasi/sekolah/page.tsx`**:
```typescript
import SchoolsErrorFallback from "@/components/schools/SchoolsErrorFallback";

export default async function SchoolsPage() {
  let initialData;

  try {
    const response = await getSchools({
      page: 1,
      page_size: 20,
      sort_by: 'code',
      sort_order: 'asc',
    });

    if (response.error) {
      throw new Error(response.error);
    }

    initialData = {
      data: response.data?.data || [],
      total: response.data?.total || 0,
      page: response.data?.page || 1,
      page_size: response.data?.page_size || 20,
      total_pages: response.data?.total_pages || 0,
    };
  } catch (error) {
    console.error('[Schools Page] Failed to fetch initial data:', error);

    // Pass only serializable string to Client Component
    return (
      <SchoolsErrorFallback
        error={error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data sekolah'}
      />
    );
  }

  return <SchoolsClient initialData={initialData} />;
}
```

**Benefits**:
- ✅ Eliminates React serialization errors immediately
- ✅ Clean separation of Server/Client concerns
- ✅ Maintains all existing functionality
- ✅ Follows Next.js 13+ best practices

**Testing**: Navigate to page with expired token → Should see error UI without console errors

---

#### TIER 2: Short-term Fix (High Priority) 🟡
**Goal**: Improve authentication error handling and user experience

**Solution**: Redirect to login on token errors with return URL preservation

**Implementation**:

1. **Update `lib/server/api.ts`**:
```typescript
export async function serverFetch<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<{ data?: T; error?: string; authError?: boolean }> {
  const { requireAuth = true, ...fetchOptions } = options;

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('gloria_access_token')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (requireAuth && accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: response.statusText
      }));

      const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;

      // Flag authentication errors for special handling
      const isAuthError = response.status === 401 ||
                         errorMessage.toLowerCase().includes('token') ||
                         errorMessage.toLowerCase().includes('unauthorized');

      return {
        error: errorMessage,
        authError: isAuthError
      };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Server fetch error:', error);
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}
```

2. **Update `app/(protected)/organisasi/sekolah/page.tsx`**:
```typescript
import { redirect } from 'next/navigation';
import SchoolsErrorFallback from "@/components/schools/SchoolsErrorFallback";

export default async function SchoolsPage() {
  let initialData;

  try {
    const response = await getSchools({
      page: 1,
      page_size: 20,
      sort_by: 'code',
      sort_order: 'asc',
    });

    // Handle authentication errors with redirect
    if (response.authError ||
        (response.error && response.error.toLowerCase().includes('token'))) {
      const returnUrl = encodeURIComponent('/organisasi/sekolah');
      redirect(`/login?returnUrl=${returnUrl}`);
    }

    if (response.error) {
      throw new Error(response.error);
    }

    initialData = {
      data: response.data?.data || [],
      total: response.data?.total || 0,
      page: response.data?.page || 1,
      page_size: response.data?.page_size || 20,
      total_pages: response.data?.total_pages || 0,
    };
  } catch (error) {
    console.error('[Schools Page] Failed to fetch initial data:', error);
    return <SchoolsErrorFallback error={error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data sekolah'} />;
  }

  return <SchoolsClient initialData={initialData} />;
}
```

3. **Update login page to handle returnUrl** (`app/login/page.tsx`):
```typescript
"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const returnUrl = searchParams.get('returnUrl');

  // After successful login
  const handleLoginSuccess = () => {
    if (returnUrl) {
      router.push(returnUrl);
    } else {
      router.push('/dashboard');
    }
  };

  // Rest of login implementation...
}
```

**Benefits**:
- ✅ Clear user flow when token expires
- ✅ Seamless return to original page after login
- ✅ Better error messaging
- ✅ Prevents confusion from stale auth state

**Testing**:
1. Let token expire
2. Navigate to schools page
3. Should redirect to login with returnUrl
4. After login, should return to schools page

---

#### TIER 3: Long-term Enhancement (Recommended) 🟢
**Goal**: Implement automatic token refresh for seamless user experience

**Solution**: Add refresh token mechanism to server-side API

**Implementation Overview**:

1. **Backend Changes** (Required first):
   - Implement refresh token endpoint
   - Store refresh token in httpOnly cookie
   - Return new access token on successful refresh

2. **Update `lib/server/api.ts`**:
```typescript
async function refreshAccessToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('gloria_refresh_token')?.value;

    if (!refreshToken) return null;

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();

    // Update access token cookie
    const cookieStore2 = await cookies();
    cookieStore2.set('gloria_access_token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
    });

    return data.access_token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

export async function serverFetch<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<{ data?: T; error?: string; authError?: boolean }> {
  // ... existing code ...

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: response.statusText
    }));

    const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
    const isAuthError = response.status === 401;

    // Attempt token refresh on 401
    if (isAuthError && requireAuth) {
      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        // Retry original request with new token
        headers['Authorization'] = `Bearer ${newAccessToken}`;

        const retryResponse = await fetch(url, {
          ...fetchOptions,
          headers,
          cache: 'no-store',
        });

        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          return { data: retryData };
        }
      }
    }

    return {
      error: errorMessage,
      authError: isAuthError
    };
  }

  // ... rest of code ...
}
```

**Benefits**:
- ✅ Seamless user experience (no manual re-login for short absences)
- ✅ Reduces authentication interruptions
- ✅ Better session management
- ✅ Industry standard pattern

**Prerequisites**:
- Backend refresh token endpoint must be implemented first
- Requires httpOnly cookie management
- Must handle refresh token expiration (fallback to login)

**Testing**:
1. Let access token expire (but not refresh token)
2. Navigate to schools page
3. Should automatically refresh and load data
4. No user interruption

---

## Testing Strategy

### Test Case 1: Expired Token on Initial Load
**Setup**: Clear cookies or use expired token
**Expected**:
- TIER 1: Error UI renders without React errors
- TIER 2: Redirects to login with returnUrl
- TIER 3: Automatically refreshes and loads data

### Test Case 2: Network Error (Non-Auth)
**Setup**: Stop backend server
**Expected**: Error UI with retry button, no redirect

### Test Case 3: Valid Token, Successful Load
**Setup**: Valid token in cookies
**Expected**: Page loads normally with school data

### Test Case 4: Token Expires During Session
**Setup**: Load page, wait for token expiration, trigger client-side fetch
**Expected**:
- Client-side RTK Query should handle refresh
- Or redirect to login if no refresh available

### Test Case 5: Return URL Preservation
**Setup**: Navigate from /organisasi/sekolah → login → successful auth
**Expected**: Returns to /organisasi/sekolah after login

---

## Implementation Priority

### Immediate (Deploy Today) 🔴
1. ✅ Create `SchoolsErrorFallback.tsx` component
2. ✅ Update `page.tsx` to use new component
3. ✅ Test with expired token
4. ✅ Deploy to production

### Short-term (This Week) 🟡
1. ✅ Add `authError` flag to `serverFetch()`
2. ✅ Implement redirect logic in `page.tsx`
3. ✅ Update login page for returnUrl handling
4. ✅ Test full authentication flow
5. ✅ Update other protected pages with same pattern

### Long-term (Next Sprint) 🟢
1. ✅ Coordinate with backend team for refresh endpoint
2. ✅ Implement `refreshAccessToken()` function
3. ✅ Add retry logic to `serverFetch()`
4. ✅ Test token refresh scenarios
5. ✅ Update documentation

---

## Related Files

### Modified Files (TIER 1)
- `app/(protected)/organisasi/sekolah/page.tsx` - Remove EmptyState direct usage
- `components/schools/SchoolsErrorFallback.tsx` - **NEW** - Error handling component

### Modified Files (TIER 2)
- `lib/server/api.ts` - Add authError flag, redirect logic
- `app/login/page.tsx` - Handle returnUrl parameter

### Modified Files (TIER 3)
- `lib/server/api.ts` - Add token refresh mechanism
- Backend API - Add `/auth/refresh` endpoint

### Referenced Files (No Changes)
- `components/ui/EmptyState.tsx` - Working correctly
- `components/schools/SchoolsClient.tsx` - Working correctly
- `lib/auth/ProtectedRoute.tsx` - Client-side auth check
- `app/(protected)/layout.tsx` - Protected route wrapper

---

## Security Considerations

### Current Security Posture
✅ **Good Practices**:
- JWT token validation on backend
- httpOnly cookies (prevents XSS token theft)
- Proper 401 responses on invalid tokens
- Server-side authentication checks

⚠️ **Areas for Improvement**:
- No token refresh mechanism (poor UX, forces frequent re-login)
- Client/Server auth state can desync
- No rate limiting on token refresh (TIER 3)
- No token revocation mechanism mentioned

### Security Impact of Changes
- TIER 1: No security impact (presentational only)
- TIER 2: Positive (clearer auth flows, better logging)
- TIER 3: Positive (more secure with proper refresh token management)

---

## Performance Considerations

### Current Performance
- ✅ Server-side rendering (fast initial load)
- ✅ No loading spinner on initial load (good UX)
- ❌ Error cascade causes poor performance

### Performance Impact of Changes
- TIER 1: Slight improvement (fewer error renders)
- TIER 2: Neutral (redirect adds one navigation)
- TIER 3: Improvement (fewer full re-logins)

---

## Monitoring & Observability

### Recommended Logging
```typescript
// Add structured logging for auth issues
console.error('[Auth]', {
  timestamp: new Date().toISOString(),
  endpoint,
  errorType: 'token_expired',
  statusCode: response.status,
  userId: getUserIdFromToken(accessToken), // if available
  action: 'redirect_to_login'
});
```

### Metrics to Track
- Token expiration rate
- Login redirect frequency
- Token refresh success rate (TIER 3)
- Error rate on protected pages

---

## Conclusion

The `/organisasi/sekolah` page failure is caused by three interconnected issues that create a cascading error scenario. The immediate fix (TIER 1) is straightforward and eliminates the React errors. The short-term fix (TIER 2) significantly improves UX with proper auth handling. The long-term enhancement (TIER 3) provides the best user experience with automatic token refresh.

**Recommendation**: Implement TIER 1 immediately, TIER 2 within the week, and plan TIER 3 for the next development sprint.

---

## Appendices

### Appendix A: Error Message Reference

| Error Code | Message | Cause | Fix |
|------------|---------|-------|-----|
| E1 | "invalid or expired token" | JWT token expired | TIER 2/3 |
| E2 | "Only plain objects can be passed..." | RSC serialization violation | TIER 1 |
| E3 | "Event handlers cannot be passed..." | Function passed to Client Component | TIER 1 |

### Appendix B: Architecture Patterns

**Pattern 1: Server Component Error Handling**
```typescript
// ✅ CORRECT
export default async function ServerPage() {
  try {
    const data = await fetchData();
    return <ClientComponent data={data} />;
  } catch (error) {
    return <ErrorClient error={error.message} />; // String only
  }
}
```

**Pattern 2: Client Component Error Handling**
```typescript
// ✅ CORRECT
"use client";
export default function ClientComponent() {
  return (
    <EmptyState
      icon={AlertCircle}      // Same context, OK
      primaryAction={{
        onClick: handleClick  // Same context, OK
      }}
    />
  );
}
```

---

**End of Analysis Report**
