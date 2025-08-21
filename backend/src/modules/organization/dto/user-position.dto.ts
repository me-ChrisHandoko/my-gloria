import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export enum PermissionScopeEnum {
  OWN = 'OWN',
  DEPARTMENT = 'DEPARTMENT',
  SCHOOL = 'SCHOOL',
  ALL = 'ALL',
}

export class AssignPositionDto {
  @ApiProperty({ description: 'User profile ID' })
  @IsNotEmpty()
  @IsUUID()
  userProfileId: string;

  @ApiProperty({ description: 'Position ID to assign' })
  @IsNotEmpty()
  @IsUUID()
  positionId: string;

  @ApiProperty({ description: 'Assignment start date', example: '2024-01-01' })
  @IsNotEmpty()
  @IsDateString()
  startDate: Date;

  @ApiPropertyOptional({
    description: 'Assignment end date',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Is PLT (acting) position',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPlt?: boolean = false;

  @ApiPropertyOptional({ description: 'SK (appointment letter) number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  skNumber?: string;

  @ApiPropertyOptional({ description: 'Assignment notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ description: 'Appointed by (Clerk user ID)' })
  @IsOptional()
  @IsString()
  appointedBy?: string;

  @ApiPropertyOptional({
    description: 'Permission scope for this position',
    enum: PermissionScopeEnum,
  })
  @IsOptional()
  @IsEnum(PermissionScopeEnum)
  permissionScope?: PermissionScopeEnum;
}

export class TerminatePositionDto {
  @ApiProperty({ description: 'User position ID to terminate' })
  @IsNotEmpty()
  @IsUUID()
  userPositionId: string;

  @ApiProperty({ description: 'Termination date', example: '2024-06-30' })
  @IsNotEmpty()
  @IsDateString()
  endDate: Date;

  @ApiPropertyOptional({ description: 'Termination reason' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class TransferPositionDto {
  @ApiProperty({ description: 'User profile ID' })
  @IsNotEmpty()
  @IsUUID()
  userProfileId: string;

  @ApiProperty({ description: 'Current position ID' })
  @IsNotEmpty()
  @IsUUID()
  fromPositionId: string;

  @ApiProperty({ description: 'New position ID' })
  @IsNotEmpty()
  @IsUUID()
  toPositionId: string;

  @ApiProperty({ description: 'Transfer date', example: '2024-07-01' })
  @IsNotEmpty()
  @IsDateString()
  transferDate: Date;

  @ApiPropertyOptional({ description: 'Transfer reason' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ description: 'New SK number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  skNumber?: string;
}

export class UserPositionFilterDto {
  @ApiPropertyOptional({ description: 'Filter by user profile ID' })
  @IsOptional()
  @IsUUID()
  userProfileId?: string;

  @ApiPropertyOptional({ description: 'Filter by position ID' })
  @IsOptional()
  @IsUUID()
  positionId?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by PLT status' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isPlt?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by start date (from)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDateFrom?: Date;

  @ApiPropertyOptional({
    description: 'Filter by start date (to)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  startDateTo?: Date;

  @ApiPropertyOptional({ description: 'Include historical records' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeHistory?: boolean;
}

export class UserPositionHistoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  positionId: string;

  @ApiProperty()
  positionName: string;

  @ApiProperty()
  departmentName?: string;

  @ApiProperty()
  schoolName?: string;

  @ApiProperty()
  startDate: Date;

  @ApiPropertyOptional()
  endDate?: Date;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isPlt: boolean;

  @ApiPropertyOptional()
  skNumber?: string;

  @ApiPropertyOptional()
  appointedBy?: string;

  @ApiProperty()
  duration: string; // e.g., "2 years 3 months"
}
