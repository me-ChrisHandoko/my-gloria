'use client';

import { useAuth, useClerk } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, LogOut } from 'lucide-react';

/**
 * Sign Out Page
 *
 * Handles user logout with contextual messages based on logout reason.
 * Supports automatic logout for HR-deactivated accounts.
 */
export default function SignOutPage() {
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const reason = searchParams.get('reason');

  // Get appropriate message based on logout reason
  const getMessage = () => {
    switch (reason) {
      case 'account_deactivated':
        return {
          title: 'Akun Tidak Aktif',
          description:
            'Akun Anda telah dinonaktifkan oleh departemen HR. Silakan hubungi HR untuk informasi lebih lanjut.',
          type: 'error' as const,
        };
      case 'session_expired':
        return {
          title: 'Sesi Berakhir',
          description: 'Sesi login Anda telah berakhir. Silakan login kembali.',
          type: 'warning' as const,
        };
      case 'manual':
        return {
          title: 'Logout Berhasil',
          description: 'Anda telah berhasil keluar dari sistem.',
          type: 'success' as const,
        };
      default:
        return {
          title: 'Logout',
          description: 'Anda akan keluar dari sistem.',
          type: 'info' as const,
        };
    }
  };

  const message = getMessage();

  // Auto sign-out when component mounts if user is signed in
  useEffect(() => {
    if (isSignedIn && !isSigningOut) {
      setIsSigningOut(true);

      // Sign out and redirect to sign-in page
      signOut()
        .then(() => {
          console.log('✅ [SignOut] User signed out successfully');

          // Redirect to sign-in after short delay
          setTimeout(() => {
            router.push('/sign-in');
          }, 2000);
        })
        .catch((error) => {
          console.error('❌ [SignOut] Sign out failed:', error);

          // Still redirect to sign-in on error
          setTimeout(() => {
            router.push('/sign-in');
          }, 2000);
        });
    } else if (!isSignedIn) {
      // User is already signed out, redirect to sign-in
      setTimeout(() => {
        router.push('/sign-in');
      }, 2000);
    }
  }, [isSignedIn, isSigningOut, signOut, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {reason === 'account_deactivated' ? (
              <AlertCircle className="h-6 w-6 text-destructive" />
            ) : (
              <LogOut className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <CardTitle>{message.title}</CardTitle>
          <CardDescription>
            {isSigningOut ? 'Mengeluarkan Anda dari sistem...' : 'Mengalihkan ke halaman login...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant={reason === 'account_deactivated' ? 'destructive' : 'default'}>
            <AlertDescription className="text-center">{message.description}</AlertDescription>
          </Alert>

          {reason === 'account_deactivated' && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <p>Hubungi HR di: hr@gloria.com</p>
              <p className="mt-1">Atau telepon: (021) 1234-5678</p>
            </div>
          )}

          <div className="mt-4 text-center text-xs text-muted-foreground">
            Anda akan diarahkan ke halaman login dalam beberapa detik...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
