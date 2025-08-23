import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  MaxLength,
  Matches,
  ArrayMaxSize,
  IsIn,
  ValidateIf,
  ValidationOptions,
} from 'class-validator';
import { AuditAction } from '@prisma/client';

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  EXCEL = 'excel',
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

export class ExportAuditLogDto {
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
  @ArrayMaxSize(20, { message: 'Too many actions specified (max 20)' })
  @IsEnum(AuditAction, { each: true })
  actions?: AuditAction[];

  @ApiProperty({
    description: 'Start date for export',
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
    { message: 'Date range cannot exceed 365 days' },
  )
  startDate: string;

  @ApiProperty({
    description: 'End date for export',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  @ValidateIf((o) => new Date(o.endDate) >= new Date(o.startDate), {
    message: 'End date must be after start date',
  })
  endDate: string;

  @ApiProperty({
    description: 'Export format',
    enum: ExportFormat,
    default: ExportFormat.CSV,
  })
  @IsEnum(ExportFormat)
  @Transform(({ value }) => value?.toLowerCase())
  format: ExportFormat = ExportFormat.CSV;

  @ApiPropertyOptional({
    description: 'Fields to include in export',
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30, { message: 'Too many fields specified (max 30)' })
  @IsIn(
    [
      'id',
      'actorId',
      'actorProfileId',
      'action',
      'module',
      'entityType',
      'entityId',
      'entityDisplay',
      'oldValues',
      'newValues',
      'changedFields',
      'targetUserId',
      'metadata',
      'ipAddress',
      'userAgent',
      'createdAt',
    ],
    { each: true, message: 'Invalid field name specified' },
  )
  fields?: string[];
}
