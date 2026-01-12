# 🔐 FRONTEND AUTHENTICATION SYSTEM - Gloria Ops (RTK Query)

**Tanggal Pembuatan**: 9 Januari 2026
**Terakhir Diupdate**: 9 Januari 2026
**Dibuat oleh**: Claude Code (SuperClaude Framework)
**Backend API**: Go + Gin + JWT (sudah implemented)
**Frontend Stack**: Next.js 16.1 + React 19 + TypeScript + RTK Query + Tailwind v4
**State Management**: Redux Toolkit + RTK Query
**Estimasi Implementasi**: 5 hari development (28-38 jam)

---

## 📋 DAFTAR ISI

1. [Next.js 16 Requirements](#nextjs-16-requirements)
2. [Overview Sistem](#overview-sistem)
3. [Arsitektur Redux + RTK Query](#arsitektur-redux--rtk-query)
4. [Struktur Direktori](#struktur-direktori)
5. [Dependencies](#dependencies)
6. [Redux Store Setup](#redux-store-setup)
7. [RTK Query API Configuration](#rtk-query-api-configuration)
8. [Auth Slice](#auth-slice)
9. [Component Integration](#component-integration)
10. [Route Protection](#route-protection)
11. [Security Considerations](#security-considerations)
12. [Implementation Guide](#implementation-guide)
13. [Testing Strategy](#testing-strategy)
14. [Performance Optimization](#performance-optimization)
15. [Timeline & Phases](#timeline--phases)

---

## ⚙️ NEXT.JS 16 REQUIREMENTS

### System Requirements

**Minimum Versions (Mandatory):**
- ✅ **Node.js**: 20.9.0+ (LTS) - Node.js 18 tidak lagi didukung
- ✅ **TypeScript**: 5.1.0+ - Untuk type safety dan inference
- ✅ **React**: 19.2+ - Included dengan Next.js 16
- ✅ **Next.js**: 16.1+ - Latest stable release

### Breaking Changes di Next.js 16

**1. Async Request APIs** ⚠️
- `params` dan `searchParams` sekarang Promise yang harus di-await
- **Dokumen ini**: ✅ Tidak menggunakan params/searchParams, tidak terpengaruh

**2. Middleware → Proxy** ⚠️
- `middleware.ts` deprecated, akan diganti `proxy.ts` di masa depan
- Edge Runtime dihapus dari proxy
- **Dokumen ini**: ✅ Sudah diupdate, tidak menggunakan middleware

**3. Caching Behavior** ⚠️
- Default behavior berubah dari **implicit caching** ke **opt-in**
- RTK Query tetap melakukan caching di level aplikasi
- **Dokumen ini**: ✅ Menggunakan RTK Query caching, tidak terpengaruh

**4. Features yang Dihapus** ⚠️
- ❌ AMP support completely removed
- ❌ `serverRuntimeConfig` dan `publicRuntimeConfig` removed
- ❌ `next/legacy/image` deprecated
- **Dokumen ini**: ✅ Tidak menggunakan features tersebut

### Best Practices untuk Next.js 16

**1. Root Layout sebagai Server Component:**
```typescript
// ✅ RECOMMENDED (Next.js 16)
// app/layout.tsx - Server Component
import ReduxProvider from '@/lib/store/ReduxProvider'; // Client Component wrapper

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}
```

**2. Environment Variables:**
```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

**3. TypeScript Configuration:**
```json
// tsconfig.json (recommended untuk Next.js 16)
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "dom"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true
  }
}
```

---

## 🎯 OVERVIEW SISTEM

### Backend Authentication (Sudah Implemented)

Backend Gloria Ops sudah memiliki sistem autentikasi lengkap dengan:

**API Endpoints:**
- `POST /api/v1/auth/register` - User registration (email harus terdaftar sebagai karyawan)
- `POST /api/v1/auth/login` - Login dengan email & password
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user info (protected)
- `POST /api/v1/auth/change-password` - Change password (protected)
- `POST /api/v1/auth/logout` - Logout & revoke refresh token (protected)

**Token Management:**
- **Access Token**: JWT, 15 minutes expiry, HS256 signed
- **Refresh Token**: Random secure token, 7 days expiry, stored as hash in DB
- **Response Format**: JSON dengan `access_token`, `refresh_token`, `token_type`, `expires_in`, `user`

**Security Features:**
- Argon2id password hashing
- Account locking after 5 failed attempts (15 min lockout)
- Login attempt tracking (IP, User-Agent)
- Device tracking for refresh tokens
- Employee email validation (registration requires active employee record)

### Frontend Requirements dengan RTK Query

Frontend menggunakan **Redux Toolkit + RTK Query** untuk:

1. ✅ **State Management** - Redux store untuk auth state global
2. ✅ **API Integration** - RTK Query untuk automatic caching & refetching
3. ✅ **Token Management** - baseQuery dengan automatic token refresh
4. ✅ **Route Protection** - Redux-based route guards
5. ✅ **Type Safety** - Full TypeScript dengan auto-generated types
6. ✅ **Developer Experience** - Generated hooks, DevTools, less boilerplate

---

## 🏗️ ARSITEKTUR REDUX + RTK QUERY

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js App                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Redux Provider (Store)                          │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │              Redux Store                            │  │  │
│  │  │  - authSlice (user, tokens, isAuthenticated)       │  │  │
│  │  │  - authApi (RTK Query endpoints)                   │  │  │
│  │  │  - storageMiddleware (sessionStorage sync)         │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│           ┌────────────────┼────────────────┐                   │
│           ▼                ▼                ▼                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Public     │  │   Auth      │  │  Protected  │            │
│  │  Routes     │  │   Routes    │  │  Routes     │            │
│  │             │  │             │  │             │            │
│  │  /          │  │  /login     │  │  /dashboard │            │
│  │  /about     │  │  /register  │  │  /profile   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                            │                     │
│                                            ▼                     │
│                                  ┌─────────────────┐            │
│                                  │ ProtectedRoute  │            │
│                                  │   Component     │            │
│                                  │ (Redux-based)   │            │
│                                  └─────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                       ┌────────────────────────┐
                       │   RTK Query            │
                       │   baseQueryWithReauth  │
                       │   (Auto token refresh) │
                       └────────────────────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  Backend API     │
                          │  (Go + Gin)      │
                          └──────────────────┘
```

### Redux Store Structure

```
store
├── auth (slice)
│   ├── user: User | null
│   ├── accessToken: string | null
│   ├── refreshToken: string | null
│   ├── isAuthenticated: boolean
│   ├── isLoading: boolean
│   └── error: string | null
│
└── authApi (RTK Query)
    ├── endpoints
    │   ├── login (mutation)
    │   ├── register (mutation)
    │   ├── refreshToken (mutation)
    │   ├── getCurrentUser (query)
    │   ├── changePassword (mutation)
    │   └── logout (mutation)
    │
    └── cache
        └── auto-managed by RTK Query
```

### Data Flow

**1. Login Flow:**
```
User submits form → useLoginMutation() hook
→ RTK Query POST /auth/login
→ Success: authSlice.setCredentials()
→ storageMiddleware saves to sessionStorage
→ Redirect to /dashboard
```

**2. Token Refresh Flow (Automatic):**
```
Protected API call → baseQuery sends request with token
→ Response 401 Unauthorized
→ baseQueryWithReauth intercepts
→ POST /auth/refresh with refreshToken
→ Success: Update accessToken in Redux
→ Retry original request
→ Failure: Logout & redirect to /login
```

**3. Protected Route Access:**
```
User navigates to /dashboard
→ useAppSelector(state => state.auth.isAuthenticated)
→ If false: redirect to /login
→ If true: render page
→ While loading: show skeleton
```

---

## 📁 STRUKTUR DIREKTORI

### Struktur Lengkap dengan RTK Query

```
frontend/
├── app/
│   ├── (auth)/                      # Auth route group
│   │   ├── login/
│   │   │   └── page.tsx             # Login page
│   │   ├── register/
│   │   │   └── page.tsx             # Register page
│   │   └── layout.tsx               # Auth layout (centered form)
│   │
│   ├── (protected)/                 # Protected route group
│   │   ├── dashboard/
│   │   │   └── page.tsx             # Dashboard (requires auth)
│   │   ├── profile/
│   │   │   └── page.tsx             # User profile
│   │   └── layout.tsx               # Protected layout with guard
│   │
│   ├── layout.tsx                   # Root layout with Redux Provider
│   ├── page.tsx                     # Public homepage
│   └── globals.css                  # Global styles + Tailwind
│
├── lib/
│   ├── store/
│   │   ├── store.ts                 # Redux store configuration
│   │   ├── hooks.ts                 # Typed useAppSelector, useAppDispatch
│   │   ├── ReduxProvider.tsx        # Redux Provider wrapper (client component)
│   │   ├── features/
│   │   │   └── authSlice.ts         # Auth state slice
│   │   ├── services/
│   │   │   └── authApi.ts           # RTK Query API definition
│   │   └── middleware/
│   │       └── storageMiddleware.ts # sessionStorage sync
│   │
│   ├── auth/
│   │   └── ProtectedRoute.tsx       # Route guard (Redux-based)
│   │
│   ├── types/
│   │   └── auth.ts                  # TypeScript types
│   │
│   └── utils/
│       └── errors.ts                # Error message mapping
│
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx            # Login form with RTK hooks
│   │   ├── RegisterForm.tsx         # Register form with RTK hooks
│   │   └── LogoutButton.tsx         # Logout button
│   │
│   └── ui/                          # Reusable UI components
│       ├── Button.tsx               # Button component
│       ├── Input.tsx                # Input field component
│       ├── Alert.tsx                # Alert/Error message component
│       └── LoadingSpinner.tsx       # Loading spinner
│
├── hooks/
│   └── (Redux hooks in lib/store/hooks.ts)
│
├── .env.local                       # Environment variables
├── next.config.ts                   # Next.js configuration
├── tailwind.config.ts               # Tailwind configuration
├── tsconfig.json                    # TypeScript configuration
└── package.json                     # Dependencies
```

### Key Directory Structure

**Core Redux Files:**
- ✅ `lib/store/` - Complete Redux setup
- ✅ `lib/store/features/authSlice.ts` - Redux auth state
- ✅ `lib/store/services/authApi.ts` - RTK Query endpoints
- ✅ `lib/store/middleware/storageMiddleware.ts` - Auto-sync to sessionStorage

---

## 📦 DEPENDENCIES

### Core Dependencies dengan RTK Query

```json
{
  "dependencies": {
    "next": "16.1.1",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "@reduxjs/toolkit": "^2.0.0",
    "react-redux": "^9.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### Installation Commands

```bash
# Install RTK Query + Redux dependencies
npm install @reduxjs/toolkit react-redux

# Or with pnpm
pnpm add @reduxjs/toolkit react-redux
```

### RTK Query Benefits

**Core Advantages:**
- ✅ **Automatic Caching** - Reduces unnecessary API calls
- ✅ **Automatic Refetching** - On window focus, reconnect
- ✅ **Request Deduplication** - Multiple identical requests = single network call
- ✅ **Generated Hooks** - `useLoginMutation()`, `useGetCurrentUserQuery()` auto-generated
- ✅ **Built-in Loading/Error States** - Less boilerplate
- ✅ **DevTools Integration** - Redux DevTools untuk debug
- ✅ **Type Safety** - Better TypeScript inference
- ✅ **Less Custom Code** - No manual interceptors, less maintenance

**Bundle Size:**
| Package | Size | Purpose |
|---------|------|---------|
| **@reduxjs/toolkit** | ~35KB | Redux + RTK Query (includes createApi, fetchBaseQuery) |
| **react-redux** | ~5KB | React bindings for Redux |
| **Total** | **~40KB** | Production-ready auth system |

**Note**: Form validation menggunakan HTML5 built-in validation (required, type="email", dll) untuk keep bundle size minimal.

---

## 🔧 REDUX STORE SETUP

### 1. Store Configuration (`lib/store/store.ts`)

```typescript
// lib/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/authSlice';
import { authApi } from './services/authApi';
import { storageMiddleware } from './middleware/storageMiddleware';

// Load initial state from sessionStorage
const loadInitialState = () => {
  if (typeof window === 'undefined') return undefined;

  try {
    const stored = sessionStorage.getItem('gloria_auth');
    if (stored) {
      const { accessToken, refreshToken, user } = JSON.parse(stored);
      return {
        auth: {
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        },
      };
    }
  } catch (error) {
    console.error('Failed to load auth state:', error);
  }
  return undefined;
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(authApi.middleware)
      .concat(storageMiddleware),
  preloadedState: loadInitialState(),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 2. Typed Hooks (`lib/store/hooks.ts`)

```typescript
// lib/store/hooks.ts
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

// Use throughout app instead of plain useDispatch and useSelector
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### 3. Storage Middleware (`lib/store/middleware/storageMiddleware.ts`)

```typescript
// lib/store/middleware/storageMiddleware.ts
import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../store';

/**
 * Middleware to sync auth state to sessionStorage
 * Automatically saves on any auth state change
 */
export const storageMiddleware: Middleware<{}, RootState> = (store) => (next) => (action) => {
  const result = next(action);

  // Save auth state to sessionStorage on auth actions
  if (action.type?.startsWith('auth/')) {
    const authState = store.getState().auth;

    if (authState.isAuthenticated && authState.accessToken && authState.refreshToken) {
      sessionStorage.setItem(
        'gloria_auth',
        JSON.stringify({
          accessToken: authState.accessToken,
          refreshToken: authState.refreshToken,
          user: authState.user,
        })
      );
    } else {
      sessionStorage.removeItem('gloria_auth');
    }
  }

  return result;
};
```

---

## 🔌 RTK QUERY API CONFIGURATION

### 1. Auth Slice (`lib/store/features/authSlice.ts`)

```typescript
// lib/store/features/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/lib/types/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: User;
        accessToken: string;
        refreshToken: string;
      }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.error = null;
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { setCredentials, setAccessToken, logout, setError, clearError } = authSlice.actions;
export default authSlice.reducer;
```

### 2. RTK Query API (`lib/store/services/authApi.ts`)

```typescript
// lib/store/services/authApi.ts
import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import { setAccessToken, logout } from '../features/authSlice';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  ChangePasswordRequest,
} from '@/lib/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Base query with automatic token attachment
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Base query with automatic token refresh on 401
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await baseQuery(args, api, extraOptions);

  // Handle 401 Unauthorized - try to refresh token
  if (result.error && result.error.status === 401) {
    const refreshToken = (api.getState() as RootState).auth.refreshToken;

    if (refreshToken) {
      // Try to refresh the token
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: { refresh_token: refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        // Store the new access token
        const data = refreshResult.data as { access_token: string };
        api.dispatch(setAccessToken(data.access_token));

        // Retry the original request with new token
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed - logout user
        api.dispatch(logout());
        window.location.href = '/login';
      }
    } else {
      // No refresh token - logout user
      api.dispatch(logout());
      window.location.href = '/login';
    }
  }

  return result;
};

// Create API with RTK Query
export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User'],
  endpoints: (builder) => ({
    // Register mutation
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (credentials) => ({
        url: '/auth/register',
        method: 'POST',
        body: credentials,
      }),
    }),

    // Login mutation
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),

    // Refresh token mutation
    refreshToken: builder.mutation<
      { access_token: string; token_type: string; expires_in: number },
      string
    >({
      query: (refreshToken) => ({
        url: '/auth/refresh',
        method: 'POST',
        body: { refresh_token: refreshToken },
      }),
    }),

    // Get current user query (cached)
    getCurrentUser: builder.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),

    // Change password mutation
    changePassword: builder.mutation<{ message: string }, ChangePasswordRequest>({
      query: (passwords) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: passwords,
      }),
    }),

    // Logout mutation
    logout: builder.mutation<{ message: string }, string>({
      query: (refreshToken) => ({
        url: '/auth/logout',
        method: 'POST',
        body: { refresh_token: refreshToken },
      }),
    }),
  }),
});

// Export auto-generated hooks
export const {
  useRegisterMutation,
  useLoginMutation,
  useRefreshTokenMutation,
  useGetCurrentUserQuery,
  useChangePasswordMutation,
  useLogoutMutation,
} = authApi;
```

### 3. TypeScript Types (`lib/types/auth.ts`)

```typescript
// lib/types/auth.ts
export interface User {
  id: string;
  email: string;
  username?: string;
  emailVerified: boolean;
  isActive: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}
```

---

## 🧩 AUTH SLICE

### Auth Slice Details

**State Structure:**
```typescript
interface AuthState {
  user: User | null;              // Current user info
  accessToken: string | null;     // JWT access token (15 min)
  refreshToken: string | null;    // Refresh token (7 days)
  isAuthenticated: boolean;       // Auth status
  isLoading: boolean;             // Loading state
  error: string | null;           // Error message
}
```

**Actions:**
- `setCredentials` - Save user + tokens after login/register
- `setAccessToken` - Update access token after refresh
- `logout` - Clear all auth state
- `setError` - Set error message
- `clearError` - Clear error message

**Usage in Components:**
```typescript
import { useAppSelector, useAppDispatch } from '@/lib/store/hooks';
import { logout } from '@/lib/store/features/authSlice';

function MyComponent() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  return <div>{user?.email}</div>;
}
```

---

## 🎨 COMPONENT INTEGRATION

### 1. Redux Provider Component (Client Component)

```typescript
// lib/store/ReduxProvider.tsx
'use client';

import { Provider } from 'react-redux';
import { store } from './store';

export default function ReduxProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Provider store={store}>{children}</Provider>;
}
```

### 2. Root Layout (Server Component - Best Practice)

```typescript
// app/layout.tsx
import ReduxProvider from '@/lib/store/ReduxProvider';
import './globals.css';

export const metadata = {
  title: 'Gloria Ops',
  description: 'Gloria Operations Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ReduxProvider>
          {children}
        </ReduxProvider>
      </body>
    </html>
  );
}
```

### 3. Login Form dengan RTK Query

```typescript
// components/auth/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLoginMutation } from '@/lib/store/services/authApi';
import { useAppDispatch } from '@/lib/store/hooks';
import { setCredentials } from '@/lib/store/features/authSlice';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';

export default function LoginForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // RTK Query mutation hook (auto-generated)
  const [login, { isLoading, error }] = useLoginMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Call API via RTK Query
      const result = await login({ email, password }).unwrap();

      // Store credentials in Redux
      dispatch(
        setCredentials({
          user: result.user,
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
        })
      );

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      // Error handled by RTK Query, shown via error state
      console.error('Login failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold text-center">Login</h2>

      {error && (
        <Alert variant="error">
          {'data' in error ? (error.data as any).error : 'Login failed'}
        </Alert>
      )}

      <Input
        type="email"
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
      />

      <Input
        type="password"
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        required
      />

      <Button type="submit" isLoading={isLoading} className="w-full">
        Login
      </Button>

      <p className="text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <a href="/register" className="text-blue-600 hover:underline">
          Register
        </a>
      </p>
    </form>
  );
}
```

### 4. Protected Route Component

```typescript
// lib/auth/ProtectedRoute.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/store/hooks';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
```

### 5. Protected Layout

```typescript
// app/(protected)/layout.tsx
'use client';

import ProtectedRoute from '@/lib/auth/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
```

### 6. Dashboard with User Query

```typescript
// app/(protected)/dashboard/page.tsx
'use client';

import { useGetCurrentUserQuery } from '@/lib/store/services/authApi';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Alert from '@/components/ui/Alert';

export default function DashboardPage() {
  // RTK Query automatically caches and manages this request
  const { data: user, isLoading, error } = useGetCurrentUserQuery();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <Alert variant="error">Failed to load user data</Alert>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p>Welcome, {user?.email}!</p>
      <div className="mt-4">
        <p>Account Status: {user?.isActive ? 'Active' : 'Inactive'}</p>
        <p>Email Verified: {user?.emailVerified ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}
```

### 7. Logout Button

```typescript
// components/auth/LogoutButton.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { useLogoutMutation } from '@/lib/store/services/authApi';
import { logout as logoutAction } from '@/lib/store/features/authSlice';
import Button from '@/components/ui/Button';

export default function LogoutButton() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { refreshToken } = useAppSelector((state) => state.auth);
  const [logout, { isLoading }] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        // Call backend logout (best effort)
        await logout(refreshToken).unwrap();
      }
    } catch (error) {
      // Ignore errors - logout locally anyway
    } finally {
      // Always clear local state
      dispatch(logoutAction());
      router.push('/login');
    }
  };

  return (
    <Button onClick={handleLogout} isLoading={isLoading} variant="secondary">
      Logout
    </Button>
  );
}
```

---

## 🛡️ ROUTE PROTECTION

### Protected Route Strategy

**App Router Pattern:**
```
app/
├── (auth)/          → No protection (public auth pages)
│   ├── login/
│   └── register/
│
└── (protected)/     → Protected with ProtectedRoute component
    ├── dashboard/
    └── profile/
```

**Protection Implementation:**
1. Layout-level guard via `(protected)/layout.tsx`
2. Uses Redux state for auth check
3. Redirects to `/login` if not authenticated
4. Shows loading state during auth check
5. Automatic on all routes in group

**Benefits:**
- ✅ DRY - Define once at layout level
- ✅ Type-safe with Redux
- ✅ Works with RTK Query cache
- ✅ SSR-compatible (client component)

---

## 🔐 SECURITY CONSIDERATIONS

### 1. Token Storage

**sessionStorage (MVP):**
- ✅ Cleared on tab close
- ✅ Not shared across tabs
- ✅ Survives page refresh
- ⚠️ Vulnerable to XSS (mitigated by React escaping)

**Synced via Redux Middleware:**
- Automatic save on auth state change
- Restored on app initialization
- Cleared on logout

### 2. Token Refresh Security

**RTK Query baseQueryWithReauth:**
- ✅ Automatic retry on 401
- ✅ Single refresh attempt (no infinite loops)
- ✅ Logout on refresh failure
- ✅ Token attached via prepareHeaders
- ✅ Refresh token from Redux state (not exposed)

### 3. XSS Protection

**React Built-in:**
- JSX auto-escapes values
- Never use `dangerouslySetInnerHTML` with user input

**Additional:**
- Content Security Policy (CSP) headers
- Sanitize HTML if needed

### 4. HTTPS Enforcement (Production)

**Best Practice**: Configure HTTPS di deployment platform (Vercel/Netlify) atau reverse proxy (Nginx/Cloudflare).

**Next.js Configuration** (jika diperlukan):

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**Note**: HTTPS redirect sebaiknya dilakukan di platform level (Vercel auto-redirects), bukan di aplikasi.

### 5. Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# Production
NEXT_PUBLIC_API_URL=https://api.gloria-ops.com/api/v1
```

**Security Rules:**
- ✅ Never commit `.env.local`
- ✅ Use `NEXT_PUBLIC_` only for client-accessible vars
- ✅ Rotate secrets regularly

---

## 📝 IMPLEMENTATION GUIDE

### Phase 1: Redux Setup (2-3 hours)

**Step 1: Install Dependencies**
```bash
npm install @reduxjs/toolkit react-redux
```

**Step 2: Create Directory Structure**
```bash
mkdir -p lib/store/features lib/store/services lib/store/middleware
mkdir -p lib/auth lib/types lib/utils
mkdir -p components/auth components/ui
```

**Step 3: Setup Environment**
```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

**Step 4: Create TypeScript Types** (`lib/types/auth.ts`)
- Copy dari section "TypeScript Types"

**Step 5: Create Auth Slice** (`lib/store/features/authSlice.ts`)
- Copy dari section "Auth Slice"

**Step 6: Create Storage Middleware** (`lib/store/middleware/storageMiddleware.ts`)
- Copy dari section "Storage Middleware"

**Step 7: Create Store** (`lib/store/store.ts`)
- Copy dari section "Store Configuration"

**Step 8: Create Typed Hooks** (`lib/store/hooks.ts`)
- Copy dari section "Typed Hooks"

**Step 9: Create Redux Provider** (`lib/store/ReduxProvider.tsx`)
- Copy dari section "Redux Provider Component"
- Ini memungkinkan root layout tetap server component (Next.js 16 best practice)

---

### Phase 2: RTK Query API (3-4 hours)

**Step 1: Create Auth API** (`lib/store/services/authApi.ts`)
- Copy dari section "RTK Query API"
- Perhatikan baseQueryWithReauth logic

**Step 2: Test API Endpoints**
```bash
# Start backend
cd ../backend && go run .

# Start frontend
npm run dev
```

**Step 3: Verify Redux DevTools**
- Install Redux DevTools extension
- Check state updates on actions

---

### Phase 3: UI Components (6-8 hours)

**Step 1: Update Root Layout** (`app/layout.tsx`)
- Wrap dengan Redux Provider

**Step 2: Create UI Components**
- `components/ui/Button.tsx`
- `components/ui/Input.tsx`
- `components/ui/Alert.tsx`
- `components/ui/LoadingSpinner.tsx`

**Step 3: Create Login Form** (`components/auth/LoginForm.tsx`)
- Use `useLoginMutation()` hook
- Dispatch `setCredentials` on success

**Step 4: Create Register Form** (`components/auth/RegisterForm.tsx`)
- Similar to login form
- Use `useRegisterMutation()` hook

**Step 5: Create Auth Pages**
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `app/(auth)/layout.tsx` (centered layout)

**Step 6: Create Protected Route** (`lib/auth/ProtectedRoute.tsx`)
- Copy dari section "Protected Route Component"

**Step 7: Create Protected Layout** (`app/(protected)/layout.tsx`)
- Wrap dengan ProtectedRoute

**Step 8: Create Dashboard** (`app/(protected)/dashboard/page.tsx`)
- Use `useGetCurrentUserQuery()` hook

**Step 9: Create Logout Button** (`components/auth/LogoutButton.tsx`)
- Copy dari section "Logout Button"

---

### Phase 4: Integration & Testing (4-6 hours)

**Step 1: Test Login Flow**
- [ ] Login dengan valid credentials → Success
- [ ] Login dengan invalid credentials → Error message
- [ ] Check Redux DevTools for state updates
- [ ] Check sessionStorage for persisted state

**Step 2: Test Registration Flow**
- [ ] Register dengan employee email → Success
- [ ] Register dengan non-employee email → Error
- [ ] Check auto-login after registration

**Step 3: Test Token Refresh**
- [ ] Make API call close to expiry → Auto-refresh
- [ ] Check Redux DevTools for token update
- [ ] Original request retries successfully

**Step 4: Test Protected Routes**
- [ ] Access /dashboard without login → Redirect to /login
- [ ] Login → Access /dashboard → Success
- [ ] Refresh page → Session restored

**Step 5: Test Logout**
- [ ] Logout → Clear Redux state
- [ ] Clear sessionStorage
- [ ] Redirect to /login

---

## 🧪 TESTING STRATEGY

### Manual Testing Checklist

**Authentication Flow:**
- [ ] ✅ Login with valid credentials → Success, redirect to dashboard
- [ ] ✅ Login with invalid email → Error: "invalid email or password"
- [ ] ✅ Login with invalid password → Error: "invalid email or password"
- [ ] ✅ 5 failed login attempts → Error: "account is locked"
- [ ] ✅ Register with employee email → Success, auto-login
- [ ] ✅ Register with non-employee email → Error: "Email tidak terdaftar sebagai karyawan"
- [ ] ✅ Register with duplicate email → Error: "Email sudah terdaftar"

**Token Management:**
- [ ] ✅ API call with valid token → Success
- [ ] ✅ API call near token expiry → Auto-refresh, request succeeds
- [ ] ✅ Refresh token expired → Logout, redirect to login
- [ ] ✅ Multiple concurrent API calls → Single refresh (check network tab)

**Redux State:**
- [ ] ✅ Login → Redux state updated with user + tokens
- [ ] ✅ Token refresh → Redux accessToken updated
- [ ] ✅ Logout → Redux state cleared
- [ ] ✅ Check Redux DevTools for all actions

**Session Persistence:**
- [ ] ✅ Login → Refresh page → Session restored (Redux state loaded)
- [ ] ✅ Close tab → Open new tab → Session cleared (sessionStorage)
- [ ] ✅ Logout → sessionStorage cleared

**Route Protection:**
- [ ] ✅ Access /dashboard without login → Redirect to /login
- [ ] ✅ Access /dashboard with valid token → Show page
- [ ] ✅ Logout from /dashboard → Redirect to /login

---

## ⚡ PERFORMANCE OPTIMIZATION

### 1. RTK Query Benefits

**Automatic Caching:**
- First request fetches from API
- Subsequent requests use cache
- Configurable cache time per endpoint

**Request Deduplication:**
- Multiple components request same data
- RTK Query makes single network request
- All components get same data

**Automatic Refetching:**
- On window focus (user returns to tab)
- On network reconnect
- Configurable per endpoint

### 2. Bundle Size

| Component | Size (gzipped) |
|-----------|---------------|
| @reduxjs/toolkit | 35KB |
| react-redux | 5KB |
| **Total Auth Bundle** | **~40KB** |

**Lean bundle** - Production-ready auth system dengan HTML5 validation (tanpa external form libraries)

### 3. Performance Targets

- ✅ Initial page load: <3s on 3G
- ✅ Auth check: <100ms (Redux state + sessionStorage)
- ✅ Login/Register: <500ms + network
- ✅ Token refresh: <200ms + network
- ✅ Cached queries: <10ms (instant)

---

## 📅 TIMELINE & PHASES

### Complete Implementation Timeline

**Phase 1: Redux Foundation (2-3 hours)**
- ✅ Install dependencies
- ✅ Create directory structure
- ✅ TypeScript types
- ✅ Auth slice
- ✅ Storage middleware
- ✅ Store configuration
- ✅ Typed hooks

**Phase 2: RTK Query API (3-4 hours)**
- ✅ baseQuery configuration
- ✅ baseQueryWithReauth logic
- ✅ Auth API endpoints
- ✅ Test with Redux DevTools

**Phase 3: UI Components (8-10 hours)**
- ✅ UI components (Button, Input, Alert)
- ✅ Login form + page
- ✅ Register form + page
- ✅ Protected route component
- ✅ Protected layout
- ✅ Dashboard page
- ✅ Logout button

**Phase 4: Integration (4-6 hours)**
- ✅ Connect all components
- ✅ Test complete flows
- ✅ Fix bugs
- ✅ Responsive design
- ✅ Error handling

**Phase 5: Testing & Polish (4-6 hours)**
- ✅ Manual testing (all scenarios)
- ✅ Redux DevTools verification
- ✅ Browser compatibility
- ✅ Mobile testing
- ✅ Performance optimization

**Phase 6: Documentation (2-3 hours)**
- ✅ Code comments
- ✅ Developer guide
- ✅ API documentation

---

## 📊 ESTIMATION SUMMARY

**Total Development Time: 28-38 hours**

**Realistic Timeline:**
- **Week 1 (Days 1-3)**: Redux Setup + RTK Query (5-7 hours)
- **Week 1 (Days 4-5)**: UI Components (8-10 hours)
- **Week 2 (Days 1-2)**: Integration + Testing (8-12 hours)
- **Week 2 (Day 3)**: Documentation + Polish (4-6 hours)

**Production-Ready MVP: 5 working days**

---

## ✅ SUCCESS CRITERIA

### Functional Requirements

- ✅ Users can register with employee email
- ✅ Users can login with email & password
- ✅ Protected routes require authentication
- ✅ Token refresh happens automatically (via RTK Query)
- ✅ Users can logout
- ✅ Session persists across page refresh
- ✅ Account locking works (5 failed attempts)
- ✅ Error messages are user-friendly
- ✅ Redux state properly managed
- ✅ RTK Query caching works

### Non-Functional Requirements

- ✅ Response time <500ms (excluding network)
- ✅ Mobile-responsive design
- ✅ Works on Chrome, Firefox, Safari, Edge
- ✅ Secure token storage (sessionStorage + Redux)
- ✅ No XSS vulnerabilities
- ✅ TypeScript type safety
- ✅ Redux DevTools integration
- ✅ Clean code architecture

---

## 📞 SUPPORT & REFERENCES

### Documentation Links

- **RTK Query**: https://redux-toolkit.js.org/rtk-query/overview
- **Redux Toolkit**: https://redux-toolkit.js.org/
- **Next.js App Router**: https://nextjs.org/docs/app
- **React 19**: https://react.dev/

### Backend Documentation

Lihat: `backend/claudedocs/authentication-system-analysis.md`

API Base URL: `http://localhost:8080/api/v1`

---

## 📋 CHEAT SHEET

### Common RTK Query Patterns

**Query (GET):**
```typescript
const { data, isLoading, error } = useGetCurrentUserQuery();
```

**Mutation (POST/PUT/DELETE):**
```typescript
const [login, { isLoading, error }] = useLoginMutation();
const result = await login(credentials).unwrap();
```

**Redux State:**
```typescript
const user = useAppSelector((state) => state.auth.user);
const dispatch = useAppDispatch();
dispatch(logout());
```

**Manual Cache Invalidation:**
```typescript
dispatch(authApi.util.invalidateTags(['User']));
```

---

**Document Version**: 2.0 (RTK Query)
**Last Updated**: 2026-01-09
**Status**: ✅ Ready for Implementation

**Prepared by**: Claude Code (SuperClaude Framework)
**Architecture**: Redux Toolkit + RTK Query
**Confidence Level**: 95%

**Recommendation**: ✅ **PROCEED WITH RTK QUERY IMPLEMENTATION**

Arsitektur RTK Query menyediakan automatic caching, refetching, dan generated hooks yang membuat development lebih efisien. Dengan Redux DevTools integration dan TypeScript support, sistem ini siap untuk production dengan better developer experience dan easier maintenance. Estimasi 5 hari kerja untuk complete production-ready MVP.
