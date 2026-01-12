// components/auth/RegisterForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRegisterMutation } from '@/lib/store/services/authApi';
import { useAppDispatch } from '@/lib/store/hooks';
import { setCredentials } from '@/lib/store/features/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordInfo, setShowPasswordInfo] = useState(false);

  const [register, { isLoading }] = useRegisterMutation();

  // Password validation checks
  const passwordChecks = {
    minLength: password.length >= 8,
    maxLength: password.length <= 100,
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    passwordsMatch: password === confirmPassword && confirmPassword.length > 0,
  };

  const handleButtonClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Validate password match
    if (password !== confirmPassword) {
      toast.error('Password and Confirm Password do not match');
      return;
    }

    try {
      const result = await register({
        email,
        password,
      }).unwrap();

      // Store credentials in Redux
      dispatch(
        setCredentials({
          user: result.user,
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
        })
      );

      toast.success('Registration successful!');
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage = err?.data?.error || err?.message || 'Registration failed';
      toast.error(errorMessage);
    }
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-5 w-full max-w-md" noValidate>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Create Account</h2>
        <p className="text-sm text-muted-foreground">
          Enter your information to create an account
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email Address
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
        />
        <p className="text-xs text-muted-foreground">
          Use your company email address
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <button
            type="button"
            onClick={() => setShowPasswordInfo(!showPasswordInfo)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Info className="h-3 w-3" />
            Requirements
          </button>
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => setShowPasswordInfo(true)}
          placeholder="••••••••"
          required
          minLength={8}
          maxLength={100}
        />

        {showPasswordInfo && password.length > 0 && (
          <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Password Requirements:</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                {passwordChecks.minLength ? (
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={passwordChecks.minLength ? 'text-foreground' : 'text-muted-foreground'}>
                  At least 8 characters
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {passwordChecks.maxLength ? (
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={passwordChecks.maxLength ? 'text-foreground' : 'text-muted-foreground'}>
                  Maximum 100 characters
                </span>
              </div>
              <div className="border-t pt-2 mt-2">
                <p className="text-xs text-muted-foreground mb-1.5">Recommended for stronger security:</p>
                <div className="flex items-center gap-2 text-xs">
                  {passwordChecks.hasNumber ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={passwordChecks.hasNumber ? 'text-foreground' : 'text-muted-foreground'}>
                    Contains a number
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {passwordChecks.hasSpecialChar ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={passwordChecks.hasSpecialChar ? 'text-foreground' : 'text-muted-foreground'}>
                    Contains a special character (!@#$%^&*)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm Password
        </label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={8}
          maxLength={100}
        />
        {confirmPassword.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            {passwordChecks.passwordsMatch ? (
              <>
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-green-600 dark:text-green-400">Passwords match</span>
              </>
            ) : (
              <>
                <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-red-600 dark:text-red-400">Passwords do not match</span>
              </>
            )}
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={handleButtonClick}
        disabled={isLoading || !passwordChecks.minLength || !passwordChecks.maxLength || !passwordChecks.passwordsMatch}
        className="w-full"
      >
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}
