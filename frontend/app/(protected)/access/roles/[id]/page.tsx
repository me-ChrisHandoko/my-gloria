// app/(protected)/akses/roles/[id]/page.tsx
/**
 * Role Detail Page with Hybrid SSR
 * - Server Component for initial data fetch
 * - Client islands for interactive buttons
 */

import { Shield, Calendar, Info, User, FileText, Award, Key, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

import { getRoleById } from "@/lib/server/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import RoleDetailActions from "@/components/roles/RoleDetailActions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RoleDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Server-side data fetching
  const { data: role, error } = await getRoleById(id);

  if (error || !role) {
    return <Alert variant="error">Gagal memuat data role: {error || "Role not found"}</Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{role.name}</h1>
            <Badge variant={role.is_active ? "success" : "secondary"}>
              {role.is_active ? "Aktif" : "Non-Aktif"}
            </Badge>
            {role.is_system_role && (
              <Badge variant="secondary">Sistem</Badge>
            )}
          </div>
          <p className="text-muted-foreground">Kode: {role.code}</p>
        </div>
        {/* Client Island - Action Buttons */}
        <RoleDetailActions roleId={id} roleName={role.name} />
      </div>

      {/* Informasi Dasar - Static Content (Server Component) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Informasi Dasar
          </CardTitle>
          <CardDescription>Identitas role dan hierarki</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Kode Role</Label>
            <p className="font-mono text-sm font-medium">{role.code}</p>
          </div>

          <div className="space-y-1">
            <Label>Nama Role</Label>
            <p className="text-sm font-medium">{role.name}</p>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Level Hierarki
            </Label>
            <p className="text-sm">
              <Badge variant="outline">{role.hierarchy_level}</Badge>
            </p>
          </div>

          <div className="space-y-1">
            <Label>Tipe Role</Label>
            <p className="text-sm">
              {role.is_system_role ? (
                <Badge variant="secondary">Role Sistem</Badge>
              ) : (
                <Badge variant="default">Role Custom</Badge>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Management - Navigation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Kelola Permissions
          </CardTitle>
          <CardDescription>
            Assign dan kelola permissions untuk role ini
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Klik tombol di samping untuk mengelola permissions
              </p>
              <p className="text-xs text-muted-foreground">
                Anda dapat assign, melihat, dan mencabut permissions dari role ini
              </p>
            </div>
            <Button asChild>
              <Link href={`/access/roles/${id}/permissions`}>
                Kelola Permissions
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deskripsi - Static Content (Server Component) */}
      {role.description && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Deskripsi
            </CardTitle>
            <CardDescription>Informasi tambahan tentang role</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{role.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Informasi Tambahan - Static Content (Server Component) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Informasi Tambahan
          </CardTitle>
          <CardDescription>Metadata dan riwayat perubahan</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dibuat Pada
            </Label>
            <p className="text-sm">{format(new Date(role.created_at), "dd MMMM yyyy, HH:mm")}</p>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Terakhir Diperbarui
            </Label>
            <p className="text-sm">{format(new Date(role.updated_at), "dd MMMM yyyy, HH:mm")}</p>
          </div>

          {role.created_by && (
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Dibuat Oleh
              </Label>
              <p className="text-sm">{formatDisplayName(role.created_by)}</p>
            </div>
          )}

          <div className="space-y-1">
            <Label>Status</Label>
            <div>
              <Badge variant={role.is_active ? "success" : "secondary"}>
                {role.is_active ? "Aktif" : "Non-Aktif"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Label component for consistent styling
function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={`text-sm font-medium text-muted-foreground ${className}`}>
      {children}
    </label>
  );
}

// Format name: replace _ with space and capitalize each word
function formatDisplayName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Optional: Enable revalidation for fresh data
export const revalidate = 0;
