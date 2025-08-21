'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useGetImpersonationSessionQuery } from '@/store/api/impersonationApi';
import { ImpersonationSession } from '@/store/api/impersonationApi';

interface ImpersonationContextType {
  session: ImpersonationSession | null;
  isImpersonating: boolean;
  isLoading: boolean;
  originalUserEmail?: string;
  impersonatedUserEmail?: string;
  remainingSeconds: number;
  isExpiringSoon: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType>({
  session: null,
  isImpersonating: false,
  isLoading: true,
  remainingSeconds: 0,
  isExpiringSoon: false,
});

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  
  // Only fetch impersonation session if user is signed in
  const queryResult = useGetImpersonationSessionQuery(undefined, {
    pollingInterval: 30000, // Poll every 30 seconds
    skip: !isLoaded || !isSignedIn, // Skip if not loaded or not signed in
  });
  
  const { data: session, isLoading, error } = queryResult;
  
  // Handle different error types
  const isApiAvailable = !error || !([404, 501].includes((error as any)?.status));
  const isAuthError = error && (error as any)?.status === 401;
  const requiresAdmin = error && (error as any)?.data?.requiresAdmin;
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  // Control refetch behavior based on error status
  useEffect(() => {
    // If we have an auth error, we might want to stop polling
    if (isAuthError) {
      console.warn('Authentication error detected, consider re-authenticating');
    }
  }, [isAuthError]);

  useEffect(() => {
    if (!session?.isActive) {
      setRemainingSeconds(0);
      setIsExpiringSoon(false);
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(session.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      
      setRemainingSeconds(remaining);
      setIsExpiringSoon(remaining < 300); // Less than 5 minutes
      
      if (remaining === 0) {
        // Session expired, trigger refresh
        window.location.reload();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // Add visual indicator to body when impersonating
  useEffect(() => {
    if (session?.isActive) {
      document.body.classList.add('impersonation-active');
      document.body.style.paddingTop = '60px'; // Make room for banner
    } else {
      document.body.classList.remove('impersonation-active');
      document.body.style.paddingTop = '';
    }

    return () => {
      document.body.classList.remove('impersonation-active');
      document.body.style.paddingTop = '';
    };
  }, [session?.isActive]);

  const value: ImpersonationContextType = {
    session: isApiAvailable ? (session || null) : null,
    isImpersonating: isApiAvailable && session?.isActive || false,
    isLoading: !isLoaded || (isSignedIn && isApiAvailable ? isLoading : false),
    originalUserEmail: session?.originalUser?.email,
    impersonatedUserEmail: session?.impersonatedUser?.email,
    remainingSeconds,
    isExpiringSoon,
  };

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within ImpersonationProvider');
  }
  return context;
}