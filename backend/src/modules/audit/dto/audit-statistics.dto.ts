import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export enum StatisticsGroupBy {
  MODULE = 'module',
  ACTION = 'action',
  ACTOR = 'actor',
  ENTITY_TYPE = 'entityType',
  DAY = 'day',
  HOUR = 'hour',
}

export class QueryAuditStatisticsDto {
  @ApiProperty({
    description: 'Start date for statistics',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date for statistics',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'Group statistics by',
    enum: StatisticsGroupBy,
  })
  @IsEnum(StatisticsGroupBy)
  groupBy: StatisticsGroupBy;

  @ApiPropertyOptional({ description: 'Module to filter by' })
  @IsOptional()
  module?: string;

  @ApiPropertyOptional({ description: 'Entity type to filter by' })
  @IsOptional()
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
