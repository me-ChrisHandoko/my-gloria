'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { LoadingOverlay } from '@/components/LoadingOverlay';

interface LoadingContextType {
  setGlobalLoading: (loading: boolean, message?: string, subMessage?: string) => void;
  isGlobalLoading: boolean;
  setAuthLoading: (loading: boolean, stage?: 'auth' | 'validate' | 'setup') => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function useGlobalLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within LoadingProvider');
  }
  return context;
}

interface LoadingProviderProps {
  children: React.ReactNode;
}

interface LoadingState {
  isActive: boolean;
  message: string;
  subMessage: string;
  showProgress: boolean;
  minDuration: number;
  startTime?: number;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  
  // Unified loading state
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isActive: false,
    message: 'Loading...',
    subMessage: 'Please wait a moment',
    showProgress: true,
    minDuration: 1000
  });
  
  // Track initialization
  const [hasInitialized, setHasInitialized] = useState(false);
  const previousPathname = useRef(pathname);
  const loadingTimeout = useRef<NodeJS.Timeout>();
  
  // Helper to show loading with minimum duration
  const showLoadingWithDuration = useCallback((
    message: string,
    subMessage: string,
    showProgress: boolean = true,
    minDuration: number = 1000
  ) => {
    // Clear any existing timeout
    if (loadingTimeout.current) {
      clearTimeout(loadingTimeout.current);
    }
    
    setLoadingState({
      isActive: true,
      message,
      subMessage,
      showProgress,
      minDuration,
      startTime: Date.now()
    });
  }, []);
  
  // Helper to hide loading respecting minimum duration
  const hideLoading = useCallback(() => {
    setLoadingState(prev => {
      if (!prev.isActive || !prev.startTime) return prev;
      
      const elapsed = Date.now() - prev.startTime;
      const remaining = Math.max(0, prev.minDuration - elapsed);
      
      if (remaining > 0) {
        loadingTimeout.current = setTimeout(() => {
          setLoadingState(p => ({ ...p, isActive: false }));
        }, remaining);
        return prev;
      }
      
      return { ...prev, isActive: false };
    });
  }, []);

  // Initial app loading
  useEffect(() => {
    if (!hasInitialized && !clerkLoaded) {
      console.log('🚀 Initial app loading');
      showLoadingWithDuration(
        'Initializing...',
        'Starting application',
        false,
        800
      );
      setHasInitialized(true);
    } else if (clerkLoaded && hasInitialized && !isSignedIn) {
      hideLoading();
    }
  }, [clerkLoaded, hasInitialized, isSignedIn, showLoadingWithDuration, hideLoading]);

  // OAuth callback detection
  useEffect(() => {
    const isOAuthCallback = 
      searchParams.has('__clerk_status') || 
      searchParams.has('__clerk_created_session') ||
      searchParams.has('__clerk_db_jwt') ||
      searchParams.has('__clerk_client_jwt') ||
      pathname?.includes('/sso-callback');

    if (isOAuthCallback) {
      console.log('🔐 OAuth callback detected');
      showLoadingWithDuration(
        'Completing sign in...',
        'Authenticating with your account',
        true,
        2000
      );
      
      // Auto-hide after OAuth processing
      const timer = setTimeout(() => {
        if (clerkLoaded) {
          hideLoading();
        }
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams, pathname, clerkLoaded, showLoadingWithDuration, hideLoading]);

  // Route transitions (only for significant changes)
  useEffect(() => {
    if (previousPathname.current !== pathname && clerkLoaded) {
      const fromPath = previousPathname.current;
      const toPath = pathname;
      
      // Only show loading for significant route changes
      const significantChange = 
        (fromPath?.includes('/sign-in') && toPath?.includes('/dashboard')) ||
        (fromPath?.includes('/sign-up') && toPath?.includes('/dashboard'));
      
      if (significantChange) {
        console.log(`🔀 Significant route change: ${fromPath} → ${toPath}`);
        showLoadingWithDuration(
          'Setting up your dashboard...',
          'Almost ready',
          true,
          1500
        );
        
        // Auto-hide after transition
        setTimeout(() => hideLoading(), 2000);
      }
      
      previousPathname.current = pathname;
    }
  }, [pathname, clerkLoaded, showLoadingWithDuration, hideLoading]);

  // Expose control functions
  const setGlobalLoading = useCallback((
    loading: boolean,
    message: string = 'Loading...',
    subMessage: string = 'Please wait a moment'
  ) => {
    if (loading) {
      showLoadingWithDuration(message, subMessage, true, 1000);
    } else {
      hideLoading();
    }
  }, [showLoadingWithDuration, hideLoading]);
  
  // Special handler for AuthWrapper loading states
  const setAuthLoading = useCallback((
    loading: boolean,
    stage?: 'auth' | 'validate' | 'setup'
  ) => {
    if (!loading) {
      hideLoading();
      return;
    }
    
    const messages = {
      auth: { 
        message: 'Authenticating...', 
        subMessage: 'Verifying your credentials' 
      },
      validate: { 
        message: 'Validating access...', 
        subMessage: 'Checking your permissions' 
      },
      setup: { 
        message: 'Setting up your dashboard...', 
        subMessage: 'Almost ready' 
      }
    };
    
    const { message, subMessage } = messages[stage || 'auth'];
    showLoadingWithDuration(message, subMessage, true, 1500);
  }, [showLoadingWithDuration, hideLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeout.current) {
        clearTimeout(loadingTimeout.current);
      }
    };
  }, []);

  return (
    <LoadingContext.Provider value={{ 
      setGlobalLoading, 
      isGlobalLoading: loadingState.isActive,
      setAuthLoading 
    }}>
      {loadingState.isActive && (
        <LoadingOverlay
          message={loadingState.message}
          subMessage={loadingState.subMessage}
          showProgress={loadingState.showProgress}
          minDuration={loadingState.minDuration}
        />
      )}
      {children}
    </LoadingContext.Provider>
  );
}