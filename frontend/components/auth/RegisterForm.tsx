// components/auth/RegisterForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRegisterMutation } from '@/lib/store/services/authApi';
import { useAppDispatch } from '@/lib/store/hooks';
import { setCredentials } from '@/lib/store/features/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useMutex } from '@/lib/hooks/useMutex';

export default function RegisterForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const t = useTranslations('Auth.register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordInfo, setShowPasswordInfo] = useState(false);

  const [register, { isLoading }] = useRegisterMutation();

  // Mutex to prevent concurrent registration attempts
  const { runExclusive, isLocked } = useMutex();

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

    // Prevent concurrent submissions using mutex
    if (isLocked) {
      console.warn('Registration already in progress');
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      toast.error(t('passwordMismatch'));
      return;
    }

    await runExclusive(async () => {
      try {
        const result = await register({
          email,
          password,
        }).unwrap();

        // Store credentials in Redux
        // Store user info in Redux (tokens handled by httpOnly cookies)
        // Backend returns { message, data } format, where data contains user info
        dispatch(setCredentials({ user: result.data }));

        toast.success(t('success'));
        // Redirect to dashboard
        router.push('/dashboard');
      } catch (err: any) {
        const errorMessage = err?.data?.error || err?.message || 'Registration failed';
        toast.error(errorMessage);
      }
    });
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-5 w-full max-w-md" noValidate>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          {t('email')}
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          required
        />
        <p className="text-xs text-muted-foreground">
          {t('emailHint')}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium">
            {t('password')}
          </label>
          <button
            type="button"
            onClick={() => setShowPasswordInfo(!showPasswordInfo)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Info className="h-3 w-3" />
            {t('requirements')}
          </button>
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => setShowPasswordInfo(true)}
          placeholder={t('passwordPlaceholder')}
          required
          minLength={8}
          maxLength={100}
        />

        {showPasswordInfo && password.length > 0 && (
          <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('passwordRequirements')}</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                {passwordChecks.minLength ? (
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={passwordChecks.minLength ? 'text-foreground' : 'text-muted-foreground'}>
                  {t('minLength')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {passwordChecks.maxLength ? (
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={passwordChecks.maxLength ? 'text-foreground' : 'text-muted-foreground'}>
                  {t('maxLength')}
                </span>
              </div>
              <div className="border-t pt-2 mt-2">
                <p className="text-xs text-muted-foreground mb-1.5">{t('recommendedSecurity')}</p>
                <div className="flex items-center gap-2 text-xs">
                  {passwordChecks.hasNumber ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={passwordChecks.hasNumber ? 'text-foreground' : 'text-muted-foreground'}>
                    {t('hasNumber')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {passwordChecks.hasSpecialChar ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={passwordChecks.hasSpecialChar ? 'text-foreground' : 'text-muted-foreground'}>
                    {t('hasSpecialChar')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          {t('confirmPassword')}
        </label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder={t('passwordPlaceholder')}
          required
          minLength={8}
          maxLength={100}
        />
        {confirmPassword.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            {passwordChecks.passwordsMatch ? (
              <>
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-green-600 dark:text-green-400">{t('passwordsMatch')}</span>
              </>
            ) : (
              <>
                <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-red-600 dark:text-red-400">{t('passwordsNotMatch')}</span>
              </>
            )}
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={handleButtonClick}
        disabled={isLoading || isLocked || !passwordChecks.minLength || !passwordChecks.maxLength || !passwordChecks.passwordsMatch}
        className="w-full"
      >
        {isLoading || isLocked ? t('submitting') : t('submit')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('hasAccount')}{' '}
        <Link href="/login" className="text-primary hover:underline font-medium">
          {t('signIn')}
        </Link>
      </p>
    </form>
  );
}
