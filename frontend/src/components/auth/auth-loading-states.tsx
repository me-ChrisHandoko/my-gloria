/**
 * Auth Loading States Components
 *
 * Comprehensive loading state components for authentication flows.
 * Provides consistent loading UI across the application.
 */

'use client';

import { Loader2, Shield, Lock, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Loading spinner component
 */
export function LoadingSpinner({
  className,
  size = 'default',
}: {
  className?: string;
  size?: 'small' | 'default' | 'large';
}) {
  const sizeClasses = {
    small: 'h-4 w-4',
    default: 'h-6 w-6',
    large: 'h-8 w-8',
  };

  return (
    <Loader2
      className={cn('animate-spin text-muted-foreground', sizeClasses[size], className)}
    />
  );
}

/**
 * Full page loading screen for authentication
 */
export function AuthLoadingScreen({
  message = 'Loading...',
  submessage,
}: {
  message?: string;
  submessage?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        {/* Animated Icon */}
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative rounded-full bg-primary/10 p-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
        </div>

        {/* Loading Text */}
        <div className="space-y-2 text-center">
          <div className="flex items-center gap-2">
            <LoadingSpinner size="small" />
            <p className="text-lg font-medium">{message}</p>
          </div>
          {submessage && (
            <p className="text-sm text-muted-foreground">{submessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Inline loading state for permission checks
 */
export function PermissionLoadingState({
  message = 'Checking permissions...',
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <LoadingSpinner size="small" />
      <span>{message}</span>
    </div>
  );
}

/**
 * Card skeleton for loading user data
 */
export function UserDataSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        {/* Avatar Skeleton */}
        <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />

        {/* Name and Email Skeleton */}
        <div className="space-y-2 flex-1">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-48 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* Additional Info Skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

/**
 * Table row skeleton for loading lists
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <div className="h-4 animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Card skeleton for loading content
 */
export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

/**
 * Loading overlay for in-place loading states
 */
export function LoadingOverlay({
  message = 'Loading...',
  transparent = false,
}: {
  message?: string;
  transparent?: boolean;
}) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex items-center justify-center',
        transparent ? 'bg-background/50' : 'bg-background'
      )}
    >
      <div className="flex flex-col items-center space-y-2">
        <LoadingSpinner size="large" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * Authenticating screen for sign-in process
 */
export function AuthenticatingScreen() {
  return (
    <AuthLoadingScreen
      message="Authenticating..."
      submessage="Please wait while we verify your credentials"
    />
  );
}

/**
 * Loading user context screen
 */
export function LoadingUserContextScreen() {
  return (
    <AuthLoadingScreen
      message="Loading your profile..."
      submessage="Fetching your permissions and settings"
    />
  );
}

/**
 * Verifying permissions screen
 */
export function VerifyingPermissionsScreen() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative rounded-full bg-primary/10 p-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LoadingSpinner size="small" />
          <p className="text-sm text-muted-foreground">
            Verifying permissions...
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Checking access screen
 */
export function CheckingAccessScreen() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative rounded-full bg-primary/10 p-4">
            <UserCheck className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LoadingSpinner size="small" />
          <p className="text-sm text-muted-foreground">Checking access...</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline button loading state
 */
export function ButtonLoading({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LoadingSpinner size="small" />
      {children && <span>{children}</span>}
    </div>
  );
}

/**
 * Skeleton list for loading multiple items
 */
export function SkeletonList({
  count = 3,
  itemComponent: ItemComponent = CardSkeleton,
}: {
  count?: number;
  itemComponent?: React.ComponentType;
}) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ItemComponent key={i} />
      ))}
    </div>
  );
}

/**
 * Loading state for navigation menu
 */
export function NavMenuLoading() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}

/**
 * Loading state for sidebar
 */
export function SidebarLoading() {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header Skeleton */}
      <div className="h-12 animate-pulse rounded-lg bg-muted" />

      {/* Menu Items Skeleton */}
      <div className="flex-1 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
        ))}
      </div>

      {/* Footer Skeleton */}
      <div className="h-16 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
