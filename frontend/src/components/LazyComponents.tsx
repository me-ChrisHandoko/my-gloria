'use client';

import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load heavy components
export const LazyOrganizationHierarchy = lazy(() => 
  import('@/app/(authenticated)/organization/hierarchy/page')
);

export const LazyUserPositions = lazy(() => 
  import('@/app/(authenticated)/organization/user-positions/page')
);

export const LazyPositions = lazy(() => 
  import('@/app/(authenticated)/organization/positions/page')
);

export const LazyDepartments = lazy(() => 
  import('@/app/(authenticated)/organization/departments/page')
);

export const LazySchools = lazy(() => 
  import('@/app/(authenticated)/organization/schools/page')
);

export const LazyPermissions = lazy(() => 
  import('@/app/(authenticated)/permissions/page')
);

export const LazyRoles = lazy(() => 
  import('@/app/(authenticated)/roles/page')
);

// Reusable loading fallback
const PageSkeleton = () => (
  <div className="container mx-auto p-4 space-y-4">
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
    <Skeleton className="h-96 w-full" />
  </div>
);

// HOC for lazy loading with consistent loading UI
export function withLazyLoading<T extends object>(Component: React.ComponentType<T>) {
  const LazyComponent = (props: T) => (
    <Suspense fallback={<PageSkeleton />}>
      <Component {...props} />
    </Suspense>
  );

  LazyComponent.displayName = `withLazyLoading(${Component.displayName || Component.name})`;
  return LazyComponent;
}