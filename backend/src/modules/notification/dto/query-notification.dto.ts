import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsString,
  IsDateString,
  IsNumberString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, Priority } from '../enums/notification.enum';

export class QueryNotificationDto {
  @ApiPropertyOptional({ description: 'Filter by notification type' })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional({ description: 'Filter by priority' })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Filter by read status' })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @ApiPropertyOptional({
    description: 'Filter notifications created after this date',
  })
  @IsDateString()
  @IsOptional()
  createdAfter?: string;

  @ApiPropertyOptional({
    description: 'Filter notifications created before this date',
  })
  @IsDateString()
  @IsOptional()
  createdBefore?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
  })
  @IsNumberString()
  @IsOptional()
  page?: string = '1';

  @ApiPropertyOptional({ description: 'Number of items per page', default: 20 })
  @IsNumberString()
  @IsOptional()
  limit?: string = '20';

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
