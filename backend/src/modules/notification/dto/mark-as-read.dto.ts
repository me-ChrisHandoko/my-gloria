import { IsArray, IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MarkAsReadDto {
  @ApiPropertyOptional({
    description:
      'Array of notification IDs to mark as read. If not provided, all notifications will be marked as read.',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  notificationIds?: string[];
}
