"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2, Mail, UserCheck, UserX, Shield, Briefcase } from "lucide-react";

import { useGetUserByIdQuery } from "@/lib/store/services/usersApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Alert } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UserDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data: user, isLoading, error } = useGetUserByIdQuery(id);

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
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{user.username || user.email}</h1>
            <p className="text-muted-foreground">ID: {user.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/pengguna/${id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Hapus
          </Button>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex gap-2">
        <Badge variant={user.is_active ? "success" : "secondary"}>
          {user.is_active ? (
            <>
              <UserCheck className="mr-1 h-3 w-3" />
              Aktif
            </>
          ) : (
            <>
              <UserX className="mr-1 h-3 w-3" />
              Non-Aktif
            </>
          )}
        </Badge>
        <Badge variant={user.email_verified ? "success" : "warning"}>
          {user.email_verified ? "Email Terverifikasi" : "Email Belum Terverifikasi"}
        </Badge>
      </div>

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

        {/* Employee Data if available */}
        {user.data_karyawan ? (
          <Card>
            <CardHeader>
              <CardTitle>Data Karyawan</CardTitle>
              <CardDescription>Informasi kepegawaian</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium">NIP:</div>
                <div className="font-medium">{user.data_karyawan.nip}</div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium">Nama Lengkap:</div>
                <div className="font-medium">
                  {user.data_karyawan.firstname} {user.data_karyawan.lastname}
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium">Departemen:</div>
                <div>{user.data_karyawan.departemen || "-"}</div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium">Jabatan:</div>
                <div>{user.data_karyawan.jabatan || "-"}</div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Data Karyawan</CardTitle>
              <CardDescription>Informasi kepegawaian</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Belum ada data karyawan terkait dengan user ini
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Roles */}
      {user.roles && user.roles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Roles
            </CardTitle>
            <CardDescription>Peran dan akses sistem user ini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <Badge key={role.id} variant="outline" className="text-sm">
                  {role.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    Level {role.hierarchy_level}
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Positions */}
      {user.positions && user.positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Posisi Jabatan
            </CardTitle>
            <CardDescription>Posisi dan tanggung jawab user ini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.positions.map((position) => (
                <div key={position.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">{position.position?.name || "-"}</div>
                    <div className="text-sm text-muted-foreground">
                      {position.is_plt && <Badge variant="warning" className="mr-2">PLT</Badge>}
                      {position.sk_number && <span>SK: {position.sk_number}</span>}
                    </div>
                  </div>
                  <Badge variant={position.is_active ? "success" : "secondary"}>
                    {position.is_active ? "Aktif" : "Non-Aktif"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
