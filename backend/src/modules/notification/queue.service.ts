import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { InjectQueue, Processor, Process } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { EmailService } from './email.service';
import { PushService } from './push.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TemplateService } from './template.service';
import { DeadLetterQueueService } from './services/dead-letter-queue.service';
import { WeightedQueueService } from './services/weighted-queue.service';
import { BatchProcessorService } from './services/batch-processor.service';
import { BatchAggregationService } from './services/batch-aggregation.service';
import {
  NotificationJob,
  NotificationQueueOptions,
} from './interfaces/notification-queue.interface';
import { NotificationChannel, NotificationType } from '@prisma/client';

@Injectable()
@Processor('notifications')
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @Optional() @InjectQueue('notifications') private notificationQueue: Queue,
    private readonly emailService: EmailService,
    private readonly pushService: PushService,
    private readonly prisma: PrismaService,
    private readonly templateService: TemplateService,
    private readonly deadLetterQueueService: DeadLetterQueueService,
    private readonly weightedQueueService: WeightedQueueService,
    private readonly batchProcessorService: BatchProcessorService,
    private readonly batchAggregationService: BatchAggregationService,
  ) {}

  async onModuleInit() {
    if (!this.notificationQueue) {
      this.logger.warn(
        'Notification queue not initialized. Queue features will be disabled.',
      );
      return;
    }

    // Clean up old completed jobs on startup
    await this.cleanupOldJobs();

    // Set up queue event listeners
    this.notificationQueue.on('completed', (job) => {
      this.logger.log(`Job ${job.id} completed successfully`);
    });

    this.notificationQueue.on('failed', async (job, err) => {
      this.logger.error(`Job ${job.id} failed:`, err);

      // Check if job has exhausted all retries
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        // Move to dead letter queue
        await this.moveToDeadLetterQueue(job, err);
      }
    });

    this.notificationQueue.on('stalled', (job) => {
      this.logger.warn(`Job ${job.id} stalled and will be retried`);
    });
  }

  async addNotificationJob(
    job: NotificationJob,
    options?: NotificationQueueOptions,
  ): Promise<void> {
    // Check if notification should be aggregated
    if (this.batchAggregationService.shouldAggregate(job)) {
      await this.batchAggregationService.addToAggregation(job);
      return;
    }

    // Check if notification should use batch processing
    if (this.shouldUseBatchProcessing(job)) {
      // Add to batch processor for efficient bulk processing
      for (const channel of job.channels) {
        await this.batchProcessorService.addToBatch(job, channel);
      }
      return;
    }

    // Use weighted queue service for priority-based queuing
    if (this.shouldUseWeightedQueue(job)) {
      await this.weightedQueueService.addWeightedJob(job, options);
      return;
    }

    if (!this.notificationQueue) {
      this.logger.warn('Queue not available. Notification will not be queued.');
      return;
    }

    try {
      const queueOptions = {
        priority: this.mapPriorityToNumber(job.priority),
        delay: options?.delay || 0,
        attempts: options?.attempts || 3,
        backoff: options?.backoff || {
          type: 'exponential' as const,
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      };

      await this.notificationQueue.add('send-notification', job, queueOptions);
      this.logger.log(`Notification job added to queue: ${job.id}`);
    } catch (error) {
      this.logger.error('Failed to add notification job to queue:', error);

      // If queue fails, try to add to dead letter queue as a last resort
      await this.deadLetterQueueService.addToDeadLetterQueue(
        job,
        `Queue failure: ${error.message}`,
        job.id,
        error.stack,
      );

      throw error;
    }
  }

  @Process('send-notification')
  async processNotification(job: Job<NotificationJob>): Promise<void> {
    const notificationJob = job.data;
    this.logger.log(`Processing notification job: ${notificationJob.id}`);

    try {
      // Get user profile to fetch email and other contact info
      const userProfile = await this.prisma.userProfile.findUnique({
        where: { id: notificationJob.userProfileId },
        include: { dataKaryawan: true },
      });

      if (!userProfile) {
        throw new Error(
          `User profile not found: ${notificationJob.userProfileId}`,
        );
      }

      // Process each channel
      for (const channel of notificationJob.channels) {
        try {
          await this.sendToChannel(channel, notificationJob, userProfile);
        } catch (channelError) {
          this.logger.error(`Failed to send to ${channel}:`, channelError);
          // Continue with other channels even if one fails
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to process notification job ${notificationJob.id}:`,
        error,
      );
      throw error; // This will trigger retry logic
    }
  }

  private async sendToChannel(
    channel: NotificationChannel,
    job: NotificationJob,
    userProfile: any,
  ): Promise<void> {
    switch (channel) {
      case NotificationChannel.EMAIL:
        await this.sendEmailNotification(job, userProfile);
        break;
      case NotificationChannel.PUSH:
        await this.sendPushNotification(job, userProfile);
        break;
      case NotificationChannel.SMS:
        await this.sendSmsNotification(job, userProfile);
        break;
      case NotificationChannel.IN_APP:
        // In-app notifications are already handled directly in NotificationService
        break;
      default:
        this.logger.warn(`Unsupported notification channel: ${channel}`);
    }
  }

  private async sendEmailNotification(
    job: NotificationJob,
    userProfile: any,
  ): Promise<void> {
    if (!userProfile.dataKaryawan?.email) {
      this.logger.warn(`No email found for user ${userProfile.id}`);
      return;
    }

    const success = await this.emailService.sendWithRetry({
      to: userProfile.dataKaryawan.email,
      subject: job.payload.title,
      text: job.payload.message,
      html: this.formatHtmlMessage(job.payload.message),
    });

    if (!success) {
      throw new Error('Failed to send email notification');
    }
  }

  private async sendPushNotification(
    job: NotificationJob,
    userProfile: any,
  ): Promise<void> {
    const subscriptions = await this.pushService.getSubscriptions(
      userProfile.id,
    );

    if (subscriptions.length === 0) {
      this.logger.warn(
        `No push subscriptions found for user ${userProfile.id}`,
      );
      return;
    }

    const results = await this.pushService.sendBulkPushNotifications(
      subscriptions,
      {
        title: job.payload.title,
        body: job.payload.message,
        data: job.payload.data,
      },
    );

    if (results.sent === 0 && results.failed > 0) {
      throw new Error('Failed to send push notifications to any device');
    }
  }

  private async sendSmsNotification(
    job: NotificationJob,
    userProfile: any,
  ): Promise<void> {
    // SMS implementation would go here
    // This is a placeholder for future SMS integration
    this.logger.warn('SMS notifications are not yet implemented');
  }

  private formatHtmlMessage(message: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  <p>${message.replace(/\n/g, '<br>')}</p>
</body>
</html>`;
  }

  private mapPriorityToNumber(priority: string): number {
    const priorityMap = {
      CRITICAL: 1,
      URGENT: 2,
      HIGH: 3,
      MEDIUM: 5,
      LOW: 10,
    };
    return priorityMap[priority] || 5;
  }

  async getQueueStatus(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    if (!this.notificationQueue) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.notificationQueue.getWaitingCount(),
      this.notificationQueue.getActiveCount(),
      this.notificationQueue.getCompletedCount(),
      this.notificationQueue.getFailedCount(),
      this.notificationQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  async cleanupOldJobs(): Promise<void> {
    if (!this.notificationQueue) return;

    try {
      // Clean completed jobs older than 24 hours
      await this.notificationQueue.clean(24 * 60 * 60 * 1000, 'completed');

      // Clean failed jobs older than 7 days
      await this.notificationQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed');

      this.logger.log('Queue cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup old jobs:', error);
    }
  }

  async pauseQueue(): Promise<void> {
    if (!this.notificationQueue) {
      this.logger.warn('Queue not available');
      return;
    }
    await this.notificationQueue.pause();
    this.logger.log('Notification queue paused');
  }

  async resumeQueue(): Promise<void> {
    if (!this.notificationQueue) {
      this.logger.warn('Queue not available');
      return;
    }
    await this.notificationQueue.resume();
    this.logger.log('Notification queue resumed');
  }

  async retryFailedJobs(): Promise<number> {
    if (!this.notificationQueue) {
      this.logger.warn('Queue not available');
      return 0;
    }
    const failedJobs = await this.notificationQueue.getFailed();
    let retryCount = 0;

    for (const job of failedJobs) {
      try {
        await job.retry();
        retryCount++;
      } catch (error) {
        this.logger.error(`Failed to retry job ${job.id}:`, error);
      }
    }

    this.logger.log(`Retried ${retryCount} failed jobs`);
    return retryCount;
  }

  async scheduleNotification(
    job: NotificationJob,
    scheduleTime: Date,
  ): Promise<void> {
    const delay = scheduleTime.getTime() - Date.now();

    if (delay < 0) {
      throw new Error('Schedule time must be in the future');
    }

    await this.addNotificationJob(job, { delay });
    this.logger.log(`Notification scheduled for ${scheduleTime.toISOString()}`);
  }

  async cancelScheduledNotification(jobId: string): Promise<boolean> {
    if (!this.notificationQueue) {
      this.logger.warn('Queue not available');
      return false;
    }

    try {
      const jobs = await this.notificationQueue.getDelayed();
      const jobToCancel = jobs.find((j) => j.data.id === jobId);

      if (jobToCancel) {
        await jobToCancel.remove();
        this.logger.log(`Cancelled scheduled notification: ${jobId}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Failed to cancel notification ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Determine if weighted queue should be used
   */
  private shouldUseWeightedQueue(job: NotificationJob): boolean {
    // Use weighted queue for high-priority notifications
    // or when system is under load
    const highPriorityJobs = ['CRITICAL', 'URGENT', 'HIGH'];
    return highPriorityJobs.includes(job.priority);
  }

  /**
   * Determine if batch processing should be used
   */
  private shouldUseBatchProcessing(job: NotificationJob): boolean {
    // Don't batch process critical or urgent notifications
    if (job.priority === 'CRITICAL' || job.priority === 'URGENT') {
      return false;
    }

    // Use batch processing for bulk notifications
    const batchEligibleTypes = [
      NotificationType.ANNOUNCEMENT,
      NotificationType.SYSTEM_UPDATE,
      NotificationType.REMINDER,
    ];

    // Check if notification type is eligible for batching
    if (job.type && batchEligibleTypes.includes(job.type as any)) {
      return true;
    }

    // Use batch processing for email channel with lower priority
    if (
      job.channels.includes(NotificationChannel.EMAIL) &&
      (job.priority === 'LOW' || job.priority === 'MEDIUM')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Move failed job to dead letter queue
   */
  private async moveToDeadLetterQueue(
    job: Job<NotificationJob>,
    error: Error,
  ): Promise<void> {
    try {
      await this.deadLetterQueueService.addToDeadLetterQueue(
        job.data,
        error.message,
        job.id.toString(),
        error.stack,
      );
    } catch (dlqError) {
      this.logger.error('Failed to move job to dead letter queue:', dlqError);
    }
  }

  /**
   * Get comprehensive queue statistics including weighted and dead letter queues
   */
  async getComprehensiveQueueStatus(): Promise<any> {
    const [
      mainQueueStatus,
      weightedQueueStats,
      deadLetterStats,
      batchStats,
      aggregationStats,
    ] = await Promise.all([
      this.getQueueStatus(),
      this.weightedQueueService.getQueueStatistics(),
      this.deadLetterQueueService.getStatistics(),
      this.batchProcessorService.getBatchStatistics(),
      this.batchAggregationService.getStatistics(),
    ]);

    return {
      mainQueue: mainQueueStatus,
      weightedQueues: weightedQueueStats,
      deadLetterQueue: deadLetterStats,
      batchProcessor: batchStats,
      aggregation: aggregationStats,
      summary: {
        totalPending:
          mainQueueStatus.waiting +
          weightedQueueStats.totalWaiting +
          batchStats.pendingBatches,
        totalActive: mainQueueStatus.active + weightedQueueStats.totalActive,
        totalFailed: mainQueueStatus.failed + deadLetterStats.failedJobs,
        totalAggregated: aggregationStats.bufferSize,
        healthStatus: this.calculateHealthStatus(
          mainQueueStatus,
          deadLetterStats,
        ),
      },
    };
  }

  /**
   * Calculate overall health status of the notification system
   */
  private calculateHealthStatus(mainQueue: any, deadLetter: any): string {
    const failureRate =
      deadLetter.failedJobs / (mainQueue.completed + deadLetter.failedJobs + 1);

    if (failureRate > 0.1) return 'CRITICAL';
    if (failureRate > 0.05) return 'WARNING';
    if (mainQueue.waiting > 1000) return 'DEGRADED';

    return 'HEALTHY';
  }
}
