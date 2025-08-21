'use client';

import { useEffect } from 'react';
import { organizationApi } from '@/store/api/organizationApi';
import { useAppDispatch } from '@/store/hooks';

/**
 * Custom hook to prefetch hierarchy data for better performance
 * @param prefetchUser - Whether to prefetch user hierarchy data
 * @param userId - User ID for prefetching user-specific hierarchy
 */
export function useHierarchyPrefetch(prefetchUser = false, userId?: string) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Prefetch organization hierarchy
    const prefetchOrgHierarchy = dispatch(
      organizationApi.endpoints.getOrganizationHierarchy.initiate(
        { includeInactive: false },
        { subscribe: false, forceRefetch: false }
      )
    );

    // Prefetch user hierarchy if requested
    let prefetchUserHierarchy: any;
    if (prefetchUser && userId) {
      prefetchUserHierarchy = dispatch(
        organizationApi.endpoints.getUserHierarchy.initiate(
          userId,
          { subscribe: false, forceRefetch: false }
        )
      );
    }

    // Cleanup function to unsubscribe
    return () => {
      prefetchOrgHierarchy.unsubscribe();
      if (prefetchUserHierarchy) {
        prefetchUserHierarchy.unsubscribe();
      }
    };
  }, [dispatch, prefetchUser, userId]);
}

/**
 * Hook to manually trigger hierarchy data refresh
 */
export function useHierarchyRefresh() {
  const dispatch = useAppDispatch();

  const refreshOrganizationHierarchy = () => {
    dispatch(
      organizationApi.endpoints.getOrganizationHierarchy.initiate(
        {},
        { subscribe: false, forceRefetch: true }
      )
    );
  };

  const refreshUserHierarchy = (userId: string) => {
    dispatch(
      organizationApi.endpoints.getUserHierarchy.initiate(
        userId,
        { subscribe: false, forceRefetch: true }
      )
    );
  };

  return {
    refreshOrganizationHierarchy,
    refreshUserHierarchy,
  };
}