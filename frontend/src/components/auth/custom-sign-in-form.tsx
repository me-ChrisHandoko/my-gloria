'use client';

import { useSignIn, useSignUp } from '@clerk/nextjs';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Custom Sign-In Form with Auto-detect Sign In vs Sign Up
 * Automatically handles both new users (sign up) and existing users (sign in)
 * This allows us to know exactly which email the user used for authentication
 */
export function CustomSignInForm() {
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp();
  const router = useRouter();

  const isLoaded = signInLoaded && signUpLoaded;

  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OAuth email validation states
  const [showOAuthEmailPrompt, setShowOAuthEmailPrompt] = useState(false);
  const [oauthEmail, setOauthEmail] = useState('');
  const [selectedOAuthProvider, setSelectedOAuthProvider] = useState<'oauth_google' | 'oauth_microsoft' | null>(null);

  // Prevent double-submission during verification
  const isVerifyingRef = useRef(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoaded || !signIn || !signUp) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // FIRST: Check if email is registered in backend database
      console.log('🔍 [CustomAuth] Checking if email is registered in database...');

      const checkResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/public/auth/validate-email?email=${encodeURIComponent(email)}`);

      if (!checkResponse.ok) {
        console.error('❌ [CustomAuth] Email validation failed:', checkResponse.status);
        const errorData = await checkResponse.json().catch(() => ({}));
        const errorMessage = errorData?.error || 'Email tidak terdaftar sebagai karyawan';
        setError(errorMessage + '. Silakan hubungi admin HR.');
        setIsLoading(false);
        return;
      }

      const checkData = await checkResponse.json();

      // ✅ FIX: Backend returns { success: true, data: { valid: true } }
      if (!checkData.data?.valid) {
        console.error('❌ [CustomAuth] Email not registered as employee:', email);
        setError('Email tidak terdaftar sebagai karyawan. Silakan hubungi admin HR.');
        setIsLoading(false);
        return;
      }

      console.log('✅ [CustomAuth] Email is registered as employee, proceeding with OTP...');

      // Save the email that user is trying to authenticate with
      sessionStorage.setItem('clerk_login_email', email);
      console.log('📧 [CustomAuth] Saved email:', email);

      // Try Sign In first (existing user)
      try {
        console.log('🔍 [CustomAuth] Trying sign-in for existing user...');

        await signIn.create({
          identifier: email,
        });

        // Prepare email code verification for sign-in
        const emailCodeFactor = signIn.supportedFirstFactors?.find(
          (factor) => factor.strategy === 'email_code'
        );

        if (emailCodeFactor && 'emailAddressId' in emailCodeFactor) {
          await signIn.prepareFirstFactor({
            strategy: 'email_code',
            emailAddressId: emailCodeFactor.emailAddressId,
          });

          console.log('✅ [CustomAuth] Sign-in OTP sent to:', email);
          setIsSignUpMode(false);
          setIsCodeSent(true);
        } else {
          throw new Error('Email code authentication not available');
        }
      } catch (signInError: any) {
        // Check if error is "account not found"
        const errorMessage = signInError.errors?.[0]?.message || signInError.message || '';

        if (errorMessage.includes("Couldn't find your account") ||
            errorMessage.includes("not found") ||
            errorMessage.includes("doesn't exist")) {

          console.log('🆕 [CustomAuth] Account not found, creating new account (sign-up)...');

          // User doesn't exist, try Sign Up (new user)
          await signUp.create({
            emailAddress: email,
          });

          // Prepare email code verification for sign-up
          await signUp.prepareEmailAddressVerification({
            strategy: 'email_code',
          });

          console.log('✅ [CustomAuth] Sign-up OTP sent to:', email);
          setIsSignUpMode(true);
          setIsCodeSent(true);
        } else {
          // Different error, re-throw
          throw signInError;
        }
      }
    } catch (err: any) {
      console.error('❌ [CustomAuth] Failed to send OTP:', err);
      const errorMessage = err.errors?.[0]?.message || err.message || 'Failed to send code';
      setError(errorMessage);
      sessionStorage.removeItem('clerk_login_email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoaded || !signIn || !signUp) {
      return;
    }

    // Prevent double-submission
    if (isVerifyingRef.current) {
      console.log('⚠️ [CustomAuth] Verification already in progress, ignoring...');
      return;
    }

    isVerifyingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      if (isSignUpMode) {
        // Sign Up flow: Verify email and complete registration
        console.log('🆕 [CustomAuth] Verifying sign-up OTP code...');

        const result = await signUp.attemptEmailAddressVerification({
          code: otpCode,
        });

        console.log('📊 [CustomAuth] Sign-up result:', {
          status: result.status,
          missingFields: result.missingFields,
          unverifiedFields: result.unverifiedFields,
        });

        if (result.status === 'complete') {
          // Sign up successful, set active session
          await setActiveSignUp({ session: result.createdSessionId });

          console.log('✅ [CustomAuth] Sign-up successful, new account created!');

          // Redirect to home
          router.push('/');
        } else if (result.status === 'missing_requirements') {
          console.log('⚠️ [CustomAuth] Missing requirements detected');
          console.log('📋 [CustomAuth] Missing fields:', result.missingFields);
          console.log('📋 [CustomAuth] Unverified fields:', result.unverifiedFields);

          // Email is already verified, now complete sign-up with required fields
          try {
            // Extract name from email if needed (e.g., john.doe@example.com -> John Doe)
            const emailParts = email.split('@')[0].split('.');
            const firstName = emailParts[0]?.charAt(0).toUpperCase() + emailParts[0]?.slice(1) || 'User';
            const lastName = emailParts[1]?.charAt(0).toUpperCase() + emailParts[1]?.slice(1) || '';

            console.log('🔧 [CustomAuth] Attempting to complete sign-up with extracted name:', { firstName, lastName });

            // Update sign-up with common required fields
            const updatePayload: any = {};

            if (result.missingFields?.includes('first_name')) {
              updatePayload.firstName = firstName;
            }
            if (result.missingFields?.includes('last_name')) {
              updatePayload.lastName = lastName || 'User';
            }
            if (result.missingFields?.includes('password')) {
              // Generate a secure random password (user won't need it, they use OTP)
              const randomPassword = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('') + '!A1';
              updatePayload.password = randomPassword;
              console.log('🔐 [CustomAuth] Auto-generated password for passwordless sign-up');
            }

            // Update if we have fields to update
            if (Object.keys(updatePayload).length > 0) {
              console.log('📝 [CustomAuth] Updating sign-up with fields:', Object.keys(updatePayload));
              await signUp.update(updatePayload);
            }

            // After update, check if session was created
            if (signUp.createdSessionId) {
              console.log('✅ [CustomAuth] Session created after update, activating...');
              await setActiveSignUp({ session: signUp.createdSessionId });
              console.log('✅ [CustomAuth] Session activated successfully!');
              router.push('/');
              return;
            }

            // If still no session, log full sign-up object for debugging
            console.error('❌ [CustomAuth] No session created after update');
            console.error('📊 [CustomAuth] Full sign-up object:', {
              status: signUp.status,
              createdSessionId: signUp.createdSessionId,
              missingFields: result.missingFields,
              unverifiedFields: result.unverifiedFields,
            });

            setError('Unable to complete sign-up. Please contact support with error code: NO_SESSION');
          } catch (updateErr: any) {
            console.error('❌ [CustomAuth] Failed to complete sign-up:', updateErr);
            const errMsg = updateErr.errors?.[0]?.message || updateErr.message || 'Unknown error';
            setError(`Sign-up error: ${errMsg}`);
          }
        } else {
          console.log('⚠️ [CustomAuth] Additional verification needed:', result.status);
          setError('Additional verification required');
        }
      } else {
        // Sign In flow: Verify existing user
        console.log('🔍 [CustomAuth] Verifying sign-in OTP code...');

        const result = await signIn.attemptFirstFactor({
          strategy: 'email_code',
          code: otpCode,
        });

        if (result.status === 'complete') {
          // Sign in successful, set active session
          await setActive({ session: result.createdSessionId });

          console.log('✅ [CustomAuth] Sign-in successful!');

          // Redirect to home
          router.push('/');
        } else {
          console.log('⚠️ [CustomAuth] Additional verification needed:', result.status);
          setError('Additional verification required');
        }
      }
    } catch (err: any) {
      console.error('❌ [CustomAuth] OTP verification failed:', err);
      const errorMessage = err.errors?.[0]?.message || err.message || 'Invalid code';

      // Handle "already verified" case - this means verification succeeded but session isn't active yet
      if (errorMessage.includes('already been verified')) {
        console.log('⚠️ [CustomAuth] Verification already completed, checking session...');

        // For sign-up, try to get the session and activate it
        if (isSignUpMode && signUp.createdSessionId) {
          try {
            await setActiveSignUp({ session: signUp.createdSessionId });
            console.log('✅ [CustomAuth] Session activated successfully!');
            router.push('/');
            return;
          } catch (sessionErr) {
            console.error('❌ [CustomAuth] Failed to activate session:', sessionErr);
          }
        }

        // For sign-in, try to get the session and activate it
        if (!isSignUpMode && signIn.createdSessionId) {
          try {
            await setActive({ session: signIn.createdSessionId });
            console.log('✅ [CustomAuth] Session activated successfully!');
            router.push('/');
            return;
          } catch (sessionErr) {
            console.error('❌ [CustomAuth] Failed to activate session:', sessionErr);
          }
        }

        // If we can't activate session, show user-friendly message
        setError('Verification completed. Please try signing in again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      isVerifyingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'oauth_google' | 'oauth_microsoft') => {
    if (!isLoaded) return;

    // Step 1: Prompt for email first
    setSelectedOAuthProvider(provider);
    setShowOAuthEmailPrompt(true);
    setError(null);
  };

  const handleOAuthWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oauthEmail || !selectedOAuthProvider || !isLoaded) return;

    setIsLoading(true);
    setError(null);

    try {
      // ✅ SECURITY FIX: Validate email BEFORE OAuth redirect
      console.log('🔍 [OAuth] Validating email before OAuth redirect...');

      const checkResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/public/auth/validate-email?email=${encodeURIComponent(oauthEmail)}`
      );

      if (!checkResponse.ok) {
        console.error('❌ [OAuth] Email validation failed:', checkResponse.status);
        const errorData = await checkResponse.json().catch(() => ({}));
        const errorMessage = errorData?.error || 'Email tidak terdaftar sebagai karyawan';
        setError(errorMessage + '. Silakan hubungi admin HR.');
        setIsLoading(false);
        return;
      }

      const checkData = await checkResponse.json();

      // ✅ FIX: Backend returns { success: true, data: { valid: true } }
      if (!checkData.data?.valid) {
        console.error('❌ [OAuth] Email not registered as employee:', oauthEmail);
        setError('Email tidak terdaftar sebagai karyawan. Silakan hubungi admin HR.');
        setIsLoading(false);
        return;
      }

      console.log('✅ [OAuth] Email validated, proceeding to OAuth...');

      // Save email hint for backend matching
      sessionStorage.setItem('clerk_login_email', oauthEmail);

      // Proceed with OAuth flow
      console.log(`🔐 [OAuth] Starting OAuth sign-in with ${selectedOAuthProvider}`);

      await signIn?.authenticateWithRedirect({
        strategy: selectedOAuthProvider,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (err: any) {
      console.error(`❌ [OAuth] Validation or sign-in failed:`, err);
      const errorMessage = err.errors?.[0]?.message || err.message || 'OAuth sign-in failed';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleCancelOAuth = () => {
    setShowOAuthEmailPrompt(false);
    setOauthEmail('');
    setSelectedOAuthProvider(null);
    setError(null);
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // OAuth email prompt modal
  if (showOAuthEmailPrompt) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold">
              {selectedOAuthProvider === 'oauth_google' ? 'Sign In with Google' : 'Sign In with Microsoft'}
            </CardTitle>
            <CardDescription>
              Masukkan email karyawan Anda untuk validasi
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleOAuthWithEmail}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label htmlFor="oauth-email" className="text-sm font-medium leading-none">
                  Email Karyawan
                </label>
                <input
                  id="oauth-email"
                  type="email"
                  value={oauthEmail}
                  onChange={(e) => setOauthEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full px-3 py-2.5 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  placeholder="nama.anda@company.com"
                  autoFocus
                  autoComplete="email"
                />
                <p className="text-xs text-muted-foreground">
                  Email ini harus terdaftar sebagai karyawan di sistem
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCancelOAuth}
                disabled={isLoading}
                className="flex-1 border border-input bg-background hover:bg-accent px-4 py-2.5 rounded-md font-medium text-sm disabled:opacity-50 transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isLoading || !oauthEmail}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 px-4 py-2.5 rounded-md font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                    Validating...
                  </span>
                ) : (
                  'Lanjutkan'
                )}
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl font-semibold">Sign In</CardTitle>
          <CardDescription>
            {isCodeSent
              ? 'Enter the verification code sent to your email'
              : 'Enter your email to receive a verification code'
            }
          </CardDescription>
        </CardHeader>

        <form onSubmit={isCodeSent ? handleVerifyCode : handleSendCode}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || isCodeSent}
                className="w-full px-3 py-2.5 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                placeholder="nama.anda@company.com"
                autoComplete="email"
              />
            </div>

            {isCodeSent && (
              <div className="space-y-2">
                <label htmlFor="otpCode" className="text-sm font-medium leading-none">
                  Verification Code
                </label>
                <input
                  id="otpCode"
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full px-3 py-2.5 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-center tracking-widest font-mono"
                  placeholder="000000"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Code sent to {email}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email || (isCodeSent && !otpCode)}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 px-4 py-2.5 rounded-md font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                  {isCodeSent ? 'Verifying...' : 'Sending code...'}
                </span>
              ) : (
                isCodeSent ? 'Verify Code' : 'Send Verification Code'
              )}
            </button>

            {isCodeSent && (
              <button
                type="button"
                onClick={() => {
                  setIsCodeSent(false);
                  setIsSignUpMode(false);
                  setOtpCode('');
                  setError(null);
                }}
                disabled={isLoading}
                className="w-full text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 py-1.5 transition-colors"
              >
                Use a different email
              </button>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2">
            {/* Divider */}
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="grid grid-cols-2 gap-2.5 w-full">
              <button
                type="button"
                onClick={() => handleOAuthSignIn('oauth_google')}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-3 py-2.5 border border-input rounded-md hover:bg-accent hover:border-accent-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow font-medium text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="hidden sm:inline">Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleOAuthSignIn('oauth_microsoft')}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-3 py-2.5 border border-input rounded-md hover:bg-accent hover:border-accent-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow font-medium text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#f25022" d="M1 1h10v10H1z" />
                  <path fill="#00a4ef" d="M13 1h10v10H13z" />
                  <path fill="#7fba00" d="M1 13h10v10H1z" />
                  <path fill="#ffb900" d="M13 13h10v10H13z" />
                </svg>
                <span className="hidden sm:inline">Microsoft</span>
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
