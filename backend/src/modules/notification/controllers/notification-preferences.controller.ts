import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { NotificationPreferencesService } from '../services/notification-preferences.service';
import {
  CreateNotificationPreferenceDto,
  UpdateNotificationPreferenceDto,
  UpdateChannelPreferencesDto,
  UnsubscribeDto,
  ResubscribeDto,
  NotificationPreferenceResponseDto,
  CheckPreferencesResponseDto,
} from '../dto/notification-preferences.dto';
import { NotificationType, Priority } from '@prisma/client';

@ApiTags('Notification Preferences')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('api/v1/notification-preferences')
export class NotificationPreferencesController {
  constructor(
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get current user notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences retrieved successfully',
    type: NotificationPreferenceResponseDto,
  })
  async getMyPreferences(
    @CurrentUser() user: any,
  ): Promise<NotificationPreferenceResponseDto> {
    return await this.preferencesService.getOrCreatePreferences(
      user.userProfileId,
    );
  }

  @Put()
  @ApiOperation({ summary: 'Update current user notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated successfully',
    type: NotificationPreferenceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async updateMyPreferences(
    @CurrentUser() user: any,
    @Body() updateDto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreferenceResponseDto> {
    return await this.preferencesService.updatePreferences(
      user.userProfileId,
      updateDto,
    );
  }

  @Put('channels')
  @ApiOperation({
    summary: 'Update channel preferences for specific notification types',
  })
  @ApiResponse({
    status: 200,
    description: 'Channel preferences updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async updateChannelPreferences(
    @CurrentUser() user: any,
    @Body() updateDto: UpdateChannelPreferencesDto,
  ) {
    return await this.preferencesService.updateChannelPreferences(
      user.userProfileId,
      updateDto,
    );
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsubscribe from notifications' })
  @ApiResponse({
    status: 200,
    description: 'Successfully unsubscribed from notifications',
  })
  @ApiResponse({
    status: 400,
    description: 'Already unsubscribed or invalid request',
  })
  async unsubscribe(
    @CurrentUser() user: any,
    @Body() unsubscribeDto: UnsubscribeDto,
  ) {
    return await this.preferencesService.unsubscribe(
      user.userProfileId,
      unsubscribeDto,
    );
  }

  @Post('resubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resubscribe to notifications using token' })
  @ApiResponse({
    status: 200,
    description: 'Successfully resubscribed to notifications',
  })
  @ApiResponse({ status: 404, description: 'Invalid token' })
  @ApiResponse({ status: 400, description: 'Already resubscribed' })
  async resubscribe(@Body() resubscribeDto: ResubscribeDto) {
    return await this.preferencesService.resubscribe(resubscribeDto.token);
  }

  @Get('check')
  @ApiOperation({
    summary: 'Check if a notification should be sent based on preferences',
  })
  @ApiQuery({
    name: 'type',
    enum: NotificationType,
    description: 'Notification type to check',
  })
  @ApiQuery({
    name: 'priority',
    enum: Priority,
    required: false,
    description: 'Notification priority (default: MEDIUM)',
  })
  @ApiResponse({
    status: 200,
    description: 'Preference check result',
    type: CheckPreferencesResponseDto,
  })
  async checkPreferences(
    @CurrentUser() user: any,
    @Query('type') notificationType: NotificationType,
    @Query('priority') priority?: Priority,
  ): Promise<CheckPreferencesResponseDto> {
    return await this.preferencesService.checkPreferences(
      user.userProfileId,
      notificationType,
      priority || Priority.MEDIUM,
    );
  }

  @Get(':userProfileId')
  @ApiOperation({
    summary: 'Get notification preferences for a specific user (admin only)',
  })
  @ApiParam({ name: 'userProfileId', description: 'User profile ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences retrieved successfully',
    type: NotificationPreferenceResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async getUserPreferences(
    @CurrentUser() user: any,
    @Param('userProfileId') userProfileId: string,
  ): Promise<NotificationPreferenceResponseDto> {
    // TODO: Add admin check
    if (!user.isSuperadmin) {
      throw new Error('Admin access required');
    }
    return await this.preferencesService.getOrCreatePreferences(userProfileId);
  }

  @Put(':userProfileId')
  @ApiOperation({
    summary: 'Update notification preferences for a specific user (admin only)',
  })
  @ApiParam({ name: 'userProfileId', description: 'User profile ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated successfully',
    type: NotificationPreferenceResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async updateUserPreferences(
    @CurrentUser() user: any,
    @Param('userProfileId') userProfileId: string,
    @Body() updateDto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreferenceResponseDto> {
    // TODO: Add admin check
    if (!user.isSuperadmin) {
      throw new Error('Admin access required');
    }
    return await this.preferencesService.updatePreferences(
      userProfileId,
      updateDto,
    );
  }

  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clean up old frequency tracking records (admin only)',
  })
  @ApiQuery({
    name: 'daysToKeep',
    required: false,
    description: 'Number of days to keep records (default: 7)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cleanup completed successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async cleanupFrequencyTracking(
    @CurrentUser() user: any,
    @Query('daysToKeep') daysToKeep?: number,
  ) {
    // TODO: Add admin check
    if (!user.isSuperadmin) {
      throw new Error('Admin access required');
    }

    const count = await this.preferencesService.cleanupOldFrequencyTracking(
      daysToKeep || 7,
    );

    return {
      message: 'Cleanup completed successfully',
      recordsDeleted: count,
    };
  }
}
