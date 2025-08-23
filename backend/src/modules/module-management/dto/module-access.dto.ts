import {
  IsUUID,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsArray,
  IsString,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionAction } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  RoleModuleAccess,
  UserModuleAccess,
  UserOverride,
  Module,
  Role,
  UserProfile,
  Position,
  UserModulePermissionSummary,
} from '../interfaces/module-management.interface';

export class CreateRoleModuleAccessDto {
  @ApiProperty({
    description: 'Role ID',
    example: 'uuid-string',
  })
  @IsUUID()
  roleId: string;

  @ApiProperty({
    description: 'Module ID',
    example: 'uuid-string',
  })
  @IsUUID()
  moduleId: string;

  @ApiPropertyOptional({
    description: 'Position ID (optional)',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsUUID()
  positionId?: string;

  @ApiProperty({
    description: 'Permissions array',
    example: ['CREATE', 'READ', 'UPDATE'],
    enum: PermissionAction,
    isArray: true,
  })
  @IsArray()
  @IsEnum(PermissionAction, { each: true })
  permissions: PermissionAction[];

  @ApiPropertyOptional({
    description: 'Is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateUserModuleAccessDto {
  @ApiProperty({
    description: 'User Profile ID',
    example: 'uuid-string',
  })
  @IsUUID()
  userProfileId: string;

  @ApiProperty({
    description: 'Module ID',
    example: 'uuid-string',
  })
  @IsUUID()
  moduleId: string;

  @ApiProperty({
    description: 'Permissions array',
    example: ['CREATE', 'READ', 'UPDATE'],
    enum: PermissionAction,
    isArray: true,
  })
  @IsArray()
  @IsEnum(PermissionAction, { each: true })
  permissions: PermissionAction[];

  @ApiPropertyOptional({
    description: 'Valid from date',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({
    description: 'Valid until date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({
    description: 'Reason for granting access',
    example: 'Temporary access for project XYZ',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateUserOverrideDto {
  @ApiProperty({
    description: 'User Profile ID',
    example: 'uuid-string',
  })
  @IsUUID()
  userProfileId: string;

  @ApiProperty({
    description: 'Module ID',
    example: 'uuid-string',
  })
  @IsUUID()
  moduleId: string;

  @ApiProperty({
    description: 'Permission type to override',
    enum: PermissionAction,
    example: PermissionAction.CREATE,
  })
  @IsEnum(PermissionAction)
  permissionType: PermissionAction;

  @ApiProperty({
    description: 'Whether permission is granted or revoked',
    example: true,
  })
  @IsBoolean()
  isGranted: boolean;

  @ApiPropertyOptional({
    description: 'Valid until date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiProperty({
    description: 'Reason for override',
    example: 'Emergency access for critical issue',
  })
  @IsString()
  reason: string;
}

export class UpdateModuleAccessDto {
  @ApiPropertyOptional({
    description: 'Permissions array',
    example: ['CREATE', 'READ', 'UPDATE'],
    enum: PermissionAction,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(PermissionAction, { each: true })
  permissions?: PermissionAction[];

  @ApiPropertyOptional({
    description: 'Is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Valid until date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class BulkModuleAccessDto {
  @ApiProperty({
    description: 'Module IDs to grant access to',
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  moduleIds: string[];

  @ApiProperty({
    description: 'Role or User Profile ID',
    example: 'uuid-string',
  })
  @IsUUID()
  targetId: string;

  @ApiProperty({
    description: 'Target type',
    enum: ['ROLE', 'USER'],
    example: 'ROLE',
  })
  targetType: 'ROLE' | 'USER';

  @ApiProperty({
    description: 'Permissions array',
    example: ['READ'],
    enum: PermissionAction,
    isArray: true,
  })
  @IsArray()
  @IsEnum(PermissionAction, { each: true })
  permissions: PermissionAction[];

  @ApiPropertyOptional({
    description: 'Position ID (for role access)',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsUUID()
  positionId?: string;
}

export class RoleModuleAccessResponseDto implements Partial<RoleModuleAccess> {
  @ApiProperty({
    description: 'Access ID',
    example: 'uuid-string',
  })
  id: string;

  @ApiProperty({
    description: 'Role ID',
    example: 'uuid-string',
  })
  roleId: string;

  @ApiProperty({
    description: 'Module ID',
    example: 'uuid-string',
  })
  moduleId: string;

  @ApiPropertyOptional({
    description: 'Position ID',
    example: 'uuid-string',
  })
  positionId: string | null;

  @ApiProperty({
    description: 'Permissions array',
    example: ['CREATE', 'READ', 'UPDATE'],
    enum: PermissionAction,
    isArray: true,
  })
  permissions: PermissionAction[];

  @ApiProperty({
    description: 'Is access active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
  })
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  @Type(() => Date)
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Module details',
    type: () => Object,
  })
  module?: Module;

  @ApiPropertyOptional({
    description: 'Role details',
    type: () => Object,
  })
  role?: Role;

  @ApiPropertyOptional({
    description: 'Position details',
    type: () => Object,
  })
  position?: Position;
}

export class UserModuleAccessResponseDto implements Partial<UserModuleAccess> {
  @ApiProperty({
    description: 'Access ID',
    example: 'uuid-string',
  })
  id: string;

  @ApiProperty({
    description: 'User Profile ID',
    example: 'uuid-string',
  })
  userProfileId: string;

  @ApiProperty({
    description: 'Module ID',
    example: 'uuid-string',
  })
  moduleId: string;

  @ApiProperty({
    description: 'Permissions array',
    example: ['CREATE', 'READ', 'UPDATE'],
    enum: PermissionAction,
    isArray: true,
  })
  permissions: PermissionAction[];

  @ApiProperty({
    description: 'Is access active',
    example: true,
  })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Valid from date',
  })
  @Type(() => Date)
  validFrom: Date | null;

  @ApiPropertyOptional({
    description: 'Valid until date',
  })
  @Type(() => Date)
  validUntil: Date | null;

  @ApiPropertyOptional({
    description: 'Reason for access',
    example: 'Temporary project access',
  })
  reason: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
  })
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  @Type(() => Date)
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Module details',
    type: () => Object,
  })
  module?: Module;

  @ApiPropertyOptional({
    description: 'User profile details',
    type: () => Object,
  })
  userProfile?: UserProfile;
}

export class UserModulePermissionDto implements UserModulePermissionSummary {
  @ApiProperty({
    description: 'Module ID',
    example: 'uuid-string',
  })
  moduleId: string;

  @ApiProperty({
    description: 'Module code',
    example: 'USER_MANAGEMENT',
  })
  moduleCode: string;

  @ApiProperty({
    description: 'Module name',
    example: 'User Management',
  })
  moduleName: string;

  @ApiProperty({
    description: 'Permissions array',
    example: ['CREATE', 'READ', 'UPDATE'],
    enum: PermissionAction,
    isArray: true,
  })
  permissions: PermissionAction[];

  @ApiProperty({
    description: 'Source of permission',
    enum: ['ROLE', 'USER', 'OVERRIDE'],
    example: 'ROLE',
  })
  source: 'ROLE' | 'USER' | 'OVERRIDE';

  @ApiPropertyOptional({
    description: 'Valid until date',
  })
  @Type(() => Date)
  validUntil?: Date | null;
}

// For backward compatibility
export type ModuleAccessResponseDto =
  | RoleModuleAccessResponseDto
  | UserModuleAccessResponseDto;

export class UserOverrideResponseDto implements UserOverride {
  @ApiProperty({
    description: 'Override ID',
    example: 'uuid-string',
  })
  id: string;

  @ApiProperty({
    description: 'User Profile ID',
    example: 'uuid-string',
  })
  userProfileId: string;

  @ApiProperty({
    description: 'Module ID',
    example: 'uuid-string',
  })
  moduleId: string;

  @ApiProperty({
    description: 'Permission type',
    enum: PermissionAction,
    example: PermissionAction.CREATE,
  })
  permissionType: PermissionAction;

  @ApiProperty({
    description: 'Is permission granted',
    example: true,
  })
  isGranted: boolean;

  @ApiProperty({
    description: 'Valid from date',
  })
  @Type(() => Date)
  validFrom: Date;

  @ApiPropertyOptional({
    description: 'Valid until date',
  })
  @Type(() => Date)
  validUntil: Date | null;

  @ApiProperty({
    description: 'Reason for override',
    example: 'Emergency access for critical issue',
  })
  reason: string;

  @ApiProperty({
    description: 'ID of user who granted the override',
    example: 'uuid-string',
  })
  grantedBy: string;

  @ApiProperty({
    description: 'Creation timestamp',
  })
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  @Type(() => Date)
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Module details',
    type: () => Object,
  })
  module?: Module;

  @ApiPropertyOptional({
    description: 'User profile details',
    type: () => Object,
  })
  userProfile?: UserProfile;
}
