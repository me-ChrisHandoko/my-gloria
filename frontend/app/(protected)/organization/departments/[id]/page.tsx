// app/(protected)/organisasi/departemen/[id]/page.tsx
/**
 * Department Detail Page with Hybrid SSR
 * - Server Component for initial data fetch
 * - Client islands for interactive buttons
 */

import { Network, Building2, Calendar, Info, User, FileText } from "lucide-react";
import { format } from "date-fns";

import { getDepartmentById } from "@/lib/server/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import DepartmentDetailActions from "@/components/departments/DepartmentDetailActions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DepartmentDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Server-side data fetching
  const { data: department, error } = await getDepartmentById(id);

  if (error || !department) {
    return <Alert variant="error">Gagal memuat data departemen: {error || "Department not found"}</Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{department.name}</h1>
            <Badge variant={department.is_active ? "success" : "secondary"}>
              {department.is_active ? "Aktif" : "Non-Aktif"}
            </Badge>
          </div>
          <p className="text-muted-foreground">Kode: {department.code}</p>
        </div>
        {/* Client Island - Action Buttons */}
        <DepartmentDetailActions departmentId={id} departmentName={department.name} />
      </div>

      {/* Informasi Dasar - Static Content (Server Component) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Informasi Dasar
          </CardTitle>
          <CardDescription>Identitas departemen</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Kode Departemen</Label>
            <p className="font-mono text-sm font-medium">{department.code}</p>
          </div>

          <div className="space-y-1">
            <Label>Nama Departemen</Label>
            <p className="text-sm font-medium">{department.name}</p>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Sekolah
            </Label>
            <p className="text-sm">
              {department.school?.name || <span className="text-muted-foreground">Tidak terkait sekolah (Umum)</span>}
            </p>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Parent Departemen
            </Label>
            <p className="text-sm">
              {department.parent?.name || <span className="text-muted-foreground">Root (Tanpa parent)</span>}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Deskripsi - Static Content (Server Component) */}
      {department.description && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Deskripsi
            </CardTitle>
            <CardDescription>Informasi tambahan tentang departemen</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{department.description}</p>
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
            <p className="text-sm">{format(new Date(department.created_at), "dd MMMM yyyy, HH:mm")}</p>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Terakhir Diperbarui
            </Label>
            <p className="text-sm">{format(new Date(department.updated_at), "dd MMMM yyyy, HH:mm")}</p>
          </div>

          {department.created_by && (
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Dibuat Oleh
              </Label>
              <p className="text-sm">{formatDisplayName(department.created_by)}</p>
            </div>
          )}

          {department.modified_by && (
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Dimodifikasi Oleh
              </Label>
              <p className="text-sm">{formatDisplayName(department.modified_by)}</p>
            </div>
          )}

          <div className="space-y-1">
            <Label>Status</Label>
            <div>
              <Badge variant={department.is_active ? "success" : "secondary"}>
                {department.is_active ? "Aktif" : "Non-Aktif"}
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
