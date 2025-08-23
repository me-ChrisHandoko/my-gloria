import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailOptions } from '../email.service';
import { PushNotificationPayload, PushSubscription } from '../push.service';

export enum FallbackNotificationType {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
}

export interface FallbackNotification {
  id?: string;
  type: FallbackNotificationType;
  payload: any;
  recipient: string;
  retryCount: number;
  maxRetries: number;
  lastAttempt?: Date;
  nextAttempt?: Date;
  error?: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class FallbackQueueService {
  private readonly logger = new Logger(FallbackQueueService.name);
  private readonly inMemoryQueue: FallbackNotification[] = [];
  private readonly maxQueueSize = 1000;
  private retryInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
    private readonly prisma: PrismaService,
  ) {
    this.startRetryProcessor();
  }

  /**
   * Store a failed email notification for later retry
   */
  async storeFailedEmail(options: EmailOptions, error?: string): Promise<void> {
    const fallbackNotification: FallbackNotification = {
      type: FallbackNotificationType.EMAIL,
      payload: options,
      recipient: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      retryCount: 0,
      maxRetries: 5,
      error,
      createdAt: new Date(),
      nextAttempt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      metadata: {
        subject: options.subject,
        hasAttachments: !!options.attachments?.length,
      },
    };

    await this.addToFallbackQueue(fallbackNotification);
  }

  /**
   * Store a failed push notification for later retry
   */
  async storeFailedPush(
    subscription: PushSubscription,
    payload: PushNotificationPayload,
    error?: string,
  ): Promise<void> {
    const fallbackNotification: FallbackNotification = {
      type: FallbackNotificationType.PUSH,
      payload: { subscription, payload },
      recipient: subscription.endpoint,
      retryCount: 0,
      maxRetries: 3,
      error,
      createdAt: new Date(),
      nextAttempt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      metadata: {
        title: payload.title,
        body: payload.body,
      },
    };

    await this.addToFallbackQueue(fallbackNotification);
  }

  /**
   * Add notification to fallback queue
   */
  private async addToFallbackQueue(
    notification: FallbackNotification,
  ): Promise<void> {
    try {
      // First, try to add to Bull queue for persistent storage
      await this.notificationQueue.add('fallback-notification', notification, {
        delay: 5 * 60 * 1000, // 5 minutes delay
        attempts: notification.maxRetries,
        backoff: {
          type: 'exponential',
          delay: 60000, // Start with 1 minute
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.log(
        `Added ${notification.type} notification to fallback queue for ${notification.recipient}`,
      );
    } catch (queueError) {
      // If Bull queue fails, use in-memory fallback
      this.logger.error(
        'Failed to add to Bull queue, using in-memory fallback:',
        queueError,
      );

      // Ensure we don't exceed max queue size
      if (this.inMemoryQueue.length >= this.maxQueueSize) {
        // Remove oldest notifications
        this.inMemoryQueue.splice(0, 10);
        this.logger.warn(
          'In-memory queue full, removed oldest 10 notifications',
        );
      }

      this.inMemoryQueue.push(notification);
    }
  }

  /**
   * Process fallback notifications for retry
   */
  private startRetryProcessor(): void {
    // Process every 5 minutes
    this.retryInterval = setInterval(
      () => {
        this.processInMemoryQueue();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Process in-memory queue
   */
  private async processInMemoryQueue(): Promise<void> {
    const now = new Date();
    const notificationsToRetry = this.inMemoryQueue.filter(
      (n) =>
        n.nextAttempt && n.nextAttempt <= now && n.retryCount < n.maxRetries,
    );

    for (const notification of notificationsToRetry) {
      try {
        await this.retryNotification(notification);

        // Remove from queue if successful
        const index = this.inMemoryQueue.indexOf(notification);
        if (index > -1) {
          this.inMemoryQueue.splice(index, 1);
        }
      } catch (error) {
        // Update retry information
        notification.retryCount++;
        notification.lastAttempt = new Date();
        notification.error = error.message;

        if (notification.retryCount >= notification.maxRetries) {
          // Move to dead letter queue
          await this.moveToDeadLetterQueue(notification);

          // Remove from in-memory queue
          const index = this.inMemoryQueue.indexOf(notification);
          if (index > -1) {
            this.inMemoryQueue.splice(index, 1);
          }
        } else {
          // Calculate next retry time with exponential backoff
          const nextDelay = Math.min(
            5 * 60 * 1000 * Math.pow(2, notification.retryCount),
            24 * 60 * 60 * 1000, // Max 24 hours
          );
          notification.nextAttempt = new Date(Date.now() + nextDelay);
        }
      }
    }
  }

  /**
   * Retry a notification
   */
  private async retryNotification(
    notification: FallbackNotification,
  ): Promise<void> {
    this.logger.log(
      `Retrying ${notification.type} notification for ${notification.recipient} (attempt ${notification.retryCount + 1}/${notification.maxRetries})`,
    );

    // Re-queue the notification for processing
    await this.notificationQueue.add('retry-notification', notification, {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  /**
   * Move failed notification to dead letter queue
   */
  private async moveToDeadLetterQueue(
    notification: FallbackNotification,
  ): Promise<void> {
    try {
      await this.notificationQueue.add('dead-letter', notification, {
        removeOnComplete: false,
        removeOnFail: false,
      });

      this.logger.error(
        `Moved ${notification.type} notification to dead letter queue after ${notification.maxRetries} failed attempts for ${notification.recipient}`,
      );

      // Store in database for permanent record
      await this.storeFailedNotificationInDb(notification);
    } catch (error) {
      this.logger.error(
        'Failed to move notification to dead letter queue:',
        error,
      );
    }
  }

  /**
   * Store permanently failed notification in database
   */
  private async storeFailedNotificationInDb(
    notification: FallbackNotification,
  ): Promise<void> {
    try {
      // Store failed notification in audit log or dedicated table
      await this.prisma.auditLog.create({
        data: {
          id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          action: 'UPDATE',
          entityType: 'notification',
          entityId: notification.id || 'unknown',
          actorId: 'system',
          module: 'notification',
          metadata: {
            actorType: 'system',
            failureType: 'NOTIFICATION_FAILED',
            type: notification.type,
            recipient: notification.recipient,
            retryCount: notification.retryCount,
            error: notification.error,
            payload: notification.payload,
            createdAt: notification.createdAt,
            lastAttempt: notification.lastAttempt,
          },
        },
      });
    } catch (error) {
      this.logger.error(
        'Failed to store failed notification in database:',
        error,
      );
    }
  }

  /**
   * Get fallback queue statistics
   */
  async getQueueStatistics(): Promise<{
    inMemoryQueueSize: number;
    pendingRetries: number;
    failedNotifications: number;
    oldestNotification?: Date;
  }> {
    const now = new Date();
    const pendingRetries = this.inMemoryQueue.filter(
      (n) =>
        n.nextAttempt && n.nextAttempt > now && n.retryCount < n.maxRetries,
    ).length;

    const failedNotifications = this.inMemoryQueue.filter(
      (n) => n.retryCount >= n.maxRetries,
    ).length;

    const oldestNotification =
      this.inMemoryQueue.length > 0
        ? this.inMemoryQueue.reduce((oldest, n) =>
            n.createdAt < oldest.createdAt ? n : oldest,
          ).createdAt
        : undefined;

    // Also get Bull queue statistics
    const bullQueueStats = await this.notificationQueue.getJobCounts();

    return {
      inMemoryQueueSize: this.inMemoryQueue.length,
      pendingRetries,
      failedNotifications,
      oldestNotification,
      ...bullQueueStats,
    };
  }

  /**
   * Clear fallback queue (for testing or emergency)
   */
  async clearFallbackQueue(): Promise<void> {
    this.inMemoryQueue.length = 0;
    await this.notificationQueue.empty();
    this.logger.warn('Fallback queue has been cleared');
  }

  /**
   * Process specific notification immediately
   */
  async processNotificationNow(notificationId: string): Promise<boolean> {
    const notification = this.inMemoryQueue.find(
      (n) => n.id === notificationId,
    );

    if (!notification) {
      return false;
    }

    try {
      await this.retryNotification(notification);

      // Remove from queue
      const index = this.inMemoryQueue.indexOf(notification);
      if (index > -1) {
        this.inMemoryQueue.splice(index, 1);
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to process notification ${notificationId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Clean up resources
   */
  onModuleDestroy(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }
  }
}
