// app/(protected)/access/permissions/[id]/page.tsx
/**
 * Permission Detail Page - Pure CSR Pattern
 *
 * Client Component that uses RTK Query for data fetching.
 * This ensures proper token refresh handling on 401 errors.
 *
 * Benefits:
 * - Automatic token refresh via baseQueryWithReauth
 * - Consistent with other protected pages (roles, modules)
 * - Simpler code with single data flow
 * - Built-in caching via RTK Query
 */
"use client";

import { use } from "react";
import { Key, Lock, Shield, Tag, Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";

import { useGetPermissionByIdQuery } from "@/lib/store/services/permissionsApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import PermissionDetailActions from "@/components/permissions/PermissionDetailActions";

interface PageProps {
    params: Promise<{ id: string }>;
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <p className={`text-sm font-medium text-muted-foreground ${className}`}>{children}</p>;
}

export default function PermissionDetailPage({ params }: PageProps) {
    // Use React.use() for client-side param resolution
    const { id } = use(params);

    // Client-side data fetching with automatic token refresh on 401
    const { data: permission, isLoading, error } = useGetPermissionByIdQuery(id);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <LoadingSpinner />
            </div>
        );
    }

    // Error state
    if (error || !permission) {
        const errorMessage = error
            ? "status" in error
                ? (error.data as { message?: string; error?: string })?.message ||
                  (error.data as { message?: string; error?: string })?.error ||
                  `Error ${error.status}`
                : error.message || "Unknown error"
            : "Permission not found";

        return <Alert variant="error">Gagal memuat data permission: {errorMessage}</Alert>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{permission.name}</h1>
                    </div>
                    <p className="text-muted-foreground font-mono text-sm">{permission.code}</p>
                </div>
                {/* Action Buttons */}
                <PermissionDetailActions
                    permissionId={id}
                    permissionName={permission.name}
                    isSystemPermission={permission.is_system_permission}
                />
            </div>

            {/* Informasi Dasar */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        Informasi Dasar
                    </CardTitle>
                    <CardDescription>Identitas permission</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                        <Label>Kode Permission</Label>
                        <p className="font-mono text-sm font-medium">{permission.code}</p>
                    </div>

                    <div className="space-y-1">
                        <Label>Nama Permission</Label>
                        <p className="text-sm font-medium">{permission.name}</p>
                    </div>

                    <div className="space-y-1">
                        <Label>Status</Label>
                        <div>
                            <Badge variant={permission.is_active ? "success" : "destructive"}>
                                {permission.is_active ? "Aktif" : "Non-Aktif"}
                            </Badge>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label>Tipe</Label>
                        <div>
                            <Badge
                                variant={permission.is_system_permission ? "outline" : "default"}
                                className="gap-1"
                            >
                                {permission.is_system_permission ? (
                                    <>
                                        <Shield className="h-3 w-3" />
                                        System Permission
                                    </>
                                ) : (
                                    "Custom Permission"
                                )}
                            </Badge>
                        </div>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                        <Label>Deskripsi</Label>
                        <p className="text-sm">{permission.description || "-"}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Detail Permission */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Detail Permission
                    </CardTitle>
                    <CardDescription>Resource, action, dan scope</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-1">
                        <Label>Resource</Label>
                        <div>
                            <Badge variant="secondary">{permission.resource}</Badge>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label>Action</Label>
                        <div>
                            <Badge variant="default">{permission.action}</Badge>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label>Scope</Label>
                        <div>
                            {permission.scope ? (
                                <Badge variant="outline">{permission.scope}</Badge>
                            ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label>Category</Label>
                        <div>
                            {permission.category ? (
                                <Badge variant="outline" className="gap-1">
                                    <Tag className="h-3 w-3" />
                                    {permission.category}
                                </Badge>
                            ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Informasi Grouping */}
            {(permission.group_name || permission.group_icon || permission.group_sort_order !== null) && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Tag className="h-5 w-5" />
                            Informasi Grouping
                        </CardTitle>
                        <CardDescription>Untuk tampilan UI dan navigasi</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        {permission.group_name && (
                            <div className="space-y-1">
                                <Label>Group Name</Label>
                                <p className="text-sm font-medium">{permission.group_name}</p>
                            </div>
                        )}

                        {permission.group_icon && (
                            <div className="space-y-1">
                                <Label>Group Icon</Label>
                                <p className="text-sm font-mono">{permission.group_icon}</p>
                            </div>
                        )}

                        {permission.group_sort_order !== null && permission.group_sort_order !== undefined && (
                            <div className="space-y-1">
                                <Label>Sort Order</Label>
                                <p className="text-sm font-medium">{permission.group_sort_order}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Metadata */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Metadata
                    </CardTitle>
                    <CardDescription>Informasi sistem</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                        <Label className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Dibuat Oleh
                        </Label>
                        <p className="text-sm">
                            {permission.created_by || <span className="text-muted-foreground">System</span>}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <Label className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Dibuat Pada
                        </Label>
                        <p className="text-sm">
                            {permission.created_at
                                ? format(new Date(permission.created_at), "dd MMM yyyy, HH:mm")
                                : "-"}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <Label className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Diperbarui Pada
                        </Label>
                        <p className="text-sm">
                            {permission.updated_at
                                ? format(new Date(permission.updated_at), "dd MMM yyyy, HH:mm")
                                : "-"}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
