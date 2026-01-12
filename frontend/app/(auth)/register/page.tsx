// app/(auth)/register/page.tsx
import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="bg-card text-card-foreground rounded-lg shadow-lg p-8">
      <RegisterForm />
    </div>
  );
}
