// app/(protected)/profile/page.tsx
'use client';

import { useAppSelector } from '@/lib/store/hooks';

export default function ProfilePage() {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <>
      <div className="rounded-lg border bg-card p-6">
        <h1 className="text-3xl font-bold mb-2">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-bold mb-4">User Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              User ID
            </label>
            <p className="font-medium">{user?.id}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Email
            </label>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Username
            </label>
            <p className="font-medium">{user?.username || 'Not set'}</p>
          </div>
        </div>
      </div>
    </>
  );
}
