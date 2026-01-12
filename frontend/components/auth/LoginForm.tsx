// components/auth/LoginForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLoginMutation } from '@/lib/store/services/authApi';
import { useAppDispatch } from '@/lib/store/hooks';
import { setCredentials } from '@/lib/store/features/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);

  // RTK Query mutation hook (auto-generated)
  const [login, { isLoading }] = useLoginMutation();

  // Countdown timer for locked accounts
  useEffect(() => {
    if (!lockedUntil) return;

    const updateRemainingTime = () => {
      const now = new Date().getTime();
      const lockTime = new Date(lockedUntil).getTime();
      const diff = lockTime - now;

      if (diff <= 0) {
        setLockedUntil(null);
        setRemainingTime(0);
        setErrorMessage('');
        return;
      }

      setRemainingTime(Math.ceil(diff / 1000)); // seconds
    };

    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(interval);
  }, [lockedUntil]);

  // Format remaining time as MM:SS
  const formatRemainingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear error when user starts typing
    if (errorMessage) {
      setErrorMessage('');
      setLockedUntil(null);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    // Clear error when user starts typing
    if (errorMessage) {
      setErrorMessage('');
      setLockedUntil(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setErrorMessage('');
    setAttemptCount(prev => prev + 1);

    try {
      const result = await login({ email, password }).unwrap();

      dispatch(
        setCredentials({
          user: result.user,
          accessToken: result.access_token,
          refreshToken: result.refresh_token,
        })
      );

      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (err: any) {
      // Handle error and show message to user
      if (err && 'data' in err && err.data) {
        const errorData = err.data as any;
        const errorMsg = errorData.error || 'Login failed. Please check your credentials.';

        // Check if account is locked and has locked_until timestamp
        if (errorData.locked_until) {
          setLockedUntil(errorData.locked_until);
          setErrorMessage(errorMsg);
        } else {
          setLockedUntil(null);
          toast.error(errorMsg);
        }
      } else {
        setLockedUntil(null);
        toast.error('Network error. Please check your connection and try again.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 w-full max-w-md" noValidate>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Welcome Back</h2>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access your account
        </p>
      </div>

      {errorMessage && (
        <Alert variant="error" className="animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col gap-1">
            <p className="font-medium">{errorMessage}</p>
            {lockedUntil && remainingTime > 0 && (
              <div className="mt-2 p-3 rounded-md bg-red-900/20 border border-red-900/30">
                <p className="text-sm font-semibold">Account Locked</p>
                <p className="text-xs mt-1">
                  Your account has been temporarily locked due to multiple failed login attempts.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs opacity-90">Time remaining:</span>
                  <span className="font-mono font-bold text-base">{formatRemainingTime(remainingTime)}</span>
                </div>
                <p className="text-xs mt-2 opacity-80">
                  You can try logging in again after the timer expires.
                </p>
              </div>
            )}
            {!lockedUntil && attemptCount >= 3 && (
              <p className="text-xs opacity-90">
                Having trouble? Make sure you&apos;re using the correct email and password.
              </p>
            )}
          </div>
        </Alert>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email Address
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={handleEmailChange}
          placeholder="your@email.com"
          required
          autoComplete="email"
          className={errorMessage ? 'border-red-500 focus-visible:ring-red-500' : ''}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Link href="/forgot-password" className="text-xs text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={handlePasswordChange}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            className={errorMessage ? 'border-red-500 focus-visible:ring-red-500 pr-10' : 'pr-10'}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading || !email || !password}
        className="w-full"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            Signing in...
          </span>
        ) : (
          'Sign In'
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-primary hover:underline font-medium">
          Create account
        </Link>
      </p>
    </form>
  );
}
