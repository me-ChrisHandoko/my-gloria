import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/services/audit.service';
import { QueueService } from './queue.service';
import { EmailService } from './email.service';
import { PushService } from './push.service';
import { RateLimitService } from './services/rate-limit.service';
import { SanitizationService } from './services/sanitization.service';
import { NotificationMetricsService } from './services/metrics.service';
import { NotificationPreferencesService } from './services/notification-preferences.service';
import {
  Notification,
  Prisma,
  NotificationChannel as PrismaNotificationChannel,
  NotificationType,
  Priority,
} from '@prisma/client';
import {
  CreateNotificationDto,
  CreateBulkNotificationDto,
  UpdateNotificationDto,
  QueryNotificationDto,
} from './dto';
import { NotificationStatus } from './enums/notification.enum';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
    private readonly emailService: EmailService,
    private readonly pushService: PushService,
    private readonly rateLimitService: RateLimitService,
    private readonly sanitizationService: SanitizationService,
    private readonly metricsService: NotificationMetricsService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  async send(params: {
    type: string;
    recipientId: string;
    title: string;
    message: string;
    data?: Record<string, any>;
    priority?: Priority;
    channels?: PrismaNotificationChannel[];
  }): Promise<Notification> {
    // Map string type to NotificationType enum or use GENERAL as default
    const notificationType = this.mapToNotificationType(params.type);

    return this.create({
      userProfileId: params.recipientId,
      type: notificationType,
      title: params.title,
      message: params.message,
      data: params.data,
      priority: params.priority || Priority.MEDIUM,
      channels: params.channels || [PrismaNotificationChannel.IN_APP],
    });
  }

  private mapToNotificationType(type: string): NotificationType {
    // Map approval-related types
    if (type.includes('APPROVAL') || type.includes('REQUEST')) {
      if (type.includes('PENDING') || type.includes('REQUIRED')) {
        return NotificationType.APPROVAL_REQUEST;
      }
      if (type.includes('APPROVED') || type.includes('REJECTED')) {
        return NotificationType.APPROVAL_RESULT;
      }
    }

    // Map delegation types
    if (type.includes('DELEGATION')) {
      return NotificationType.DELEGATION;
    }

    // Map workflow types
    if (type.includes('WORKFLOW')) {
      return NotificationType.GENERAL;
    }

    // Default to GENERAL for other types
    return NotificationType.GENERAL;
  }

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const timer = this.metricsService.startTimer();

    try {
      const {
        channels = [PrismaNotificationChannel.IN_APP],
        ...notificationData
      } = createNotificationDto;

      // Check user preferences first
      const preferencesCheck = await this.preferencesService.checkPreferences(
        notificationData.userProfileId,
        notificationData.type,
        notificationData.priority || Priority.MEDIUM,
      );

      if (!preferencesCheck.shouldSend) {
        this.logger.log(
          `Notification blocked for user ${notificationData.userProfileId}: ${preferencesCheck.blockedReason}`,
        );
        // Return a mock notification to avoid errors but prevent sending
        return {
          id: `blocked-${Date.now()}`,
          userProfileId: notificationData.userProfileId,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          data: notificationData.data || null,
          priority: notificationData.priority || Priority.MEDIUM,
          isRead: false,
          readAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Notification;
      }

      // Use channels from preferences if available
      const effectiveChannels =
        preferencesCheck.channels.length > 0
          ? preferencesCheck.channels
          : channels.map((c) => c as string as PrismaNotificationChannel);

      // Sanitize input
      const sanitized = this.sanitizationService.sanitizeNotificationContent({
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data,
      });

      // Check rate limit
      const rateLimitResult = await this.rateLimitService.isRateLimited(
        notificationData.userProfileId,
        notificationData.type,
      );

      if (rateLimitResult.limited) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many notifications. Please try again later.',
            remaining: rateLimitResult.remaining,
            resetAt: rateLimitResult.resetAt,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Check for duplicates
      const duplicateCheck = await this.rateLimitService.isDuplicate(
        notificationData.userProfileId,
        sanitized.title,
        sanitized.message,
        sanitized.data,
      );

      if (duplicateCheck.duplicate) {
        this.logger.warn(
          `Duplicate notification blocked for user ${notificationData.userProfileId}. Hash: ${duplicateCheck.hash}`,
        );
        // Return a mock notification to avoid errors but prevent duplicate
        return {
          id: `duplicate-${duplicateCheck.hash}`,
          userProfileId: notificationData.userProfileId,
          type: notificationData.type,
          title: sanitized.title,
          message: sanitized.message,
          data: sanitized.data || null,
          priority: notificationData.priority || Priority.MEDIUM,
          isRead: false,
          readAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Notification;
      }

      // Create in-app notification with sanitized data
      const dbTimer = this.metricsService.startTimer();
      const notification = await this.prisma.notification.create({
        data: {
          userProfileId: notificationData.userProfileId,
          type: notificationData.type,
          title: sanitized.title,
          message: sanitized.message,
          data: sanitized.data,
          priority: notificationData.priority,
        },
      });
      this.metricsService.recordDatabaseQueryDuration(
        'create_notification',
        dbTimer(),
      );

      // Queue additional channels using effective channels from preferences
      if (
        effectiveChannels.length > 1 ||
        !effectiveChannels.includes(PrismaNotificationChannel.IN_APP)
      ) {
        await this.queueService.addNotificationJob({
          id: notification.id,
          userProfileId: notification.userProfileId,
          channels: effectiveChannels.filter(
            (c) => c !== PrismaNotificationChannel.IN_APP,
          ),
          priority: notification.priority,
          payload: {
            title: notification.title,
            message: notification.message,
            data: notification.data as Record<string, any>,
          },
        });
      }

      // Track notification sent for frequency capping
      await this.preferencesService.trackNotificationSent(
        notificationData.userProfileId,
        notificationData.type,
      );

      // Log audit
      await this.auditService.log({
        actorId: notificationData.userProfileId,
        module: 'Notification',
        action: 'CREATE',
        entityType: 'Notification',
        entityId: notification.id,
        newValues: notification,
      });

      this.logger.log(`Notification created: ${notification.id}`);

      // Record success metrics
      const duration = timer();
      this.metricsService.recordProcessingDuration(
        notificationData.type,
        notificationData.priority || Priority.MEDIUM,
        duration,
      );

      // Record notification sent for each effective channel
      for (const channel of effectiveChannels) {
        this.metricsService.recordNotificationSent(
          notificationData.type,
          notificationData.priority || Priority.MEDIUM,
          channel,
        );
      }

      return notification;
    } catch (error) {
      this.logger.error('Failed to create notification', error);

      // Record failure metrics
      this.metricsService.recordNotificationFailed(
        createNotificationDto.type,
        createNotificationDto.priority || Priority.MEDIUM,
        PrismaNotificationChannel.IN_APP,
        error.message || 'Unknown error',
      );

      throw new InternalServerErrorException('Failed to create notification');
    }
  }

  async createBulk(
    createBulkNotificationDto: CreateBulkNotificationDto,
  ): Promise<{ count: number }> {
    try {
      const {
        userProfileIds,
        channels = [PrismaNotificationChannel.IN_APP],
        ...notificationData
      } = createBulkNotificationDto;

      // Sanitize input
      const sanitized = this.sanitizationService.sanitizeNotificationContent({
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data,
      });

      // Filter out rate-limited users
      const validUserIds: string[] = [];
      const rateLimitedUsers: string[] = [];

      for (const userProfileId of userProfileIds) {
        const rateLimitResult = await this.rateLimitService.isRateLimited(
          userProfileId,
          notificationData.type,
        );

        if (!rateLimitResult.limited) {
          // Check for duplicates
          const duplicateCheck = await this.rateLimitService.isDuplicate(
            userProfileId,
            sanitized.title,
            sanitized.message,
            sanitized.data,
          );

          if (!duplicateCheck.duplicate) {
            validUserIds.push(userProfileId);
          }
        } else {
          rateLimitedUsers.push(userProfileId);
        }
      }

      if (validUserIds.length === 0) {
        this.logger.warn(
          `All ${userProfileIds.length} users were rate-limited or had duplicate notifications`,
        );
        return { count: 0 };
      }

      if (rateLimitedUsers.length > 0) {
        this.logger.warn(
          `${rateLimitedUsers.length} users were rate-limited for bulk notification`,
        );
      }

      // Create in-app notifications for valid users with sanitized data
      const notifications = await this.prisma.notification.createMany({
        data: validUserIds.map((userProfileId) => ({
          userProfileId,
          type: notificationData.type,
          title: sanitized.title,
          message: sanitized.message,
          data: sanitized.data,
          priority: notificationData.priority,
        })),
      });

      // Queue additional channels for valid users only
      if (
        channels.length > 1 ||
        !channels.includes(PrismaNotificationChannel.IN_APP)
      ) {
        const additionalChannels = channels.filter(
          (c) => c !== PrismaNotificationChannel.IN_APP,
        );

        for (const userProfileId of validUserIds) {
          await this.queueService.addNotificationJob({
            id: `bulk-${Date.now()}-${userProfileId}`,
            userProfileId,
            channels: additionalChannels,
            priority: notificationData.priority || Priority.MEDIUM,
            payload: {
              title: sanitized.title,
              message: sanitized.message,
              data: sanitized.data,
            },
          });
        }
      }

      this.logger.log(
        `Bulk notifications created: ${notifications.count} notifications`,
      );
      return { count: notifications.count };
    } catch (error) {
      this.logger.error('Failed to create bulk notifications', error);
      throw new InternalServerErrorException(
        'Failed to create bulk notifications',
      );
    }
  }

  async findAll(
    userProfileId: string,
    query: QueryNotificationDto,
  ): Promise<{
    data: Notification[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const page = parseInt(query.page || '1') || 1;
      const limit = parseInt(query.limit || '20') || 20;
      const skip = (page - 1) * limit;

      const where: Prisma.NotificationWhereInput = {
        userProfileId,
        ...(query.type && { type: query.type }),
        ...(query.priority && { priority: query.priority }),
        ...(query.isRead !== undefined && { isRead: query.isRead }),
        ...((query.createdAfter || query.createdBefore) && {
          createdAt: {
            ...(query.createdAfter && { gte: new Date(query.createdAfter) }),
            ...(query.createdBefore && { lte: new Date(query.createdBefore) }),
          },
        }),
      };

      const [data, total] = await Promise.all([
        this.prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy: query.sortBy
            ? {
                [query.sortBy]: query.sortOrder,
              }
            : {
                createdAt: 'desc',
              },
        }),
        this.prisma.notification.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Failed to fetch notifications', error);
      throw new InternalServerErrorException('Failed to fetch notifications');
    }
  }

  async findOne(id: string, userProfileId: string): Promise<Notification> {
    try {
      const notification = await this.prisma.notification.findFirst({
        where: {
          id,
          userProfileId,
        },
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      // Auto-mark as read when fetched
      if (!notification.isRead) {
        await this.prisma.notification.update({
          where: { id },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });
      }

      return notification;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Failed to fetch notification', error);
      throw new InternalServerErrorException('Failed to fetch notification');
    }
  }

  async update(
    id: string,
    userProfileId: string,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    try {
      const notification = await this.prisma.notification.findFirst({
        where: {
          id,
          userProfileId,
        },
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      const updatedNotification = await this.prisma.notification.update({
        where: { id },
        data: {
          isRead: updateNotificationDto.isRead,
          readAt: updateNotificationDto.isRead ? new Date() : null,
        },
      });

      await this.auditService.log({
        actorId: userProfileId,
        module: 'Notification',
        action: 'UPDATE',
        entityType: 'Notification',
        entityId: id,
        oldValues: notification,
        newValues: updatedNotification,
      });

      return updatedNotification;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Failed to update notification', error);
      throw new InternalServerErrorException('Failed to update notification');
    }
  }

  async markAsRead(
    userProfileId: string,
    notificationIds?: string[],
  ): Promise<{ count: number }> {
    try {
      const where: Prisma.NotificationWhereInput = {
        userProfileId,
        isRead: false,
        ...(notificationIds && { id: { in: notificationIds } }),
      };

      const result = await this.prisma.notification.updateMany({
        where,
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      this.logger.log(
        `Marked ${result.count} notifications as read for user ${userProfileId}`,
      );
      return { count: result.count };
    } catch (error) {
      this.logger.error('Failed to mark notifications as read', error);
      throw new InternalServerErrorException(
        'Failed to mark notifications as read',
      );
    }
  }

  async getUnreadCount(userProfileId: string): Promise<{ count: number }> {
    try {
      const count = await this.prisma.notification.count({
        where: {
          userProfileId,
          isRead: false,
        },
      });

      return { count };
    } catch (error) {
      this.logger.error('Failed to get unread count', error);
      throw new InternalServerErrorException('Failed to get unread count');
    }
  }

  async remove(
    id: string,
    userProfileId: string,
  ): Promise<{ message: string }> {
    try {
      const notification = await this.prisma.notification.findFirst({
        where: {
          id,
          userProfileId,
        },
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      await this.prisma.notification.delete({
        where: { id },
      });

      await this.auditService.log({
        actorId: userProfileId,
        module: 'Notification',
        action: 'DELETE',
        entityType: 'Notification',
        entityId: id,
        oldValues: notification,
      });

      return { message: 'Notification deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Failed to delete notification', error);
      throw new InternalServerErrorException('Failed to delete notification');
    }
  }

  async removeAllRead(userProfileId: string): Promise<{ count: number }> {
    try {
      const result = await this.prisma.notification.deleteMany({
        where: {
          userProfileId,
          isRead: true,
        },
      });

      this.logger.log(
        `Deleted ${result.count} read notifications for user ${userProfileId}`,
      );
      return { count: result.count };
    } catch (error) {
      this.logger.error('Failed to delete read notifications', error);
      throw new InternalServerErrorException(
        'Failed to delete read notifications',
      );
    }
  }

  // Internal method for other services to send notifications
  async sendNotification(
    userProfileId: string,
    type: string,
    title: string,
    message: string,
    data?: Record<string, any>,
    channels: PrismaNotificationChannel[] = [PrismaNotificationChannel.IN_APP],
  ): Promise<Notification> {
    return this.create({
      userProfileId,
      type: type as any,
      title,
      message,
      data,
      channels,
    });
  }

  /**
   * Get rate limit status for a user
   */
  async getRateLimitStatus(
    userProfileId: string,
  ): Promise<Map<string, { count: number; remaining: number; resetAt: Date }>> {
    return this.rateLimitService.getRateLimitStatus(userProfileId);
  }

  /**
   * Reset rate limit for a user (admin only)
   */
  async resetRateLimit(
    userProfileId: string,
    notificationType?: string,
  ): Promise<void> {
    return this.rateLimitService.resetRateLimit(
      userProfileId,
      notificationType,
    );
  }
}
