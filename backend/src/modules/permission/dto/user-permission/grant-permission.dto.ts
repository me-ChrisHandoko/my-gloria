import {
  IsString,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsNumber,
  IsJSON,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GrantPermissionDto {
  @ApiProperty({
    description: 'Permission ID to grant',
  })
  @IsString()
  permissionId: string;

  @ApiPropertyOptional({
    description: 'Whether to grant or deny the permission',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isGranted?: boolean;

  @ApiPropertyOptional({
    description: 'User-specific permission conditions',
  })
  @IsOptional()
  @IsJSON()
  conditions?: any;

  @ApiPropertyOptional({
    description: 'When the permission becomes valid',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({
    description: 'When the permission expires',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiProperty({
    description: 'Reason for granting this permission (required for audit)',
  })
  @IsString()
  grantReason: string;

  @ApiPropertyOptional({
    description: 'Priority for override resolution (higher overrides lower)',
    default: 100,
    minimum: 0,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({
    description: 'Is this a temporary permission',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTemporary?: boolean;
}

export class RevokePermissionDto {
  @ApiProperty({
    description: 'Permission ID to revoke',
  })
  @IsString()
  permissionId: string;

  @ApiProperty({
    description: 'Reason for revoking this permission (required for audit)',
  })
  @IsString()
  revokeReason: string;
}

export class BulkGrantPermissionsDto {
  @ApiProperty({
    description: 'User profile ID to grant permissions to',
  })
  @IsString()
  userProfileId: string;

  @ApiProperty({
    description: 'List of permissions to grant',
    type: [GrantPermissionDto],
  })
  permissions: GrantPermissionDto[];
}
