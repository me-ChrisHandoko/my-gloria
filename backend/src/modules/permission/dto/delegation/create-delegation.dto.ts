import { IsString, IsNotEmpty, IsArray, IsDateString, IsOptional, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class DelegatedPermission {
  @ApiProperty({ description: 'Permission code' })
  @IsString()
  @IsNotEmpty()
  permission: string;

  @ApiPropertyOptional({ description: 'Permission scope' })
  @IsString()
  @IsOptional()
  scope?: string;
}

export class CreateDelegationDto {
  @ApiProperty({ description: 'User profile ID of the delegate' })
  @IsString()
  @IsNotEmpty()
  delegateId: string;

  @ApiProperty({ 
    description: 'Array of permissions to delegate',
    type: [DelegatedPermission]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DelegatedPermission)
  permissions: DelegatedPermission[];

  @ApiProperty({ description: 'Reason for delegation' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ 
    description: 'Start date of delegation (defaults to now)',
    type: String,
    format: 'date-time'
  })
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiProperty({ 
    description: 'End date of delegation',
    type: String,
    format: 'date-time'
  })
  @IsDateString()
  @IsNotEmpty()
  validUntil: string;
}