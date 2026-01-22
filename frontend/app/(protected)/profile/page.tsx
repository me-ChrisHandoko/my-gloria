// app/(protected)/profile/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useGetCurrentUserQuery } from '@/lib/store/services/authApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/alert';
import { Mail, User as UserIcon, Briefcase, Building, Edit, Lock } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { data: user, isLoading, error } = useGetCurrentUserQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !user) {
    return <Alert variant="error">Gagal memuat data profil</Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profil Saya</h1>
          <p className="text-muted-foreground">
            Kelola informasi akun dan data pribadi Anda
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/profile/edit')}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profil
          </Button>
          <Button variant="outline" onClick={() => router.push('/change-password')}>
            <Lock className="mr-2 h-4 w-4" />
            Ubah Password
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Akun</CardTitle>
            <CardDescription>Detail akun dan status autentikasi</CardDescription>
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserIcon className="h-4 w-4" />
                <span className="font-medium">Username:</span>
              </div>
              <div>{user.username || '-'}</div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">
                Status Akun:
              </div>
              <div>
                <Badge variant={user.is_active ? 'success' : 'secondary'}>
                  {user.is_active ? 'Aktif' : 'Non-Aktif'}
                </Badge>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">
                User ID:
              </div>
              <div className="font-mono text-sm">{user.id}</div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Data */}
        {user.data_karyawan ? (
          <Card>
            <CardHeader>
              <CardTitle>Data Karyawan</CardTitle>
              <CardDescription>Informasi kepegawaian YPK Gloria</CardDescription>
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
                  {user.data_karyawan.full_name || user.data_karyawan.nama || '-'}
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="h-4 w-4" />
                  <span className="font-medium">Bagian Kerja:</span>
                </div>
                <div>{user.data_karyawan.departemen || user.data_karyawan.bagian_kerja || '-'}</div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  <span className="font-medium">Jenis Karyawan:</span>
                </div>
                <div>{user.data_karyawan.jenis_karyawan || '-'}</div>
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
                Belum ada data karyawan terkait dengan akun ini
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Additional Information */}
      {user.roles && user.roles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Roles & Permissions</CardTitle>
            <CardDescription>Peran dan akses sistem Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground font-medium mb-2">Roles:</div>
                <div className="flex flex-wrap gap-2">
                  {user.roles.map((role) => (
                    <Badge key={role.id} variant="outline">
                      {role.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Positions */}
      {user.positions && user.positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Posisi Jabatan</CardTitle>
            <CardDescription>Posisi dan tanggung jawab Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.positions.map((position) => (
                <div key={position.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">{position.position?.name || '-'}</div>
                    <div className="text-sm text-muted-foreground">
                      {position.is_plt && <Badge variant="warning" className="mr-2">PLT</Badge>}
                      {position.sk_number && <span>SK: {position.sk_number}</span>}
                    </div>
                  </div>
                  <Badge variant={position.is_active ? 'success' : 'secondary'}>
                    {position.is_active ? 'Aktif' : 'Non-Aktif'}
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
