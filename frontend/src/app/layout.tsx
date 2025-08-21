import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { ReduxProvider } from "@/providers/ReduxProvider";
import { ClientAuthWrapper } from "@/components/ClientAuthWrapper";
import { AuthenticatedApiProvider } from "@/providers/AuthenticatedApiProvider";
import { LoadingProvider } from "@/providers/LoadingProvider";
import { ImpersonationBanner } from "@/components/impersonation/ImpersonationBanner";
// import { DevelopmentToolbar } from "@/components/dev/DevelopmentToolbar"; // Disabled for production mode
// import { MockDataInitializer } from "@/components/dev/MockDataInitializer"; // Disabled for production mode
import { Toaster } from "sonner";
import "./globals.css";

// Load API debugging utilities in development
if (process.env.NODE_ENV === 'development') {
  import('@/lib/api-debug');
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YPK Gloria - Internal System",
  description: "Internal management system for YPK Gloria",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ReduxProvider>
            <AuthenticatedApiProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <LanguageProvider>
                  <ImpersonationProvider>
                    <LoadingProvider>
                      <ClientAuthWrapper>
                        {/* <MockDataInitializer /> Disabled for production mode */}
                        <ImpersonationBanner />
                        {children}
                        <Toaster richColors position="top-right" />
                        {/* <DevelopmentToolbar /> Disabled for production mode */}
                      </ClientAuthWrapper>
                    </LoadingProvider>
                  </ImpersonationProvider>
                </LanguageProvider>
              </ThemeProvider>
            </AuthenticatedApiProvider>
          </ReduxProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
