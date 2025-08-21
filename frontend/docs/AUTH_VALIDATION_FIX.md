# Authentication Validation Fix

## Problem
The frontend was experiencing a 404 error when trying to validate user emails with the backend API endpoint `/api/v1/auth/validate-email`. This was causing:
1. Users being automatically signed out
2. "Access Denied" error messages
3. Poor development experience when backend is not running

## Root Cause
The AuthWrapper component was making a POST request to validate emails against the backend database, but:
- The backend endpoint might not be implemented yet
- During development, the backend might not be running
- The strict validation was preventing developers from testing the frontend

## Solution Implemented

### 1. Development Mode Bypass
The AuthWrapper now automatically bypasses email validation in development mode when:
- The backend endpoint returns 404
- `NODE_ENV` is set to 'development'
- `NEXT_PUBLIC_BYPASS_EMAIL_VALIDATION` is set to 'true'

### 2. Graceful Error Handling
- No automatic sign-out in development mode
- Mock employee data is created for development testing
- Clear console warnings indicate when validation is bypassed

### 3. Configuration Options
Added environment variable for explicit control:
```env
# In .env.local
NEXT_PUBLIC_BYPASS_EMAIL_VALIDATION=true  # Skip validation entirely
```

## Changes Made

### AuthWrapper.tsx
1. **Early Bypass Check**: Added development mode check before making API call
2. **404 Handling**: Specifically handles 404 errors by bypassing validation in dev
3. **No Auto-Logout**: Prevents automatic sign-out in development mode
4. **Mock Data**: Creates realistic mock employee data for testing

### Environment Configuration
Added new variables to `.env.example`:
- `NEXT_PUBLIC_API_URL`: Backend API URL configuration
- `NEXT_PUBLIC_BYPASS_EMAIL_VALIDATION`: Option to bypass validation

## Usage

### Development Mode (Backend Not Running)
```bash
# Just run the frontend - validation will be automatically bypassed
npm run dev
```

### Development Mode (With Backend)
```bash
# Run both frontend and backend
cd backend && npm run start:dev
cd frontend && npm run dev
```

### Production Mode
Email validation is always enforced in production. Users without valid emails in the database will be denied access and automatically signed out.

## Benefits
1. **Better DX**: Developers can work on frontend without backend
2. **Faster Iteration**: No need to set up full stack for UI development
3. **Clearer Errors**: Console clearly indicates when/why validation is bypassed
4. **Production Safety**: Strict validation remains in production

## Testing the Fix

1. **Without Backend**: 
   - Start only the frontend
   - Sign in with Clerk
   - Should see "EMAIL VALIDATION BYPASSED" in console
   - Should be able to access the app

2. **With Backend**:
   - Start both frontend and backend
   - Implement the `/api/v1/auth/validate-email` endpoint
   - Validation will work normally

3. **Force Bypass**:
   - Set `NEXT_PUBLIC_BYPASS_EMAIL_VALIDATION=true` in `.env.local`
   - Validation will always be skipped regardless of backend status

## Security Notes
- Email validation bypass ONLY works in development mode
- Production builds always enforce validation
- Mock data is clearly marked with "DEV_" prefix
- Console warnings make it obvious when validation is bypassed