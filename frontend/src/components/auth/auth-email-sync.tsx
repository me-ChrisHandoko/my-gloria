'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';

/**
 * Component untuk clear login email saat logout
 * Login email disimpan saat user submit custom sign-in form
 */
export function AuthEmailSync() {
  const { isSignedIn } = useUser();

  useEffect(() => {
    if (!isSignedIn) {
      // User logout, hapus login email
      sessionStorage.removeItem('clerk_login_email');
      console.log('🗑️ [EmailSync] Cleared login email');
    }
  }, [isSignedIn]);

  // Component ini tidak render apapun
  return null;
}
