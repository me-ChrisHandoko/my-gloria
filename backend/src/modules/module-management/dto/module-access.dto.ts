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

export class ModuleAccessResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  moduleId: string;

  @ApiPropertyOptional()
  roleId?: string;

  @ApiPropertyOptional()
  userProfileId?: string;

  @ApiPropertyOptional()
  positionId?: string;

  @ApiProperty({
    description: 'Permissions JSON array',
    example: ['CREATE', 'READ', 'UPDATE'],
  })
  permissions: PermissionAction[];

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  validFrom?: Date;

  @ApiPropertyOptional()
  validUntil?: Date;

  @ApiPropertyOptional()
  reason?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  module?: any;

  @ApiPropertyOptional()
  role?: any;

  @ApiPropertyOptional()
  userProfile?: any;

  @ApiPropertyOptional()
  position?: any;
}

export class UserModulePermissionDto {
  @ApiProperty()
  moduleId: string;

  @ApiProperty()
  moduleCode: string;

  @ApiProperty()
  moduleName: string;

  @ApiProperty({
    description: 'Permissions array',
    example: ['CREATE', 'READ', 'UPDATE'],
  })
  permissions: PermissionAction[];

  @ApiProperty({
    description: 'Source of permission',
    enum: ['ROLE', 'USER', 'OVERRIDE'],
  })
  source: 'ROLE' | 'USER' | 'OVERRIDE';

  @ApiPropertyOptional()
  validUntil?: Date;
}

export class UserOverrideResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userProfileId: string;

  @ApiProperty()
  moduleId: string;

  @ApiProperty()
  permissionType: PermissionAction;

  @ApiProperty()
  isGranted: boolean;

  @ApiProperty()
  validFrom: Date;

  @ApiPropertyOptional()
  validUntil?: Date;

  @ApiProperty()
  reason: string;

  @ApiProperty()
  grantedBy: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  module?: any;

  @ApiPropertyOptional()
  userProfile?: any;
}