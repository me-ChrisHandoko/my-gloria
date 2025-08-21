import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @MinLength(3)
  @MaxLength(50)
  code: string;

  @ApiProperty({
    description: 'Module name',
    example: 'User Management',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Module description',
    example: 'Module for managing users and their profiles',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
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
  icon?: string;

  @ApiPropertyOptional({
    description: 'Module route path',
    example: '/users',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
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
  @IsNumber()
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
    description: 'Whether the module requires authentication',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
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
  name?: string;

  @ApiPropertyOptional({
    description: 'Module description',
    example: 'Module for managing users and their profiles',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
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
  icon?: string;

  @ApiPropertyOptional({
    description: 'Module route path',
    example: '/users',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
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
  @IsNumber()
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
    description: 'Whether the module requires authentication',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  requiredPlan?: string;
}

export class ModuleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  category: string;  // Prisma returns enum as string

  @ApiPropertyOptional()
  icon?: string | null;

  @ApiPropertyOptional()
  path?: string | null;

  @ApiPropertyOptional()
  parentId?: string | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isVisible: boolean;

  @ApiPropertyOptional()
  requiredPlan?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  parent?: any;

  @ApiPropertyOptional()
  children?: any[];

  @ApiPropertyOptional()
  permissions?: any[];

  @ApiPropertyOptional()
  roleAccess?: any[];

  @ApiPropertyOptional()
  userAccess?: any[];

  @ApiPropertyOptional()
  overrides?: any[];
}