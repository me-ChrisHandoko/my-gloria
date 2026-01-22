/**
 * Users Error Fallback Component
 *
 * Displays user-friendly error messages when server-side data fetching fails
 */

"use client";

import { RefreshCw, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

interface UsersErrorFallbackProps {
  error: string;
}

export default function UsersErrorFallback({ error }: UsersErrorFallbackProps) {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengguna</h1>
          <p className="text-muted-foreground">
            Kelola data pengguna dan akses sistem
          </p>
        </div>
      </div>

      {/* Error State */}
      <EmptyState
        icon={RefreshCw}
        iconClassName="text-destructive"
        title="Gagal Memuat Data Pengguna"
        description={
          <div className="space-y-2">
            <p>
              Terjadi kesalahan saat mengambil data dari server. Hal ini bisa
              disebabkan oleh masalah koneksi atau server sedang sibuk.
            </p>
            <p className="text-xs font-mono bg-muted/50 p-2 rounded">
              Error: {error}
            </p>
            <p className="text-xs">
              Silakan coba muat ulang data. Jika masalah berlanjut, hubungi
              administrator sistem.
            </p>
          </div>
        }
        primaryAction={{
          label: "Muat Ulang Halaman",
          onClick: handleRefresh,
          variant: "default",
          icon: RefreshCw,
        }}
      />
    </div>
  );
}
