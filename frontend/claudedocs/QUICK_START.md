# Frontend Authentication - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Prerequisites
```bash
# Ensure backend is running on localhost:8080
cd ../backend && go run .
```

### 2. Start Frontend
```bash
cd frontend
npm run dev
# Opens at http://localhost:3000
```

### 3. Test Flow
1. **Register**: Visit `http://localhost:3000/register`
   - Use employee email from backend database
   - Password: minimum 8 characters

2. **Login**: Visit `http://localhost:3000/login`
   - Enter registered credentials

3. **Dashboard**: Auto-redirected to `/dashboard` after login

---

## 📖 Common Usage Patterns

### Using Auth State in Components
```typescript
'use client';

import { useAppSelector } from '@/lib/store/hooks';

export default function MyComponent() {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {user?.email}!</p>
      ) : (
        <p>Please login</p>
      )}
    </div>
  );
}
```

### Making Protected API Calls
```typescript
'use client';

import { useGetCurrentUserQuery } from '@/lib/store/services/authApi';

export default function ProfileComponent() {
  const { data: user, isLoading, error } = useGetCurrentUserQuery();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <Alert variant="error">Failed to load</Alert>;

  return <div>{user?.email}</div>;
}
```

### Manual Logout
```typescript
'use client';

import { useAppDispatch } from '@/lib/store/hooks';
import { logout } from '@/lib/store/features/authSlice';
import { useRouter } from 'next/navigation';

export default function MyComponent() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

---

## 🔍 Debugging

### Redux DevTools
1. Install Redux DevTools browser extension
2. Open DevTools → Redux tab
3. Watch actions: `auth/setCredentials`, `auth/logout`
4. Inspect state: `state.auth`

### Check sessionStorage
```javascript
// Browser console
sessionStorage.getItem('gloria_auth')
// Should show: {"accessToken":"...", "refreshToken":"...", "user":{...}}
```

### Network Tab
- Login: `POST /api/v1/auth/login`
- Protected: `GET /api/v1/auth/me` with Bearer token
- Refresh: `POST /api/v1/auth/refresh` on 401

---

## ⚠️ Common Issues

### "Account locked" error
**Cause**: 5 failed login attempts
**Solution**: Wait 15 minutes or clear backend login attempts table

### "Email tidak terdaftar sebagai karyawan"
**Cause**: Email not in backend employee table
**Solution**: Register email in employee table first

### Token refresh fails
**Cause**: Refresh token expired (7 days)
**Solution**: Login again, tokens will be regenerated

### Protected route not working
**Cause**: Not wrapped in ProtectedRoute component
**Solution**: Use `(protected)` route group or wrap with `<ProtectedRoute>`

---

## 📂 Key Files Reference

| File | Purpose |
|------|---------|
| `lib/store/store.ts` | Redux store configuration |
| `lib/store/services/authApi.ts` | API endpoints & hooks |
| `lib/store/features/authSlice.ts` | Auth state management |
| `lib/auth/ProtectedRoute.tsx` | Route protection logic |
| `components/auth/LoginForm.tsx` | Login UI |
| `.env.local` | API URL configuration |

---

## 🎯 Quick Testing Commands

```bash
# Development
npm run dev

# Production build
npm run build
npm start

# Lint
npm run lint
```

---

## 📞 Need Help?

**Documentation:**
- Implementation Details: `claudedocs/IMPLEMENTATION_SUMMARY.md`
- Backend API: `../backend/claudedocs/authentication-system-analysis.md`
- Full Spec: `claudedocs/frontend-authentication-implementation.md`

**Support:**
- Check Redux DevTools for state issues
- Check browser Network tab for API issues
- Check browser Console for errors
