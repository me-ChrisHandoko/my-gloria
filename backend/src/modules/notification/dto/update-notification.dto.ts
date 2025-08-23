import { IsBoolean, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationDto {
  @ApiPropertyOptional({ description: 'Mark notification as read' })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @ApiPropertyOptional({ description: 'Timestamp when notification was read' })
  @IsDateString()
  @IsOptional()
  readAt?: string;
}
