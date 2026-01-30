// app/(protected)/settings/api-keys/[id]/page.tsx
/**
 * API Key Detail Page
 *
 * Displays detailed information about a specific API key.
 */
"use client";

import { use } from "react";
import { Key, Calendar, BarChart2, Info, CheckCircle2, Ban, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useRouter } from "next/navigation";

import { useGetApiKeyByIdQuery } from "@/lib/store/services/apiKeysApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { PermissionRouteGuard } from "@/components/rbac";
import { displayApiKey, isApiKeyExpired, formatExpiryDate } from "@/lib/types/apikey";

interface PageProps {
  params: Promise<{ id: string }>;
}

function ApiKeyDetailContent({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data: apiKey, isLoading, error } = useGetApiKeyByIdQuery(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !apiKey) {
    const errorMessage = error
      ? "status" in error
        ? (error.data as { message?: string; error?: string })?.message ||
          (error.data as { message?: string; error?: string })?.error ||
          `Error ${error.status}`
        : error.message || "Unknown error"
      : "API Key not found";

    return <Alert variant="error">Gagal memuat data API Key: {errorMessage}</Alert>;
  }

  const expired = isApiKeyExpired(apiKey.expires_at);
  const maskedKey = displayApiKey(apiKey.prefix, apiKey.last_four_chars);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/settings/api-keys")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{apiKey.name}</h1>
          </div>
          <p className="text-muted-foreground ml-12">Detail API Key</p>
        </div>
      </div>

      {/* Status Alert */}
      {(!apiKey.is_active || expired) && (
        <Alert variant="warning">
          <Ban className="h-4 w-4" />
          <div>
            <strong>API Key {expired ? "Expired" : "Nonaktif"}</strong>
            <p className="text-sm">
              {expired
                ? "API Key ini sudah melewati tanggal kedaluwarsa dan tidak dapat digunakan."
                : "API Key ini telah dinonaktifkan dan tidak dapat digunakan."}
            </p>
          </div>
        </Alert>
      )}

      {/* Informasi Dasar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Informasi Dasar
          </CardTitle>
          <CardDescription>Data identitas API Key</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Nama</Label>
            <p className="text-sm font-medium">{apiKey.name}</p>
          </div>

          <div className="space-y-1">
            <Label>API Key</Label>
            <code className="block px-3 py-2 bg-muted rounded text-sm font-mono">
              {maskedKey}
            </code>
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <div>
              {apiKey.is_active && !expired ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Aktif
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Ban className="mr-1 h-3 w-3" />
                  {expired ? "Expired" : "Nonaktif"}
                </Badge>
              )}
            </div>
          </div>

          {apiKey.description && (
            <div className="space-y-1 md:col-span-2">
              <Label>Deskripsi</Label>
              <p className="text-sm">{apiKey.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistik Penggunaan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Statistik Penggunaan
          </CardTitle>
          <CardDescription>Informasi penggunaan API Key</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Total Penggunaan</Label>
            <p className="text-sm font-medium">{apiKey.usage_count}x</p>
          </div>

          <div className="space-y-1">
            <Label>Terakhir Digunakan</Label>
            <p className="text-sm">
              {apiKey.last_used_at
                ? formatDistanceToNow(new Date(apiKey.last_used_at), {
                    addSuffix: true,
                    locale: localeId,
                  })
                : "Belum pernah digunakan"}
            </p>
          </div>

          <div className="space-y-1">
            <Label>Terakhir Digunakan Dari IP</Label>
            <p className="text-sm font-mono">{apiKey.last_used_ip || "-"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Informasi Waktu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Informasi Waktu
          </CardTitle>
          <CardDescription>Tanggal pembuatan dan kedaluwarsa</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Dibuat</Label>
            <p className="text-sm">
              {formatDistanceToNow(new Date(apiKey.created_at), {
                addSuffix: true,
                locale: localeId,
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(apiKey.created_at).toLocaleString("id-ID")}
            </p>
          </div>

          <div className="space-y-1">
            <Label>Kedaluwarsa</Label>
            {apiKey.expires_at ? (
              <>
                <p className={`text-sm ${expired ? "text-destructive font-medium" : ""}`}>
                  {formatExpiryDate(apiKey.expires_at)}
                  {expired && " (Expired)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(apiKey.expires_at).toLocaleString("id-ID")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada tanggal kedaluwarsa</p>
            )}
          </div>

          {apiKey.revoked_at && (
            <div className="space-y-1">
              <Label>Dinonaktifkan</Label>
              <p className="text-sm">
                {formatDistanceToNow(new Date(apiKey.revoked_at), {
                  addSuffix: true,
                  locale: localeId,
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(apiKey.revoked_at).toLocaleString("id-ID")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informasi Pembuat */}
      {apiKey.created_by_email && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Informasi Tambahan
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Dibuat Oleh</Label>
              <p className="text-sm">{apiKey.created_by_email}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ApiKeyDetailPage({ params }: PageProps) {
  return (
    <PermissionRouteGuard resource="api-keys" action="READ">
      <ApiKeyDetailContent params={params} />
    </PermissionRouteGuard>
  );
}
