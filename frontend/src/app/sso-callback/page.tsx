'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

/**
 * SSO Callback Page
 * Handles OAuth redirect and validates email before proceeding
 *
 * SECURITY FIX: Added email validation against backend before allowing access
 */
export default function SSOCallbackPage() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);

  useEffect(() => {
    if (!authLoaded || !userLoaded) {
      return;
    }

    // Not signed in - redirect to sign-in page
    if (!isSignedIn || !user) {
      console.log('⚠️ [SSOCallback] Not signed in, redirecting to sign-in...');
      router.push('/sign-in');
      return;
    }

    // Get the email address used for OAuth sign-in
    const primaryEmail = user.primaryEmailAddress?.emailAddress;

    if (!primaryEmail) {
      setError('Email address tidak ditemukan. Silakan coba lagi.');
      return;
    }

    // Validate email only once
    if (!isValidating && !validationComplete) {
      validateAndProceed(primaryEmail);
    }
  }, [authLoaded, userLoaded, isSignedIn, user, router, isValidating, validationComplete]);

  const validateAndProceed = async (email: string) => {
    setIsValidating(true);
    setError(null);

    try {
      console.log('🔍 [SSOCallback] Validating email:', email);

      // ✅ SECURITY FIX: Validate email against backend before proceeding
      const checkResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/v1/public/auth/validate-email?email=${encodeURIComponent(email)}`
      );

      if (!checkResponse.ok) {
        const errorData = await checkResponse.json().catch(() => ({}));
        const errorMessage = errorData?.error || 'Email tidak terdaftar sebagai karyawan';

        console.error('❌ [SSOCallback] Email validation failed:', checkResponse.status);
        setError(errorMessage + '. Silakan hubungi admin HR.');
        setIsValidating(false);
        return;
      }

      const checkData = await checkResponse.json();

      // ✅ FIX: Backend returns { success: true, data: { valid: true, nip, nama } }
      if (!checkData.data?.valid) {
        console.error('❌ [SSOCallback] Email not registered as employee:', email);
        setError('Email tidak terdaftar sebagai karyawan. Silakan hubungi admin HR.');
        setIsValidating(false);
        return;
      }

      console.log('✅ [SSOCallback] Email validated successfully');

      // Save the email to sessionStorage for backend hint
      sessionStorage.setItem('clerk_login_email', email);
      console.log('📧 [SSOCallback] Saved OAuth login email:', email);
      console.log('🔐 [SSOCallback] OAuth provider:', user?.externalAccounts?.[0]?.provider || 'unknown');

      // Mark validation as complete
      setValidationComplete(true);

      // Redirect to home page
      console.log('✅ [SSOCallback] Validation complete, redirecting to home...');
      router.push('/');

    } catch (err) {
      console.error('❌ [SSOCallback] Validation error:', err);
      setError('Gagal memvalidasi email. Silakan coba lagi.');
      setIsValidating(false);
    }
  };

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <button
              onClick={() => router.push('/sign-in')}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium"
            >
              Kembali ke Sign In
            </button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show loading state
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          {isValidating ? 'Memvalidasi akun...' : 'Menyelesaikan sign-in...'}
        </h2>
        <p className="text-muted-foreground">
          Mohon tunggu sebentar
        </p>
      </div>
    </div>
  );
}
