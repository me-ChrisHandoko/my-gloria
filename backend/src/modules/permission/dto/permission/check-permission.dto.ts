import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionAction, PermissionScope } from '@prisma/client';

export class CheckPermissionDto {
  @ApiProperty({
    description: 'User profile ID to check permissions for',
  })
  @IsString()
  userId: string;

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

export class PermissionCheckResultDto {
  @ApiProperty({
    description: 'Whether the permission is allowed',
  })
  isAllowed: boolean;

  @ApiPropertyOptional({
    description: 'Reason why permission was denied',
  })
  reason?: string;

  @ApiPropertyOptional({
    description: 'Sources that granted the permission',
    type: [String],
  })
  grantedBy?: string[];

  @ApiPropertyOptional({
    description: 'Time taken to check permission (ms)',
  })
  checkDuration?: number;
}
