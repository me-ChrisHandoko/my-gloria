# Backend Integration Verification Guide

**Status:** ✅ **IMPLEMENTED**
**Date:** December 10, 2025
**Component:** AuthInitializer - Clerk to Backend Integration

---

## 📋 Implementation Summary

### What Was Implemented

**1. AuthInitializer Component** (`src/components/auth/auth-initializer.tsx`)
- Bridges Clerk authentication with backend user context
- Monitors Clerk auth state via `useAuth()` hook
- Fetches user data from backend `/api/v1/me` endpoint
- Syncs user context to Redux store
- Handles loading/error states gracefully
- Clears Redux on logout

**2. Layout Integration** (`src/app/layout.tsx`)
- Added AuthInitializer wrapper after ClerkProvider and ReduxProvider
- Ensures proper provider order for hook dependencies
- Wraps entire app to initialize auth on startup

**3. Backend Endpoint Verification**
- ✅ Endpoint exists: `GET /api/v1/me` (line 185 in main.go)
- ✅ Handler implemented: `me_handler.go` with complete user context
- ✅ Returns: User, Employee, Roles, Permissions, Modules

---

## 🧪 Testing Instructions

### Prerequisites

1. **Backend Running:**
   ```bash
   cd /Users/christianhandoko/Development/work/my-gloria/backend
   ./api  # or go run cmd/api/main.go
   ```

   Backend should be running at: `http://localhost:8080`

2. **Frontend Running:**
   ```bash
   cd /Users/christianhandoko/Development/work/my-gloria/frontend
   npm run dev
   ```

   Frontend should be running at: `http://localhost:3000`

3. **Browser DevTools Ready:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Enable "Preserve log" option

---

## 🔍 Verification Steps

### Step 1: Verify Login Flow with Backend Call

1. **Open Application:**
   ```
   http://localhost:3000
   ```

2. **Expected Behavior:**
   - Should redirect to `/sign-in` (not authenticated)
   - See Clerk sign-in page

3. **Sign In:**
   - Enter credentials and sign in via Clerk
   - **Watch Network tab during sign-in**

4. **Expected Network Requests:**
   ```
   Request: GET http://localhost:8080/api/v1/me
   Headers:
     Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
     Content-Type: application/json

   Response: 200 OK
   {
     "success": true,
     "data": {
       "user": {
         "id": "123",
         "clerk_user_id": "user_xxx",
         "email": "user@example.com",
         ...
       },
       "employee": { ... },
       "roles": [ ... ],
       "permissions": [ ... ],
       "modules": [ ... ]
     }
   }
   ```

5. **Verification Checklist:**
   - [ ] Request to `/api/v1/me` appears in Network tab
   - [ ] Request includes `Authorization: Bearer` header
   - [ ] Response status is `200 OK`
   - [ ] Response contains user context data
   - [ ] Page redirects to `/` (dashboard) after successful load

---

### Step 2: Verify Redux State Population

1. **Install Redux DevTools Extension:**
   - Chrome: [Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)
   - Firefox: [Redux DevTools](https://addons.mozilla.org/en-US/firefox/addon/reduxdevtools/)

2. **Open Redux DevTools:**
   - Open browser DevTools (F12)
   - Go to "Redux" tab
   - Select "State" sub-tab

3. **Check Auth State:**
   ```json
   {
     "auth": {
       "userContext": {
         "user": {
           "id": "123",
           "clerk_user_id": "user_xxx",
           "email": "user@example.com",
           "first_name": "John",
           "last_name": "Doe",
           ...
         },
         "employee": { ... },
         "roles": [ ... ],
         "permissions": [ ... ],
         "modules": [ ... ]
       },
       "isLoading": false,
       "error": null,
       "isInitialized": true
     }
   }
   ```

4. **Verification Checklist:**
   - [ ] `auth.userContext` is populated (not null)
   - [ ] `auth.isInitialized` is `true`
   - [ ] `auth.isLoading` is `false`
   - [ ] `auth.error` is `null`
   - [ ] User data matches backend response

---

### Step 3: Verify Loading States

1. **Clear Browser Cache:**
   - DevTools → Application → Clear Storage → Clear site data

2. **Reload Page:**
   - Watch for loading screen during initialization

3. **Expected Behavior:**
   - Should see "Loading your profile..." screen
   - Screen displays with Shield icon and spinner
   - Should transition to dashboard after data loads

4. **Verification Checklist:**
   - [ ] Loading screen appears during initialization
   - [ ] Loading screen disappears after backend responds
   - [ ] No flash of unauthenticated content (FOUC)

---

### Step 4: Verify Logout Flow

1. **Click Logout:**
   - Find user menu in navbar
   - Click "Sign Out" or "Logout"

2. **Expected Behavior:**
   - Clerk signs out user
   - Redux state cleared
   - Redirects to `/sign-in`

3. **Check Redux State After Logout:**
   ```json
   {
     "auth": {
       "userContext": null,
       "isLoading": false,
       "error": null,
       "isInitialized": false
     }
   }
   ```

4. **Verification Checklist:**
   - [ ] Redux `auth.userContext` is `null`
   - [ ] Redux `auth.isInitialized` is `false`
   - [ ] Redirected to `/sign-in`
   - [ ] Cannot access protected routes

---

### Step 5: Verify Error Handling

**Test Case 1: Backend Offline**

1. **Stop Backend:**
   ```bash
   # Kill backend process
   ```

2. **Try to Login:**
   - Sign in via Clerk
   - Backend request will fail

3. **Expected Behavior:**
   - Error message appears in Redux state
   - Error boundary catches error gracefully
   - User sees error UI (not blank page)

4. **Verification Checklist:**
   - [ ] Redux `auth.error` contains error message
   - [ ] Error boundary displays error UI
   - [ ] No application crash

**Test Case 2: User Not Found in Backend**

1. **Login with New Clerk User:**
   - Use a Clerk account that doesn't exist in backend database

2. **Expected Backend Response:**
   ```json
   Status: 404 Not Found
   {
     "success": false,
     "error": "user profile not found"
   }
   ```

3. **Expected Frontend Behavior:**
   - Redux `auth.error` contains "Failed to load user context"
   - Error boundary shows error message

4. **Verification Checklist:**
   - [ ] 404 error caught and handled
   - [ ] User sees meaningful error message
   - [ ] Can retry or contact support

---

## 🐛 Troubleshooting

### Issue 1: No Backend Call After Login

**Symptoms:**
- Login successful but no network request to `/api/v1/me`
- Redux `userContext` remains `null`

**Diagnosis:**
```bash
# Check if useCurrentUser is being called
# Add console.log to auth-initializer.tsx
```

**Solution:**
- Verify AuthInitializer is in layout.tsx
- Check provider order (ClerkProvider → ReduxProvider → AuthInitializer)
- Ensure Clerk `userId` is available

---

### Issue 2: Backend Returns 401 Unauthorized

**Symptoms:**
- Request to `/api/v1/me` returns 401
- Error: "Invalid or expired token"

**Diagnosis:**
```bash
# Check Authorization header in Network tab
# Should be: Authorization: Bearer <valid_jwt>
```

**Solution:**
- Verify Clerk JWT is being injected by `useAuthQuery`
- Check backend JWT validation middleware
- Ensure Clerk secret key matches in backend

---

### Issue 3: CORS Error

**Symptoms:**
- Network tab shows CORS error
- Request to `http://localhost:8080` blocked

**Diagnosis:**
```
Access to XMLHttpRequest at 'http://localhost:8080/api/v1/me'
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution:**
```bash
# Backend must enable CORS for localhost:3000
# Check backend CORS middleware configuration
```

---

### Issue 4: Infinite Loading Screen

**Symptoms:**
- Loading screen never disappears
- Backend request successful but state not updating

**Diagnosis:**
```bash
# Check Redux DevTools for action dispatches
# Should see: auth/setUserContext action
```

**Solution:**
- Verify `dispatch(setUserContext(...))` is called
- Check useEffect dependencies in AuthInitializer
- Ensure no infinite loop in useEffect

---

## ✅ Success Criteria

All tests pass when:

- [x] **File 1 Created:** `src/components/auth/auth-initializer.tsx` exists
- [x] **File 2 Modified:** `src/app/layout.tsx` includes AuthInitializer wrapper
- [x] **Backend Endpoint:** `GET /api/v1/me` is accessible and returns 200
- [ ] **Network Request:** Login triggers call to `/api/v1/me`
- [ ] **Authorization:** Request includes `Authorization: Bearer` header
- [ ] **Redux State:** `auth.userContext` populated after login
- [ ] **Loading State:** Loading screen displays during initialization
- [ ] **Logout:** Redux state cleared on logout
- [ ] **Error Handling:** Errors caught and displayed gracefully

---

## 📊 Expected Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User visits /                                            │
│    ↓                                                         │
│ 2. proxy.ts redirects to /sign-in (unauthenticated)        │
│    ↓                                                         │
│ 3. User signs in via Clerk                                  │
│    ↓                                                         │
│ 4. Clerk creates JWT token                                  │
│    ↓                                                         │
│ 5. AuthInitializer detects Clerk userId                     │
│    ↓                                                         │
│ 6. useCurrentUser() hook calls backend                      │
│    Request: GET /api/v1/me                                  │
│    Headers: Authorization: Bearer <clerk_jwt>               │
│    ↓                                                         │
│ 7. Backend validates JWT                                    │
│    ↓                                                         │
│ 8. Backend returns user context                             │
│    Response: { user, employee, roles, permissions, modules }│
│    ↓                                                         │
│ 9. AuthInitializer dispatches to Redux                      │
│    dispatch(setUserContext(...))                            │
│    ↓                                                         │
│ 10. Redux state updated                                     │
│     auth.userContext = { user, employee, ... }              │
│     auth.isInitialized = true                               │
│     ↓                                                        │
│ 11. Loading screen disappears                               │
│     ↓                                                        │
│ 12. Dashboard renders with user context                     │
│     ↓                                                        │
│ 13. RBAC/Permissions fully functional ✅                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Next Steps After Verification

**If All Tests Pass:**
1. ✅ Mark Prioritas 1 as complete
2. 🔧 Proceed to Prioritas 2 (error handling enhancements)
3. 🎯 Implement token refresh mechanism
4. 📚 Document backend API requirements

**If Tests Fail:**
1. 🐛 Follow troubleshooting guide above
2. 📝 Check error messages in console and network tab
3. 🔍 Verify backend logs for JWT validation errors
4. 💬 Report specific error for debugging

---

## 📞 Support

**Debugging Resources:**
- Frontend logs: Browser DevTools → Console
- Backend logs: Terminal where `./api` is running
- Redux state: Redux DevTools → State tab
- Network requests: DevTools → Network tab → XHR filter

**Common Issues:**
1. Backend not running → Start backend server
2. CORS errors → Check backend CORS config
3. 401 errors → Verify Clerk JWT validation
4. 404 errors → User not in database, needs creation
