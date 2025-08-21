import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({
    description: 'User profile ID to assign role to',
  })
  @IsString()
  userProfileId: string;

  @ApiPropertyOptional({
    description: 'When the role assignment becomes valid',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({
    description: 'When the role assignment expires',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class RevokeRoleDto {
  @ApiProperty({
    description: 'User profile ID to revoke role from',
  })
  @IsString()
  userProfileId: string;
}

export class RolePermissionDto {
  @ApiProperty({
    description: 'Permission ID',
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
    description: 'Additional conditions for this permission',
  })
  @IsOptional()
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

  @ApiPropertyOptional({
    description: 'Reason for granting this permission',
  })
  @IsOptional()
  @IsString()
  grantReason?: string;
}
