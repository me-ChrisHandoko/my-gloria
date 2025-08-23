import { Type, Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  IsEnum,
  IsArray,
  Min,
  Max,
  MaxLength,
  Matches,
  IsUUID,
  ValidationOptions,
} from 'class-validator';
import { AuditAction } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

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

export class QueryAuditLogDto {
  @ApiPropertyOptional({ description: 'Entity type to filter by' })
  @IsOptional()
  @IsSafeString()
  @Transform(({ value }) => value?.trim())
  entityType?: string;

  @ApiPropertyOptional({ description: 'Entity ID to filter by' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  entityId?: string;

  @ApiPropertyOptional({ description: 'Module to filter by' })
  @IsOptional()
  @IsSafeString()
  @Transform(({ value }) => value?.trim())
  module?: string;

  @ApiPropertyOptional({ description: 'Actor (Clerk user ID) to filter by' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^(user_|clerk_)?[a-zA-Z0-9_\-]+$/, {
    message: 'Invalid Clerk user ID format',
  })
  @Transform(({ value }) => value?.trim())
  actorId?: string;

  @ApiPropertyOptional({
    description: 'Actions to filter by',
    enum: AuditAction,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(AuditAction, { each: true })
  actions?: AuditAction[];

  @ApiPropertyOptional({
    description: 'Start date for filtering',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Number of records to return',
    minimum: 1,
    maximum: 100,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Number of records to skip',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Sort field',
    default: 'createdAt',
    enum: ['createdAt', 'module', 'action', 'entityType', 'actorId'],
  })
  @IsOptional()
  @IsEnum(['createdAt', 'module', 'action', 'entityType', 'actorId'], {
    message:
      'Sort field must be one of: createdAt, module, action, entityType, actorId',
  })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  @Transform(({ value }) => value?.toLowerCase())
  sortOrder?: 'asc' | 'desc' = 'desc';
}
