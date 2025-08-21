import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
  IsJSON,
  MaxLength,
} from 'class-validator';

export class CreateUserProfileDto {
  @ApiProperty({ description: 'Clerk User ID', example: 'user_2abc123' })
  @IsString()
  @IsNotEmpty()
  clerkUserId: string;

  @ApiProperty({
    description: 'NIP (Nomor Induk Pegawai) from data_karyawan',
    example: '2024001',
    maxLength: 15,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  nip: string;

  @ApiPropertyOptional({
    description: 'Is user a superadmin',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isSuperadmin?: boolean;

  @ApiPropertyOptional({
    description: 'Is user active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'User preferences as JSON',
    example: { theme: 'dark', language: 'id' },
  })
  @IsOptional()
  @IsJSON()
  preferences?: any;

  @ApiPropertyOptional({
    description: 'Clerk user ID who created this profile',
  })
  @IsString()
  @IsOptional()
  createdBy?: string;
}
