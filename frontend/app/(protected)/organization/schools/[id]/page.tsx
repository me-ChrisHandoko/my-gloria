// app/(protected)/organization/schools/[id]/page.tsx
/**
 * School Detail Page - Pure CSR Pattern
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
import { Building2, MapPin, Phone, Mail, User, Calendar, Info } from "lucide-react";
import { format } from "date-fns";

import { useGetSchoolByIdQuery } from "@/lib/store/services/organizationApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SchoolDetailActions from "@/components/schools/SchoolDetailActions";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function SchoolDetailPage({ params }: PageProps) {
    // Use React.use() for client-side param resolution
    const { id } = use(params);

    // Client-side data fetching with automatic token refresh on 401
    const { data: school, isLoading, error } = useGetSchoolByIdQuery(id);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <LoadingSpinner />
            </div>
        );
    }

    // Error state
    if (error || !school) {
        const errorMessage = error
            ? "status" in error
                ? (error.data as { message?: string; error?: string })?.message ||
                  (error.data as { message?: string; error?: string })?.error ||
                  `Error ${error.status}`
                : error.message || "Unknown error"
            : "School not found";

        return <Alert variant="error">Gagal memuat data sekolah: {errorMessage}</Alert>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{school.name}</h1>
                    </div>
                    <p className="text-muted-foreground">Kode: {school.code}</p>
                </div>
                {/* Action Buttons */}
                <SchoolDetailActions schoolId={id} schoolName={school.name} />
            </div>

            {/* Informasi Dasar */}
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
                        <p className="text-sm">
                            {school.lokasi || <span className="text-muted-foreground">-</span>}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <Label className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Kepala Sekolah
                        </Label>
                        <p className="text-sm">
                            {school.principal || <span className="text-muted-foreground">-</span>}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Kontak */}
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
                        <p className="text-sm">
                            {school.address || <span className="text-muted-foreground">-</span>}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <Label className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Nomor Telepon
                        </Label>
                        <p className="text-sm">
                            {school.phone || <span className="text-muted-foreground">-</span>}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <Label className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email
                        </Label>
                        <p className="text-sm">
                            {school.email || <span className="text-muted-foreground">-</span>}
                        </p>
                    </div>
                </CardContent>
            </Card>

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
    return <label className={`text-sm font-medium text-muted-foreground ${className}`}>{children}</label>;
}

// Format name: replace _ with space and capitalize each word
function formatDisplayName(name: string): string {
    return name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
