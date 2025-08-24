import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsDate,
  Length,
  Min,
  Max,
  IsIP,
  ArrayMaxSize,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConfigCategory,
  BackupType,
  BackupStatus,
} from './system-config.dto';
import {
  IsValidTableName,
  IsValidFeatureFlagName,
  IsValidRolloutPercentage,
  IsValidConfigKey,
  IsSafeString,
} from '../validators/custom-validators';

export class EnhancedSystemConfigDto {
  @ApiProperty({ description: 'Configuration key' })
  @IsString()
  @IsNotEmpty()
  @IsValidConfigKey()
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
  @Length(0, 500)
  @IsSafeString()
  description?: string;

  @ApiPropertyOptional({ description: 'Is configuration encrypted' })
  @IsBoolean()
  @IsOptional()
  isEncrypted?: boolean;
}

export class EnhancedUpdateSystemConfigDto {
  @ApiProperty({ description: 'Configuration value' })
  value: any;

  @ApiPropertyOptional({ description: 'Configuration description' })
  @IsString()
  @IsOptional()
  @Length(0, 500)
  @IsSafeString()
  description?: string;
}

export class EnhancedFeatureFlagDto {
  @ApiProperty({ description: 'Feature flag name' })
  @IsString()
  @IsNotEmpty()
  @IsValidFeatureFlagName()
  name: string;

  @ApiProperty({ description: 'Is feature enabled' })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: 'Feature description' })
  @IsString()
  @IsOptional()
  @Length(0, 500)
  @IsSafeString()
  description?: string;

  @ApiPropertyOptional({ description: 'User groups allowed to access' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayMaxSize(50)
  @Length(1, 100, { each: true })
  allowedGroups?: string[];

  @ApiPropertyOptional({ description: 'Rollout percentage (0-100)' })
  @IsOptional()
  @IsValidRolloutPercentage()
  rolloutPercentage?: number;
}

export class EnhancedUpdateFeatureFlagDto {
  @ApiPropertyOptional({ description: 'Is feature enabled' })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Feature description' })
  @IsString()
  @IsOptional()
  @Length(0, 500)
  @IsSafeString()
  description?: string;

  @ApiPropertyOptional({ description: 'User groups allowed to access' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayMaxSize(50)
  @Length(1, 100, { each: true })
  allowedGroups?: string[];

  @ApiPropertyOptional({ description: 'Rollout percentage (0-100)' })
  @IsOptional()
  @IsValidRolloutPercentage()
  rolloutPercentage?: number;
}

export class EnhancedMaintenanceModeDto {
  @ApiProperty({ description: 'Is maintenance mode enabled' })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: 'Maintenance message to display' })
  @IsString()
  @IsOptional()
  @Length(0, 500)
  @IsSafeString()
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
  @IsIP(undefined, { each: true })
  @IsOptional()
  @ArrayMaxSize(50)
  allowedIps?: string[];

  @ApiPropertyOptional({ description: 'Allowed user roles during maintenance' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayMaxSize(20)
  @Length(1, 50, { each: true })
  allowedRoles?: string[];
}

export class EnhancedBackupConfigDto {
  @ApiProperty({ description: 'Backup type', enum: BackupType })
  @IsEnum(BackupType)
  type: BackupType;

  @ApiPropertyOptional({ description: 'Backup description' })
  @IsString()
  @IsOptional()
  @Length(0, 200)
  @IsSafeString()
  description?: string;

  @ApiPropertyOptional({ description: 'Include specific tables' })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(100)
  @IsValidTableName({ each: true })
  includeTables?: string[];

  @ApiPropertyOptional({ description: 'Exclude specific tables' })
  @IsArray()
  @IsOptional()
  @ArrayMaxSize(100)
  @IsValidTableName({ each: true })
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

export class EnhancedBackupStatusDto {
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
  @IsNumber()
  @Min(0)
  sizeBytes?: number;

  @ApiPropertyOptional({ description: 'File path' })
  filePath?: string;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  @IsString()
  @Length(0, 1000)
  error?: string;
}

export class EnhancedRestoreBackupDto {
  @ApiProperty({ description: 'Backup ID to restore' })
  @IsString()
  @IsNotEmpty()
  @Length(36, 36) // UUID length
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