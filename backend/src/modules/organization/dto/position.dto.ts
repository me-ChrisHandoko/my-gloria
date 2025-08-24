import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  MaxLength,
  MinLength,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreatePositionDto {
  @ApiProperty({ description: 'Unique position code', example: 'MGR-IT' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Transform(({ value }) => value?.toUpperCase())
  code: string;

  @ApiProperty({ description: 'Position name', example: 'IT Manager' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Department ID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'School ID' })
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @ApiProperty({
    description: 'Hierarchy level (1=highest)',
    example: 3,
    minimum: 1,
    maximum: 10,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  hierarchyLevel: number;

  @ApiPropertyOptional({
    description: 'Maximum number of holders',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  maxHolders?: number = 1;

  @ApiPropertyOptional({
    description: 'Is unique position (only one holder)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isUnique?: boolean = true;

  @ApiPropertyOptional({ description: 'Active status', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdatePositionDto extends PartialType(CreatePositionDto) {
  @ApiPropertyOptional({ description: 'Modified by user ID' })
  @IsOptional()
  @IsString()
  modifiedBy?: string;
}

export class PositionFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by department ID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by school ID' })
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @ApiPropertyOptional({ description: 'Filter by hierarchy level' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  hierarchyLevel?: number;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by unique positions only' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isUnique?: boolean;

  @ApiPropertyOptional({ description: 'Filter positions with available slots' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasAvailableSlots?: boolean;

  @ApiPropertyOptional({ description: 'Search by name or code' })
  @IsOptional()
  @IsString()
  declare search?: string;
}

export class PositionAvailabilityDto {
  @ApiProperty()
  positionId: string;

  @ApiProperty()
  positionName: string;

  @ApiProperty()
  isAvailable: boolean;

  @ApiProperty()
  maxHolders: number;

  @ApiProperty()
  currentHolders: number;

  @ApiProperty()
  availableSlots: number;

  @ApiProperty({ type: [Object] })
  currentAssignments: Array<{
    userProfileId: string;
    userName: string;
    startDate: Date;
    endDate?: Date;
    isPlt: boolean;
  }>;
}
