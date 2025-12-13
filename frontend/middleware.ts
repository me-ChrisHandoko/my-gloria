/**
 * Next.js Middleware with Clerk Server-Side Authentication
 *
 * SECURITY: This middleware validates authentication tokens on the SERVER
 * using the same CLERK_SECRET_KEY as the backend before allowing page access.
 *
 * This prevents the authentication bypass vulnerability where:
 * - Frontend allows access based on client-side Clerk validation (token structure only)
 * - Backend rejects requests because token signature doesn't match CLERK_SECRET_KEY
 *
 * With this middleware:
 * ✅ Token validated server-side BEFORE page renders
 * ✅ Invalid/expired tokens → redirect to /sign-in
 * ✅ Synchronization with backend authentication
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  // Authentication pages
  '/sign-in(.*)',
  '/sign-up(.*)',

  // Public landing page (if you have one)
  // Uncomment if you want root path to be public
  // '/',
]);

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes without authentication
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protect all other routes - validate token server-side
  // This uses CLERK_SECRET_KEY from environment variables
  // If token is invalid/expired, userId will be null
  const { userId } = await auth();

  if (!userId) {
    // Token validation failed - redirect to sign-in
    console.log('🚫 [Middleware] Authentication failed - redirecting to sign-in');

    const signInUrl = new URL('/sign-in', req.url);

    // Preserve the original URL for redirect after successful login
    signInUrl.searchParams.set('redirect_url', req.url);

    return NextResponse.redirect(signInUrl);
  }

  // Token is valid - allow access
  console.log('✅ [Middleware] Authentication successful for user:', userId);
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',

    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
