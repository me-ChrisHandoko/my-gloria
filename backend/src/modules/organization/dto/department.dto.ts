import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateDepartmentDto {
  @ApiProperty({ description: 'Unique department code', example: 'IT' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  @Transform(({ value }) => value?.toUpperCase())
  code: string;

  @ApiProperty({
    description: 'Department name',
    example: 'Information Technology',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Bagian kerja from data_karyawan' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bagianKerja?: string;

  @ApiPropertyOptional({ description: 'School ID' })
  @IsOptional()
  @IsString()
  schoolId?: string;

  @ApiPropertyOptional({ description: 'Parent department ID for hierarchy' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Department description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Active status', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {
  @ApiPropertyOptional({ description: 'Modified by user ID' })
  @IsOptional()
  @IsString()
  modifiedBy?: string;
}

export class MoveDepartmentDto {
  @ApiProperty({ description: 'Department ID to move' })
  @IsNotEmpty()
  @IsString()
  departmentId: string;

  @ApiPropertyOptional({ description: 'New parent department ID' })
  @IsOptional()
  @IsString()
  newParentId?: string;

  @ApiPropertyOptional({ description: 'New school ID' })
  @IsOptional()
  @IsString()
  newSchoolId?: string;
}

export class DepartmentFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by school ID' })
  @IsOptional()
  @IsString()
  schoolId?: string;

  @ApiPropertyOptional({ description: 'Filter by parent department ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by bagian kerja' })
  @IsOptional()
  @IsString()
  bagianKerja?: string;

  @ApiPropertyOptional({ description: 'Search by name or code' })
  @IsOptional()
  @IsString()
  declare search?: string;

  @ApiPropertyOptional({
    description: 'Include child departments in tree structure',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeChildren?: boolean;
}

export class DepartmentTreeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  bagianKerja?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  level: number;

  @ApiProperty({ type: () => [DepartmentTreeDto] })
  children: DepartmentTreeDto[];

  @ApiProperty()
  employeeCount: number;

  @ApiProperty()
  positionCount: number;
}
