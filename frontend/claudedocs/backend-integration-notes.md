# Backend Integration Notes

## Data Karyawan Integration

### Frontend Changes Completed ✅

1. **Type Definitions Updated** (`lib/types/auth.ts`)
   - Added `DataKaryawan` interface with fields: `nip`, `firstname`, `lastname`, `departemen`, `jabatan`
   - Added `data_karyawan` field to `User` interface

2. **Gloria Sidebar Updated** (`components/gloria-sidebar.tsx`)
   - Now displays `firstname + lastname` as name
   - Now displays `nip` instead of email
   - Falls back to username/email if `data_karyawan` is not available

3. **Debug Logging Added**
   - `LoginForm.tsx`: Logs user data and data_karyawan after successful login
   - `RegisterForm.tsx`: Logs user data and data_karyawan after successful registration
   - `gloria-sidebar.tsx`: Logs user data when sidebar renders

### Backend Requirements ⚠️

**The backend needs to include `data_karyawan` in the User object for these endpoints:**

#### 1. Login Response (`POST /api/v1/auth/login`)
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username",
    "is_active": true,
    "data_karyawan": {
      "nip": "12345678",
      "firstname": "John",
      "lastname": "Doe",
      "departemen": "IT",
      "jabatan": "Developer"
    }
  }
}
```

#### 2. Register Response (`POST /api/v1/auth/register`)
Same structure as login response.

#### 3. Get Current User (`GET /api/v1/auth/me`)
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "username",
  "is_active": true,
  "data_karyawan": {
    "nip": "12345678",
    "firstname": "John",
    "lastname": "Doe",
    "departemen": "IT",
    "jabatan": "Developer"
  }
}
```

### Testing Steps

1. **Open Browser Console** (F12)
2. **Login or Register** with a test account
3. **Check Console Logs:**
   - Should see "Login successful" or "Registration successful"
   - Should see "User data" with the user object
   - Should see "Data karyawan" - this should show the karyawan data or `undefined`
4. **Check Sidebar:**
   - Should see "GloriaSidebar - User" log
   - Should see "GloriaSidebar - Data karyawan" log

### Current Behavior

- ✅ Frontend code is ready to receive and display `data_karyawan`
- ✅ Frontend type definitions updated to match backend snake_case (`is_active`)
- ⚠️ **Backend currently NOT sending `data_karyawan`** (verified from console logs)
- 🔄 Sidebar currently shows email as fallback because `data_karyawan` is missing

### Current Backend Response (Actual)
```json
{
  "id": "48948766-857c-4b7c-b473-e84f99e7e2d4",
  "email": "christian_handoko@gloriaschool.org",
  "is_active": true
  // ❌ data_karyawan is MISSING
}
```

### Expected Backend Response (With data_karyawan)
```json
{
  "id": "48948766-857c-4b7c-b473-e84f99e7e2d4",
  "email": "christian_handoko@gloriaschool.org",
  "is_active": true,
  "data_karyawan": {
    "nip": "12345678",
    "firstname": "Christian",
    "lastname": "Handoko",
    "departemen": "IT",
    "jabatan": "Developer"
  }
}
```

### Next Steps for Backend Team

1. **Add `data_karyawan` relation to User model**
   - Create/verify relationship between User and Karyawan tables
   - Ensure proper foreign key relationship

2. **Include `data_karyawan` in User serialization**
   - Update User serializer/response model to include `data_karyawan` field
   - Apply to all auth endpoints (login, register, me)

3. **Populate `data_karyawan` from database**
   - Join with karyawan table when fetching User
   - Include all required fields: nip, firstname, lastname, departemen, jabatan

4. **Test with frontend**
   - After implementation, test login/register
   - Check browser console logs to verify data is being sent
   - Verify sidebar displays "Firstname Lastname" and NIP

### What Happens When data_karyawan is Missing

Currently, the sidebar will display:
- **Name**: Email username part (e.g., "christian_handoko" from "christian_handoko@gloriaschool.org")
- **Subtitle**: Full email address

Once `data_karyawan` is added, sidebar will display:
- **Name**: "Firstname Lastname" (e.g., "Christian Handoko")
- **Subtitle**: NIP (e.g., "12345678")
