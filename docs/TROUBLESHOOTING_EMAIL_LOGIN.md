# Troubleshooting Email Login Issues

## Problem

Unable to login with Microsoft account using email `christian_handoko@gloriaschool.org` even though the email should exist in the `data_karyawan` table.

## Debugging Steps Implemented

### 1. Enhanced Email Validation Logic

The backend now performs multiple validation attempts:

1. **Exact match** with case-insensitive mode
2. **Contains match** for flexible matching
3. **Raw SQL query** for direct database access
4. **Normalized email** (trimmed and lowercase)

### 2. Comprehensive Logging

Added detailed logging at every step:

- Email received from Clerk
- Email normalization process
- Database query attempts
- Validation results

### 3. Debug Endpoint

Created `/api/auth/debug/check-email` endpoint for testing:

```bash
curl -X POST http://localhost:3001/api/auth/debug/check-email \
  -H "Content-Type: application/json" \
  -d '{"email": "christian_handoko@gloriaschool.org"}'
```

### 4. Test Script

Run the test script to verify database queries:

```bash
cd backend
npx tsx test-email-validation.ts
```

## Common Issues and Solutions

### Issue 1: Email Case Sensitivity

**Problem**: Database stores email differently than OAuth provider sends
**Solution**: Implemented case-insensitive matching with `mode: 'insensitive'`

### Issue 2: Whitespace in Email

**Problem**: Extra spaces before/after email in database
**Solution**: Added `TRIM()` function in queries and normalized emails

### Issue 3: Email Format Variations

**Possible formats in database**:

- `christian_handoko@gloriaschool.org`
- `Christian_Handoko@gloriaschool.org`
- `christian_handoko@GloriaSchool.org`
- With spaces: `christian_handoko@gloriaschool.org`

### Issue 4: NULL or Empty Email

**Problem**: Email field might be NULL or empty string
**Solution**: Check for NULL values and empty strings

## How to Verify Your Email

### Step 1: Check Backend Logs

When you try to login, check the backend console for:

```
[Nest] Email validation request received for: "christian_handoko@gloriaschool.org"
[Nest] Validating email: "christian_handoko@gloriaschool.org"
[Nest] Email validation result for "christian_handoko@gloriaschool.org": true/false
```

### Step 2: Check Browser Console

Open browser DevTools (F12) and look for:

```
=== Email Validation Debug ===
Email from Clerk: christian_handoko@gloriaschool.org
Validation Response: {...}
```

### Step 3: Use Debug Endpoint

Test directly with the debug endpoint to see all query methods:

```bash
curl -X POST http://localhost:3001/api/auth/debug/check-email \
  -H "Content-Type: application/json" \
  -d '{"email": "christian_handoko@gloriaschool.org"}'
```

### Step 4: Direct Database Query

Connect to PostgreSQL and run:

```sql
-- Check exact email
SELECT nip, nama, email
FROM gloria_master.data_karyawan
WHERE LOWER(TRIM(email)) = 'christian_handoko@gloriaschool.org';

-- Find similar emails
SELECT nip, nama, email
FROM gloria_master.data_karyawan
WHERE email ILIKE '%christian%handoko%';

-- Check all gloriaschool.org emails
SELECT nip, nama, email
FROM gloria_master.data_karyawan
WHERE email ILIKE '%@gloriaschool.org%'
LIMIT 10;
```

## Manual Fix Options

### Option 1: Update Email in Database

If the email format is incorrect in the database:

```sql
UPDATE gloria_master.data_karyawan
SET email = 'christian_handoko@gloriaschool.org'
WHERE nip = 'YOUR_NIP';
```

### Option 2: Add Email if Missing

If email is NULL or empty:

```sql
UPDATE gloria_master.data_karyawan
SET email = 'christian_handoko@gloriaschool.org'
WHERE nama ILIKE '%christian%handoko%';
```

### Option 3: Clean Existing Email

If email has extra characters:

```sql
UPDATE gloria_master.data_karyawan
SET email = TRIM(LOWER(email))
WHERE email IS NOT NULL;
```

## Verification After Fix

1. **Run test script**:

   ```bash
   npx tsx test-email-validation.ts
   ```

2. **Test login flow**:

   - Clear browser cache and cookies
   - Sign out from Clerk
   - Try logging in again with Microsoft

3. **Check validation endpoint**:
   ```bash
   curl -X POST http://localhost:3001/api/auth/validate-email \
     -H "Content-Type: application/json" \
     -d '{"email": "christian_handoko@gloriaschool.org"}'
   ```

## Expected Successful Response

When email is found correctly:

```json
{
  "valid": true,
  "message": "Email is registered",
  "employee": {
    "nip": "YOUR_NIP",
    "nama": "Christian Handoko"
  },
  "debug": {
    "receivedEmail": "christian_handoko@gloriaschool.org",
    "normalizedEmail": "christian_handoko@gloriaschool.org",
    "employeeFound": true
  }
}
```

## Alternative Solutions

### 1. Bypass Email Validation (Development Only)

Temporarily disable validation in `auth.service.ts`:

```typescript
// WARNING: Only for development/debugging
const emailExists = true; // await this.validateUserEmail(primaryEmail.emailAddress);
```

### 2. Use NIP-based Login

Configure Clerk to store NIP in user metadata and use that for validation instead of email.

### 3. Whitelist Specific Emails

Add a whitelist in the validation logic:

```typescript
const whitelist = ["christian_handoko@gloriaschool.org"];
if (whitelist.includes(email.toLowerCase())) {
  return true;
}
```

## Contact for Database Issues

If the email exists in the database but validation still fails:

1. Check database connection settings
2. Verify schema permissions (`gloria_master.data_karyawan`)
3. Check if there are any triggers or views affecting the query
4. Contact database administrator to verify data integrity
