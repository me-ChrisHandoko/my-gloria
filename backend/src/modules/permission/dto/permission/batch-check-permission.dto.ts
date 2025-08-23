import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionAction, PermissionScope } from '@prisma/client';
import { Type } from 'class-transformer';

export class PermissionCheckItem {
  @ApiProperty({
    example: 'workorder',
    description: 'Resource to check permission for',
  })
  @IsString()
  resource: string;

  @ApiProperty({
    enum: PermissionAction,
    example: PermissionAction.CREATE,
    description: 'Action to check permission for',
  })
  @IsEnum(PermissionAction)
  action: PermissionAction;

  @ApiPropertyOptional({
    enum: PermissionScope,
    description: 'Scope to check permission for',
  })
  @IsOptional()
  @IsEnum(PermissionScope)
  scope?: PermissionScope;

  @ApiPropertyOptional({
    description: 'Specific resource ID to check permission for',
  })
  @IsOptional()
  @IsString()
  resourceId?: string;
}

export class BatchCheckPermissionDto {
  @ApiProperty({
    description: 'User profile ID to check permissions for',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    type: [PermissionCheckItem],
    description: 'List of permissions to check',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PermissionCheckItem)
  permissions: PermissionCheckItem[];
}

export class BatchPermissionCheckResultDto {
  @ApiProperty({
    type: 'object',
    description: 'Map of permission check results keyed by resource:action:scope',
    additionalProperties: {
      type: 'object',
      properties: {
        isAllowed: { type: 'boolean' },
        reason: { type: 'string' },
        grantedBy: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  results: Record<string, {
    isAllowed: boolean;
    reason?: string;
    grantedBy?: string[];
  }>;

  @ApiProperty({
    description: 'Total time taken to check all permissions (ms)',
  })
  totalDuration: number;

  @ApiProperty({
    description: 'Number of permissions checked',
  })
  totalChecked: number;

  @ApiProperty({
    description: 'Number of permissions allowed',
  })
  totalAllowed: number;

  @ApiProperty({
    description: 'Number of cache hits',
  })
  cacheHits: number;
}