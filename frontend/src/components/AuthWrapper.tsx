'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/hooks/redux';
import { addNotification } from '@/store/features/notification/notificationSlice';
import { setAuthError } from '@/store/features/auth/authSlice';
import { useGlobalLoading } from '@/providers/LoadingProvider';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { setAuthLoading } = useGlobalLoading();
  const [isValidating, setIsValidating] = useState(true);
  const [isValidUser, setIsValidUser] = useState(false);
  const [hasValidationAttempted, setHasValidationAttempted] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'auth' | 'validate' | 'setup'>('auth');
  
  // Both auth and user must be loaded
  const isLoaded = authLoaded && userLoaded;
  
  // Version indicator for debugging
  useEffect(() => {
    console.log('%c=== AUTH WRAPPER LOADED ===', 'color: green; font-size: 20px; font-weight: bold');
    console.log('%cVersion: 7.0 - UNIFIED LOADING SYSTEM', 'color: blue; font-size: 20px; font-weight: bold');
    console.log('%cTimestamp: ' + new Date().toISOString(), 'color: gray');
    console.log('%cFIX: Single unified loading system', 'color: green; font-weight: bold');
    console.log('%cNo duplicate overlays', 'color: green');
    console.log('%cSmooth continuous loading', 'color: green');
  }, []);


  // Update loading stage based on authentication state
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      setLoadingStage('validate');
      setAuthLoading(true, 'validate');
    } else if (isLoaded && isSignedIn) {
      setLoadingStage('auth');
      setAuthLoading(true, 'auth');
    } else if (isLoaded) {
      setAuthLoading(false);
    }
  }, [isLoaded, isSignedIn, user, setAuthLoading]);

  useEffect(() => {
    console.log('🔄 useEffect triggered');
    console.log('  - authLoaded:', authLoaded);
    console.log('  - userLoaded:', userLoaded);
    console.log('  - isLoaded (combined):', isLoaded);
    console.log('  - isSignedIn:', isSignedIn);
    console.log('  - user exists:', !!user);
    console.log('  - loadingStage:', loadingStage);
    if (user) {
      console.log('  - user.id:', user.id);
      console.log('  - user.emailAddresses:', user.emailAddresses?.length);
    }
    
    const validateUser = async () => {
      console.log('🚀 validateUser function called');
      
      if (!isLoaded) {
        console.log('⏳ Clerk not loaded yet, waiting...');
        setIsValidating(false);
        return;
      }
      
      if (!isSignedIn) {
        console.log('🚫 User not signed in');
        setIsValidating(false);
        return;
      }
      
      if (!user) {
        console.log('❓ No user object from Clerk');
        setIsValidating(false);
        return;
      }
      
      console.log('✅ All checks passed, proceeding with validation...');

      // PRODUCTION MODE - No bypass allowed
      // Email validation is always required
      const isProductionMode = true; // Force production-like behavior
      
      if (isProductionMode) {
        console.log('🔒 Running in production mode - email validation required');
      }

      try {
        // Get user's primary email
        const primaryEmail = user.emailAddresses.find(
          email => email.id === user.primaryEmailAddressId
        );

        // Enhanced logging for debugging
        console.log('=== AUTHENTICATION FLOW START ===');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Version: 3.1 - Enhanced Debug');
        console.log('Clerk User ID:', user.id);
        console.log('All email addresses from Clerk:');
        user.emailAddresses.forEach((email: any, index: number) => {
          console.log(`  Email ${index + 1}: ${email.emailAddress} (Primary: ${email.id === user.primaryEmailAddressId})`);
        });

        if (!primaryEmail) {
          console.error('❌ No primary email found!');
          throw new Error('No email address found');
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        console.log('📡 API URL:', apiUrl);
        console.log('📧 Validating email:', primaryEmail.emailAddress);
        console.log('Email format check:');
        console.log('  - Contains underscore:', primaryEmail.emailAddress.includes('_'));
        console.log('  - Contains dot:', primaryEmail.emailAddress.includes('.'));
        console.log('  - Domain:', primaryEmail.emailAddress.split('@')[1]);
        console.log('  - Full email length:', primaryEmail.emailAddress.length);
        console.log('==============================');

        // Validate email with backend
        const response = await fetch(`${apiUrl}/v1/auth/validate-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: primaryEmail.emailAddress }),
        });

        // Check if the response is ok
        if (!response.ok) {
          console.error('API Response Error:', response.status, response.statusText);
          
          // PRODUCTION MODE - No bypass for 404 errors
          if (response.status === 404) {
            console.error('❌ Backend validation endpoint not found (404)');
            console.error('❌ Cannot authenticate without backend validation');
            
            // Show error notification
            dispatch(addNotification({
              type: 'error',
              title: 'Authentication Failed',
              message: 'Backend validation service is not available. Please contact system administrator.',
            }));
            
            // Set authentication error
            dispatch(setAuthError('Backend validation service unavailable'));
            
            // Sign out the user
            await signOut();
            return;
          }
          
          throw new Error(`API Error: ${response.status}`);
        }

        const responseText = await response.text();
        console.log('📥 Raw response:', responseText);
        console.log('📥 Response length:', responseText.length);
        
        let data;
        try {
          data = JSON.parse(responseText);
          console.log('✅ Successfully parsed JSON');
        } catch (parseError) {
          console.error('❌ Failed to parse response as JSON:', parseError);
          console.error('Response text was:', responseText);
          throw new Error('Invalid response from server');
        }
        
        console.log('📋 Full validation response:', JSON.stringify(data, null, 2));
        
        // Handle wrapped response format from NestJS interceptor
        const validationResult = data.data || data;
        console.log('📊 Extracted validation result:', validationResult);
        console.log('🔍 Is valid?:', validationResult.valid);
        console.log('🔍 Type of valid:', typeof validationResult.valid);

        if (!validationResult.valid) {
          // Email not registered in data_karyawan
          console.error('❌ Email validation failed!');
          console.error('❌ Validation result:', validationResult);
          console.error('❌ Message:', validationResult.message);
          
          // Show detailed error with debug info
          const debugInfo = validationResult.debug ? 
            `\n\nDebug Info:\n- Email received: ${validationResult.debug.receivedEmail}\n- Normalized: ${validationResult.debug.normalizedEmail}` : '';
          
          dispatch(addNotification({
            title: 'Access Denied',
            message: `${validationResult.message || 'Your email is not registered in the employee database. Please contact administrator.'}${debugInfo}`,
            severity: 'error',
          }));

          dispatch(setAuthError('Email not registered in employee database'));

          // Log debug info to console
          console.log('=== Email Validation Debug ===');
          console.log('Email from Clerk:', primaryEmail.emailAddress);
          console.log('Validation Response:', data);
          console.log('==============================');

          // Only auto logout in production
          if (process.env.NODE_ENV === 'production') {
            setTimeout(async () => {
              await signOut();
              router.push('/sign-in');
            }, 5000);
          } else {
            console.warn('⚠️ Skipping auto-logout in development mode');
          }

          setIsValidUser(false);
          setHasValidationAttempted(true);
        } else {
          // Valid user - store employee info if available
          console.log('✅ Email validation SUCCESSFUL!');
          console.log('✅ Employee found:', validationResult.employee);
          
          if (validationResult.employee) {
            localStorage.setItem('employeeInfo', JSON.stringify(validationResult.employee));
            console.log('💾 Saved employee info to localStorage');
          }
          setLoadingStage('setup');
          setAuthLoading(true, 'setup');
          setIsValidUser(true);
          setHasValidationAttempted(true);
          console.log('🎉 User marked as valid, access granted!');
          
          // Small delay to show "Setting up dashboard" message
          setTimeout(() => {
            setIsValidating(false);
            setAuthLoading(false);
          }, 500);
        }
      } catch (error) {
        console.error('User validation failed:', error);
        
        dispatch(addNotification({
          title: 'Validation Error',
          message: 'Failed to validate user credentials. Please try again.',
          severity: 'error',
        }));

        // Only sign out on validation error in production
        if (process.env.NODE_ENV === 'production') {
          setTimeout(async () => {
            await signOut();
            router.push('/sign-in');
          }, 3000);
        } else {
          console.warn('⚠️ Validation error occurred, but skipping auto-logout in development mode');
          // In development, treat as valid user to allow testing
          setIsValidUser(true);
          setIsValidating(false);
          setHasValidationAttempted(true);
          
          // Set mock employee data
          localStorage.setItem('employeeInfo', JSON.stringify({
            nip: 'DEV_ERROR',
            nama: user?.fullName || 'Development User (Error)',
            email: user?.emailAddresses[0]?.emailAddress || 'dev@example.com'
          }));
          
          setAuthLoading(false);
        }
        
        setIsValidUser(false);
        setHasValidationAttempted(true);
      } finally {
        if (!isValidUser) {
          setIsValidating(false);
          setAuthLoading(false);
        }
      }
    };

    console.log('📞 Calling validateUser()...');
    validateUser();
  }, [isLoaded, isSignedIn, user, signOut, router, dispatch, setAuthLoading]);

  // Log current state for debugging
  console.log('🎯 Current State:', {
    isLoaded,
    isSignedIn, 
    isValidating,
    isValidUser,
    hasUser: !!user,
    hasValidationAttempted
  });

  // Don't render anything while loading - LoadingProvider handles it
  if (!isLoaded || (isSignedIn && isValidating)) {
    console.log('📱 Loading state active, LoadingProvider handling display');
    return null;
  }

  // Show error message ONLY if validation has been attempted and user is invalid
  // This prevents showing error during the initial false state
  if (isSignedIn && !isValidating && !isValidUser && hasValidationAttempted) {
    console.log('📱 Rendering: Access Denied screen');
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            Your email is not registered in the employee database.
          </p>
          <p className="text-sm text-muted-foreground">
            You will be logged out automatically...
          </p>
        </div>
      </div>
    );
  }

  // Render children only if user is valid or not signed in
  console.log('📱 Rendering: Children (normal content)');
  return <>{children}</>;
}