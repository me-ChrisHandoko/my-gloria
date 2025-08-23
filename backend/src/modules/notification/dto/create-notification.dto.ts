import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationType,
  Priority,
  NotificationChannel,
} from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'ID of the user profile to receive the notification',
  })
  @IsString()
  @IsNotEmpty()
  userProfileId: string;

  @ApiProperty({ enum: NotificationType, description: 'Type of notification' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Title of the notification' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Message content of the notification' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Additional data for the notification' })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional({ enum: Priority, default: Priority.MEDIUM })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority = Priority.MEDIUM;

  @ApiPropertyOptional({
    enum: NotificationChannel,
    isArray: true,
    description: 'Channels to send the notification through',
    default: [NotificationChannel.IN_APP],
  })
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  @IsOptional()
  channels?: NotificationChannel[] = [NotificationChannel.IN_APP];
}

export class CreateBulkNotificationDto {
  @ApiProperty({
    description: 'IDs of user profiles to receive the notification',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  userProfileIds: string[];

  @ApiProperty({ enum: NotificationType, description: 'Type of notification' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Title of the notification' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Message content of the notification' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Additional data for the notification' })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional({ enum: Priority, default: Priority.MEDIUM })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority = Priority.MEDIUM;

  @ApiPropertyOptional({
    enum: NotificationChannel,
    isArray: true,
    description: 'Channels to send the notification through',
    default: [NotificationChannel.IN_APP],
  })
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  @IsOptional()
  channels?: NotificationChannel[] = [NotificationChannel.IN_APP];
}
