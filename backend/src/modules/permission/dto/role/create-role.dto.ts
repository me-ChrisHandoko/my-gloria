import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    example: 'ADMIN',
    description: 'Unique role code',
  })
  @IsString()
  code: string;

  @ApiProperty({
    example: 'Administrator',
    description: 'Role display name',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Role description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 1,
    description: 'Hierarchy level (1 = highest)',
    minimum: 1,
  })
  @IsNumber()
  hierarchyLevel: number;

  @ApiPropertyOptional({
    description: 'Is this a system role',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystemRole?: boolean;

  @ApiPropertyOptional({
    description: 'Permission IDs to assign to this role',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];

  @ApiPropertyOptional({
    description: 'Parent role IDs for hierarchy',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  parentRoleIds?: string[];
}
