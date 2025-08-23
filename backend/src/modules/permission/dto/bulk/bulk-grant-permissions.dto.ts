import { IsString, IsArray, IsNotEmpty, IsOptional, ValidateNested, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum BulkTargetType {
  USERS = 'users',
  ROLES = 'roles',
}

export class BulkPermissionItem {
  @ApiProperty({ description: 'Permission code' })
  @IsString()
  @IsNotEmpty()
  permissionCode: string;

  @ApiPropertyOptional({ description: 'Permission scope' })
  @IsString()
  @IsOptional()
  scope?: string;

  @ApiPropertyOptional({ description: 'Additional conditions' })
  @IsOptional()
  conditions?: any;
}

export class BulkGrantPermissionsDto {
  @ApiProperty({ 
    description: 'Target type',
    enum: BulkTargetType
  })
  @IsEnum(BulkTargetType)
  targetType: BulkTargetType;

  @ApiProperty({ 
    description: 'Array of target IDs (User profile IDs or Role IDs)',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  targetIds: string[];

  @ApiProperty({ 
    description: 'Array of permissions to grant',
    type: [BulkPermissionItem]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkPermissionItem)
  permissions: BulkPermissionItem[];

  @ApiPropertyOptional({ description: 'Reason for bulk grant' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ 
    description: 'Skip validation of existing permissions',
    default: false
  })
  @IsOptional()
  skipExistingCheck?: boolean;
}