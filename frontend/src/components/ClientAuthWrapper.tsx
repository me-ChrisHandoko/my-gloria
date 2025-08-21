'use client';

import { usePathname } from 'next/navigation';
import { SignedIn, SignedOut } from '@clerk/nextjs';
import { AuthWrapper } from './AuthWrapper';
import { LoadingScreen } from './LoadingScreen';

interface ClientAuthWrapperProps {
  children: React.ReactNode;
}

export function ClientAuthWrapper({ children }: ClientAuthWrapperProps) {
  const pathname = usePathname();
  
  // Check if we're on the sign-in page
  const isSignInPage = pathname?.startsWith('/sign-in');
  
  return (
    <>
      <SignedOut>
        {/* Only show loading screen if NOT on sign-in page */}
        {isSignInPage ? (
          children
        ) : (
          <LoadingScreen message="Redirecting to sign in..." />
        )}
      </SignedOut>
      <SignedIn>
        <AuthWrapper>
          {children}
        </AuthWrapper>
      </SignedIn>
    </>
  );
}