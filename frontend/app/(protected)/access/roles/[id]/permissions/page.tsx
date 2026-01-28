// app/(protected)/access/roles/[id]/permissions/page.tsx
/**
 * Role Permissions Management Page
 *
 * Client Component that uses RTK Query for data fetching.
 * This ensures proper token refresh handling on 401 errors.
 *
 * Provides UI for:
 * - Viewing all assigned permissions
 * - Assigning new permissions to the role
 * - Revoking permissions from the role
 * - Search and filter functionality
 */
"use client";

import { use } from "react";
import { ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import RolePermissionsManagement from "@/components/roles/RolePermissionsManagement";
import { AssignPermissionDialog } from "@/components/roles/AssignPermissionDialog";
import { useGetRoleByIdQuery, useGetRoleWithPermissionsQuery } from "@/lib/store/services/rolesApi";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RolePermissionsPage({ params }: PageProps) {
  // Use React.use() for client-side param resolution
  const { id } = use(params);

  // Client-side data fetching with automatic token refresh on 401
  const { data: role, isLoading, error } = useGetRoleByIdQuery(id);
  const { data: roleWithPermissions, refetch } = useGetRoleWithPermissionsQuery(id);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (error || !role) {
    const errorMessage = error
      ? "status" in error
        ? (error.data as { message?: string; error?: string })?.message ||
          (error.data as { message?: string; error?: string })?.error ||
          `Error ${error.status}`
        : error.message || "Unknown error"
      : "Role not found";

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
          Gagal memuat data role: {errorMessage}
        </Alert>
      </div>
    );
  }

  const assignedPermissionIds = roleWithPermissions?.permissions?.map((p) => p.id) || [];

  return (
    <div className="space-y-6">
      {/* Header - Same pattern as detail page */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Kelola Permissions</h1>
            <Badge variant={role.is_active ? "success" : "secondary"}>
              {role.is_active ? "Aktif" : "Non-Aktif"}
            </Badge>
            {role.is_system_role && (
              <Badge variant="secondary">Sistem</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Role: {role.name} • Kode: {role.code}
          </p>
        </div>
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/access/roles/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Detail Role
            </Link>
          </Button>
          <AssignPermissionDialog
            roleId={id}
            roleName={role.name}
            assignedPermissionIds={assignedPermissionIds}
            onSuccess={refetch}
          />
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
      <RolePermissionsManagement roleId={id} roleName={role.name} hideHeader />
    </div>
  );
}
