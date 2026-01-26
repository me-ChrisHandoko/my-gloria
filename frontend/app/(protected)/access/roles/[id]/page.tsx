// app/(protected)/access/roles/[id]/page.tsx
/**
 * Role Detail Page - Pure CSR Pattern
 *
 * Client Component that uses RTK Query for data fetching.
 * This ensures proper token refresh handling on 401 errors.
 *
 * Benefits:
 * - Automatic token refresh via baseQueryWithReauth
 * - Consistent with other protected pages (dashboard, profile)
 * - Simpler code with single data flow
 * - Built-in caching via RTK Query
 */
"use client";

import { use } from "react";
import { Shield, Calendar, Info, User, FileText, Award } from "lucide-react";
import { format } from "date-fns";

import { useGetRoleByIdQuery } from "@/lib/store/services/rolesApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import RoleDetailActions from "@/components/roles/RoleDetailActions";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function RoleDetailPage({ params }: PageProps) {
    // Use React.use() for client-side param resolution
    const { id } = use(params);

    // Client-side data fetching with automatic token refresh on 401
    const { data: role, isLoading, error } = useGetRoleByIdQuery(id);

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
        const errorMessage = error ? ("status" in error ? (error.data as { message?: string; error?: string })?.message || (error.data as { message?: string; error?: string })?.error || `Error ${error.status}` : error.message || "Unknown error") : "Role not found";

        return <Alert variant="error">Gagal memuat data role: {errorMessage}</Alert>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{role.name}</h1>
                    </div>
                    <p className="text-muted-foreground">Kode: {role.code}</p>
                </div>
                {/* Client Island - Action Buttons */}
                <RoleDetailActions roleId={id} roleName={role.name} />
            </div>

            {/* Informasi Dasar */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Informasi Dasar
                    </CardTitle>
                    <CardDescription>Identitas role dan hierarki</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-4">
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
                        <Label>Kode Role</Label>
                        <p className="font-mono text-sm font-medium">{role.code}</p>
                    </div>

                    <div className="space-y-1">
                        <Label>Nama Role</Label>
                        <p className="text-sm font-medium">{role.name}</p>
                    </div>

                    <div className="space-y-1">
                        <Label>Tipe Role</Label>
                        <p className="text-sm">{role.is_system_role ? <Badge variant="secondary">Role Sistem</Badge> : <Badge variant="default">Role Custom</Badge>}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Deskripsi */}
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

            {/* Informasi Tambahan */}
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
                            <Badge variant={role.is_active ? "success" : "secondary"}>{role.is_active ? "Aktif" : "Non-Aktif"}</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Label component for consistent styling
function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <label className={`text-sm font-medium text-muted-foreground ${className}`}>{children}</label>;
}

// Format name: replace _ with space and capitalize each word
function formatDisplayName(name: string): string {
    return name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
