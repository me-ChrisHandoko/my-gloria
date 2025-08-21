'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Building2, Mail, Phone, MapPin, Briefcase } from 'lucide-react';

export function UserInfoCard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [employeeInfo, setEmployeeInfo] = useState<any>(null);

  useEffect(() => {
    // Try to get employee info from localStorage (set by AuthWrapper)
    const storedInfo = localStorage.getItem('employeeInfo');
    if (storedInfo) {
      try {
        setEmployeeInfo(JSON.parse(storedInfo));
      } catch (error) {
        console.error('Failed to parse employee info:', error);
      }
    }
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px] mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  // Use user data from Redux store or employee info from localStorage
  const displayName = user?.name || employeeInfo?.nama || 'Unknown User';
  const nip = user?.nip || employeeInfo?.nip || 'N/A';
  const email = user?.email || user?.dataKaryawan?.email || '';
  const phone = user?.phone || user?.dataKaryawan?.noPonsel || '';
  const department = user?.employee?.department || user?.dataKaryawan?.bagianKerja || '';
  const location = user?.employee?.location || user?.dataKaryawan?.lokasi || '';
  const position = user?.employee?.position || user?.dataKaryawan?.bidangKerja || '';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Employee Information
        </CardTitle>
        <CardDescription>
          Welcome back to YPK Gloria Internal System
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {/* Primary Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Full Name</p>
              <p className="text-lg font-semibold">{displayName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">NIP</p>
              <p className="text-lg font-mono font-semibold">{nip}</p>
            </div>
          </div>

          {/* Contact Info */}
          {(email || phone) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              {email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-sm">{email}</p>
                  </div>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p className="text-sm">{phone}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Work Info */}
          {(department || location || position) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
              {department && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Department</p>
                    <p className="text-sm">{department}</p>
                  </div>
                </div>
              )}
              {location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Location</p>
                    <p className="text-sm">{location}</p>
                  </div>
                </div>
              )}
              {position && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Position</p>
                    <p className="text-sm">{position}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin Badge */}
          {user?.isSuperadmin && (
            <div className="pt-2 border-t">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                System Administrator
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}