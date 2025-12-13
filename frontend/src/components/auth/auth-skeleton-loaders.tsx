/**
 * Auth Skeleton Loaders
 *
 * Optimized skeleton loading states for authentication flows.
 * Provides better perceived performance with content-aware placeholders.
 */

'use client';

import { Shield, User } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Sidebar Skeleton Loader
 * Matches the layout of app-sidebar.tsx
 */
export function AuthSidebarSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header Skeleton */}
      <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-muted-foreground/20" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-muted-foreground/20" />
          <div className="h-3 w-24 animate-pulse rounded bg-muted-foreground/20" />
        </div>
      </div>

      {/* Menu Items Skeleton */}
      <div className="flex-1 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-md p-2"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="h-5 w-5 animate-pulse rounded bg-muted-foreground/20" />
            <div className="h-4 flex-1 animate-pulse rounded bg-muted-foreground/20" />
          </div>
        ))}
      </div>

      {/* Footer Skeleton */}
      <div className="rounded-lg bg-muted p-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted-foreground/20" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-muted-foreground/20" />
            <div className="h-2 w-16 animate-pulse rounded bg-muted-foreground/20" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard Header Skeleton
 */
export function AuthDashboardHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between border-b bg-background p-4">
      <div className="flex items-center gap-3">
        <div className="h-6 w-6 animate-pulse rounded bg-muted-foreground/20" />
        <div className="h-5 w-32 animate-pulse rounded bg-muted-foreground/20" />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted-foreground/20" />
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted-foreground/20" />
      </div>
    </div>
  );
}

/**
 * User Profile Card Skeleton
 */
export function AuthUserProfileSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="h-16 w-16 animate-pulse rounded-full bg-muted-foreground/20" />

        {/* Info */}
        <div className="flex-1 space-y-3">
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-muted-foreground/20" />
            <div className="h-4 w-56 animate-pulse rounded bg-muted-foreground/20" />
          </div>

          <div className="flex gap-2">
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted-foreground/20" />
            <div className="h-6 w-24 animate-pulse rounded-full bg-muted-foreground/20" />
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-6 space-y-3 border-t pt-6">
        <div className="flex justify-between">
          <div className="h-4 w-24 animate-pulse rounded bg-muted-foreground/20" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted-foreground/20" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 w-20 animate-pulse rounded bg-muted-foreground/20" />
          <div className="h-4 w-28 animate-pulse rounded bg-muted-foreground/20" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 w-28 animate-pulse rounded bg-muted-foreground/20" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted-foreground/20" />
        </div>
      </div>
    </div>
  );
}

/**
 * Enhanced Loading Screen with Progressive Content
 */
export function AuthProgressiveLoadingScreen({
  stage = 'authenticating',
}: {
  stage?: 'authenticating' | 'fetching' | 'processing' | 'finalizing';
}) {
  const stages = {
    authenticating: {
      icon: Shield,
      title: 'Authenticating...',
      description: 'Verifying your credentials',
      progress: 25,
    },
    fetching: {
      icon: User,
      title: 'Loading profile...',
      description: 'Fetching your user data',
      progress: 50,
    },
    processing: {
      icon: Shield,
      title: 'Processing permissions...',
      description: 'Setting up your access',
      progress: 75,
    },
    finalizing: {
      icon: User,
      title: 'Almost ready...',
      description: 'Preparing your dashboard',
      progress: 90,
    },
  };

  const currentStage = stages[stage];
  const Icon = currentStage.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 px-4">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative rounded-full bg-primary/10 p-6">
              <Icon className="h-16 w-16 text-primary" />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold">{currentStage.title}</h2>
          <p className="text-sm text-muted-foreground">
            {currentStage.description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${currentStage.progress}%` }}
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {currentStage.progress}% complete
          </p>
        </div>

        {/* Stage Indicators */}
        <div className="flex justify-center gap-2">
          {Object.keys(stages).map((key, index) => (
            <div
              key={key}
              className={cn(
                'h-2 w-2 rounded-full transition-colors',
                index <= Object.keys(stages).indexOf(stage)
                  ? 'bg-primary'
                  : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Permissions Loading Skeleton
 */
export function AuthPermissionsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-md border p-3"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="h-4 w-4 animate-pulse rounded bg-muted-foreground/20" />
          <div className="flex-1 space-y-1">
            <div className="h-4 w-32 animate-pulse rounded bg-muted-foreground/20" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted-foreground/20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Modules Navigation Skeleton
 */
export function AuthModulesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border bg-card p-6"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="space-y-4">
            <div className="h-12 w-12 animate-pulse rounded-lg bg-muted-foreground/20" />
            <div className="space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-muted-foreground/20" />
              <div className="h-4 w-full animate-pulse rounded bg-muted-foreground/20" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted-foreground/20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Table Skeleton for Data Tables
 */
export function AuthTableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="rounded-lg border">
      {/* Header */}
      <div className="flex gap-4 border-b bg-muted/50 p-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-4 flex-1 animate-pulse rounded bg-muted-foreground/20"
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 border-b p-4 last:border-0"
          style={{ animationDelay: `${rowIndex * 50}ms` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-4 flex-1 animate-pulse rounded bg-muted-foreground/20"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Full Page Layout Skeleton
 * Combines all auth-related skeletons for initial page load
 */
export function AuthFullPageSkeleton() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="hidden w-64 border-r lg:block">
        <AuthSidebarSkeleton />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <AuthDashboardHeaderSkeleton />

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-muted-foreground/20" />

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border bg-card p-6"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="space-y-4">
                  <div className="h-12 w-12 animate-pulse rounded-lg bg-muted-foreground/20" />
                  <div className="space-y-2">
                    <div className="h-5 w-32 animate-pulse rounded bg-muted-foreground/20" />
                    <div className="h-8 w-20 animate-pulse rounded bg-muted-foreground/20" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <AuthTableSkeleton rows={8} columns={5} />
        </div>
      </div>
    </div>
  );
}
