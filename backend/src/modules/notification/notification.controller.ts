import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  Patch,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../auth/guards/clerk-auth.guard';
import { NotificationService } from './notification.service';
import {
  CreateNotificationDto,
  CreateBulkNotificationDto,
  UpdateNotificationDto,
  MarkAsReadDto,
  QueryNotificationDto,
} from './dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('api/v1/notifications')
@UseGuards(ClerkAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create notifications for multiple users' })
  @ApiResponse({
    status: 201,
    description: 'Notifications created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createBulk(
    @Body() createBulkNotificationDto: CreateBulkNotificationDto,
  ) {
    return this.notificationService.createBulk(createBulkNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get notifications for the current user' })
  @ApiResponse({ status: 200, description: 'Returns list of notifications' })
  @ApiQuery({ type: QueryNotificationDto })
  async findAll(@Request() req, @Query() query: QueryNotificationDto) {
    return this.notificationService.findAll(req.user.userProfileId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications' })
  @ApiResponse({
    status: 200,
    description: 'Returns unread notification count',
  })
  async getUnreadCount(@Request() req) {
    return this.notificationService.getUnreadCount(req.user.userProfileId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific notification' })
  @ApiResponse({ status: 200, description: 'Returns the notification' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.notificationService.findOne(id, req.user.userProfileId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a notification' })
  @ApiResponse({
    status: 200,
    description: 'Notification updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationService.update(
      id,
      req.user.userProfileId,
      updateNotificationDto,
    );
  }

  @Post('mark-as-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read' })
  async markAsRead(@Request() req, @Body() markAsReadDto: MarkAsReadDto) {
    return this.notificationService.markAsRead(
      req.user.userProfileId,
      markAsReadDto.notificationIds,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async remove(@Request() req, @Param('id') id: string) {
    return this.notificationService.remove(id, req.user.userProfileId);
  }

  @Delete()
  @ApiOperation({
    summary: 'Delete all read notifications for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Read notifications deleted successfully',
  })
  async removeAllRead(@Request() req) {
    return this.notificationService.removeAllRead(req.user.userProfileId);
  }

  @Get('rate-limit/status')
  @ApiOperation({ summary: 'Get rate limit status for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns rate limit status for all notification types',
  })
  async getRateLimitStatus(@Request() req) {
    const status = await this.notificationService.getRateLimitStatus(
      req.user.userProfileId,
    );
    // Convert Map to object for JSON response
    const result = {};
    status.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  @Post('rate-limit/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset rate limit for a user (admin only)',
    description: 'Requires admin role to reset rate limits',
  })
  @ApiResponse({
    status: 200,
    description: 'Rate limit reset successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires admin role',
  })
  async resetRateLimit(
    @Request() req,
    @Body() body: { userProfileId: string; notificationType?: string },
  ) {
    // TODO: Add admin role check here
    // For now, users can only reset their own rate limit
    if (req.user.userProfileId !== body.userProfileId) {
      throw new HttpException(
        'You can only reset your own rate limit',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.notificationService.resetRateLimit(
      body.userProfileId,
      body.notificationType,
    );
    return { message: 'Rate limit reset successfully' };
  }
}
