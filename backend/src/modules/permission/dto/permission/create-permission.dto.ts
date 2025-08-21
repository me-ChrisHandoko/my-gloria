import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsJSON,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionAction, PermissionScope } from '@prisma/client';

export class CreatePermissionDto {
  @ApiProperty({
    example: 'workorder.create',
    description: 'Unique permission code',
  })
  @IsString()
  code: string;

  @ApiProperty({
    example: 'Create Work Order',
    description: 'Human readable permission name',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Permission description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'workorder',
    description: 'Resource being protected',
  })
  @IsString()
  resource: string;

  @ApiProperty({
    enum: PermissionAction,
    example: PermissionAction.CREATE,
    description: 'Action type',
  })
  @IsEnum(PermissionAction)
  action: PermissionAction;

  @ApiPropertyOptional({
    enum: PermissionScope,
    example: PermissionScope.DEPARTMENT,
    description: 'Permission scope',
  })
  @IsOptional()
  @IsEnum(PermissionScope)
  scope?: PermissionScope;

  @ApiPropertyOptional({
    description: 'Permission group ID',
  })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({
    description: 'Additional conditions for permission',
    example: { field: 'status', operator: '=', value: 'draft' },
  })
  @IsOptional()
  @IsJSON()
  conditions?: any;

  @ApiPropertyOptional({
    description: 'Additional metadata for UI/frontend use',
  })
  @IsOptional()
  @IsJSON()
  metadata?: any;

  @ApiPropertyOptional({
    description: 'Is this a system permission',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystemPermission?: boolean;

  @ApiPropertyOptional({
    description: 'Permission dependencies (permission IDs)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];
}
