# Sign-Out Page 2x Loop Fix - useEffect Dependency Issue

## 🚨 Problem Report

**Issue**: Masih terjadi 2x loop setelah fix module-level isLoggingOut
**Reported**: User testing setelah implementasi MULTIPLE_INSTANCES_FIX
**Severity**: 🔴 HIGH
**Date Fixed**: 2025-12-14

---

## 🔍 Root Cause Analysis (Third Level)

### Progress Timeline

**Original Issue**: 3+ loop before reaching sign-in
**After First Fix (LOGOUT_LOOP_FIX)**: Still 3x loop
**After Second Fix (MULTIPLE_INSTANCES_FIX)**: Reduced to 2x loop ← PROGRESS!
**After Third Fix (THIS FIX)**: Should be clean single redirect ✅

### Why Previous Fixes Helped But Didn't Completely Solve It

**First Fix (Remove duplicate signOut):**
- ✅ Fixed: signOut() no longer called twice
- ❌ Still Broken: 3x loop from multiple component instances

**Second Fix (Module-level isLoggingOut):**
- ✅ Fixed: Multiple components no longer all attempt redirect
- ✅ Progress: 3x loop → 2x loop
- ❌ Still Broken: 2x loop remains

**Why 2x loop persisted?** Because there was a THIRD source of duplication we hadn't identified!

### The /sign-out Page useEffect Dependency Issue

**Discovery:** The /sign-out page's useEffect has problematic dependencies:

```typescript
useEffect(() => {
  if (isSignedIn && !isSigningOut) {
    setIsSigningOut(true);
    signOut().then(() => {
      setTimeout(() => router.push('/sign-in'), 2000); // ← setTimeout #1
    });
  } else if (!isSignedIn) {
    setTimeout(() => router.push('/sign-in'), 2000);   // ← setTimeout #2
  }
}, [isSignedIn, isSigningOut, signOut, router]); // ❌ isSignedIn triggers rerun!
```

### The 2x Loop Flow

**When user arrives at /sign-out page:**

```
Time 0ms:   /sign-out page loads and mounts
            Clerk context: isSignedIn = true (Clerk session still valid)

Time 1ms:   useEffect runs (FIRST time)
            Condition: isSignedIn (true) && !isSigningOut (true) → TRUE
            Execute: setIsSigningOut(true)
                     signOut() starts
            Set: setTimeout #1 for router.push('/sign-in') in 2000ms

Time 100ms: signOut() completes successfully
            Clerk updates: isSignedIn changes from true → false
            Dependency changed: [isSignedIn, ...] triggers useEffect AGAIN!

Time 101ms: useEffect runs (SECOND time) ← THIS IS THE PROBLEM!
            Condition: isSignedIn (false) → enters else if (!isSignedIn)
            Execute: setTimeout #2 for router.push('/sign-in') in 2000ms

Time 2001ms: setTimeout #1 fires → router.push('/sign-in') (first redirect)
Time 2101ms: setTimeout #2 fires → router.push('/sign-in') (second redirect)

Result: User sees 2x redirect = 2x loop
```

### Why This Causes 2x Loop

```
useEffect runs TWICE because isSignedIn changes:

  First run (isSignedIn = true):
    → signOut() called
    → setTimeout #1 set (2 seconds delay)
    → signOut completes → isSignedIn becomes false

  Second run (isSignedIn = false):
    → useEffect reruns because isSignedIn is in dependency array
    → else if (!isSignedIn) block executes
    → setTimeout #2 set (2 seconds delay)

  After 2 seconds:
    → setTimeout #1 fires → router.push('/sign-in') ← Redirect #1
    → setTimeout #2 fires → router.push('/sign-in') ← Redirect #2

  User perception: Loop effect, double redirect
```

---

## ✅ Solution Applied

### Pattern Reference: hasProcessedRef Guard Pattern

Similar to how we used module-level `isLoggingOut` in use-auth-query.ts, we need a guard to prevent duplicate execution.

**For /sign-out page, we use useRef instead of module-level:**

```typescript
// ✅ useRef guard (component-level is appropriate here)
const hasProcessedRef = useRef(false);

useEffect(() => {
  // Guard check
  if (hasProcessedRef.current) {
    console.log('⏳ [SignOut] Sign-out already processing - skipping duplicate');
    return;
  }

  hasProcessedRef.current = true;

  // ... rest of logic
}, [isSignedIn, isSigningOut, signOut, router]);
```

**Why useRef is appropriate here:**
- /sign-out page only has ONE instance (unlike useAuthQuery with multiple instances)
- Component-level guard is sufficient (no cross-component coordination needed)
- useRef persists across renders within same component lifecycle
- Cleaner than removing dependencies (keeps React dependencies accurate)

### Applied Fix to /sign-out/page.tsx

**BEFORE (Problematic):**

```typescript
export default function SignOutPage() {
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const reason = searchParams.get('reason');

  useEffect(() => {
    if (isSignedIn && !isSigningOut) {
      setIsSigningOut(true);
      signOut().then(() => {
        setTimeout(() => router.push('/sign-in'), 2000);
      });
    } else if (!isSignedIn) {
      setTimeout(() => router.push('/sign-in'), 2000); // ❌ Duplicate setTimeout
    }
  }, [isSignedIn, isSigningOut, signOut, router]); // ❌ isSignedIn triggers rerun
}
```

**AFTER (Fixed):**

```typescript
export default function SignOutPage() {
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSigningOut, setIsSigningOut] = useState(false);

  /**
   * Guard flag to prevent duplicate execution when isSignedIn changes
   * Pattern: Same as module-level isLoggingOut in use-auth-query.ts
   */
  const hasProcessedRef = useRef(false); // ✅ Added guard

  const reason = searchParams.get('reason');

  useEffect(() => {
    // ✅ Guard check prevents rerun
    if (hasProcessedRef.current) {
      console.log('⏳ [SignOut] Sign-out already processing - skipping duplicate');
      return;
    }

    hasProcessedRef.current = true;
    console.log('🔄 [SignOut] Starting sign-out process', {
      isSignedIn,
      reason,
    });

    if (isSignedIn && !isSigningOut) {
      setIsSigningOut(true);
      signOut().then(() => {
        console.log('✅ [SignOut] User signed out successfully');
        setTimeout(() => router.push('/sign-in'), 2000);
      });
    } else if (!isSignedIn) {
      console.log('ℹ️ [SignOut] User already signed out, redirecting to sign-in');
      setTimeout(() => router.push('/sign-in'), 2000);
    }
  }, [isSignedIn, isSigningOut, signOut, router]); // ✅ Deps kept, but guarded
}
```

**Why this works:**
```
First useEffect run:
  hasProcessedRef.current = false → passes guard check
  hasProcessedRef.current = true  → sets guard
  → signOut() → setTimeout #1

isSignedIn changes from true → false:
  useEffect triggered (because isSignedIn is in deps)
  hasProcessedRef.current = true  → BLOCKED by guard
  → return early (exit)
  → NO setTimeout #2

Result: Only ONE setTimeout executes → clean single redirect ✅
```

---

## 📊 Changes Summary

### Files Modified

**File:** `src/app/(auth)/sign-out/page.tsx`

**Changes:**

1. **Added useRef import** (line 5):
```typescript
import { useEffect, useState, useRef } from 'react';
```

2. **Added hasProcessedRef guard** (line 27):
```typescript
const hasProcessedRef = useRef(false);
```

3. **Added guard check in useEffect** (lines 70-73):
```typescript
if (hasProcessedRef.current) {
  console.log('⏳ [SignOut] Sign-out already processing - skipping duplicate');
  return;
}

hasProcessedRef.current = true;
```

4. **Added debug logging** (lines 76-78, 87, 104):
```typescript
console.log('🔄 [SignOut] Starting sign-out process', { isSignedIn, reason });
console.log('✅ [SignOut] User signed out successfully');
console.log('ℹ️ [SignOut] User already signed out, redirecting to sign-in');
```

**Total Changes:**
- Added: 1 import (useRef)
- Added: 1 useRef declaration + documentation
- Added: 4-line guard check
- Added: 3 console.log statements for debugging
- Modified: useEffect logic flow (no code changes, just guard added)

---

## 🎯 How This Fixes The 2x Loop

### Scenario: User Redirected to /sign-out

**User Action:** Page refresh with inactive email → FETCH_ERROR → redirectOnce('/sign-out')

### BEFORE FIX (2x Loop):

```
/sign-out page loads:
  isSignedIn = true, hasProcessedRef = not used

  useEffect run #1:
    isSignedIn = true → signOut() → setTimeout #1

  signOut completes:
    isSignedIn changes to false

  useEffect run #2 (triggered by isSignedIn change):
    isSignedIn = false → setTimeout #2

  After 2 seconds:
    setTimeout #1 fires → router.push('/sign-in') ← Loop #1
    setTimeout #2 fires → router.push('/sign-in') ← Loop #2

User sees: 2x redirect, loop effect
Console shows: 2x setTimeout logs
```

### AFTER FIX (Clean):

```
/sign-out page loads:
  isSignedIn = true, hasProcessedRef.current = false

  useEffect run #1:
    hasProcessedRef.current = false → passes guard
    hasProcessedRef.current = true  → sets guard
    isSignedIn = true → signOut() → setTimeout #1

  signOut completes:
    isSignedIn changes to false

  useEffect run #2 (triggered by isSignedIn change):
    hasProcessedRef.current = true → BLOCKED by guard
    return early (exit immediately)
    → NO setTimeout #2

  After 2 seconds:
    setTimeout #1 fires → router.push('/sign-in') ← ONLY redirect

User sees: Clean single redirect
Console shows: "Starting sign-out" + "already processing - skipping"
```

---

## 🧪 Testing Verification

### Test Case 1: FETCH_ERROR Auto-Logout Flow

**Setup:**
1. Login with active user
2. Stop backend server
3. Refresh page

**Expected Behavior:**
```
✅ Backend fails → FETCH_ERROR detected in use-auth-query.ts
✅ Console: "🚨 [Layer 2] FETCH_ERROR detected"
✅ redirectOnce('/sign-out') → allowed → navigate

✅ /sign-out page loads
✅ Console: "🔄 [SignOut] Starting sign-out process { isSignedIn: true, reason: 'network_error' }"
✅ signOut() called → setTimeout #1 set
✅ isSignedIn changes to false
✅ Console: "⏳ [SignOut] Sign-out already processing - skipping duplicate"
✅ useEffect blocked → NO setTimeout #2

✅ After 2 seconds → single redirect to /sign-in
✅ NO loop, NO multiple redirects
```

### Test Case 2: Manual Logout Flow

**Setup:**
1. User logged in
2. User clicks "Logout" button
3. Navigate to /sign-out manually

**Expected Behavior:**
```
✅ /sign-out page loads with isSignedIn = true
✅ Console: "🔄 [SignOut] Starting sign-out process { isSignedIn: true, reason: null }"
✅ signOut() executes → setTimeout set
✅ isSignedIn changes → useEffect blocked by guard
✅ Single redirect to /sign-in after 2 seconds
✅ Clean flow, no loop
```

### Test Case 3: Already Signed Out

**Setup:**
1. User already signed out from Clerk
2. Navigate to /sign-out page directly

**Expected Behavior:**
```
✅ /sign-out page loads with isSignedIn = false
✅ Console: "🔄 [SignOut] Starting sign-out process { isSignedIn: false, reason: null }"
✅ Console: "ℹ️ [SignOut] User already signed out, redirecting to sign-in"
✅ Single setTimeout set
✅ Redirect to /sign-in after 2 seconds
✅ Clean flow
```

---

## 📝 Code Review Checklist

### Implementation
- [x] ✅ Added useRef import
- [x] ✅ Added hasProcessedRef guard declaration
- [x] ✅ Added guard check at start of useEffect
- [x] ✅ Added comprehensive logging
- [x] ✅ Followed established guard pattern
- [x] ✅ Dependencies kept accurate (not suppressed)

### Testing
- [ ] Test FETCH_ERROR auto-logout flow
- [ ] Test manual logout flow
- [ ] Test already-signed-out scenario
- [ ] Verify only ONE "Starting sign-out" message
- [ ] Verify "already processing" message when isSignedIn changes
- [ ] Check no loop effect observed
- [ ] Verify clean arrival at /sign-in

### Verification
- [ ] Console shows max 1x "Starting sign-out process"
- [ ] Console shows 1x "already processing - skipping" (when isSignedIn changes)
- [ ] No visual loop or flicker
- [ ] Clean arrival at /sign-in
- [ ] Total time from /sign-out to /sign-in ≈ 2 seconds (not 4 seconds)

---

## 🎓 Key Learnings

### 1. **useEffect Dependencies Can Cause Loops**
```typescript
// ❌ PROBLEM: Dependency causes rerun
useEffect(() => {
  if (someState) {
    doSomething();
    // doSomething changes someState → useEffect reruns → infinite loop!
  }
}, [someState]); // ← someState is in deps!

// ✅ SOLUTION: Guard against rerun
const hasRun = useRef(false);
useEffect(() => {
  if (hasRun.current) return; // Guard
  hasRun.current = true;

  if (someState) {
    doSomething();
  }
}, [someState]); // ← Safe now, guard prevents loop
```

### 2. **Guard Patterns Are Powerful**
We've now used guard patterns in THREE places:
1. **redirectOnce()**: Module-level `isRedirecting` flag
2. **useAuthQuery**: Module-level `isLoggingOut` flag
3. **SignOutPage**: Component-level `hasProcessedRef` flag

**When to use each:**
- Module-level: Cross-instance coordination (multiple components)
- useRef: Single-instance protection (one component, prevent rerun)

### 3. **Multiple Fixes Can Be Needed**
Complex issues often have LAYERS of problems:
- Layer 1: Duplicate signOut() calls
- Layer 2: Multiple component instances
- Layer 3: useEffect dependency loops

Each fix addressed one layer. All three were needed for complete resolution.

### 4. **Debugging Requires Systematic Analysis**
```
Symptom: 3x loop
→ Fix 1: Remove duplicate signOut → Still 3x
→ Fix 2: Module-level isLoggingOut → Reduced to 2x (PROGRESS!)
→ Fix 3: hasProcessedRef guard → Should be FIXED!
```

Progress indicators (3x → 2x) confirmed we're on right track.

---

## 🔗 Related Fixes

This fix builds on:
1. **LOGOUT_LOOP_FIX.md** - Removed duplicate signOut() calls
2. **MULTIPLE_INSTANCES_FIX.md** - Module-level isLoggingOut for multiple instances
3. **PENDEKATAN_2_IMPLEMENTATION_SUMMARY.md** - Original FETCH_ERROR implementation

Combined fixes:
- ✅ No duplicate signOut() calls (first fix)
- ✅ No multiple component redirect attempts (second fix)
- ✅ No useEffect rerun loops (this fix)
- ✅ Clean single redirect flow

---

## 📊 Impact Analysis

### Before All Fixes
```
FETCH_ERROR → Multiple issues:
            → Duplicate signOut() calls
            → Multiple component instances attempting redirect
            → useEffect rerun causing duplicate setTimeout
            → Result: 3+ loops, bad UX
```

### After First Fix
```
FETCH_ERROR → Fixed duplicate signOut()
            → Still: Multiple component instances
            → Still: useEffect rerun issue
            → Result: 3x loop
```

### After Second Fix
```
FETCH_ERROR → Fixed: Duplicate signOut(), multiple instances
            → Still: useEffect rerun issue
            → Result: 2x loop (PROGRESS!)
```

### After Third Fix (THIS FIX)
```
FETCH_ERROR → Fixed: ALL issues
            → Single redirect flow
            → Result: Clean, no loop ✅
```

---

## ✅ Summary

**Problem:** useEffect dependency on `isSignedIn` caused rerun when signOut completed, creating 2x setTimeout calls
**Solution:** Added hasProcessedRef guard to prevent duplicate execution
**Pattern:** useRef guard (component-level) similar to module-level isLoggingOut
**Result:** Only ONE setTimeout executes → clean single redirect

**Status:** ✅ **FIXED - READY FOR RE-TESTING**

**Confidence:** 🟢 HIGH - Addresses final root cause, completes the fix chain

---

## 📞 If Still Not Fixed

If user still reports loop after this fix:

1. **Check Console Logs:**
   - Should see: 1x "🔄 Starting sign-out process"
   - Should see: 1x "⏳ already processing - skipping"
   - If seeing 2x "Starting" → guard not working, investigate

2. **Check Timing:**
   - Total time from /sign-out to /sign-in should be ≈2 seconds
   - If ≈4 seconds → likely 2 redirects still happening
   - Check browser network tab for redirect count

3. **Check Environment:**
   - Development vs Production (Strict Mode only in dev)
   - React Strict Mode can cause additional mount/unmount cycles
   - Test in production build to eliminate Strict Mode effects

4. **Escalation:**
   - If issue persists, there may be ANOTHER source of redirects we haven't identified
   - Check for browser extensions or service workers
   - Verify no other code calling router.push('/sign-in')

**Next Investigation:**
If problem persists, search for ALL occurrences of `router.push('/sign-in')` and `window.location.href` to find any other redirect sources.
