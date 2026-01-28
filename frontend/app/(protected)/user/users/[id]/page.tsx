"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, Mail, Shield, Briefcase, X } from "lucide-react";

import { useGetUserByIdQuery, useGetUserRolesQuery, useRevokeRoleFromUserMutation, useGetUserPositionsQuery, useRevokePositionFromUserMutation } from "@/lib/store/services/usersApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Alert } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AssignRoleDialog } from "@/components/users/AssignRoleDialog";
import { AssignPositionDialog } from "@/components/users/AssignPositionDialog";
import { toast } from "sonner";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function UserDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const [revokingRoleId, setRevokingRoleId] = useState<string | null>(null);
    const [revokingPositionId, setRevokingPositionId] = useState<string | null>(null);

    // Dialog state for role revoke confirmation
    const [revokeRoleDialogOpen, setRevokeRoleDialogOpen] = useState(false);
    const [pendingRoleRevoke, setPendingRoleRevoke] = useState<{ id: string; name: string } | null>(null);

    // Dialog state for position revoke confirmation
    const [revokePositionDialogOpen, setRevokePositionDialogOpen] = useState(false);
    const [pendingPositionRevoke, setPendingPositionRevoke] = useState<{ id: string; name: string } | null>(null);

    const { data: user, isLoading, error } = useGetUserByIdQuery(id);
    const { data: userRoles, isLoading: isLoadingRoles } = useGetUserRolesQuery(id);
    const { data: userPositions, isLoading: isLoadingPositions } = useGetUserPositionsQuery(id);
    const [revokeRole, { isLoading: isRevoking }] = useRevokeRoleFromUserMutation();
    const [revokePosition] = useRevokePositionFromUserMutation();

    // Open role revoke confirmation dialog
    const openRevokeRoleDialog = (roleAssignmentId: string, roleName: string) => {
        setPendingRoleRevoke({ id: roleAssignmentId, name: roleName });
        setRevokeRoleDialogOpen(true);
    };

    // Confirm role revoke
    const handleConfirmRevokeRole = async () => {
        if (!pendingRoleRevoke) return;

        setRevokingRoleId(pendingRoleRevoke.id);
        try {
            await revokeRole({ userId: id, roleAssignmentId: pendingRoleRevoke.id }).unwrap();
            toast.success(`Role "${pendingRoleRevoke.name}" berhasil di-revoke`);
        } catch (err) {
            console.error("Failed to revoke role:", err);
            toast.error("Gagal revoke role");
        } finally {
            setRevokingRoleId(null);
            setRevokeRoleDialogOpen(false);
            setPendingRoleRevoke(null);
        }
    };

    // Open position revoke confirmation dialog
    const openRevokePositionDialog = (positionAssignmentId: string, positionName: string) => {
        setPendingPositionRevoke({ id: positionAssignmentId, name: positionName });
        setRevokePositionDialogOpen(true);
    };

    // Confirm position revoke
    const handleConfirmRevokePosition = async () => {
        if (!pendingPositionRevoke) return;

        setRevokingPositionId(pendingPositionRevoke.id);
        try {
            await revokePosition({ userId: id, positionAssignmentId: pendingPositionRevoke.id }).unwrap();
            toast.success(`Posisi "${pendingPositionRevoke.name}" berhasil di-revoke`);
        } catch (err) {
            console.error("Failed to revoke position:", err);
            toast.error("Gagal revoke posisi");
        } finally {
            setRevokingPositionId(null);
            setRevokePositionDialogOpen(false);
            setPendingPositionRevoke(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <LoadingSpinner />
            </div>
        );
    }

    if (error || !user) {
        return <Alert variant="error">Gagal memuat data pengguna</Alert>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">Detail Pengguna</h1>
                    </div>
                    <p className="text-muted-foreground">
                        {user.name || user.username || user.email} • ID: {user.id}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => router.push("/user/users")}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Kembali ke Daftar
                    </Button>
                    <Button onClick={() => router.push(`/user/users/${id}/edit`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Pengguna
                    </Button>
                </div>
            </div>

            {/* Two Cards Side by Side */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Account Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Informasi Akun</CardTitle>
                        <CardDescription>Detail akun pengguna</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                <span className="font-medium">Email:</span>
                            </div>
                            <div>{user.email}</div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground font-medium">Username:</div>
                            <div>{user.username || "-"}</div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground font-medium">User ID:</div>
                            <div className="font-mono text-sm">{user.id}</div>
                        </div>
                    </CardContent>
                </Card>

                {/* Roles, Permissions & Modules */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Roles, Permissions & Modules
                        </CardTitle>
                        <CardDescription>Peran dan akses sistem</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Roles Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold text-muted-foreground">Roles</div>
                                <AssignRoleDialog userId={id} assignedRoleIds={userRoles?.map((r) => r.role_id) || []} />
                            </div>
                            {isLoadingRoles ? (
                                <div className="text-sm text-muted-foreground">Loading roles...</div>
                            ) : userRoles && userRoles.length > 0 ? (
                                <div className="space-y-2">
                                    {userRoles.map((roleAssignment) => (
                                        <div key={roleAssignment.id} className="flex items-center justify-between p-2 border rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-sm">
                                                    {roleAssignment.role?.name || "Unknown Role"}
                                                </Badge>
                                                {roleAssignment.role?.hierarchy_level && <span className="text-xs text-muted-foreground">Level {roleAssignment.role.hierarchy_level}</span>}
                                                {!roleAssignment.is_active && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Tidak Aktif
                                                    </Badge>
                                                )}
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => openRevokeRoleDialog(roleAssignment.id, roleAssignment.role?.name || "Unknown Role")} disabled={revokingRoleId === roleAssignment.id}>
                                                <X className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">Belum ada role</div>
                            )}
                        </div>

                        <Separator />

                        {/* Positions Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                    <Briefcase className="h-4 w-4" />
                                    Posisi Jabatan
                                </div>
                                <AssignPositionDialog userId={id} assignedPositionIds={userPositions?.map((p) => p.position_id) || []} />
                            </div>
                            {isLoadingPositions ? (
                                <div className="text-sm text-muted-foreground">Loading positions...</div>
                            ) : userPositions && userPositions.length > 0 ? (
                                <div className="space-y-2">
                                    {userPositions.map((positionAssignment) => (
                                        <div key={positionAssignment.id} className="flex items-center justify-between p-2 border rounded-lg">
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">{positionAssignment.position?.name || "Unknown Position"}</span>
                                                    {positionAssignment.is_plt && (
                                                        <Badge variant="warning" className="text-xs py-0">
                                                            PLT
                                                        </Badge>
                                                    )}
                                                    {!positionAssignment.is_active && (
                                                        <Badge variant="secondary" className="text-xs py-0">
                                                            Tidak Aktif
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground space-y-1">
                                                    {positionAssignment.sk_number && <div>SK: {positionAssignment.sk_number}</div>}
                                                    <div className="flex gap-3">
                                                        <span>Mulai: {new Date(positionAssignment.start_date).toLocaleDateString("id-ID")}</span>
                                                        {positionAssignment.end_date && <span>Berakhir: {new Date(positionAssignment.end_date).toLocaleDateString("id-ID")}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => openRevokePositionDialog(positionAssignment.id, positionAssignment.position?.name || "Unknown Position")} disabled={revokingPositionId === positionAssignment.id}>
                                                <X className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">Belum ada posisi</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Data Karyawan - Full Width Below */}
            <Card>
                <CardHeader>
                    <CardTitle>Data Karyawan</CardTitle>
                    <CardDescription>Informasi kepegawaian</CardDescription>
                </CardHeader>
                <CardContent>
                    {user.data_karyawan ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground font-medium">NIP:</div>
                                <div className="font-medium">{user.data_karyawan.nip}</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground font-medium">Nama Lengkap:</div>
                                <div className="font-medium">{user.data_karyawan.full_name}</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground font-medium">Bagian Kerja:</div>
                                <div>{user.data_karyawan.departemen || "-"}</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground font-medium">Bidang Kerja:</div>
                                <div>{user.data_karyawan.jabatan || "-"}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">Belum ada data karyawan terkait dengan user ini</div>
                    )}
                </CardContent>
            </Card>

            {/* Role Revoke Confirmation Dialog */}
            <AlertDialog open={revokeRoleDialogOpen} onOpenChange={setRevokeRoleDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Revoke Role</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin me-revoke role <strong>{pendingRoleRevoke?.name}</strong> dari user ini?
                            <br />
                            <br />
                            User tidak akan memiliki akses yang terkait dengan role ini setelah di-revoke.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingRoleRevoke(null)}>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmRevokeRole} disabled={revokingRoleId !== null} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {revokingRoleId ? (
                                <>
                                    <LoadingSpinner />
                                    <span className="ml-2">Revoking...</span>
                                </>
                            ) : (
                                "Ya, Revoke Role"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Position Revoke Confirmation Dialog */}
            <AlertDialog open={revokePositionDialogOpen} onOpenChange={setRevokePositionDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Konfirmasi Revoke Posisi</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin me-revoke posisi <strong>{pendingPositionRevoke?.name}</strong> dari user ini?
                            <br />
                            <br />
                            User tidak akan memiliki jabatan ini setelah di-revoke.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingPositionRevoke(null)}>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmRevokePosition} disabled={revokingPositionId !== null} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {revokingPositionId ? (
                                <>
                                    <LoadingSpinner />
                                    <span className="ml-2">Revoking...</span>
                                </>
                            ) : (
                                "Ya, Revoke Posisi"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
