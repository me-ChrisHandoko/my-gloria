// app/(protected)/organisasi/sekolah/[id]/page.tsx
/**
 * School Detail Page with Hybrid SSR
 * - Server Component for initial data fetch
 * - Client islands for interactive buttons
 */

import { Building2, MapPin, Phone, Mail, User, Calendar, Info } from "lucide-react";
import { format } from "date-fns";

import { getSchoolById } from "@/lib/server/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import SchoolDetailActions from "@/components/schools/SchoolDetailActions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SchoolDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Server-side data fetching
  const { data: school, error } = await getSchoolById(id);

  if (error || !school) {
    return <Alert variant="error">Gagal memuat data sekolah: {error || "School not found"}</Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{school.name}</h1>
            <Badge variant={school.is_active ? "success" : "secondary"}>
              {school.is_active ? "Aktif" : "Non-Aktif"}
            </Badge>
          </div>
          <p className="text-muted-foreground">Kode: {school.code}</p>
        </div>
        {/* Client Island - Action Buttons */}
        <SchoolDetailActions schoolId={id} schoolName={school.name} />
      </div>

      {/* Informasi Dasar - Static Content (Server Component) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informasi Dasar
          </CardTitle>
          <CardDescription>Identitas sekolah</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Kode Sekolah</Label>
            <p className="font-mono text-sm font-medium">{school.code}</p>
          </div>

          <div className="space-y-1">
            <Label>Nama Sekolah</Label>
            <p className="text-sm font-medium">{school.name}</p>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Lokasi
            </Label>
            <p className="text-sm">{school.lokasi || <span className="text-muted-foreground">-</span>}</p>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Kepala Sekolah
            </Label>
            <p className="text-sm">{school.principal || <span className="text-muted-foreground">-</span>}</p>
          </div>
        </CardContent>
      </Card>

      {/* Kontak - Static Content (Server Component) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Informasi Kontak
          </CardTitle>
          <CardDescription>Detail kontak sekolah</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <Label>Alamat Lengkap</Label>
            <p className="text-sm">{school.address || <span className="text-muted-foreground">-</span>}</p>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Nomor Telepon
            </Label>
            <p className="text-sm">{school.phone || <span className="text-muted-foreground">-</span>}</p>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <p className="text-sm">{school.email || <span className="text-muted-foreground">-</span>}</p>
          </div>
        </CardContent>
      </Card>

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
            <p className="text-sm">{format(new Date(school.created_at), "dd MMMM yyyy, HH:mm")}</p>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Terakhir Diperbarui
            </Label>
            <p className="text-sm">{format(new Date(school.updated_at), "dd MMMM yyyy, HH:mm")}</p>
          </div>

          {school.created_by && (
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Dibuat Oleh
              </Label>
              <p className="text-sm">{formatDisplayName(school.created_by)}</p>
            </div>
          )}

          {school.modified_by && (
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Dimodifikasi Oleh
              </Label>
              <p className="text-sm">{formatDisplayName(school.modified_by)}</p>
            </div>
          )}

          <div className="space-y-1">
            <Label>Status</Label>
            <div>
              <Badge variant={school.is_active ? "success" : "secondary"}>
                {school.is_active ? "Aktif" : "Non-Aktif"}
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
