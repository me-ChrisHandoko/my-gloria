import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  MinLength,
  MaxLength,
  IsNotEmpty,
  Matches,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  Module,
  ModuleWithRelations,
  ModulePermission,
  RoleModuleAccess,
  UserModuleAccess,
  UserOverride,
} from '../interfaces/module-management.interface';

export enum ModuleCategory {
  SERVICE = 'SERVICE',
  PERFORMANCE = 'PERFORMANCE',
  QUALITY = 'QUALITY',
  FEEDBACK = 'FEEDBACK',
  TRAINING = 'TRAINING',
  SYSTEM = 'SYSTEM',
}

export class CreateModuleDto {
  @ApiProperty({
    description: 'Module code',
    example: 'USER_MANAGEMENT',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'Code must be uppercase with underscores only',
  })
  @Transform(({ value }) => value?.trim().toUpperCase())
  code: string;

  @ApiProperty({
    description: 'Module name',
    example: 'User Management',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    message:
      'Name can only contain alphanumeric characters, spaces, hyphens, and underscores',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Module description',
    example: 'Module for managing users and their profiles',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => {
    // Sanitize HTML and trim whitespace
    if (!value) return value;
    return value
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
      .trim();
  })
  description?: string;

  @ApiProperty({
    description: 'Module category',
    enum: ModuleCategory,
    example: ModuleCategory.SERVICE,
  })
  @IsEnum(ModuleCategory)
  category: ModuleCategory;

  @ApiPropertyOptional({
    description: 'Module icon',
    example: 'users',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9\-_]+$/, {
    message:
      'Icon name can only contain alphanumeric characters, hyphens, and underscores',
  })
  @Transform(({ value }) => value?.trim())
  icon?: string;

  @ApiPropertyOptional({
    description: 'Module route path',
    example: '/users',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^\/[a-zA-Z0-9\-_\/]*$/, {
    message: 'Path must start with / and contain only valid URL characters',
  })
  @Transform(({ value }) => value?.trim())
  path?: string;

  @ApiPropertyOptional({
    description: 'Parent module ID',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Display order',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Is module active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the module is visible in navigation',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({
    description: 'Required subscription plan for access',
    example: 'premium',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9\-_]+$/, {
    message:
      'Plan name can only contain alphanumeric characters, hyphens, and underscores',
  })
  @Transform(({ value }) => value?.trim())
  requiredPlan?: string;
}

export class UpdateModuleDto {
  @ApiPropertyOptional({
    description: 'Module name',
    example: 'User Management',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    message:
      'Name can only contain alphanumeric characters, spaces, hyphens, and underscores',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Module description',
    example: 'Module for managing users and their profiles',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => {
    // Sanitize HTML and trim whitespace
    if (!value) return value;
    return value
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
      .trim();
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Module category',
    enum: ModuleCategory,
    example: ModuleCategory.SERVICE,
  })
  @IsOptional()
  @IsEnum(ModuleCategory)
  category?: ModuleCategory;

  @ApiPropertyOptional({
    description: 'Module icon',
    example: 'users',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9\-_]+$/, {
    message:
      'Icon name can only contain alphanumeric characters, hyphens, and underscores',
  })
  @Transform(({ value }) => value?.trim())
  icon?: string;

  @ApiPropertyOptional({
    description: 'Module route path',
    example: '/users',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^\/[a-zA-Z0-9\-_\/]*$/, {
    message: 'Path must start with / and contain only valid URL characters',
  })
  @Transform(({ value }) => value?.trim())
  path?: string;

  @ApiPropertyOptional({
    description: 'Parent module ID',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Display order',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Is module active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the module is visible in navigation',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({
    description: 'Required subscription plan for access',
    example: 'premium',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9\-_]+$/, {
    message:
      'Plan name can only contain alphanumeric characters, hyphens, and underscores',
  })
  @Transform(({ value }) => value?.trim())
  requiredPlan?: string;
}

export class ModuleResponseDto implements Module {
  @ApiProperty({
    description: 'Module ID',
    example: 'uuid-string',
  })
  id: string;

  @ApiProperty({
    description: 'Module code',
    example: 'USER_MANAGEMENT',
  })
  code: string;

  @ApiProperty({
    description: 'Module name',
    example: 'User Management',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Module description',
    example: 'Module for managing users',
  })
  description: string | null;

  @ApiProperty({
    description: 'Module category',
    enum: ModuleCategory,
  })
  category: ModuleCategory;

  @ApiPropertyOptional({
    description: 'Module icon',
    example: 'users',
  })
  icon: string | null;

  @ApiPropertyOptional({
    description: 'Module route path',
    example: '/users',
  })
  path: string | null;

  @ApiPropertyOptional({
    description: 'Parent module ID',
    example: 'uuid-string',
  })
  parentId: string | null;

  @ApiProperty({
    description: 'Display order',
    example: 1,
  })
  sortOrder: number;

  @ApiProperty({
    description: 'Is module active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Is module visible in navigation',
    example: true,
  })
  isVisible: boolean;

  @ApiPropertyOptional({
    description: 'Required subscription plan',
    example: 'premium',
  })
  requiredPlan: string | null;

  @ApiProperty({
    description: 'Version number for optimistic locking',
    example: 0,
  })
  version: number;

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
}

export class ModuleWithRelationsDto
  extends ModuleResponseDto
  implements ModuleWithRelations
{
  @ApiPropertyOptional({
    description: 'Parent module',
    type: () => ModuleResponseDto,
  })
  @Type(() => ModuleResponseDto)
  parent?: Module | null;

  @ApiPropertyOptional({
    description: 'Child modules',
    type: () => [ModuleResponseDto],
  })
  @Type(() => ModuleResponseDto)
  children?: Module[];

  @ApiPropertyOptional({
    description: 'Module permissions',
    type: () => [Object],
  })
  permissions?: ModulePermission[];

  @ApiPropertyOptional({
    description: 'Role access configurations',
    type: () => [Object],
  })
  roleAccess?: RoleModuleAccess[];

  @ApiPropertyOptional({
    description: 'User access configurations',
    type: () => [Object],
  })
  userAccess?: UserModuleAccess[];

  @ApiPropertyOptional({
    description: 'User permission overrides',
    type: () => [Object],
  })
  overrides?: UserOverride[];
}
