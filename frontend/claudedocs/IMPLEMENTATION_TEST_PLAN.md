# Implementation Test Plan - Pendekatan 2 (Backend + Layer 2)

## Overview

Testing plan untuk memvalidasi implementasi Pendekatan 2:
- ✅ **Backend**: Fix `/me` endpoint untuk return HTTP 403
- ✅ **Layer 2**: FETCH_ERROR handling di `use-auth-query.ts`

---

## 🎯 Test Objectives

1. ✅ Verify backend returns proper HTTP codes (bukan crash)
2. ✅ Verify Layer 2 handles FETCH_ERROR dengan logout
3. ✅ Verify inactive users auto-logout
4. ✅ Verify active users tidak terpengaruh (no false positives)
5. ✅ Verify existing functionality tetap bekerja

---

## 📋 Test Matrix

| Test Case | Scenario | Expected Backend | Expected Frontend | Pass/Fail |
|-----------|----------|------------------|-------------------|-----------|
| TC-1 | Active user login + refresh | HTTP 200 + data | Normal operation | |
| TC-2 | Inactive user (is_active=false) + refresh | HTTP 403 | Auto-logout | |
| TC-3 | Inactive employee (status_aktif='0') + refresh | HTTP 403 | Auto-logout | |
| TC-4 | User not found | HTTP 404 | Show error screen | |
| TC-5 | Backend server down | FETCH_ERROR | Auto-logout | |
| TC-6 | Network timeout | FETCH_ERROR | Auto-logout | |
| TC-7 | Multiple API calls when inactive | HTTP 403 | Single logout (no duplicates) | |
| TC-8 | 401 retry mechanism | HTTP 401 → retry → 401 | Retry 3x then logout | |

---

## 🧪 Detailed Test Cases

### TC-1: Active User - Normal Flow ✅

**Objective:** Verify active users can login and use system normally

**Preconditions:**
- User exists in database
- `user.is_active = true`
- `employee.status_aktif = '1'`
- Backend server running

**Steps:**
1. Navigate to `/sign-in`
2. Login with active email credentials
3. Wait for dashboard to load
4. Refresh page (F5)
5. Wait for page to reload

**Expected Results:**
- ✅ Login successful
- ✅ Dashboard loads with user data
- ✅ After refresh: Page loads normally
- ✅ No logout
- ✅ No errors in console
- ✅ Backend returns: HTTP 200 dengan user data
- ✅ Frontend: Normal rendering

**Acceptance Criteria:**
- User remains logged in after refresh
- No FETCH_ERROR in console
- No false-positive logout

---

### TC-2: Inactive User (is_active = false) ✅

**Objective:** Verify backend returns 403 and frontend auto-logout

**Preconditions:**
- User logged in successfully
- Backend server running

**Steps:**
1. User logged in and on dashboard
2. **In database**: `UPDATE users SET is_active = false WHERE clerk_user_id = 'user_xxx'`
3. Refresh page (F5)
4. Observe behavior

**Expected Results:**
- ✅ Backend receives request to `/me`
- ✅ Backend detects `is_active = false`
- ✅ Backend returns: HTTP 403 `{"success": false, "error": "user account is inactive"}`
- ✅ ❌ NOT: Backend crash or FETCH_ERROR
- ✅ Frontend Layer 2 catches 403
- ✅ Frontend logs: `🚫 [useAuthQuery] User account is inactive`
- ✅ Frontend redirects to: `/sign-out?reason=account_deactivated`
- ✅ User logged out from Clerk
- ✅ User redirected to sign-in page

**Acceptance Criteria:**
- No FETCH_ERROR (must be HTTP 403)
- Auto-logout occurs
- Clear log messages in console
- User cannot access system until reactivated

---

### TC-3: Inactive Employee (status_aktif = '0') ✅

**Objective:** Verify backend returns 403 for inactive employee status

**Preconditions:**
- User logged in successfully
- Backend server running

**Steps:**
1. User logged in and on dashboard
2. **In database**: `UPDATE employees SET status_aktif = '0' WHERE email = 'user@example.com'`
3. Refresh page (F5)
4. Observe behavior

**Expected Results:**
- ✅ Backend receives request to `/me`
- ✅ Backend detects `employee.status_aktif != '1'`
- ✅ Backend returns: HTTP 403 `{"success": false, "error": "user account is inactive"}`
- ✅ ❌ NOT: Backend crash or FETCH_ERROR
- ✅ Frontend Layer 2 catches 403
- ✅ Frontend redirects to: `/sign-out?reason=account_deactivated`
- ✅ User logged out

**Acceptance Criteria:**
- No FETCH_ERROR (must be HTTP 403)
- Identical behavior to TC-2
- Consistent error handling

---

### TC-4: User Not Found (404) ✅

**Objective:** Verify backend returns 404 when user doesn't exist

**Preconditions:**
- User has Clerk account but not in backend database
- Backend server running

**Steps:**
1. Login with Clerk credentials (valid Clerk user)
2. Backend doesn't have this user
3. System tries to fetch user context

**Expected Results:**
- ✅ Backend receives request to `/me`
- ✅ Backend cannot find user in database
- ✅ Backend returns: HTTP 404 `{"success": false, "error": "user not found in database"}`
- ✅ Frontend shows: UserNotFoundError screen
- ✅ User can retry or logout

**Acceptance Criteria:**
- HTTP 404 returned (not 403 or FETCH_ERROR)
- User-friendly error screen
- Option to retry or logout

---

### TC-5: Backend Server Down (FETCH_ERROR) ✅

**Objective:** Verify Layer 2 handles FETCH_ERROR dengan auto-logout

**Preconditions:**
- User logged in successfully
- Backend server will be stopped

**Steps:**
1. User logged in and on dashboard
2. **Stop backend server**: `docker stop backend` atau kill process
3. Refresh page (F5)
4. Observe behavior

**Expected Results:**
- ✅ Frontend makes request to `/me`
- ✅ Request fails with network error (connection refused)
- ✅ RTK Query returns: `{status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch'}`
- ✅ Frontend Layer 2 detects FETCH_ERROR
- ✅ Frontend logs:
  ```
  🚨 [Layer 2] FETCH_ERROR detected during API call
  🚨 This indicates:
     - Backend server crash or unhandled exception
     - Network connectivity failure
     - Connection timeout or reset
  🚨 Security: Forcing logout to prevent unauthorized access
  ```
- ✅ Frontend redirects to: `/sign-out?reason=network_error`
- ✅ User logged out from Clerk
- ✅ User redirected to sign-in page

**Acceptance Criteria:**
- FETCH_ERROR is caught by Layer 2
- Auto-logout occurs (security: deny access on error)
- Clear log messages
- No hanging or infinite retry

---

### TC-6: Network Timeout ✅

**Objective:** Verify timeout also triggers FETCH_ERROR handling

**Preconditions:**
- User logged in
- Backend configured with artificial delay or network throttling

**Steps:**
1. User logged in
2. **Simulate network delay**: Use browser DevTools → Network tab → Throttling → Slow 3G
3. Refresh page
4. Wait for timeout

**Expected Results:**
- ✅ Request times out
- ✅ FETCH_ERROR detected
- ✅ Auto-logout triggered
- ✅ Same behavior as TC-5

**Acceptance Criteria:**
- Consistent FETCH_ERROR handling
- No hanging UI

---

### TC-7: Multiple API Calls When Inactive ✅

**Objective:** Verify only ONE logout occurs, no duplicate redirects

**Preconditions:**
- User logged in
- Multiple API calls happen simultaneously (dashboard widgets)

**Steps:**
1. User logged in with complex dashboard (multiple widgets making API calls)
2. Set user inactive: `UPDATE users SET is_active = false`
3. Refresh page
4. Multiple API calls fail simultaneously

**Expected Results:**
- ✅ All API calls return HTTP 403
- ✅ Layer 2 catches FIRST 403
- ✅ `isLoggingOut.current` flag prevents duplicate logouts
- ✅ Only ONE redirect occurs
- ✅ Console shows:
  ```
  🚫 [useAuthQuery] User account is inactive
  ⏳ Logout already in progress - skipping duplicate  (for subsequent calls)
  ```

**Acceptance Criteria:**
- Single logout event
- No multiple redirects
- Clean log output

---

### TC-8: 401 Retry Mechanism Still Works ✅

**Objective:** Verify existing 401 retry logic not broken by FETCH_ERROR changes

**Preconditions:**
- User logged in with valid but expiring token
- Backend configured to return 401 for expired tokens

**Steps:**
1. User logged in
2. Wait for token to approach expiration
3. Make API call that triggers 401
4. Observe retry behavior

**Expected Results:**
- ✅ First 401 → retry attempt 1
- ✅ Token refresh attempted
- ✅ Second 401 → retry attempt 2
- ✅ Third 401 → retry attempt 3
- ✅ Fourth 401 → force logout
- ✅ FETCH_ERROR handling does NOT interfere

**Acceptance Criteria:**
- Existing retry logic works
- Max 3 retries before logout
- FETCH_ERROR logic separate from 401 logic

---

## 🔍 Regression Testing

### Existing Functionality Verification

**Test Areas:**
1. ✅ Normal login flow
2. ✅ Normal logout flow
3. ✅ Token refresh on 401
4. ✅ 403 inactive user detection
5. ✅ User not found (404) error
6. ✅ Cross-tab synchronization
7. ✅ Redux state management

**How to Test:**
- Run through complete user journey
- Login → Use system → Logout
- Verify no regressions

---

## 📊 Test Execution Checklist

### Pre-Testing Setup
- [ ] Frontend changes deployed to test environment
- [ ] Backend changes deployed to test environment
- [ ] Test database accessible
- [ ] Browser DevTools ready
- [ ] Test user accounts prepared

### Frontend Testing
- [ ] TC-1: Active user normal flow ✅
- [ ] TC-5: Backend down (FETCH_ERROR) ✅
- [ ] TC-6: Network timeout ✅
- [ ] TC-7: Multiple API calls ✅
- [ ] TC-8: 401 retry mechanism ✅

### Backend Testing
- [ ] TC-2: Inactive user (is_active=false) ✅
- [ ] TC-3: Inactive employee (status_aktif='0') ✅
- [ ] TC-4: User not found (404) ✅

### Integration Testing
- [ ] All test cases pass end-to-end
- [ ] No FETCH_ERROR when backend healthy
- [ ] Proper error handling when backend fails
- [ ] No false-positive logouts

### Regression Testing
- [ ] Login flow works
- [ ] Logout flow works
- [ ] Token refresh works
- [ ] Cross-tab sync works
- [ ] Existing features unaffected

---

## 🐛 Bug Report Template

Jika test case gagal, gunakan template ini:

```
**Test Case:** TC-X: [Name]
**Status:** ❌ FAILED

**Expected:**
[What should happen]

**Actual:**
[What actually happened]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Console Logs:**
```
[Paste relevant console output]
```

**Network Response:**
```
[Paste HTTP response if relevant]
```

**Screenshots:**
[Attach if applicable]

**Environment:**
- Frontend commit: [hash]
- Backend commit: [hash]
- Browser: [Chrome/Firefox/Safari]
- Test environment: [staging/local]
```

---

## ✅ Success Criteria (Overall)

**Must Pass:**
- ✅ All 8 test cases pass
- ✅ No FETCH_ERROR when backend returns proper HTTP codes
- ✅ FETCH_ERROR handling works when backend crashes
- ✅ No false-positive logouts for active users
- ✅ No regressions in existing functionality

**Quality Metrics:**
- ✅ 100% test case pass rate
- ✅ <1% error rate in production logs
- ✅ No user complaints about unexpected logouts
- ✅ Clean console logs (no spam)

---

## 📈 Post-Deployment Monitoring

**What to Monitor (First 24 Hours):**
1. **Error Logs:**
   - Search for `FETCH_ERROR` occurrences
   - Should be ZERO if backend healthy

2. **Logout Events:**
   - Monitor `/sign-out?reason=network_error`
   - Should be rare (only actual network issues)

3. **403 Events:**
   - Monitor `/sign-out?reason=account_deactivated`
   - Should match HR deactivation events

4. **User Reports:**
   - Monitor support tickets
   - Look for "unexpected logout" complaints
   - Investigate any false positives immediately

**Metrics Dashboard:**
```
Daily Metrics:
- FETCH_ERROR count: [should be 0]
- 403 inactive count: [should match HR deactivations]
- False-positive logouts: [should be 0]
- Active user login success rate: [should be >99%]
```

---

## 📞 Escalation Path

**If Issues Found:**

**Minor Issues (No security impact):**
1. Document in bug tracker
2. Fix in next sprint
3. Monitor for patterns

**Major Issues (Security or functionality broken):**
1. Immediate rollback if needed
2. Emergency fix
3. Re-test all test cases
4. Redeploy with fix

**Critical Issues (Users cannot access system):**
1. Immediate rollback
2. Post-mortem analysis
3. Root cause investigation
4. Comprehensive fix + testing

---

## 📝 Test Report Template

```
# Test Execution Report - Pendekatan 2 Implementation

**Date:** [YYYY-MM-DD]
**Tester:** [Name]
**Environment:** [Staging/Production]
**Frontend Version:** [commit hash]
**Backend Version:** [commit hash]

## Test Results Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-1: Active user | ✅/❌ | |
| TC-2: Inactive user | ✅/❌ | |
| TC-3: Inactive employee | ✅/❌ | |
| TC-4: User not found | ✅/❌ | |
| TC-5: Backend down | ✅/❌ | |
| TC-6: Network timeout | ✅/❌ | |
| TC-7: Multiple calls | ✅/❌ | |
| TC-8: 401 retry | ✅/❌ | |

**Pass Rate:** X/8 (XX%)

## Issues Found
[List any issues or bugs discovered]

## Recommendations
[Any recommendations for improvement]

## Sign-off
- [ ] All critical test cases passed
- [ ] No blocking issues found
- [ ] Ready for production deployment

**QA Sign-off:** _______________
**Date:** _______________
```

---

## 🎓 Testing Best Practices

1. **Test in Isolation:** Test one change at a time
2. **Use Fresh Data:** Reset database between tests
3. **Check Logs:** Always review console and server logs
4. **Document Everything:** Screenshot errors, save logs
5. **Regression First:** Ensure existing features still work
6. **Real Scenarios:** Test with realistic user workflows

**Remember:**
- Testing is NOT optional
- Each test case validates critical security functionality
- Failed tests = security vulnerabilities

✅ Good testing = confident deployment!
