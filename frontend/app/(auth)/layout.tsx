// app/(auth)/layout.tsx
import { LanguageSwitcher } from "@/components/language-switcher"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher variant="outline" size="sm" showLabel />
      </div>

      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
