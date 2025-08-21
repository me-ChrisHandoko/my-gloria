'use client';

import { useUser } from '@clerk/nextjs';

// Define superadmin emails
const SUPERADMIN_EMAILS = [
  'christian_handoko@gloriaschool.org',
  // Add more superadmin emails as needed
];

export function useIsSuperAdmin() {
  const { user, isLoaded } = useUser();
  
  if (!isLoaded || !user) {
    return {
      isSuperAdmin: false,
      isLoading: !isLoaded,
      userEmail: undefined,
    };
  }

  const primaryEmail = user.primaryEmailAddress?.emailAddress;
  const isSuperAdmin = primaryEmail ? SUPERADMIN_EMAILS.includes(primaryEmail) : false;

  return {
    isSuperAdmin,
    isLoading: false,
    userEmail: primaryEmail,
  };
}