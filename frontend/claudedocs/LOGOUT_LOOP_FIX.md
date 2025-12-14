# Logout Loop Fix - Duplicate signOut() Issue

## 🚨 Problem Identified

**Issue**: Auto-logout mengalami loop lebih dari satu kali sebelum redirect ke sign-in page.

**Reported By**: User testing
**Severity**: 🔴 HIGH - Affects user experience, causes confusion
**Date Fixed**: 2025-12-14

---

## 🔍 Root Cause Analysis

### The Duplicate signOut() Problem

**Symptom:**
```
FETCH_ERROR or 401 error → Multiple redirects → Loop → Finally reaches sign-in
```

**Root Cause:**
`signOut()` was being called **TWICE**:
1. In `use-auth-query.ts` when error detected
2. In `/sign-out` page when it loads

### Flow Diagram (BEFORE FIX):

```
┌─────────────────────────────────────────────────────┐
│ 1. FETCH_ERROR detected in use-auth-query.ts       │
├─────────────────────────────────────────────────────┤
│ redirectOnce('/sign-out?reason=network_error')  ✅  │
│ await signOut()  ❌ PROBLEM: SignOut #1             │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 2. Page redirects to /sign-out                      │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 3. /sign-out page.tsx useEffect runs                │
├─────────────────────────────────────────────────────┤
│ if (isSignedIn) {                                   │
│   signOut()  ❌ PROBLEM: SignOut #2 (DUPLICATE!)    │
│   setTimeout(() => router.push('/sign-in'), 2000)  │
│ } else {                                            │
│   setTimeout(() => router.push('/sign-in'), 2000)  │
│ }                                                   │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 4. Race Conditions & Timing Issues                  │
├─────────────────────────────────────────────────────┤
│ - signOut #1 completes before/after navigation     │
│ - isSignedIn state unclear during transition       │
│ - Multiple setTimeout redirects queued             │
│ - Potential loop or double redirect                │
└─────────────────────────────────────────────────────┘
```

### Timing Race Condition:

**Scenario A: signOut #1 completes BEFORE navigation**
```
Time 0ms:   FETCH_ERROR → redirectOnce() + signOut() called
Time 100ms: signOut() completes → isSignedIn = false
Time 200ms: window.location.href navigates to /sign-out
Time 300ms: /sign-out loads, checks isSignedIn → false
Time 400ms: /sign-out → router.push('/sign-in') (no second signOut)
Result: Immediate redirect, looks like loop
```

**Scenario B: signOut #1 completes AFTER navigation**
```
Time 0ms:   FETCH_ERROR → redirectOnce() + signOut() called
Time 100ms: window.location.href navigates to /sign-out
Time 200ms: /sign-out loads, checks isSignedIn → still true (signOut #1 not done)
Time 300ms: /sign-out calls signOut() AGAIN → signOut #2
Time 400ms: signOut #1 finally completes
Time 500ms: signOut #2 completes
Time 2000ms: router.push('/sign-in')
Result: Double signOut, potential loop
```

---

## ✅ Solution Applied

### Pattern Reference: The 403 Handler (CORRECT)

The existing 403 handler already had the correct pattern:

```typescript
// Handle 403 Forbidden - CORRECT PATTERN ✅
if (result.error.status === 403) {
  redirectOnce('/sign-out?reason=account_deactivated');
  return;  // ✅ NO signOut() call - let /sign-out page handle it
}
```

**Why this works:**
- Only calls `redirectOnce()` to navigate to /sign-out
- /sign-out page handles the signOut() call
- No duplicate signOut()
- Clean flow, no race conditions

### Fix Applied to FETCH_ERROR Handler

**BEFORE (Problematic):**
```typescript
if (result.error.status === 'FETCH_ERROR') {
  // ... logging ...

  isLoggingOut.current = true;

  (async () => {
    try {
      redirectOnce('/sign-out?reason=network_error');
      await signOut();  // ❌ PROBLEM: Duplicate signOut()
    } catch (error) {
      console.error('❌ Logout failed:', error);
      window.location.href = '/sign-in?reason=connection_error';
    } finally {
      isLoggingOut.current = false;
    }
  })();

  return;
}
```

**AFTER (Fixed):**
```typescript
if (result.error.status === 'FETCH_ERROR') {
  // ... logging ...

  if (isLoggingOut.current) {
    console.log('⏳ Logout already in progress - skipping duplicate');
    return;
  }

  isLoggingOut.current = true;

  // Redirect to sign-out page
  // Note: We don't call signOut() here to avoid duplicate calls
  // The /sign-out page will handle the actual Clerk signOut
  console.log('🔄 [Layer 2] Redirecting to /sign-out (signOut will be handled by sign-out page)');
  redirectOnce('/sign-out?reason=network_error');

  return;  // ✅ Clean exit, no duplicate signOut()
}
```

### Fix Applied to 401 Handler

**BEFORE (Problematic):**
```typescript
if (retryCount.current >= 3) {
  // ... logging ...

  isLoggingOut.current = true;

  (async () => {
    try {
      redirectOnce('/sign-out?reason=authentication_failed');
      await signOut();  // ❌ PROBLEM: Duplicate signOut()
    } catch (error) {
      console.error('❌ Logout failed:', error);
      window.location.href = '/sign-in?reason=auth_error';
    } finally {
      isLoggingOut.current = false;
    }
  })();

  return;
}
```

**AFTER (Fixed):**
```typescript
if (retryCount.current >= 3) {
  // ... logging ...

  isLoggingOut.current = true;

  // Redirect to sign-out page
  // Note: We don't call signOut() here to avoid duplicate calls
  // The /sign-out page will handle the actual Clerk signOut
  console.log('🔄 [Layer 2] Redirecting to /sign-out (signOut will be handled by sign-out page)');
  redirectOnce('/sign-out?reason=authentication_failed');

  return;  // ✅ Clean exit, no duplicate signOut()
}
```

---

## 📊 Changes Summary

| Handler | Before | After | Status |
|---------|--------|-------|--------|
| **403 Inactive** | redirectOnce() only | redirectOnce() only | ✅ Already correct |
| **FETCH_ERROR** | redirectOnce() + signOut() | redirectOnce() only | ✅ Fixed |
| **401 Max Retry** | redirectOnce() + signOut() | redirectOnce() only | ✅ Fixed |

**Pattern Consistency:** All error handlers now follow the same pattern:
```typescript
redirectOnce('/sign-out?reason=XXX');
return;  // Let /sign-out page handle signOut()
```

---

## 🎯 Benefits of This Fix

### 1. **Eliminates Duplicate signOut() Calls**
- Only ONE signOut() call happens (in /sign-out page)
- No race conditions between multiple signOut() attempts
- Clean, predictable logout flow

### 2. **Prevents Redirect Loops**
- Single redirect chain: error → /sign-out → /sign-in
- No intermediate loops or multiple redirects
- User sees clean transition

### 3. **Consistent Behavior**
- All error handlers (401, 403, FETCH_ERROR) work the same way
- Easier to understand and maintain
- Follows established pattern from 403 handler

### 4. **Better User Experience**
- ✅ Clean, single redirect
- ✅ Proper logout message displayed on /sign-out page
- ✅ 2-second delay gives user time to read message
- ✅ No confusing loops or multiple redirects

---

## 🧪 Testing Verification

### Test Case 1: FETCH_ERROR Flow

**Steps:**
1. Login with active user
2. Stop backend server
3. Refresh page

**Expected Behavior (After Fix):**
```
1. FETCH_ERROR detected
2. Log: "🚨 [Layer 2] FETCH_ERROR detected"
3. Log: "🔄 [Layer 2] Redirecting to /sign-out"
4. Navigate to /sign-out page
5. /sign-out page displays message: "Network error..."
6. /sign-out calls signOut() (ONLY ONCE)
7. After 2 seconds → redirect to /sign-in
8. User at sign-in page ✅
```

**Logs to Verify:**
```
✅ ONE "Redirecting to /sign-out" message
✅ ONE signOut call in /sign-out page
✅ NO "Logout failed" errors
✅ NO multiple redirect messages
```

### Test Case 2: 401 Max Retry Flow

**Steps:**
1. Login with user
2. Simulate expired token (3 consecutive 401 responses)

**Expected Behavior (After Fix):**
```
1. First 401 → retry attempt 1
2. Second 401 → retry attempt 2
3. Third 401 → retry attempt 3
4. Fourth 401 → max retries reached
5. Log: "🚪 [Layer 2] Forcing Clerk sign-out"
6. Log: "🔄 [Layer 2] Redirecting to /sign-out"
7. Navigate to /sign-out page
8. /sign-out calls signOut() (ONLY ONCE)
9. After 2 seconds → redirect to /sign-in
10. User at sign-in page ✅
```

### Test Case 3: Multiple API Calls with FETCH_ERROR

**Steps:**
1. Login with active user
2. Dashboard with multiple widgets (multiple API calls)
3. Stop backend server
4. Refresh page (all API calls fail simultaneously)

**Expected Behavior (After Fix):**
```
1. Multiple FETCH_ERROR detected simultaneously
2. First FETCH_ERROR → triggers redirect
3. isLoggingOut flag set → blocks subsequent errors
4. Logs show:
   - "🚨 [Layer 2] FETCH_ERROR detected" (first call)
   - "⏳ Logout already in progress - skipping duplicate" (other calls)
5. Only ONE redirect to /sign-out
6. Clean flow to /sign-in
```

---

## 📝 Code Review Checklist

### Before Merge
- [x] ✅ Removed duplicate signOut() calls from FETCH_ERROR handler
- [x] ✅ Removed duplicate signOut() calls from 401 handler
- [x] ✅ Verified 403 handler pattern is correct (already was)
- [x] ✅ All handlers follow consistent pattern
- [x] ✅ Added explanatory comments about why we don't call signOut()
- [x] ✅ Documentation updated

### Testing
- [ ] Test FETCH_ERROR flow (backend down)
- [ ] Test 401 max retry flow (expired token)
- [ ] Test 403 inactive user flow (unchanged, should still work)
- [ ] Test multiple simultaneous API failures
- [ ] Verify no redirect loops
- [ ] Verify clean transition to sign-in

### Verification
- [ ] No console errors
- [ ] Only ONE signOut() call in logs
- [ ] Only ONE redirect to /sign-out
- [ ] 2-second delay visible on /sign-out page
- [ ] Clean arrival at /sign-in page

---

## 🎓 Key Learnings

### 1. **Separation of Concerns**
- Error detection (use-auth-query.ts) → redirects
- Logout execution (/sign-out page) → calls signOut()
- Clean separation prevents duplicates

### 2. **Pattern Consistency**
- When you find a working pattern (403 handler), apply it consistently
- Don't reinvent the wheel for similar scenarios
- Consistency makes code easier to understand

### 3. **Race Conditions**
- Async operations + redirects = potential race conditions
- Simpler is better: redirect only, let the page handle the rest
- Avoid mixing redirect + async operations

### 4. **Testing Edge Cases**
- Multiple simultaneous API calls can expose timing issues
- Test with network failures, not just successful flows
- Verify what happens when things go wrong

---

## 📚 Related Files

### Modified
- `src/hooks/use-auth-query.ts` - Fixed FETCH_ERROR and 401 handlers

### Referenced (Unchanged)
- `src/app/(auth)/sign-out/page.tsx` - Handles actual signOut()
- `src/lib/redirect-guard.ts` - Prevents duplicate redirects

---

## ✅ Summary

**Problem:** Duplicate `signOut()` calls causing logout loops
**Solution:** Remove `signOut()` from error handlers, let /sign-out page handle it
**Pattern:** `redirectOnce('/sign-out?reason=XXX')` + `return` (consistent across all handlers)
**Result:** Clean, single redirect flow with no loops

**Status:** ✅ **FIXED AND READY FOR TESTING**
