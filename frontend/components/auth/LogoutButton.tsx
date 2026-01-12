// components/auth/LogoutButton.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { useLogoutMutation } from '@/lib/store/services/authApi';
import { logout as logoutAction } from '@/lib/store/features/authSlice';
import { Button } from '@/components/ui/button';

export default function LogoutButton() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { refreshToken } = useAppSelector((state) => state.auth);
  const [logout, { isLoading }] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        // Call backend logout (best effort)
        await logout(refreshToken).unwrap();
      }
    } catch (error) {
      // Ignore errors - logout locally anyway
    } finally {
      // Always clear local state
      dispatch(logoutAction());
      router.push('/login');
    }
  };

  return (
    <Button onClick={handleLogout} disabled={isLoading} variant="outline">
      {isLoading ? 'Logging out...' : 'Logout'}
    </Button>
  );
}
