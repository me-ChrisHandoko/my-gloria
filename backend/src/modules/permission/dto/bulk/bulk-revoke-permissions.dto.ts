import { IsString, IsArray, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BulkTargetType } from './bulk-grant-permissions.dto';

export class BulkRevokePermissionsDto {
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
    description: 'Array of permission codes to revoke',
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  permissionCodes: string[];

  @ApiPropertyOptional({ description: 'Reason for bulk revoke' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ 
    description: 'Force revoke even if permission is required by role',
    default: false
  })
  @IsOptional()
  forceRevoke?: boolean;
}