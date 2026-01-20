// app/(auth)/login/page.tsx
import { Suspense } from 'react';
import LoginForm from '@/components/auth/LoginForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function LoginPage() {
  return (
    <div className="bg-card text-card-foreground rounded-lg shadow-lg p-8">
      <Suspense fallback={<div className="flex justify-center py-8"><LoadingSpinner /></div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
