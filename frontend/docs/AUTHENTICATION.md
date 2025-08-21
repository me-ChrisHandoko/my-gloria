# Authentication Setup - YPK Gloria Internal System

## Overview
This application uses Clerk for authentication with **admin-managed users only**. There is no self-registration (sign-up) functionality as this is an internal office application.

## User Management

### For Administrators
Users must be created and managed through the Clerk Dashboard:

1. Log in to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to "Users" section
3. Click "Create user" to add new employees
4. Set user credentials and send invitation emails

### For Users
- Access the application at the designated URL
- Sign in with credentials provided by your administrator
- Contact your administrator if you need account access or password reset

## Authentication Flow

### Sign In Process
1. Users navigate to the application
2. Unauthenticated users are redirected to `/sign-in`
3. After successful authentication, users are redirected to `/dashboard`

### Protected Routes
The following routes require authentication:
- `/dashboard/*` - Main application interface
- `/api/user/*` - User-specific API endpoints
- `/api/private/*` - Protected API endpoints
- `/settings/*` - Application settings
- `/profile/*` - User profile pages

### Public Routes
- `/` - Home page (redirects to sign-in if not authenticated)
- `/sign-in` - Authentication page
- `/api/public/*` - Public API endpoints

## Security Notes

1. **No Self-Registration**: Sign-up functionality is intentionally disabled
2. **Admin Control**: All user accounts must be created by administrators
3. **Environment Variables**: Sensitive keys are stored in `.env.local` (never commit this file)
4. **Middleware Protection**: Routes are protected at the middleware level for security

## Troubleshooting

### Common Issues

1. **"Cannot access the application"**
   - Contact your administrator to create an account for you

2. **"Forgot password"**
   - Use the "Forgot password?" link on the sign-in page
   - Or contact your administrator for a password reset

3. **"Account locked"**
   - Contact your administrator to unlock your account

## Technical Implementation

### Key Files
- `src/middleware.ts` - Route protection and authentication checks
- `src/app/layout.tsx` - ClerkProvider setup and authentication UI
- `src/components/nav-user.tsx` - User menu with account management
- `.env.local` - Clerk API keys (not in version control)

### Disabled Features
- Sign-up routes and pages have been removed
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` environment variable removed
- Sign-up route matching in middleware disabled

## Contact
For account access or authentication issues, please contact your system administrator.