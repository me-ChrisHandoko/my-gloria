import { useState, useEffect } from 'react';

interface DynamicImportResult<T> {
  component: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Custom hook for dynamic imports with loading states
 * Useful for conditional component loading based on user roles or features
 */
export function useDynamicImport<T>(
  importFn: () => Promise<{ default: T }>,
  shouldLoad: boolean = true
): DynamicImportResult<T> {
  const [state, setState] = useState<DynamicImportResult<T>>({
    component: null,
    loading: shouldLoad,
    error: null,
  });

  useEffect(() => {
    if (!shouldLoad) {
      setState({ component: null, loading: false, error: null });
      return;
    }

    let isMounted = true;

    const loadComponent = async () => {
      try {
        const module = await importFn();
        if (isMounted) {
          setState({
            component: module.default,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            component: null,
            loading: false,
            error: error instanceof Error ? error : new Error('Import failed'),
          });
        }
      }
    };

    loadComponent();

    return () => {
      isMounted = false;
    };
  }, [importFn, shouldLoad]);

  return state;
}

// Utility for feature-based dynamic loading
export function useFeatureDynamicImport<T>(
  importFn: () => Promise<{ default: T }>,
  featureEnabled: boolean
) {
  return useDynamicImport(importFn, featureEnabled);
}