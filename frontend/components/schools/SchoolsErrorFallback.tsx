/**
 * Schools Error Fallback Component
 *
 * Client-side error handling component for school page failures.
 * Receives serializable error data from Server Component and renders
 * interactive error UI with recovery options.
 *
 * This component solves the React Server/Client Component boundary violation
 * by handling all non-serializable props (icons, functions) within the
 * Client Component context.
 */

"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

interface SchoolsErrorFallbackProps {
  error: string;
}

export default function SchoolsErrorFallback({
  error
}: SchoolsErrorFallbackProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sekolah</h1>
        <p className="text-muted-foreground">
          Kelola data sekolah dalam organisasi YPK Gloria
        </p>
      </div>

      {/* Error State with Interactive Elements */}
      <EmptyState
        icon={AlertCircle}
        iconClassName="text-destructive"
        title="Gagal Memuat Data Sekolah"
        description={
          <div className="space-y-2">
            <p className="font-medium">
              {error}
            </p>
            <p className="text-sm">
              Hal ini bisa disebabkan oleh:
            </p>
            <ul className="text-xs space-y-1 list-disc list-inside text-left bg-muted/50 p-3 rounded-md">
              <li>Masalah koneksi jaringan</li>
              <li>Server backend tidak merespons</li>
              <li>Sesi autentikasi telah berakhir</li>
              <li>Gangguan sementara pada sistem</li>
            </ul>
            <p className="text-xs mt-2">
              Jika masalah berlanjut setelah refresh, hubungi administrator sistem.
            </p>
          </div>
        }
        primaryAction={{
          label: "Muat Ulang Halaman",
          onClick: () => window.location.reload(),
          variant: "default",
          icon: RefreshCw,
        }}
        secondaryAction={{
          label: "Kembali ke Dashboard",
          onClick: () => window.location.href = '/dashboard',
          variant: "outline",
        }}
      />
    </div>
  );
}
