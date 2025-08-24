import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateSchoolDto {
  @ApiProperty({ description: 'Unique school code', example: 'SD01' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  @Transform(({ value }) => value?.toUpperCase())
  code: string;

  @ApiProperty({ description: 'School name', example: 'SD Gloria 1' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Location code from data_karyawan',
    example: 'LOC01',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  lokasi?: string;

  @ApiPropertyOptional({ description: 'School address' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({
    description: 'School phone number',
    example: '021-12345678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'School email',
    example: 'sd1@gloria.sch.id',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @ApiPropertyOptional({ description: 'Principal name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  principal?: string;

  @ApiPropertyOptional({ description: 'Active status', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateSchoolDto extends PartialType(CreateSchoolDto) {
  @ApiPropertyOptional({ description: 'Modified by user ID' })
  @IsOptional()
  @IsString()
  modifiedBy?: string;
}

export class SchoolFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by location' })
  @IsOptional()
  @IsString()
  lokasi?: string;

  @ApiPropertyOptional({ description: 'Search by name or code' })
  @IsOptional()
  @IsString()
  declare search?: string;
}

export class SchoolResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  lokasi?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  principal?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  createdBy?: string;

  @ApiPropertyOptional()
  modifiedBy?: string;

  @ApiPropertyOptional({ description: 'Statistics about the school' })
  stats?: {
    totalDepartments: number;
    totalPositions: number;
    totalEmployees: number;
  };
}
