import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserProfile, DataKaryawan } from '@prisma/client';

export class UserProfileDto {
  @ApiProperty({ description: 'User profile ID', example: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Clerk User ID', example: 'user_2abc123' })
  clerkUserId: string;

  @ApiProperty({
    description: 'NIP (Nomor Induk Pegawai)',
    example: '2024001',
  })
  nip: string;

  @ApiProperty({
    description: 'Is user a superadmin',
    default: false,
  })
  isSuperadmin: boolean;

  @ApiProperty({
    description: 'Account active status',
    default: true,
  })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Last active timestamp' })
  lastActive?: Date;

  @ApiPropertyOptional({
    description: 'User preferences as JSON',
    example: { theme: 'dark', language: 'id' },
  })
  preferences?: any;

  @ApiProperty({ description: 'Profile creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Profile last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Clerk user ID who created this profile',
  })
  createdBy?: string;

  @ApiProperty({ description: 'Linked employee data from data_karyawan' })
  dataKaryawan?: Partial<DataKaryawan>;

  constructor(partial: Partial<UserProfileDto>) {
    Object.assign(this, partial);
  }

  static fromPrisma(
    userProfile: UserProfile & { dataKaryawan?: DataKaryawan | null },
  ): UserProfileDto {
    return new UserProfileDto({
      id: userProfile.id,
      clerkUserId: userProfile.clerkUserId,
      nip: userProfile.nip,
      isSuperadmin: userProfile.isSuperadmin,
      isActive: userProfile.isActive,
      lastActive: userProfile.lastActive || undefined,
      preferences: userProfile.preferences || undefined,
      createdAt: userProfile.createdAt,
      updatedAt: userProfile.updatedAt,
      createdBy: userProfile.createdBy || undefined,
      dataKaryawan: userProfile.dataKaryawan
        ? {
            nip: userProfile.dataKaryawan.nip,
            nama: userProfile.dataKaryawan.nama,
            jenisKelamin: userProfile.dataKaryawan.jenisKelamin,
            tglMulaiBekerja: userProfile.dataKaryawan.tglMulaiBekerja,
            tglTetap: userProfile.dataKaryawan.tglTetap,
            status: userProfile.dataKaryawan.status,
            waktuKerjaKependidikan:
              userProfile.dataKaryawan.waktuKerjaKependidikan,
            bagianKerja: userProfile.dataKaryawan.bagianKerja,
            lokasi: userProfile.dataKaryawan.lokasi,
            bidangKerja: userProfile.dataKaryawan.bidangKerja,
            jenisKaryawan: userProfile.dataKaryawan.jenisKaryawan,
            statusAktif: userProfile.dataKaryawan.statusAktif,
            noPonsel: userProfile.dataKaryawan.noPonsel,
            email: userProfile.dataKaryawan.email,
            birthdate: userProfile.dataKaryawan.birthdate,
            rfid: userProfile.dataKaryawan.rfid,
          }
        : undefined,
    });
  }
}
