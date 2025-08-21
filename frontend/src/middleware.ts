import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
// Note: Sign-up is disabled as users are managed by administrators
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/api/public(.*)",
]);

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api/private(.*)",
  "/api/user(.*)",
  "/settings(.*)",
  "/profile(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Get the current path
  const path = req.nextUrl.pathname;
  
  // Check if user is authenticated
  const { userId } = await auth();
  
  // Redirect authenticated users away from sign-in page
  if (userId && path.startsWith('/sign-in')) {
    const url = new URL('/dashboard', req.url);
    return NextResponse.redirect(url);
  }
  
  // Handle home page redirect
  if (path === '/') {
    if (userId) {
      const url = new URL('/dashboard', req.url);
      return NextResponse.redirect(url);
    } else {
      const url = new URL('/sign-in', req.url);
      return NextResponse.redirect(url);
    }
  }
  
  // Protect routes that require authentication
  if (isProtectedRoute(req) && !userId) {
    const url = new URL('/sign-in', req.url);
    return NextResponse.redirect(url);
  }
  
  // Public routes are accessible without authentication
  // All other routes follow the default behavior
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};