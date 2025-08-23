import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationJob } from '../interfaces/notification-queue.interface';
import {
  NotificationType,
  NotificationChannel,
  Priority,
} from '@prisma/client';
import { NotificationMetricsService } from './metrics.service';

export interface AggregationRule {
  type: NotificationType;
  channels: NotificationChannel[];
  windowMs: number;
  maxCount: number;
  groupBy?: string[];
  combineStrategy: 'digest' | 'summary' | 'individual';
}

export interface AggregatedNotification {
  userProfileId: string;
  type: NotificationType;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  items: NotificationJob[];
  digest?: string;
}

@Injectable()
export class BatchAggregationService {
  private readonly logger = new Logger(BatchAggregationService.name);
  private aggregationBuffer: Map<string, AggregatedNotification> = new Map();
  private aggregationRules: Map<NotificationType, AggregationRule> = new Map();
  private lastProcessedTime: Date = new Date();

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: NotificationMetricsService,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {
    this.initializeAggregationRules();
  }

  private initializeAggregationRules(): void {
    // Define aggregation rules for different notification types
    this.aggregationRules.set(NotificationType.SYSTEM_UPDATE, {
      type: NotificationType.SYSTEM_UPDATE,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      windowMs: 60 * 60 * 1000, // 1 hour
      maxCount: 10,
      groupBy: ['userProfileId'],
      combineStrategy: 'digest',
    });

    this.aggregationRules.set(NotificationType.APPROVAL_REQUEST, {
      type: NotificationType.APPROVAL_REQUEST,
      channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxCount: 5,
      groupBy: ['userProfileId', 'requestType'],
      combineStrategy: 'summary',
    });

    this.aggregationRules.set(NotificationType.ALERT, {
      type: NotificationType.ALERT,
      channels: [
        NotificationChannel.EMAIL,
        NotificationChannel.PUSH,
        NotificationChannel.SMS,
      ],
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxCount: 3,
      groupBy: ['userProfileId', 'alertLevel'],
      combineStrategy: 'individual', // Don't aggregate critical alerts
    });

    this.aggregationRules.set(NotificationType.REMINDER, {
      type: NotificationType.REMINDER,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      windowMs: 30 * 60 * 1000, // 30 minutes
      maxCount: 10,
      groupBy: ['userProfileId', 'reminderType'],
      combineStrategy: 'digest',
    });

    this.aggregationRules.set(NotificationType.ANNOUNCEMENT, {
      type: NotificationType.ANNOUNCEMENT,
      channels: [NotificationChannel.EMAIL],
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      maxCount: 20,
      groupBy: ['userProfileId'],
      combineStrategy: 'digest',
    });
  }

  /**
   * Determine if a notification should be aggregated
   */
  shouldAggregate(job: NotificationJob): boolean {
    if (!job.type) {
      return false;
    }
    const rule = this.aggregationRules.get(job.type);
    if (!rule) {
      return false;
    }

    // Don't aggregate critical notifications
    if (job.priority === 'CRITICAL' || job.priority === 'URGENT') {
      return false;
    }

    // Check if notification channels match aggregation rule
    const channelMatch = job.channels.some((channel) =>
      rule.channels.includes(channel),
    );

    return channelMatch && rule.combineStrategy !== 'individual';
  }

  /**
   * Add notification to aggregation buffer
   */
  async addToAggregation(job: NotificationJob): Promise<void> {
    if (!job.type) {
      // No type specified, process immediately
      await this.notificationQueue.add('send-notification', job);
      return;
    }
    const rule = this.aggregationRules.get(job.type);
    if (!rule) {
      // No aggregation rule, process immediately
      await this.notificationQueue.add('send-notification', job);
      return;
    }

    const aggregationKey = this.generateAggregationKey(job, rule);
    const existing = this.aggregationBuffer.get(aggregationKey);

    if (existing) {
      // Update existing aggregation
      existing.count++;
      existing.lastOccurrence = new Date();
      existing.items.push(job);

      // Check if we should flush this aggregation
      if (this.shouldFlushAggregation(existing, rule)) {
        await this.flushAggregation(aggregationKey);
      }
    } else {
      // Create new aggregation
      this.aggregationBuffer.set(aggregationKey, {
        userProfileId: job.userProfileId,
        type: job.type,
        count: 1,
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
        items: [job],
      });
    }

    // Record metrics
    await this.metricsService.recordNotificationAggregation({
      type: job.type,
      buffered: this.aggregationBuffer.size,
      aggregationKey,
    });
  }

  /**
   * Generate aggregation key based on grouping rules
   */
  private generateAggregationKey(
    job: NotificationJob,
    rule: AggregationRule,
  ): string {
    const keyParts = [job.type || 'unknown'];

    if (rule.groupBy) {
      rule.groupBy.forEach((field) => {
        if (field === 'userProfileId') {
          keyParts.push(job.userProfileId);
        } else if (job.payload[field]) {
          keyParts.push(job.payload[field]);
        }
      });
    }

    return keyParts.join(':');
  }

  /**
   * Check if aggregation should be flushed
   */
  private shouldFlushAggregation(
    aggregation: AggregatedNotification,
    rule: AggregationRule,
  ): boolean {
    // Flush if max count reached
    if (aggregation.count >= rule.maxCount) {
      return true;
    }

    // Flush if time window exceeded
    const age = Date.now() - aggregation.firstOccurrence.getTime();
    if (age >= rule.windowMs) {
      return true;
    }

    return false;
  }

  /**
   * Flush a specific aggregation
   */
  private async flushAggregation(key: string): Promise<void> {
    const aggregation = this.aggregationBuffer.get(key);
    if (!aggregation) {
      return;
    }

    this.aggregationBuffer.delete(key);

    try {
      const rule = this.aggregationRules.get(aggregation.type);
      if (!rule) {
        this.logger.error(
          `No aggregation rule found for type: ${aggregation.type}`,
        );
        return;
      }
      const combinedJob = await this.combineNotifications(aggregation, rule);

      // Add combined notification to queue
      await this.notificationQueue.add('send-notification', combinedJob, {
        priority: this.priorityToNumber(
          this.calculateAggregatedPriority(aggregation),
        ),
        removeOnComplete: true,
      });

      this.logger.log(
        `Flushed aggregation: ${key} with ${aggregation.count} notifications`,
      );

      // Record metrics
      await this.metricsService.recordAggregationFlush({
        type: aggregation.type,
        count: aggregation.count,
        timeInBuffer: Date.now() - aggregation.firstOccurrence.getTime(),
      });
    } catch (error) {
      this.logger.error(`Failed to flush aggregation ${key}:`, error);

      // Fallback: send individual notifications
      for (const job of aggregation.items) {
        await this.notificationQueue.add('send-notification', job);
      }
    }
  }

  /**
   * Combine multiple notifications into a single notification
   */
  private async combineNotifications(
    aggregation: AggregatedNotification,
    rule: AggregationRule,
  ): Promise<NotificationJob> {
    let title: string;
    let message: string;
    let data: any = {};

    switch (rule.combineStrategy) {
      case 'digest':
        ({ title, message, data } = this.createDigest(aggregation));
        break;
      case 'summary':
        ({ title, message, data } = this.createSummary(aggregation));
        break;
      default:
        // Use first notification as base
        const first = aggregation.items[0];
        title = first.payload.title;
        message = first.payload.message;
        data = first.payload.data;
    }

    // Get unique channels from all aggregated notifications
    const channels = new Set<NotificationChannel>();
    aggregation.items.forEach((job) => {
      job.channels.forEach((channel) => channels.add(channel));
    });

    return {
      id: `aggregated-${Date.now()}-${aggregation.userProfileId}`,
      userProfileId: aggregation.userProfileId,
      type: aggregation.type,
      priority: this.calculateAggregatedPriority(aggregation),
      channels: Array.from(channels),
      payload: {
        title,
        message,
        data: {
          ...data,
          aggregated: true,
          count: aggregation.count,
          firstOccurrence: aggregation.firstOccurrence,
          lastOccurrence: aggregation.lastOccurrence,
          aggregatedIds: aggregation.items.map((item) => item.id),
        },
      },
    };
  }

  /**
   * Create a digest of multiple notifications
   */
  private createDigest(aggregation: AggregatedNotification): {
    title: string;
    message: string;
    data: any;
  } {
    const typeLabel = this.getNotificationTypeLabel(aggregation.type);
    const title = `${aggregation.count} ${typeLabel} Notifications`;

    const messages = aggregation.items.map((item, index) => {
      const timestamp = new Date(item.payload.timestamp || Date.now());
      return `${index + 1}. [${timestamp.toLocaleTimeString()}] ${item.payload.title}`;
    });

    const message = messages.join('\n');

    return {
      title,
      message,
      data: {
        type: 'digest',
        items: aggregation.items.map((item) => ({
          id: item.id,
          title: item.payload.title,
          message: item.payload.message,
          timestamp: item.payload.timestamp,
        })),
      },
    };
  }

  /**
   * Create a summary of multiple notifications
   */
  private createSummary(aggregation: AggregatedNotification): {
    title: string;
    message: string;
    data: any;
  } {
    const typeLabel = this.getNotificationTypeLabel(aggregation.type);
    const title = `${aggregation.count} ${typeLabel} - Summary`;

    // Group by common attributes
    const groups = new Map<string, NotificationJob[]>();
    aggregation.items.forEach((item) => {
      const key = item.payload.title || 'Other';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      const group = groups.get(key);
      if (group) {
        group.push(item);
      }
    });

    const summaryLines = Array.from(groups.entries()).map(([key, items]) => {
      return `• ${key} (${items.length})`;
    });

    const message = summaryLines.join('\n');

    return {
      title,
      message,
      data: {
        type: 'summary',
        groups: Object.fromEntries(groups),
      },
    };
  }

  /**
   * Convert Priority enum to numeric value for Bull queue
   */
  private priorityToNumber(priority: Priority): number {
    const priorityMap = {
      [Priority.CRITICAL]: 1,
      [Priority.URGENT]: 2,
      [Priority.HIGH]: 3,
      [Priority.MEDIUM]: 4,
      [Priority.LOW]: 5,
    };
    return priorityMap[priority] || 4;
  }

  /**
   * Calculate priority for aggregated notification
   */
  private calculateAggregatedPriority(
    aggregation: AggregatedNotification,
  ): Priority {
    const priorities = [
      Priority.CRITICAL,
      Priority.URGENT,
      Priority.HIGH,
      Priority.MEDIUM,
      Priority.LOW,
    ];
    let highestPriority: Priority = Priority.LOW;

    for (const item of aggregation.items) {
      const itemPriorityIndex = priorities.indexOf(item.priority);
      const currentHighestIndex = priorities.indexOf(highestPriority);

      if (itemPriorityIndex < currentHighestIndex) {
        highestPriority = item.priority;
      }
    }

    return highestPriority;
  }

  /**
   * Get human-readable label for notification type
   */
  private getNotificationTypeLabel(type: NotificationType): string {
    const labels = {
      [NotificationType.SYSTEM_UPDATE]: 'System Update',
      [NotificationType.APPROVAL_REQUEST]: 'Approval Request',
      [NotificationType.ALERT]: 'Alert',
      [NotificationType.REMINDER]: 'Reminder',
      [NotificationType.ANNOUNCEMENT]: 'Announcement',
      [NotificationType.USER_ACTION]: 'User Action',
      [NotificationType.DATA_CHANGE]: 'Data Change',
    };

    return labels[type] || 'Notification';
  }

  /**
   * Process aggregations periodically
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processAggregations(): Promise<void> {
    const now = Date.now();
    const keysToFlush: string[] = [];

    for (const [key, aggregation] of this.aggregationBuffer.entries()) {
      const rule = this.aggregationRules.get(aggregation.type);
      if (!rule) continue;

      const age = now - aggregation.firstOccurrence.getTime();

      // Flush if time window exceeded
      if (age >= rule.windowMs) {
        keysToFlush.push(key);
      }
    }

    // Flush aggregations
    for (const key of keysToFlush) {
      await this.flushAggregation(key);
    }

    if (keysToFlush.length > 0) {
      this.logger.log(`Processed ${keysToFlush.length} aggregations`);
    }

    this.lastProcessedTime = new Date();
  }

  /**
   * Force flush all aggregations
   */
  async flushAll(): Promise<void> {
    const keys = Array.from(this.aggregationBuffer.keys());

    for (const key of keys) {
      await this.flushAggregation(key);
    }

    this.logger.log(`Force flushed ${keys.length} aggregations`);
  }

  /**
   * Get aggregation statistics
   */
  getStatistics() {
    const stats = {
      bufferSize: this.aggregationBuffer.size,
      lastProcessed: this.lastProcessedTime,
      aggregations: Array.from(this.aggregationBuffer.entries()).map(
        ([key, agg]) => ({
          key,
          type: agg.type,
          count: agg.count,
          age: Date.now() - agg.firstOccurrence.getTime(),
          userProfileId: agg.userProfileId,
        }),
      ),
      rules: Array.from(this.aggregationRules.entries()).map(
        ([type, rule]) => ({
          type,
          windowMs: rule.windowMs,
          maxCount: rule.maxCount,
          strategy: rule.combineStrategy,
        }),
      ),
    };

    return stats;
  }

  /**
   * Update aggregation rule
   */
  updateRule(type: NotificationType, rule: Partial<AggregationRule>): void {
    const existing = this.aggregationRules.get(type);
    if (existing) {
      this.aggregationRules.set(type, { ...existing, ...rule });
      this.logger.log(`Updated aggregation rule for ${type}`);
    }
  }
}
