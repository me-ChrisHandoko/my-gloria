// app/(protected)/organisasi/posisi/[id]/page.tsx
/**
 * Position Detail Page with Hybrid SSR
 * - Server Component for initial data fetch
 * - Client islands for interactive buttons
 */

import { Briefcase, Layers, Building2, Network, Calendar, Info, User, Users } from "lucide-react";
import { format } from "date-fns";

import { getPositionById } from "@/lib/server/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import PositionDetailActions from "@/components/positions/PositionDetailActions";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function PositionDetailPage({ params }: PageProps) {
    const { id } = await params;

    // Server-side data fetching
    const { data: position, error } = await getPositionById(id);

    if (error || !position) {
        return <Alert variant="error">Gagal memuat data posisi: {error || "Position not found"}</Alert>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{position.name}</h1>
                    </div>
                    <p className="text-muted-foreground">Kode: {position.code}</p>
                </div>
                {/* Client Island - Action Buttons */}
                <PositionDetailActions positionId={id} positionName={position.name} />
            </div>

            {/* Informasi Dasar - Static Content (Server Component) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Informasi Dasar
                    </CardTitle>
                    <CardDescription>Identitas posisi</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                        <Label>Kode Posisi</Label>
                        <p className="font-mono text-sm font-medium">{position.code}</p>
                    </div>

                    <div className="space-y-1">
                        <Label>Nama Posisi</Label>
                        <p className="text-sm font-medium">{position.name}</p>
                    </div>

                    <div className="space-y-1">
                        <Label className="flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            Level Hierarki
                        </Label>
                        <p className="text-sm">
                            <Badge variant="outline" className="font-mono">
                                Level {position.hierarchy_level}
                            </Badge>
                        </p>
                    </div>

                    <div className="space-y-1">
                        <Label className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Maksimal Pemegang
                        </Label>
                        <p className="text-sm">{position.max_holders || 1} orang</p>
                    </div>

                    <div className="space-y-1">
                        <Label>Posisi Unik</Label>
                        <p className="text-sm">
                            <Badge variant={position.is_unique ? "default" : "secondary"}>{position.is_unique ? "Ya" : "Tidak"}</Badge>
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Organisasi - Static Content (Server Component) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Organisasi
                    </CardTitle>
                    <CardDescription>Hubungan dengan departemen dan sekolah</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                        <Label className="flex items-center gap-2">
                            <Network className="h-4 w-4" />
                            Departemen
                        </Label>
                        <p className="text-sm">{position.department ? position.department.name : <span className="text-muted-foreground">Tidak terkait departemen</span>}</p>
                    </div>

                    <div className="space-y-1">
                        <Label className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Sekolah
                        </Label>
                        <p className="text-sm">{position.school ? position.school.name : <span className="text-muted-foreground">Tidak terkait sekolah</span>}</p>
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
                        <p className="text-sm">{format(new Date(position.created_at), "dd MMMM yyyy, HH:mm")}</p>
                    </div>

                    <div className="space-y-1">
                        <Label className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Terakhir Diperbarui
                        </Label>
                        <p className="text-sm">{format(new Date(position.updated_at), "dd MMMM yyyy, HH:mm")}</p>
                    </div>

                    {position.created_by && (
                        <div className="space-y-1">
                            <Label className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Dibuat Oleh
                            </Label>
                            <p className="text-sm">{formatDisplayName(position.created_by)}</p>
                        </div>
                    )}

                    {position.modified_by && (
                        <div className="space-y-1">
                            <Label className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Dimodifikasi Oleh
                            </Label>
                            <p className="text-sm">{formatDisplayName(position.modified_by)}</p>
                        </div>
                    )}

                    <div className="space-y-1">
                        <Label>Status</Label>
                        <div>
                            <Badge variant={position.is_active ? "success" : "secondary"}>{position.is_active ? "Aktif" : "Non-Aktif"}</Badge>
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

// Optional: Enable revalidation for fresh data
export const revalidate = 0;
