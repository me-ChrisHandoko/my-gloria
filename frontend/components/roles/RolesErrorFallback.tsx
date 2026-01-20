// components/roles/RolesErrorFallback.tsx
"use client";

import { AlertCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RolesErrorFallbackProps {
  error: string;
}

export default function RolesErrorFallback({ error }: RolesErrorFallbackProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
        <p className="text-muted-foreground">Kelola roles dan hak akses dalam sistem YPK Gloria</p>
      </div>

      {/* Error Card */}
      <Card className="p-6">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Halaman Roles</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">{error}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.refresh()}>
                Coba Lagi
              </Button>
              <Button variant="ghost" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke Dashboard
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </Card>
    </div>
  );
}
