import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  ValidateIf,
  ValidationOptions,
} from 'class-validator';

export enum StatisticsGroupBy {
  MODULE = 'module',
  ACTION = 'action',
  ACTOR = 'actor',
  ENTITY_TYPE = 'entityType',
  DAY = 'day',
  HOUR = 'hour',
}

// Custom decorator for safe string validation
function IsSafeString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    IsString(validationOptions)(object, propertyName);
    MaxLength(255, validationOptions)(object, propertyName);
    Matches(/^[a-zA-Z0-9_\-\.\/\s]+$/, {
      message: `${propertyName} contains invalid characters`,
      ...validationOptions,
    })(object, propertyName);
  };
}

export class QueryAuditStatisticsDto {
  @ApiProperty({
    description: 'Start date for statistics',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  @ValidateIf(
    (o) => {
      // Validate date range is not too large (max 1 year)
      if (o.endDate) {
        const start = new Date(o.startDate);
        const end = new Date(o.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 365;
      }
      return true;
    },
    { message: 'Date range cannot exceed 365 days for statistics' },
  )
  startDate: string;

  @ApiProperty({
    description: 'End date for statistics',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  @ValidateIf((o) => new Date(o.endDate) >= new Date(o.startDate), {
    message: 'End date must be after start date',
  })
  endDate: string;

  @ApiProperty({
    description: 'Group statistics by',
    enum: StatisticsGroupBy,
  })
  @IsEnum(StatisticsGroupBy)
  @Transform(({ value }) => value?.toLowerCase())
  groupBy: StatisticsGroupBy;

  @ApiPropertyOptional({ description: 'Module to filter by' })
  @IsOptional()
  @IsSafeString()
  @Transform(({ value }) => value?.trim())
  module?: string;

  @ApiPropertyOptional({ description: 'Entity type to filter by' })
  @IsOptional()
  @IsSafeString()
  @Transform(({ value }) => value?.trim())
  entityType?: string;
}

export class AuditStatisticsResponseDto {
  @ApiProperty()
  label: string;

  @ApiProperty()
  value: string | number;

  @ApiProperty()
  count: number;

  @ApiPropertyOptional()
  percentage?: number;
}

export class AuditStatisticsSummaryDto {
  @ApiProperty({ type: [AuditStatisticsResponseDto] })
  data: AuditStatisticsResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  groupBy: string;
}
