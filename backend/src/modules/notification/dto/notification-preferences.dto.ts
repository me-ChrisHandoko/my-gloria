import {
  IsBoolean,
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  IsEnum,
  Min,
  Max,
  Matches,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  NotificationChannel,
  NotificationType,
  Priority,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationPreferenceDto {
  @ApiProperty({
    description: 'Enable or disable all notifications',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean = true;

  @ApiPropertyOptional({ description: 'Enable quiet hours' })
  @IsBoolean()
  @IsOptional()
  quietHoursEnabled?: boolean = false;

  @ApiPropertyOptional({
    description: 'Start time for quiet hours (HH:mm format)',
    example: '22:00',
  })
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'quietHoursStart must be in HH:mm format',
  })
  quietHoursStart?: string;

  @ApiPropertyOptional({
    description: 'End time for quiet hours (HH:mm format)',
    example: '08:00',
  })
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'quietHoursEnd must be in HH:mm format',
  })
  quietHoursEnd?: string;

  @ApiProperty({
    description: 'User timezone',
    default: 'Asia/Jakarta',
  })
  @IsString()
  @IsOptional()
  timezone?: string = 'Asia/Jakarta';

  @ApiPropertyOptional({
    description: 'Maximum notifications per day (null = unlimited)',
    minimum: 1,
    maximum: 1000,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(1000)
  maxDailyNotifications?: number | null;

  @ApiPropertyOptional({
    description: 'Maximum notifications per hour',
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  maxHourlyNotifications?: number | null;

  @ApiProperty({
    description: 'Default notification channels',
    enum: NotificationChannel,
    isArray: true,
    default: [NotificationChannel.IN_APP],
  })
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  @IsOptional()
  defaultChannels?: NotificationChannel[] = [NotificationChannel.IN_APP];
}

export class UpdateNotificationPreferenceDto extends CreateNotificationPreferenceDto {}

export class NotificationChannelPreferenceDto {
  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
  })
  @IsEnum(NotificationType)
  notificationType: NotificationType;

  @ApiProperty({
    description: 'Enabled channels for this notification type',
    enum: NotificationChannel,
    isArray: true,
  })
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @ApiProperty({
    description: 'Enable or disable this notification type',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean = true;

  @ApiPropertyOptional({
    description: 'Minimum priority level to send',
    enum: Priority,
  })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiPropertyOptional({
    description: 'Maximum daily limit for this notification type',
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  maxDaily?: number | null;
}

export class UpdateChannelPreferencesDto {
  @ApiProperty({
    description: 'Channel preferences per notification type',
    type: [NotificationChannelPreferenceDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationChannelPreferenceDto)
  preferences: NotificationChannelPreferenceDto[];
}

export class UnsubscribeDto {
  @ApiPropertyOptional({
    description: 'Notification type to unsubscribe from (null = all)',
    enum: NotificationType,
  })
  @IsEnum(NotificationType)
  @IsOptional()
  notificationType?: NotificationType | null;

  @ApiPropertyOptional({
    description: 'Channel to unsubscribe from (null = all channels)',
    enum: NotificationChannel,
  })
  @IsEnum(NotificationChannel)
  @IsOptional()
  channel?: NotificationChannel | null;

  @ApiPropertyOptional({
    description: 'Reason for unsubscribing',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class ResubscribeDto {
  @ApiProperty({
    description: 'Unsubscribe token',
  })
  @IsString()
  @IsUUID()
  token: string;
}

export class NotificationPreferenceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userProfileId: string;

  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  quietHoursEnabled: boolean;

  @ApiPropertyOptional()
  quietHoursStart?: string | null;

  @ApiPropertyOptional()
  quietHoursEnd?: string | null;

  @ApiProperty()
  timezone: string;

  @ApiPropertyOptional()
  maxDailyNotifications?: number | null;

  @ApiPropertyOptional()
  maxHourlyNotifications?: number | null;

  @ApiProperty({ enum: NotificationChannel, isArray: true })
  defaultChannels: NotificationChannel[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: [NotificationChannelPreferenceDto] })
  channelPreferences?: NotificationChannelPreferenceDto[];
}

export class CheckPreferencesResponseDto {
  @ApiProperty({ description: 'Whether the notification should be sent' })
  shouldSend: boolean;

  @ApiProperty({
    description: 'Channels to use for sending',
    enum: NotificationChannel,
    isArray: true,
  })
  channels: NotificationChannel[];

  @ApiPropertyOptional({ description: 'Reason if notification is blocked' })
  blockedReason?: string;
}
