import { useEffect, useState } from 'react';
import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { useAppDispatch, useAppSelector } from './redux';
import { useGetCurrentUserQuery, useSyncUserMutation } from '@/store/api/authApi';
import { setUser, clearUser, setAuthLoading } from '@/store/features/auth/authSlice';

export function useAuth() {
  const dispatch = useAppDispatch();
  const { isLoaded, isSignedIn, user: clerkUser, getToken } = useClerkAuth();
  const authState = useAppSelector((state) => state.auth);
  
  // Add a small delay to ensure Clerk session is fully established
  const [isSessionReady, setIsSessionReady] = useState(false);
  
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Wait a moment for Clerk session to be fully established
      const timer = setTimeout(() => {
        setIsSessionReady(true);
        console.log('✅ Session ready, enabling API calls');
      }, 1000); // 1000ms delay to ensure Clerk is fully ready
      
      return () => clearTimeout(timer);
    } else {
      setIsSessionReady(false);
    }
  }, [isLoaded, isSignedIn]);
  
  // Skip the query if Clerk is not loaded, user is not signed in, or session is not ready
  const shouldSkipQuery = !isLoaded || !isSignedIn || !isSessionReady;
  
  const { data: currentUser, isLoading, error, refetch } = useGetCurrentUserQuery(undefined, {
    skip: shouldSkipQuery,
  });
  const [syncUser] = useSyncUserMutation();
  
  // Debug logging for authentication state
  useEffect(() => {
    if (isLoaded) {
      console.log('🔐 Clerk Auth State:', {
        isLoaded,
        isSignedIn,
        hasClerkUser: !!clerkUser,
        isSessionReady,
        willCallAPI: !shouldSkipQuery,
      });
    }
  }, [isLoaded, isSignedIn, clerkUser, shouldSkipQuery, isSessionReady]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      dispatch(clearUser());
    }
  }, [isLoaded, isSignedIn, dispatch]);

  useEffect(() => {
    if (currentUser) {
      dispatch(setUser(currentUser));
    }
  }, [currentUser, dispatch]);

  useEffect(() => {
    dispatch(setAuthLoading(isLoading));
  }, [isLoading, dispatch]);

  const syncUserData = async () => {
    if (isSignedIn) {
      try {
        const result = await syncUser().unwrap();
        if (result.success && result.user) {
          dispatch(setUser(result.user));
        }
        return result;
      } catch (error) {
        console.error('Failed to sync user:', error);
        throw error;
      }
    }
  };

  const refreshUser = async () => {
    if (isSignedIn) {
      await refetch();
    }
  };

  return {
    ...authState,
    clerkUser,
    isClerkLoaded: isLoaded,
    isClerkSignedIn: isSignedIn,
    syncUserData,
    refreshUser,
    isLoadingUser: isLoading,
    userError: error,
  };
}