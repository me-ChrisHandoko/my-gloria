import { IsString, IsOptional, IsBoolean, IsArray, IsObject, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PermissionTemplateCategory {
  DEFAULT = 'default',
  DEPARTMENT_HEAD = 'department_head',
  VIEWER = 'viewer',
  EDITOR = 'editor',
  ADMIN = 'admin',
  CUSTOM = 'custom',
}

export class PermissionItem {
  @ApiProperty({ description: 'Permission code' })
  @IsString()
  @IsNotEmpty()
  permission: string;

  @ApiPropertyOptional({ description: 'Permission scope' })
  @IsString()
  @IsOptional()
  scope?: string;

  @ApiPropertyOptional({ description: 'Additional conditions' })
  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;
}

export class ModuleAccessItem {
  @ApiProperty({ description: 'Module name' })
  @IsString()
  @IsNotEmpty()
  module: string;

  @ApiProperty({ description: 'Allowed actions', isArray: true, type: String })
  @IsArray()
  @IsString({ each: true })
  actions: string[];
}

export class CreatePermissionTemplateDto {
  @ApiProperty({ description: 'Unique template code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Template name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    description: 'Template category',
    enum: PermissionTemplateCategory
  })
  @IsEnum(PermissionTemplateCategory)
  category: PermissionTemplateCategory;

  @ApiProperty({ 
    description: 'Array of permissions',
    type: [PermissionItem]
  })
  @IsArray()
  permissions: PermissionItem[];

  @ApiPropertyOptional({ 
    description: 'Module access configuration',
    type: [ModuleAccessItem]
  })
  @IsArray()
  @IsOptional()
  moduleAccess?: ModuleAccessItem[];

  @ApiPropertyOptional({ 
    description: 'Whether this is a system template (cannot be modified)',
    default: false
  })
  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;
}