import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDelegationDto {
  @ApiProperty({ description: 'Profile ID of the person to delegate to' })
  @IsString()
  delegateProfileId: string;

  @ApiPropertyOptional({ description: 'Specific module for delegation (null for all)' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiProperty({ description: 'Start date of delegation' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date of delegation' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Reason for delegation' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateDelegationDto {
  @ApiPropertyOptional({ description: 'Profile ID of the person to delegate to' })
  @IsOptional()
  @IsString()
  delegateProfileId?: string;

  @ApiPropertyOptional({ description: 'Specific module for delegation (null for all)' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ description: 'Start date of delegation' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date of delegation' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Reason for delegation' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Is delegation active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class DelegationFilterDto {
  @ApiPropertyOptional({ description: 'Filter by delegator profile ID' })
  @IsOptional()
  @IsString()
  delegatorProfileId?: string;

  @ApiPropertyOptional({ description: 'Filter by delegate profile ID' })
  @IsOptional()
  @IsString()
  delegateProfileId?: string;

  @ApiPropertyOptional({ description: 'Filter by module' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by date (checks if delegation is active on this date)' })
  @IsOptional()
  @IsDateString()
  activeOn?: string;
}