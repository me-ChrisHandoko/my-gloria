// app/(protected)/dashboard/page.tsx
'use client';

import { useGetCurrentUserQuery } from '@/lib/store/services/authApi';
import { useGetKaryawansQuery } from '@/lib/store/services/employeesApi';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, Briefcase } from 'lucide-react';

export default function DashboardPage() {
  const { data: user, isLoading, error } = useGetCurrentUserQuery();
  const { data: karyawanData, isLoading: isLoadingKaryawan } = useGetKaryawansQuery();

  // Helper function to get full name
  const getFullName = () => {
    if (!user?.data_karyawan) return user?.email || 'User';

    const { full_name, firstname, lastname, nama } = user.data_karyawan;

    // Priority: full_name > firstname + lastname > firstname only > nama (legacy) > email
    if (full_name) {
      return full_name;
    }
    if (firstname && lastname) {
      return `${firstname} ${lastname}`;
    }
    if (firstname) {
      return firstname;
    }
    if (nama) {
      return nama;
    }
    return user?.email || 'User';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">Failed to load user data</Alert>;
  }

  // Calculate statistics (only active employees)
  const totalKaryawan = karyawanData?.total || 0;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="rounded-lg border bg-card p-6">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Selamat datang, {getFullName()}!
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Karyawan Aktif</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoadingKaryawan ? '-' : totalKaryawan}
            </div>
            <p className="text-xs text-muted-foreground">
              Total karyawan dengan status aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departemen</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user?.data_karyawan?.departemen || user?.data_karyawan?.bagian_kerja || '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              Departemen Anda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jabatan</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user?.data_karyawan?.jabatan || user?.data_karyawan?.bidang_kerja || '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              Jabatan Anda
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Akun</CardTitle>
          <CardDescription>Detail akun dan status Anda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="font-medium">{user?.email}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Username</div>
              <div className="font-medium">{user?.username || 'N/A'}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Status Akun</div>
              <div>
                <Badge variant={user?.is_active ? 'success' : 'destructive'}>
                  {user?.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Email Verified</div>
              <div>
                <Badge variant={user?.email_verified ? 'success' : 'warning'}>
                  {user?.email_verified ? 'Verified' : 'Not Verified'}
                </Badge>
              </div>
            </div>
          </div>

          {user?.data_karyawan && (
            <>
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold mb-3">Data Karyawan</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">NIP</div>
                    <div className="font-medium">{user.data_karyawan.nip}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Nama Lengkap</div>
                    <div className="font-medium">
                      {getFullName()}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Departemen</div>
                    <div className="font-medium">
                      {user.data_karyawan.departemen || user.data_karyawan.bagian_kerja || '-'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Jabatan</div>
                    <div className="font-medium">
                      {user.data_karyawan.jabatan || user.data_karyawan.bidang_kerja || '-'}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
