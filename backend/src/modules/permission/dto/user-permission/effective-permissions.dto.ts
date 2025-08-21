import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionAction, PermissionScope } from '@prisma/client';

export class EffectivePermissionDto {
  @ApiProperty({
    description: 'Permission ID',
  })
  id: string;

  @ApiProperty({
    description: 'Permission code',
  })
  code: string;

  @ApiProperty({
    description: 'Permission name',
  })
  name: string;

  @ApiProperty({
    description: 'Resource being protected',
  })
  resource: string;

  @ApiProperty({
    enum: PermissionAction,
    description: 'Action type',
  })
  action: PermissionAction;

  @ApiPropertyOptional({
    enum: PermissionScope,
    description: 'Permission scope',
  })
  scope?: PermissionScope;

  @ApiProperty({
    description: 'Source of the permission',
    enum: ['role', 'direct', 'policy', 'inherited', 'resource'],
  })
  source: 'role' | 'direct' | 'policy' | 'inherited' | 'resource';

  @ApiPropertyOptional({
    description: 'Role or policy that granted this permission',
  })
  grantedBy?: string;

  @ApiPropertyOptional({
    description: 'Additional conditions for this permission',
  })
  conditions?: any;

  @ApiPropertyOptional({
    description: 'Priority level (for conflict resolution)',
  })
  priority?: number;

  @ApiPropertyOptional({
    description: 'When the permission expires',
  })
  validUntil?: Date;
}

export class UserPermissionSummaryDto {
  @ApiProperty({
    description: 'User profile ID',
  })
  userProfileId: string;

  @ApiProperty({
    description: 'User name',
  })
  userName: string;

  @ApiProperty({
    description: 'Is user a superadmin',
  })
  isSuperadmin: boolean;

  @ApiProperty({
    description: 'List of effective permissions',
    type: [EffectivePermissionDto],
  })
  permissions: EffectivePermissionDto[];

  @ApiProperty({
    description: 'List of active roles',
  })
  roles: Array<{
    id: string;
    code: string;
    name: string;
    hierarchyLevel: number;
  }>;

  @ApiPropertyOptional({
    description: 'List of active policies',
  })
  policies?: Array<{
    id: string;
    code: string;
    name: string;
    type: string;
  }>;

  @ApiProperty({
    description: 'Permission statistics',
  })
  statistics: {
    totalPermissions: number;
    directPermissions: number;
    rolePermissions: number;
    inheritedPermissions: number;
    deniedPermissions: number;
  };

  @ApiProperty({
    description: 'When this summary was generated',
  })
  generatedAt: Date;

  @ApiPropertyOptional({
    description: 'Cache expiry time',
  })
  cacheExpiresAt?: Date;
}
