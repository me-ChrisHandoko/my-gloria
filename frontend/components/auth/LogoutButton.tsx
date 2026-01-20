// components/auth/LogoutButton.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/lib/store/hooks';
import { useLogoutMutation } from '@/lib/store/services/authApi';
import { logout as logoutAction } from '@/lib/store/features/authSlice';
import { Button } from '@/components/ui/button';

export default function LogoutButton() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [logout, { isLoading }] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      // Call backend logout (refresh_token sent via httpOnly cookie)
      await logout().unwrap();
    } catch (error) {
      // Ignore errors - logout locally anyway
    } finally {
      // Clear local state (Redux)
      dispatch(logoutAction());

      // Navigate to login
      router.push('/login');
    }
  };

  return (
    <Button onClick={handleLogout} disabled={isLoading} variant="outline">
      {isLoading ? 'Logging out...' : 'Logout'}
    </Button>
  );
}
