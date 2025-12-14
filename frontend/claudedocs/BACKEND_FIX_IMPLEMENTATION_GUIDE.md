# Backend Fix Implementation Guide

## Tujuan (Objective)

Memperbaiki endpoint `/api/v1/me` agar **selalu mengembalikan HTTP status code yang benar** dan **tidak crash** saat memproses user dengan email inactive.

---

## 🚨 Masalah Saat Ini (Current Problem)

**Behavior yang Salah:**
- Saat user dengan email inactive melakukan request ke `/me`
- Backend crash atau throw exception tanpa mengirim HTTP response
- Frontend menerima `FETCH_ERROR: TypeError: Failed to fetch`
- User tetap login (security vulnerability)

**Yang Diharapkan:**
- Backend return HTTP 403 dengan message `"user account is inactive"`
- Frontend auto-logout user (existing handler sudah ada)

---

## ✅ Solusi Backend (Backend Solution)

### File yang Perlu Diubah

Kemungkinan lokasi (tergantung struktur backend):
- `handlers/user_handler.go` (jika menggunakan Go/Gin)
- `controllers/user_controller.js` (jika menggunakan Node.js/Express)
- File yang menghandle endpoint `GET /api/v1/me`

### Implementasi (Go/Gin Example)

```go
// File: handlers/user_handler.go atau backend/api/v1/user.go

// GetCurrentUser handles GET /api/v1/me
func GetCurrentUser(c *gin.Context) {
    // Get Clerk user ID from context (set by auth middleware)
    clerkUserID, exists := c.Get("clerk_user_id")
    if !exists {
        c.JSON(401, gin.H{
            "success": false,
            "error":   "unauthorized - no user ID in context",
        })
        return
    }

    // Convert to string
    clerkUserIDStr, ok := clerkUserID.(string)
    if !ok {
        c.JSON(500, gin.H{
            "success": false,
            "error":   "internal server error - invalid user ID type",
        })
        return
    }

    // Fetch user from database
    var user models.User
    err := db.Preload("Employee").
        Where("clerk_user_id = ?", clerkUserIDStr).
        First(&user).Error

    if err != nil {
        if err == gorm.ErrRecordNotFound {
            // User not found in database
            c.JSON(404, gin.H{
                "success": false,
                "error":   "user not found in database",
            })
            return
        }

        // Other database errors
        log.Printf("❌ Database error fetching user: %v", err)
        c.JSON(500, gin.H{
            "success": false,
            "error":   "internal server error",
        })
        return
    }

    // ⚠️ CRITICAL CHECK: Verify user is active
    if !user.IsActive {
        log.Printf("🚫 User %s is inactive (is_active = false)", user.ClerkUserID)
        c.JSON(403, gin.H{
            "success": false,
            "error":   "user account is inactive",
        })
        return
    }

    // ⚠️ CRITICAL CHECK: Verify employee exists and is active
    if user.Employee == nil {
        log.Printf("🚫 User %s has no employee record", user.ClerkUserID)
        c.JSON(403, gin.H{
            "success": false,
            "error":   "user account is inactive",
        })
        return
    }

    if user.Employee.StatusAktif != "1" {
        log.Printf("🚫 Employee %s has inactive status (status_aktif = %s)",
            user.Employee.NIP, user.Employee.StatusAktif)
        c.JSON(403, gin.H{
            "success": false,
            "error":   "user account is inactive",
        })
        return
    }

    // User is active - fetch roles, permissions, modules
    var roles []models.Role
    var permissions []string
    var modules []models.Module

    // ... fetch roles, permissions, modules logic ...

    // Return success response
    c.JSON(200, gin.H{
        "success": true,
        "message": "User context retrieved successfully",
        "data": gin.H{
            "id":            user.ID,
            "clerk_user_id": user.ClerkUserID,
            "nip":           user.NIP,
            "is_active":     user.IsActive,
            "employee":      user.Employee,
            "roles":         roles,
            "permissions":   permissions,
            "modules":       modules,
        },
    })
}
```

### Implementasi (Node.js/Express Example)

```javascript
// File: controllers/user.controller.js

/**
 * Get current user context
 * GET /api/v1/me
 */
async function getCurrentUser(req, res) {
  try {
    // Get Clerk user ID from auth middleware
    const clerkUserID = req.auth?.userId;

    if (!clerkUserID) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized - no user ID',
      });
    }

    // Fetch user from database with employee relation
    const user = await db.User.findOne({
      where: { clerk_user_id: clerkUserID },
      include: [{ model: db.Employee }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'user not found in database',
      });
    }

    // ⚠️ CRITICAL CHECK: Verify user is active
    if (!user.is_active) {
      console.log(`🚫 User ${user.clerk_user_id} is inactive`);
      return res.status(403).json({
        success: false,
        error: 'user account is inactive',
      });
    }

    // ⚠️ CRITICAL CHECK: Verify employee exists and is active
    if (!user.Employee || user.Employee.status_aktif !== '1') {
      console.log(`🚫 User ${user.clerk_user_id} has inactive employee`);
      return res.status(403).json({
        success: false,
        error: 'user account is inactive',
      });
    }

    // Fetch roles, permissions, modules
    const roles = await user.getRoles();
    const permissions = await user.getPermissions();
    const modules = await user.getModules();

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'User context retrieved successfully',
      data: {
        id: user.id,
        clerk_user_id: user.clerk_user_id,
        nip: user.nip,
        is_active: user.is_active,
        employee: user.Employee,
        roles,
        permissions,
        modules,
      },
    });

  } catch (error) {
    console.error('❌ Error in getCurrentUser:', error);
    return res.status(500).json({
      success: false,
      error: 'internal server error',
    });
  }
}

module.exports = { getCurrentUser };
```

---

## 🔍 Checklist Validasi (Validation Checklist)

### Pre-Implementation Checks
- [ ] Identifikasi file yang handle endpoint `GET /api/v1/me`
- [ ] Review current error handling logic
- [ ] Understand database schema untuk `users` dan `employees`
- [ ] Verify field names: `is_active`, `status_aktif`, dll

### Implementation Checks
- [ ] ✅ Check `user.is_active === false` → return 403
- [ ] ✅ Check `user.Employee === null` → return 403
- [ ] ✅ Check `user.Employee.status_aktif !== "1"` → return 403
- [ ] ✅ All error cases return proper HTTP status code
- [ ] ✅ No unhandled exceptions that could crash the server
- [ ] ✅ Proper logging for debugging

### Response Format Validation
- [ ] ✅ All responses have consistent structure: `{success, error/data, message}`
- [ ] ✅ HTTP 403 responses include: `{"success": false, "error": "user account is inactive"}`
- [ ] ✅ HTTP 404 responses include: `{"success": false, "error": "user not found in database"}`
- [ ] ✅ HTTP 500 responses include: `{"success": false, "error": "internal server error"}`

---

## 🧪 Testing Guide

### Test Case 1: Active User (Normal Flow)
```bash
# Setup: User dengan email active
# Expected: HTTP 200 dengan data user

curl -X GET http://localhost:8080/api/v1/me \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"

# Expected Response:
# Status: 200 OK
# Body: {
#   "success": true,
#   "data": { ... user data ... }
# }
```

### Test Case 2: Inactive User (is_active = false)
```bash
# Setup: Set user.is_active = false di database
UPDATE users SET is_active = false WHERE clerk_user_id = 'user_xxx';

# Test
curl -X GET http://localhost:8080/api/v1/me \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"

# Expected Response:
# Status: 403 Forbidden
# Body: {
#   "success": false,
#   "error": "user account is inactive"
# }

# ❌ NOT: Connection refused, timeout, or no response
```

### Test Case 3: Inactive Employee (status_aktif != "1")
```bash
# Setup: Set employee.status_aktif = '0' di database
UPDATE employees SET status_aktif = '0' WHERE nip = 'xxx';

# Test
curl -X GET http://localhost:8080/api/v1/me \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"

# Expected Response:
# Status: 403 Forbidden
# Body: {
#   "success": false,
#   "error": "user account is inactive"
# }
```

### Test Case 4: User Not Found
```bash
# Setup: User dengan Clerk ID tidak ada di database

# Test
curl -X GET http://localhost:8080/api/v1/me \
  -H "Authorization: Bearer UNKNOWN_USER_TOKEN"

# Expected Response:
# Status: 404 Not Found
# Body: {
#   "success": false,
#   "error": "user not found in database"
# }
```

### Test Case 5: No Employee Record
```bash
# Setup: User ada tapi employee = NULL

# Test
curl -X GET http://localhost:8080/api/v1/me \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"

# Expected Response:
# Status: 403 Forbidden
# Body: {
#   "success": false,
#   "error": "user account is inactive"
# }
```

---

## 📊 Integration Testing (dengan Frontend)

### Test Integration 1: Inactive Email + Refresh
```
1. Login dengan email active → ✅ Success
2. Di backend, set email inactive:
   UPDATE employees SET status_aktif = '0' WHERE email = 'user@example.com'
3. Refresh browser (F5)
4. Expected:
   ✅ Backend returns HTTP 403
   ✅ Frontend Layer 2 catches 403
   ✅ Auto-redirect to /sign-out?reason=account_deactivated
   ✅ User logged out dari Clerk
   ✅ NO FETCH_ERROR in console
```

### Test Integration 2: Backend Crash Scenario
```
1. Login dengan email active
2. Stop backend server atau simulate crash
3. Refresh browser
4. Expected:
   ✅ FETCH_ERROR detected
   ✅ Frontend Layer 2 catches FETCH_ERROR
   ✅ Auto-redirect to /sign-out?reason=network_error
   ✅ User logged out
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] ✅ All test cases pass (active, inactive user, inactive employee)
- [ ] ✅ No FETCH_ERROR in any test scenario
- [ ] ✅ Code review completed
- [ ] ✅ Integration testing with frontend completed
- [ ] ✅ Database migration (if schema changes needed)

### Deployment Steps
1. [ ] Deploy to staging environment
2. [ ] Run integration tests on staging
3. [ ] Monitor logs for errors
4. [ ] Deploy to production
5. [ ] Monitor production logs for 24 hours

### Post-Deployment
- [ ] Verify no FETCH_ERROR in production logs
- [ ] Verify inactive users auto-logout
- [ ] Verify active users not affected
- [ ] Monitor error rates and user feedback

---

## 📝 Key Principles

### ✅ DO
- ✅ **Always return HTTP status code** - never crash without response
- ✅ **Use 403 for inactive users** - frontend already handles this
- ✅ **Use 404 for user not found** - clear error semantics
- ✅ **Use 500 for server errors** - with proper logging
- ✅ **Log all security events** - for audit trail
- ✅ **Consistent error format** - `{success, error, message}`

### ❌ DON'T
- ❌ **Don't throw unhandled exceptions** - always catch and return proper HTTP code
- ❌ **Don't crash on invalid data** - handle gracefully
- ❌ **Don't return 200 for errors** - use correct HTTP semantics
- ❌ **Don't expose sensitive info in errors** - generic messages for production

---

## 🔗 Related Files

**Frontend:**
- `src/hooks/use-auth-query.ts` - Layer 2 defense (FETCH_ERROR handler)
- `src/store/api/apiSlice.ts` - API base query configuration
- `src/components/auth/auth-initializer.tsx` - Layer 3 defense

**Backend:**
- `handlers/user_handler.go` (atau equivalent) - IMPLEMENT FIX HERE
- `middleware/auth.go` - Clerk token validation
- `models/user.go`, `models/employee.go` - Data models

---

## 📞 Support & Questions

Jika ada pertanyaan atau issue saat implementasi:
1. Review test cases - pastikan semua pass
2. Check logs - lihat error messages
3. Verify response format - harus konsisten `{success, error/data}`
4. Test integration - pastikan frontend handler works

**Success Criteria:**
✅ Tidak ada FETCH_ERROR di logs
✅ Inactive users auto-logout
✅ Active users normal operation
✅ Semua test cases pass
