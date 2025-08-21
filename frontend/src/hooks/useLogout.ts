'use client';

import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useLogout() {
  const { signOut } = useClerk();
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    try {
      // Disable scroll restoration temporarily to prevent warnings
      const originalScrollRestoration = history.scrollRestoration;
      history.scrollRestoration = 'manual';
      
      // Sign out without redirectUrl to avoid navigation issues
      await signOut();
      
      // Use replace instead of push to avoid history issues
      router.replace('/sign-in');
      
      // Restore scroll restoration after a brief delay
      setTimeout(() => {
        history.scrollRestoration = originalScrollRestoration;
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: still try to navigate to sign-in
      router.replace('/sign-in');
    }
  }, [signOut, router]);

  return handleLogout;
}