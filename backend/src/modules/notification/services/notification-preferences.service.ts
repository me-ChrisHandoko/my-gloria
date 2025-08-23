import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  NotificationChannel,
  NotificationType,
  Priority,
  NotificationPreference,
  NotificationChannelPreference,
  NotificationUnsubscribe,
  NotificationFrequencyTracking,
} from '@prisma/client';
import {
  CreateNotificationPreferenceDto,
  UpdateNotificationPreferenceDto,
  NotificationChannelPreferenceDto,
  UpdateChannelPreferencesDto,
  UnsubscribeDto,
  CheckPreferencesResponseDto,
} from '../dto/notification-preferences.dto';
import { randomUUID } from 'crypto';
import * as moment from 'moment-timezone';

@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create notification preferences for a user
   */
  async getOrCreatePreferences(
    userProfileId: string,
  ): Promise<NotificationPreference> {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userProfileId },
      include: {
        channelPreferences: true,
        unsubscriptions: {
          where: { resubscribedAt: null },
        },
      },
    });

    if (!preferences) {
      preferences = await this.prisma.notificationPreference.create({
        data: {
          userProfileId,
          enabled: true,
          defaultChannels: [NotificationChannel.IN_APP],
          timezone: 'Asia/Jakarta',
        },
        include: {
          channelPreferences: true,
          unsubscriptions: {
            where: { resubscribedAt: null },
          },
        },
      });
    }

    return preferences;
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userProfileId: string,
    updateDto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    const preferences = await this.getOrCreatePreferences(userProfileId);

    // Validate quiet hours if provided
    if (
      updateDto.quietHoursEnabled &&
      (!updateDto.quietHoursStart || !updateDto.quietHoursEnd)
    ) {
      throw new BadRequestException(
        'Quiet hours start and end times are required when quiet hours are enabled',
      );
    }

    return await this.prisma.notificationPreference.update({
      where: { id: preferences.id },
      data: {
        enabled: updateDto.enabled ?? preferences.enabled,
        quietHoursEnabled:
          updateDto.quietHoursEnabled ?? preferences.quietHoursEnabled,
        quietHoursStart:
          updateDto.quietHoursStart ?? preferences.quietHoursStart,
        quietHoursEnd: updateDto.quietHoursEnd ?? preferences.quietHoursEnd,
        timezone: updateDto.timezone ?? preferences.timezone,
        maxDailyNotifications:
          updateDto.maxDailyNotifications !== undefined
            ? updateDto.maxDailyNotifications
            : preferences.maxDailyNotifications,
        maxHourlyNotifications:
          updateDto.maxHourlyNotifications !== undefined
            ? updateDto.maxHourlyNotifications
            : preferences.maxHourlyNotifications,
        defaultChannels:
          updateDto.defaultChannels ?? preferences.defaultChannels,
      },
      include: {
        channelPreferences: true,
      },
    });
  }

  /**
   * Update channel preferences for specific notification types
   */
  async updateChannelPreferences(
    userProfileId: string,
    updateDto: UpdateChannelPreferencesDto,
  ): Promise<NotificationChannelPreference[]> {
    const preferences = await this.getOrCreatePreferences(userProfileId);

    // Use transaction to update all preferences atomically
    const results = await this.prisma.$transaction(
      updateDto.preferences.map((pref) =>
        this.prisma.notificationChannelPreference.upsert({
          where: {
            preferenceId_notificationType: {
              preferenceId: preferences.id,
              notificationType: pref.notificationType,
            },
          },
          update: {
            channels: pref.channels,
            enabled: pref.enabled ?? true,
            priority: pref.priority,
            maxDaily: pref.maxDaily,
          },
          create: {
            preferenceId: preferences.id,
            notificationType: pref.notificationType,
            channels: pref.channels,
            enabled: pref.enabled ?? true,
            priority: pref.priority,
            maxDaily: pref.maxDaily,
          },
        }),
      ),
    );

    return results;
  }

  /**
   * Unsubscribe from notifications
   */
  async unsubscribe(
    userProfileId: string,
    unsubscribeDto: UnsubscribeDto,
  ): Promise<NotificationUnsubscribe> {
    const preferences = await this.getOrCreatePreferences(userProfileId);
    const token = randomUUID();

    // Check if already unsubscribed
    const existing = await this.prisma.notificationUnsubscribe.findFirst({
      where: {
        preferenceId: preferences.id,
        notificationType: unsubscribeDto.notificationType,
        channel: unsubscribeDto.channel,
        resubscribedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Already unsubscribed from these notifications',
      );
    }

    return await this.prisma.notificationUnsubscribe.create({
      data: {
        preferenceId: preferences.id,
        notificationType: unsubscribeDto.notificationType,
        channel: unsubscribeDto.channel,
        reason: unsubscribeDto.reason,
        token,
      },
    });
  }

  /**
   * Resubscribe to notifications using token
   */
  async resubscribe(token: string): Promise<NotificationUnsubscribe> {
    const unsubscribe = await this.prisma.notificationUnsubscribe.findUnique({
      where: { token },
    });

    if (!unsubscribe) {
      throw new NotFoundException('Invalid unsubscribe token');
    }

    if (unsubscribe.resubscribedAt) {
      throw new BadRequestException('Already resubscribed');
    }

    return await this.prisma.notificationUnsubscribe.update({
      where: { id: unsubscribe.id },
      data: { resubscribedAt: new Date() },
    });
  }

  /**
   * Check if a notification should be sent based on user preferences
   */
  async checkPreferences(
    userProfileId: string,
    notificationType: NotificationType,
    priority: Priority = Priority.MEDIUM,
  ): Promise<CheckPreferencesResponseDto> {
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { userProfileId },
      include: {
        channelPreferences: {
          where: { notificationType },
        },
        unsubscriptions: {
          where: {
            resubscribedAt: null,
            OR: [{ notificationType: null }, { notificationType }],
          },
        },
      },
    });

    // If no preferences, use defaults
    if (!preferences) {
      return {
        shouldSend: true,
        channels: [NotificationChannel.IN_APP],
      };
    }

    // Check if globally disabled
    if (!preferences.enabled) {
      return {
        shouldSend: false,
        channels: [],
        blockedReason: 'Notifications are disabled',
      };
    }

    // Check unsubscriptions
    const isUnsubscribed = preferences.unsubscriptions.some(
      (unsub) =>
        !unsub.notificationType || unsub.notificationType === notificationType,
    );

    if (isUnsubscribed) {
      return {
        shouldSend: false,
        channels: [],
        blockedReason: 'User has unsubscribed from this notification type',
      };
    }

    // Check quiet hours
    if (
      preferences.quietHoursEnabled &&
      preferences.quietHoursStart &&
      preferences.quietHoursEnd
    ) {
      const isInQuietHours = this.isInQuietHours(
        preferences.quietHoursStart,
        preferences.quietHoursEnd,
        preferences.timezone,
      );

      if (isInQuietHours) {
        return {
          shouldSend: false,
          channels: [],
          blockedReason: 'Currently in quiet hours',
        };
      }
    }

    // Check frequency limits
    const frequencyCheck = await this.checkFrequencyLimits(
      preferences.id,
      notificationType,
      preferences.maxDailyNotifications,
      preferences.maxHourlyNotifications,
    );

    if (!frequencyCheck.allowed) {
      return {
        shouldSend: false,
        channels: [],
        blockedReason: frequencyCheck.reason,
      };
    }

    // Get channel preferences for this notification type
    const channelPref = preferences.channelPreferences[0];

    if (channelPref) {
      // Check if this notification type is disabled
      if (!channelPref.enabled) {
        return {
          shouldSend: false,
          channels: [],
          blockedReason: 'This notification type is disabled',
        };
      }

      // Check priority threshold
      if (
        channelPref.priority &&
        this.comparePriority(priority, channelPref.priority) < 0
      ) {
        return {
          shouldSend: false,
          channels: [],
          blockedReason: `Priority ${priority} is below threshold ${channelPref.priority}`,
        };
      }

      // Check type-specific daily limit
      if (channelPref.maxDaily) {
        const typeFrequencyCheck = await this.checkTypeFrequencyLimit(
          preferences.id,
          notificationType,
          channelPref.maxDaily,
        );

        if (!typeFrequencyCheck.allowed) {
          return {
            shouldSend: false,
            channels: [],
            blockedReason: typeFrequencyCheck.reason,
          };
        }
      }

      return {
        shouldSend: true,
        channels: channelPref.channels,
      };
    }

    // Use default channels if no specific preference
    return {
      shouldSend: true,
      channels: preferences.defaultChannels,
    };
  }

  /**
   * Track notification frequency for rate limiting
   */
  async trackNotificationSent(
    userProfileId: string,
    notificationType: NotificationType,
  ): Promise<void> {
    const preferences = await this.getOrCreatePreferences(userProfileId);
    const now = new Date();

    // Track hourly
    const hourlyWindowStart = new Date(now);
    hourlyWindowStart.setMinutes(0, 0, 0);

    await this.prisma.notificationFrequencyTracking.upsert({
      where: {
        preferenceId_notificationType_windowType_windowStart: {
          preferenceId: preferences.id,
          notificationType,
          windowType: 'hourly',
          windowStart: hourlyWindowStart,
        },
      },
      update: {
        count: { increment: 1 },
      },
      create: {
        preferenceId: preferences.id,
        notificationType,
        windowType: 'hourly',
        windowStart: hourlyWindowStart,
        count: 1,
      },
    });

    // Track daily
    const dailyWindowStart = new Date(now);
    dailyWindowStart.setHours(0, 0, 0, 0);

    await this.prisma.notificationFrequencyTracking.upsert({
      where: {
        preferenceId_notificationType_windowType_windowStart: {
          preferenceId: preferences.id,
          notificationType,
          windowType: 'daily',
          windowStart: dailyWindowStart,
        },
      },
      update: {
        count: { increment: 1 },
      },
      create: {
        preferenceId: preferences.id,
        notificationType,
        windowType: 'daily',
        windowStart: dailyWindowStart,
        count: 1,
      },
    });
  }

  /**
   * Clean up old frequency tracking records
   */
  async cleanupOldFrequencyTracking(daysToKeep: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.notificationFrequencyTracking.deleteMany({
      where: {
        windowStart: { lt: cutoffDate },
      },
    });

    this.logger.log(
      `Cleaned up ${result.count} old frequency tracking records`,
    );
    return result.count;
  }

  // Helper methods

  private isInQuietHours(
    startTime: string,
    endTime: string,
    timezone: string,
  ): boolean {
    const now = moment.tz(timezone);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const start = now.clone().hour(startHour).minute(startMinute).second(0);
    const end = now.clone().hour(endHour).minute(endMinute).second(0);

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (end.isBefore(start)) {
      return now.isAfter(start) || now.isBefore(end);
    }

    return now.isBetween(start, end);
  }

  private async checkFrequencyLimits(
    preferenceId: string,
    notificationType: NotificationType,
    maxDaily: number | null,
    maxHourly: number | null,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const now = new Date();

    // Check hourly limit
    if (maxHourly) {
      const hourlyWindowStart = new Date(now);
      hourlyWindowStart.setMinutes(0, 0, 0);

      const hourlyCount =
        await this.prisma.notificationFrequencyTracking.aggregate({
          where: {
            preferenceId,
            windowType: 'hourly',
            windowStart: hourlyWindowStart,
          },
          _sum: { count: true },
        });

      if ((hourlyCount._sum.count || 0) >= maxHourly) {
        return {
          allowed: false,
          reason: `Hourly notification limit (${maxHourly}) reached`,
        };
      }
    }

    // Check daily limit
    if (maxDaily) {
      const dailyWindowStart = new Date(now);
      dailyWindowStart.setHours(0, 0, 0, 0);

      const dailyCount =
        await this.prisma.notificationFrequencyTracking.aggregate({
          where: {
            preferenceId,
            windowType: 'daily',
            windowStart: dailyWindowStart,
          },
          _sum: { count: true },
        });

      if ((dailyCount._sum.count || 0) >= maxDaily) {
        return {
          allowed: false,
          reason: `Daily notification limit (${maxDaily}) reached`,
        };
      }
    }

    return { allowed: true };
  }

  private async checkTypeFrequencyLimit(
    preferenceId: string,
    notificationType: NotificationType,
    maxDaily: number,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const now = new Date();
    const dailyWindowStart = new Date(now);
    dailyWindowStart.setHours(0, 0, 0, 0);

    const dailyCount =
      await this.prisma.notificationFrequencyTracking.findUnique({
        where: {
          preferenceId_notificationType_windowType_windowStart: {
            preferenceId,
            notificationType,
            windowType: 'daily',
            windowStart: dailyWindowStart,
          },
        },
      });

    if (dailyCount && dailyCount.count >= maxDaily) {
      return {
        allowed: false,
        reason: `Daily limit for ${notificationType} (${maxDaily}) reached`,
      };
    }

    return { allowed: true };
  }

  private comparePriority(current: Priority, threshold: Priority): number {
    const priorityOrder = {
      [Priority.LOW]: 1,
      [Priority.MEDIUM]: 2,
      [Priority.HIGH]: 3,
      [Priority.URGENT]: 4,
      [Priority.CRITICAL]: 5,
    };

    return priorityOrder[current] - priorityOrder[threshold];
  }
}
