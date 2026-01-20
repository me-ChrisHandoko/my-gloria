/**
 * Permissions Error Fallback Component
 *
 * Displays error state when server-side data fetch fails
 * Provides retry and navigation options for better UX
 */

"use client";

import { RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRouter } from "next/navigation";

interface PermissionsErrorFallbackProps {
  error: string;
}

export default function PermissionsErrorFallback({ error }: PermissionsErrorFallbackProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Permissions</h1>
          <p className="text-muted-foreground">
            Kelola permissions dan hak akses dalam sistem
          </p>
        </div>
      </div>

      {/* Error State */}
      <EmptyState
        icon={AlertCircle}
        iconClassName="text-destructive"
        title="Gagal Memuat Data Permissions"
        description={
          <div className="space-y-2">
            <p>{error}</p>
            <p className="text-xs">
              Silakan coba muat ulang halaman. Jika masalah berlanjut, hubungi administrator sistem.
            </p>
          </div>
        }
        primaryAction={{
          label: "Muat Ulang Halaman",
          onClick: () => router.refresh(),
          variant: "default",
          icon: RefreshCw,
        }}
        secondaryAction={{
          label: "Kembali ke Dashboard",
          onClick: () => router.push("/dashboard"),
          variant: "outline",
        }}
      />
    </div>
  );
}
