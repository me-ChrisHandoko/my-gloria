# Multiple useAuthQuery Instances Fix - 3x Loop Issue

## 🚨 Problem Report

**Issue**: Masih terjadi 3x loop setelah fix pertama
**Reported**: User testing setelah implementasi LOGOUT_LOOP_FIX
**Severity**: 🔴 HIGH
**Date Fixed**: 2025-12-14

---

## 🔍 Root Cause Analysis (Deeper Level)

### Why First Fix Wasn't Enough

**First Fix:** Removed duplicate `signOut()` calls
- ✅ Fixed: signOut() no longer called twice (in hook + in /sign-out page)
- ❌ Still Broken: 3x loop masih terjadi

**Why?** Because `isLoggingOut` was **instance-specific**, not global!

### The Multiple Instances Problem

**Discovery:** 5 different components use `useCurrentUser()`:

```
1. auth-initializer.tsx (line 71)   ← ALWAYS mounted (wraps whole app)
2. nav-user.tsx (line 49)            ← Mounted when nav visible
3. use-module-access.ts (line 38)   ← Mounted when checking modules
4. use-role-check.ts (line 37)      ← Mounted when checking roles
5. use-permissions.ts (line 37)     ← Mounted when checking permissions
```

Each component:
```typescript
useCurrentUser()
  → useAuthQuery()
    → const isLoggingOut = useRef<boolean>(false);  ❌ SEPARATE REF!
```

### The 3x Loop Flow

**When FETCH_ERROR occurs:**

```
Time 0ms:   Backend fails → ALL mounted components get FETCH_ERROR

Component 1 (auth-initializer):
  isLoggingOut_1.current = false   ← Own ref
  ✅ Passes check → redirectOnce('/sign-out')  ← Attempt #1
  ✅ redirectOnce allows it → Redirect starts
  isLoggingOut_1.current = true

Component 2 (nav-user):
  isLoggingOut_2.current = false   ← DIFFERENT ref! ❌
  ✅ Passes check → redirectOnce('/sign-out')  ← Attempt #2
  ❌ redirectOnce blocks it (already redirecting)
  isLoggingOut_2.current = true

Component 3 (use-permissions):
  isLoggingOut_3.current = false   ← DIFFERENT ref! ❌
  ✅ Passes check → redirectOnce('/sign-out')  ← Attempt #3
  ❌ redirectOnce blocks it (already redirecting)
  isLoggingOut_3.current = true

Result: 3 components tried to redirect
        Even though redirectOnce blocked #2 and #3,
        the ATTEMPTS still happened, creating timing issues
```

### Why This Causes "Loop" Effect

```
Time 0ms:    Component 1, 2, 3 all detect FETCH_ERROR
Time 10ms:   Component 1 calls redirectOnce() → ALLOWED
Time 11ms:   Component 2 calls redirectOnce() → BLOCKED (logged)
Time 12ms:   Component 3 calls redirectOnce() → BLOCKED (logged)
Time 50ms:   window.location.href starts navigation
Time 100ms:  /sign-out page starts loading
Time 150ms:  /sign-out page still loading (maybe slow network)
Time 200ms:  User sees flicker or brief reload
Time 2000ms: /sign-out → router.push('/sign-in')

User perception: Multiple redirects happening (loop effect)
Console shows: 3 "FETCH_ERROR detected" messages
```

---

## ✅ Solution Applied

### Pattern Reference: redirectOnce() in redirect-guard.ts

```typescript
// Module-level variable (shared across entire app)
let isRedirecting = false;

export function redirectOnce(url: string): boolean {
  if (isRedirecting) {
    console.log('⚠️ Redirect already in progress, blocking duplicate');
    return false;
  }

  isRedirecting = true;
  window.location.href = url;
  return true;
}
```

**Why this works:** ONE flag for ALL callers!

### Applied Same Pattern to use-auth-query.ts

**BEFORE (Instance-Specific - WRONG):**

```typescript
export function useAuthQuery() {
  // ❌ Each hook instance has its own ref
  const isLoggingOut = useRef<boolean>(false);

  useEffect(() => {
    if (FETCH_ERROR) {
      if (isLoggingOut.current) {  // ❌ Only checks THIS instance
        return;
      }
      isLoggingOut.current = true;
      redirectOnce('/sign-out');
    }
  });
}
```

**Problem:**
- Component 1's isLoggingOut ≠ Component 2's isLoggingOut ≠ Component 3's isLoggingOut
- Each component thinks "I'm the first one to detect error!"
- All 3 try to redirect (even if redirectOnce blocks most)

**AFTER (Module-Level - CORRECT):**

```typescript
// ✅ Module-level variable shared across ALL instances
let isLoggingOut = false;

export function useAuthQuery() {
  // No useRef needed - use module-level variable

  useEffect(() => {
    if (FETCH_ERROR) {
      if (isLoggingOut) {  // ✅ Checks GLOBAL flag
        return;
      }
      isLoggingOut = true;  // ✅ Sets GLOBAL flag
      redirectOnce('/sign-out');
    }
  });
}
```

**Why this works:**
```
Component 1: isLoggingOut = false → passes → sets isLoggingOut = true → redirects
Component 2: isLoggingOut = true  → BLOCKED (doesn't even try to redirect)
Component 3: isLoggingOut = true  → BLOCKED (doesn't even try to redirect)

Result: ONLY Component 1 attempts redirect
        Components 2 & 3 exit early (clean)
        NO duplicate attempts, NO timing issues
```

---

## 📊 Changes Summary

### Files Modified

**File:** `src/hooks/use-auth-query.ts`

**Changes:**

1. **Added module-level variable** (line 16):
```typescript
let isLoggingOut = false;
```

2. **Removed useRef declaration** (was line 66):
```typescript
// REMOVED: const isLoggingOut = useRef<boolean>(false);
```

3. **Updated FETCH_ERROR handler** (lines 142-147):
```typescript
// BEFORE:
if (isLoggingOut.current) { ... }
isLoggingOut.current = true;

// AFTER:
if (isLoggingOut) { ... }
isLoggingOut = true;
```

4. **Updated 401 max retry handler** (lines 220-225):
```typescript
// BEFORE:
if (isLoggingOut.current) { ... }
isLoggingOut.current = true;

// AFTER:
if (isLoggingOut) { ... }
isLoggingOut = true;
```

**Total Changes:**
- Added: 1 module-level variable + documentation
- Removed: 1 useRef declaration
- Modified: 4 references (.current removed)

---

## 🎯 How This Fixes The 3x Loop

### Scenario: 3 Components Mounted

**Components Active:**
1. auth-initializer.tsx → calls useAuthQuery (instance #1)
2. nav-user.tsx → calls useAuthQuery (instance #2)
3. use-permissions.ts → calls useAuthQuery (instance #3)

**Event:** Backend fails, all 3 get FETCH_ERROR

### BEFORE FIX (3x Loop):

```
Instance #1:
  isLoggingOut_1.current = false  ✅ passes
  → redirectOnce()  ← Attempt #1

Instance #2:
  isLoggingOut_2.current = false  ✅ passes (different ref!)
  → redirectOnce()  ← Attempt #2

Instance #3:
  isLoggingOut_3.current = false  ✅ passes (different ref!)
  → redirectOnce()  ← Attempt #3

redirectOnce blocks #2 and #3, but they still tried
User sees: 3 attempts, timing issues, "loop" effect
Console: 3x "FETCH_ERROR detected"
```

### AFTER FIX (Clean):

```
Instance #1:
  isLoggingOut = false  ✅ passes
  isLoggingOut = true   ✅ sets global flag
  → redirectOnce()  ← ONLY attempt

Instance #2:
  isLoggingOut = true   ❌ blocked early
  → return (exit)       ← NO redirect attempt

Instance #3:
  isLoggingOut = true   ❌ blocked early
  → return (exit)       ← NO redirect attempt

User sees: Clean single redirect
Console: 1x "FETCH_ERROR detected" + 2x "Logout already in progress"
```

---

## 🧪 Testing Verification

### Test Case 1: Multiple Components Scenario

**Setup:**
1. Ensure auth-initializer, nav-user, and one permission hook are all mounted
2. Login with active user
3. Stop backend server
4. Refresh page

**Expected Behavior:**
```
✅ Console shows:
   🚨 [Layer 2] FETCH_ERROR detected during API call  (Component #1)
   ⏳ [Layer 2] Logout already in progress - skipping duplicate  (Component #2)
   ⏳ [Layer 2] Logout already in progress - skipping duplicate  (Component #3)
   🔄 [Layer 2] Redirecting to /sign-out
   ✅ [RedirectGuard] Triggering redirect

✅ Only ONE redirect attempt
✅ Navigate to /sign-out page
✅ /sign-out shows message for 2 seconds
✅ Redirect to /sign-in
✅ NO loop, NO multiple redirects
```

### Test Case 2: Single Component Scenario

**Setup:**
1. Only auth-initializer mounted (minimal app)
2. Login with active user
3. Stop backend server
4. Refresh page

**Expected Behavior:**
```
✅ Console shows:
   🚨 [Layer 2] FETCH_ERROR detected during API call  (Component #1 only)
   🔄 [Layer 2] Redirecting to /sign-out
   ✅ [RedirectGuard] Triggering redirect

✅ Clean single redirect
✅ NO "Logout already in progress" messages
✅ Same result as multiple component scenario
```

### Test Case 3: Rapid Sequential Errors

**Setup:**
1. Multiple API endpoints failing in sequence (not simultaneously)
2. Login, trigger multiple failures

**Expected Behavior:**
```
✅ First error: triggers redirect, sets isLoggingOut = true
✅ Subsequent errors: all blocked by isLoggingOut flag
✅ Only ONE redirect, regardless of error count
```

---

## 📝 Code Review Checklist

### Implementation
- [x] ✅ Moved isLoggingOut to module-level
- [x] ✅ Removed useRef declaration
- [x] ✅ Updated all isLoggingOut.current to isLoggingOut
- [x] ✅ Added documentation comments
- [x] ✅ Followed redirectOnce() pattern

### Testing
- [ ] Test with 3+ components mounted
- [ ] Test with single component mounted
- [ ] Verify only ONE redirect attempt in console
- [ ] Verify "Logout already in progress" for duplicates
- [ ] Check no loop effect observed
- [ ] Verify clean transition to /sign-in

### Verification
- [ ] Console shows max 1x "Redirecting to /sign-out"
- [ ] Console shows Nx "Logout already in progress" (N = components - 1)
- [ ] No visual loop or flicker
- [ ] Clean arrival at /sign-in

---

## 🎓 Key Learnings

### 1. **useRef is Instance-Specific**
```typescript
// ❌ WRONG for cross-instance state
const isLoggingOut = useRef<boolean>(false);

// ✅ RIGHT for cross-instance state
let isLoggingOut = false;  // Module-level
```

### 2. **Module-Level Variables for Shared State**
When you need state shared across ALL instances of a hook:
- ✅ Use module-level variable (outside hook)
- ❌ Don't use useRef, useState, or other instance-specific state

### 3. **Pattern: Follow Established Solutions**
`redirectOnce()` already had the right pattern:
- Module-level flag
- Check before action
- Set flag immediately

We should have applied the same pattern from the start!

### 4. **Multiple Hook Instances Are Common**
In React apps, hooks are often used in multiple places:
- Layouts
- Navigation
- Permission checks
- Role checks

Always consider: "What if this hook runs in 5 places simultaneously?"

---

## 🔗 Related Fixes

This fix builds on:
1. **LOGOUT_LOOP_FIX.md** - Removed duplicate signOut() calls
2. **PENDEKATAN_2_IMPLEMENTATION_SUMMARY.md** - Original FETCH_ERROR implementation

Combined fixes:
- ✅ No duplicate signOut() calls (first fix)
- ✅ No multiple redirect attempts (this fix)
- ✅ Clean single redirect flow

---

## 📊 Impact Analysis

### Before All Fixes
```
FETCH_ERROR → 3 components detect
            → 3 signOut() calls (duplicate)
            → 3 redirect attempts
            → Loop, race conditions, bad UX
```

### After First Fix (LOGOUT_LOOP_FIX)
```
FETCH_ERROR → 3 components detect
            → 3 redirect attempts (isLoggingOut per-instance)
            → redirectOnce blocks 2, allows 1
            → Still timing issues, still feels like loop
```

### After This Fix (MULTIPLE_INSTANCES_FIX)
```
FETCH_ERROR → 3 components detect
            → 1 redirect attempt (isLoggingOut global blocks rest)
            → redirectOnce allows 1
            → Clean single redirect ✅
```

---

## ✅ Summary

**Problem:** `isLoggingOut` was instance-specific (useRef), causing 3x loop
**Solution:** Changed to module-level variable (shared across all instances)
**Pattern:** Same as `redirectOnce()` in redirect-guard.ts
**Result:** Only ONE component attempts redirect, others blocked early

**Status:** ✅ **FIXED - READY FOR RE-TESTING**

**Confidence:** 🟢 HIGH - Follows proven pattern, addresses root cause

---

## 📞 If Still Not Fixed

If user still reports loop after this fix:

1. **Check Console Logs:**
   - Should see: 1x "FETCH_ERROR detected"
   - Should see: 2x "Logout already in progress" (or more, depending on mounted components)
   - If seeing 3x "FETCH_ERROR detected" still → flag not working

2. **Verify Module Reload:**
   - isLoggingOut resets on page navigation (module reloads)
   - If flag stays true across pages → need to add reset mechanism

3. **Check Component Count:**
   - How many components are mounted?
   - Add logging to count useAuthQuery instances
   - Should see "Logout already in progress" for each blocked instance

4. **Timing Issue:**
   - Check network tab: how many redirect requests?
   - Should be 1
   - If >1 → redirectOnce might not be working

**Escalation:** If issue persists after this fix, likely a different root cause (browser caching, service worker, etc.)
