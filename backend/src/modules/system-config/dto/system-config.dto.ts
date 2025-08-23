import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsObject,
  IsNumber,
  IsArray,
  ValidateNested,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ConfigCategory {
  GENERAL = 'general',
  SECURITY = 'security',
  NOTIFICATION = 'notification',
  BACKUP = 'backup',
  FEATURE = 'feature',
  MAINTENANCE = 'maintenance',
}

export class SystemConfigDto {
  @ApiProperty({ description: 'Configuration key' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Configuration value' })
  value: any;

  @ApiPropertyOptional({
    description: 'Configuration category',
    enum: ConfigCategory,
  })
  @IsEnum(ConfigCategory)
  @IsOptional()
  category?: ConfigCategory;

  @ApiPropertyOptional({ description: 'Configuration description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Is configuration encrypted' })
  @IsBoolean()
  @IsOptional()
  isEncrypted?: boolean;
}

export class UpdateSystemConfigDto {
  @ApiProperty({ description: 'Configuration value' })
  value: any;

  @ApiPropertyOptional({ description: 'Configuration description' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class FeatureFlagDto {
  @ApiProperty({ description: 'Feature flag name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Is feature enabled' })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: 'Feature description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'User groups allowed to access' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedGroups?: string[];

  @ApiPropertyOptional({ description: 'Rollout percentage (0-100)' })
  @IsNumber()
  @IsOptional()
  rolloutPercentage?: number;
}

export class UpdateFeatureFlagDto {
  @ApiPropertyOptional({ description: 'Is feature enabled' })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Feature description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'User groups allowed to access' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedGroups?: string[];

  @ApiPropertyOptional({ description: 'Rollout percentage (0-100)' })
  @IsNumber()
  @IsOptional()
  rolloutPercentage?: number;
}

export class MaintenanceModeDto {
  @ApiProperty({ description: 'Is maintenance mode enabled' })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: 'Maintenance message to display' })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({ description: 'Estimated end time' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  estimatedEndTime?: Date;

  @ApiPropertyOptional({
    description: 'Allowed IP addresses during maintenance',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedIps?: string[];

  @ApiPropertyOptional({ description: 'Allowed user roles during maintenance' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedRoles?: string[];
}

export enum BackupType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  DIFFERENTIAL = 'differential',
}

export enum BackupStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class BackupConfigDto {
  @ApiProperty({ description: 'Backup type', enum: BackupType })
  @IsEnum(BackupType)
  type: BackupType;

  @ApiPropertyOptional({ description: 'Backup description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Include specific tables' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  includeTables?: string[];

  @ApiPropertyOptional({ description: 'Exclude specific tables' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludeTables?: string[];

  @ApiPropertyOptional({ description: 'Compress backup' })
  @IsBoolean()
  @IsOptional()
  compress?: boolean;

  @ApiPropertyOptional({ description: 'Encrypt backup' })
  @IsBoolean()
  @IsOptional()
  encrypt?: boolean;
}

export class BackupStatusDto {
  @ApiProperty({ description: 'Backup ID' })
  id: string;

  @ApiProperty({ description: 'Backup type', enum: BackupType })
  type: BackupType;

  @ApiProperty({ description: 'Backup status', enum: BackupStatus })
  status: BackupStatus;

  @ApiProperty({ description: 'Started at' })
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Completed at' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  sizeBytes?: number;

  @ApiPropertyOptional({ description: 'File path' })
  filePath?: string;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;
}

export class RestoreBackupDto {
  @ApiProperty({ description: 'Backup ID to restore' })
  @IsString()
  backupId: string;

  @ApiPropertyOptional({ description: 'Restore to specific point in time' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  pointInTime?: Date;

  @ApiPropertyOptional({ description: 'Verify backup before restore' })
  @IsBoolean()
  @IsOptional()
  verify?: boolean;
}
