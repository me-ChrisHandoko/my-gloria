// app/(protected)/akses/modules/[id]/page.tsx
/**
 * Module Detail Page with Hybrid SSR
 * - Server Component for initial data fetch
 * - Client islands for interactive buttons
 */

import { Box, Network, Calendar, Info, User, FileText, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";

import { getModuleById } from "@/lib/server/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import ModuleDetailActions from "@/components/modules/ModuleDetailActions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ModuleDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Server-side data fetching
  const { data: module, error } = await getModuleById(id);

  if (error || !module) {
    return <Alert variant="error">Gagal memuat data module: {error || "Module not found"}</Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{module.name}</h1>
            <Badge variant={module.is_active ? "success" : "secondary"}>
              {module.is_active ? "Aktif" : "Non-Aktif"}
            </Badge>
            <Badge variant={module.is_visible ? "default" : "outline"}>
              {module.is_visible ? (
                <>
                  <Eye className="mr-1 h-3 w-3" />
                  Terlihat
                </>
              ) : (
                <>
                  <EyeOff className="mr-1 h-3 w-3" />
                  Tersembunyi
                </>
              )}
            </Badge>
          </div>
          <p className="text-muted-foreground">Kode: {module.code}</p>
        </div>
        {/* Client Island - Action Buttons */}
        <ModuleDetailActions moduleId={id} moduleName={module.name} />
      </div>

      {/* Informasi Dasar - Static Content (Server Component) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" />
            Informasi Dasar
          </CardTitle>
          <CardDescription>Identitas module</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Kode Module</Label>
            <p className="font-mono text-sm font-medium">{module.code}</p>
          </div>

          <div className="space-y-1">
            <Label>Nama Module</Label>
            <p className="text-sm font-medium">{module.name}</p>
          </div>

          <div className="space-y-1">
            <Label>Kategori</Label>
            <Badge className={getCategoryColor(module.category)}>
              {module.category}
            </Badge>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Parent Module
            </Label>
            <p className="text-sm">
              {module.parent?.name || <span className="text-muted-foreground">Root (Tanpa parent)</span>}
            </p>
          </div>

          {module.icon && (
            <div className="space-y-1">
              <Label>Icon</Label>
              <p className="text-sm font-mono">{module.icon}</p>
            </div>
          )}

          {module.path && (
            <div className="space-y-1">
              <Label>Path URL</Label>
              <p className="text-sm font-mono">{module.path}</p>
            </div>
          )}

          <div className="space-y-1">
            <Label>Urutan Tampilan</Label>
            <p className="text-sm">{module.sort_order}</p>
          </div>

          <div className="space-y-1">
            <Label>Visibilitas</Label>
            <div>
              <Badge variant={module.is_visible ? "default" : "outline"}>
                {module.is_visible ? (
                  <>
                    <Eye className="mr-1 h-3 w-3" />
                    Terlihat di Menu
                  </>
                ) : (
                  <>
                    <EyeOff className="mr-1 h-3 w-3" />
                    Tersembunyi di Menu
                  </>
                )}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deskripsi - Static Content (Server Component) */}
      {module.description && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Deskripsi
            </CardTitle>
            <CardDescription>Informasi tambahan tentang module</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{module.description}</p>
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
            <p className="text-sm">{format(new Date(module.created_at), "dd MMMM yyyy, HH:mm")}</p>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Terakhir Diperbarui
            </Label>
            <p className="text-sm">{format(new Date(module.updated_at), "dd MMMM yyyy, HH:mm")}</p>
          </div>

          {module.created_by && (
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Dibuat Oleh
              </Label>
              <p className="text-sm">{formatDisplayName(module.created_by)}</p>
            </div>
          )}

          {module.modified_by && (
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Dimodifikasi Oleh
              </Label>
              <p className="text-sm">{formatDisplayName(module.modified_by)}</p>
            </div>
          )}

          <div className="space-y-1">
            <Label>Status</Label>
            <div>
              <Badge variant={module.is_active ? "success" : "secondary"}>
                {module.is_active ? "Aktif" : "Non-Aktif"}
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Versi</Label>
            <p className="text-sm">{module.version}</p>
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

// Get category badge color
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    SERVICE: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    PERFORMANCE: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    QUALITY: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    FEEDBACK: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
    TRAINING: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
    SYSTEM: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
  };
  return colors[category] || "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
}

// Optional: Enable revalidation for fresh data
export const revalidate = 0;
