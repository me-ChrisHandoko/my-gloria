// app/(protected)/access/roles/[id]/permissions/page.tsx
/**
 * Role Permissions Management Page
 *
 * Dedicated page for assigning and managing permissions for a specific role.
 * Provides UI for:
 * - Viewing all assigned permissions
 * - Assigning new permissions to the role
 * - Revoking permissions from the role
 * - Search and filter functionality
 */

import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import RolePermissionsManagement from "@/components/roles/RolePermissionsManagement";
import { getRoleById } from "@/lib/server/api";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RolePermissionsPage({ params }: PageProps) {
  const { id } = await params;

  // Server-side data fetching for role info
  const { data: role, error } = await getRoleById(id);

  if (error || !role) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/access/roles">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Roles
            </Link>
          </Button>
        </div>
        <Alert variant="error">
          Gagal memuat data role: {error || "Role not found"}
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/access/roles/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Detail Role
            </Link>
          </Button>
        </div>
      </div>

      {/* Page Title */}
      <div>
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Kelola Permissions: {role.name}
            </h1>
            <p className="text-muted-foreground">
              Kode: {role.code} • Level Hierarki: {role.hierarchy_level}
            </p>
          </div>
        </div>
      </div>

      {/* System Role Warning */}
      {role.is_system_role && (
        <Alert>
          <Shield className="h-4 w-4" />
          <div>
            <p className="font-medium">Role Sistem</p>
            <p className="text-sm">
              Ini adalah role sistem. Hati-hati saat mengelola permissions untuk role ini.
            </p>
          </div>
        </Alert>
      )}

      {/* Main Content - Client Component */}
      <RolePermissionsManagement roleId={id} roleName={role.name} />
    </div>
  );
}

// Optional: Enable revalidation for fresh data
export const revalidate = 0;
