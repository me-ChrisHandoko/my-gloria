// app/(protected)/dashboard/page.tsx
'use client';

import { useGetCurrentUserQuery } from '@/lib/store/services/authApi';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Alert from '@/components/ui/Alert';

export default function DashboardPage() {
  // RTK Query automatically caches and manages this request
  const { data: user, isLoading, error } = useGetCurrentUserQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">Failed to load user data</Alert>;
  }

  return (
    <>
      <div className="rounded-lg border bg-card p-6">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {user?.email}!</p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-bold mb-4">Account Information</h2>
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">Username:</span>
            <span className="font-medium">{user?.username || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">Account Status:</span>
            <span className={`font-medium ${user?.is_active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {user?.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">Email Verified:</span>
            <span className={`font-medium ${user?.email_verified ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
              {user?.email_verified ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
