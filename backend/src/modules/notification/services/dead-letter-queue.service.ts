import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationJob } from '../interfaces/notification-queue.interface';
import { EmailService } from '../email.service';

export interface DeadLetterJob extends NotificationJob {
  failureReason: string;
  failureCount: number;
  lastFailureAt: Date;
  originalJobId: string;
  stackTrace?: string;
}

export interface AlertConfig {
  enabled: boolean;
  threshold: number;
  windowMs: number;
  recipients: string[];
}

@Injectable()
@Processor('dead-letter-notifications')
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name);
  private failureCount = 0;
  private failureWindow: Map<string, number> = new Map();
  private readonly alertConfig: AlertConfig = {
    enabled: true,
    threshold: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    recipients: ['admin@gloria.org'],
  };

  constructor(
    @InjectQueue('dead-letter-notifications') private deadLetterQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    this.setupQueueEventHandlers();
    this.startAlertMonitor();
  }

  /**
   * Setup event handlers for dead letter queue
   */
  private setupQueueEventHandlers(): void {
    this.deadLetterQueue.on('completed', (job) => {
      this.logger.log(`Dead letter job ${job.id} processed successfully`);
    });

    this.deadLetterQueue.on('failed', (job, err) => {
      this.logger.error(`Dead letter job ${job.id} failed:`, err);
      this.incrementFailureCount();
    });

    this.deadLetterQueue.on('error', (error) => {
      this.logger.error('Dead letter queue error:', error);
    });
  }

  /**
   * Add a failed job to dead letter queue
   */
  async addToDeadLetterQueue(
    job: NotificationJob,
    failureReason: string,
    originalJobId: string,
    stackTrace?: string,
  ): Promise<void> {
    try {
      const deadLetterJob: DeadLetterJob = {
        ...job,
        failureReason,
        failureCount: 1,
        lastFailureAt: new Date(),
        originalJobId,
        stackTrace,
      };

      await this.deadLetterQueue.add('process-dead-letter', deadLetterJob, {
        removeOnComplete: false,
        removeOnFail: false,
        attempts: 1,
      });

      this.logger.warn(
        `Job ${originalJobId} moved to dead letter queue: ${failureReason}`,
      );

      // Increment failure tracking
      this.incrementFailureCount();

      // Store in database for permanent record
      await this.storeDeadLetterRecord(deadLetterJob);
    } catch (error) {
      this.logger.error('Failed to add job to dead letter queue:', error);
      throw error;
    }
  }

  /**
   * Process dead letter jobs (for manual review or retry)
   */
  @Process('process-dead-letter')
  async processDeadLetterJob(job: Job<DeadLetterJob>): Promise<void> {
    const deadLetterJob = job.data;

    try {
      // Log the dead letter job for analysis
      this.logger.warn(`Processing dead letter job: ${deadLetterJob.id}`, {
        userProfileId: deadLetterJob.userProfileId,
        failureReason: deadLetterJob.failureReason,
        failureCount: deadLetterJob.failureCount,
        priority: deadLetterJob.priority,
      });

      // Store detailed failure information
      await this.analyzeFailure(deadLetterJob);

      // Check if alert threshold is reached
      await this.checkAlertThreshold();
    } catch (error) {
      this.logger.error('Error processing dead letter job:', error);
      throw error;
    }
  }

  /**
   * Store dead letter record in database
   */
  private async storeDeadLetterRecord(job: DeadLetterJob): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: `dlq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          action: 'UPDATE',
          entityType: 'notification_dead_letter',
          entityId: job.id,
          actorId: 'system',
          module: 'notification',
          metadata: JSON.parse(
            JSON.stringify({
              actorType: 'system',
              originalJobId: job.originalJobId,
              userProfileId: job.userProfileId,
              channels: job.channels,
              priority: job.priority,
              failureReason: job.failureReason,
              failureCount: job.failureCount,
              lastFailureAt: job.lastFailureAt,
              stackTrace: job.stackTrace,
              payload: job.payload,
            }),
          ),
        },
      });
    } catch (error) {
      this.logger.error('Failed to store dead letter record:', error);
    }
  }

  /**
   * Analyze failure patterns
   */
  private async analyzeFailure(job: DeadLetterJob): Promise<void> {
    // Track failure patterns for specific users
    const userFailureKey = `user:${job.userProfileId}`;
    const currentCount = this.failureWindow.get(userFailureKey) || 0;
    this.failureWindow.set(userFailureKey, currentCount + 1);

    // Track failure patterns by channel
    for (const channel of job.channels) {
      const channelKey = `channel:${channel}`;
      const channelCount = this.failureWindow.get(channelKey) || 0;
      this.failureWindow.set(channelKey, channelCount + 1);
    }

    // Track failure patterns by priority
    const priorityKey = `priority:${job.priority}`;
    const priorityCount = this.failureWindow.get(priorityKey) || 0;
    this.failureWindow.set(priorityKey, priorityCount + 1);
  }

  /**
   * Increment failure count and track in time window
   */
  private incrementFailureCount(): void {
    this.failureCount++;
    const now = Date.now();
    const windowKey = `window:${Math.floor(now / this.alertConfig.windowMs)}`;
    const windowCount = this.failureWindow.get(windowKey) || 0;
    this.failureWindow.set(windowKey, windowCount + 1);
  }

  /**
   * Check if alert threshold is reached
   */
  private async checkAlertThreshold(): Promise<void> {
    if (!this.alertConfig.enabled) return;

    const now = Date.now();
    const currentWindow = Math.floor(now / this.alertConfig.windowMs);
    const windowKey = `window:${currentWindow}`;
    const currentWindowCount = this.failureWindow.get(windowKey) || 0;

    if (currentWindowCount >= this.alertConfig.threshold) {
      await this.sendCriticalAlert(currentWindowCount);

      // Reset counter after alert to avoid spam
      this.failureWindow.set(windowKey, 0);
    }
  }

  /**
   * Send critical failure alert
   */
  private async sendCriticalAlert(failureCount: number): Promise<void> {
    const alertMessage = `
      CRITICAL: Notification System Alert
      
      The notification system has exceeded the failure threshold.
      
      Details:
      - Failures in last hour: ${failureCount}
      - Threshold: ${this.alertConfig.threshold}
      - Time: ${new Date().toISOString()}
      
      Failure Analysis:
      ${this.generateFailureAnalysis()}
      
      Please investigate immediately.
    `;

    for (const recipient of this.alertConfig.recipients) {
      try {
        await this.emailService.sendEmail({
          to: recipient,
          subject: '🚨 CRITICAL: Notification System Failure Alert',
          text: alertMessage,
          html: this.formatAlertHtml(alertMessage),
        });
      } catch (error) {
        this.logger.error(`Failed to send alert to ${recipient}:`, error);
      }
    }

    this.logger.error(`Critical alert sent: ${failureCount} failures detected`);
  }

  /**
   * Generate failure analysis for alert
   */
  private generateFailureAnalysis(): string {
    const analysis: string[] = [];

    // Analyze by type
    const userFailures = Array.from(this.failureWindow.entries())
      .filter(([key]) => key.startsWith('user:'))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    if (userFailures.length > 0) {
      analysis.push('Top affected users:');
      userFailures.forEach(([key, count]) => {
        const userId = key.replace('user:', '');
        analysis.push(`  - User ${userId}: ${count} failures`);
      });
    }

    // Analyze by channel
    const channelFailures = Array.from(this.failureWindow.entries())
      .filter(([key]) => key.startsWith('channel:'))
      .sort(([, a], [, b]) => b - a);

    if (channelFailures.length > 0) {
      analysis.push('\nFailures by channel:');
      channelFailures.forEach(([key, count]) => {
        const channel = key.replace('channel:', '');
        analysis.push(`  - ${channel}: ${count} failures`);
      });
    }

    // Analyze by priority
    const priorityFailures = Array.from(this.failureWindow.entries())
      .filter(([key]) => key.startsWith('priority:'))
      .sort(([, a], [, b]) => b - a);

    if (priorityFailures.length > 0) {
      analysis.push('\nFailures by priority:');
      priorityFailures.forEach(([key, count]) => {
        const priority = key.replace('priority:', '');
        analysis.push(`  - ${priority}: ${count} failures`);
      });
    }

    return analysis.join('\n');
  }

  /**
   * Format alert message as HTML
   */
  private formatAlertHtml(message: string): string {
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
          .alert {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
          }
          .details {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            margin-top: 20px;
          }
          pre {
            white-space: pre-wrap;
            word-wrap: break-word;
          }
        </style>
      </head>
      <body>
        <div class="alert">
          <h2>🚨 CRITICAL: Notification System Alert</h2>
        </div>
        <div class="details">
          <pre>${message}</pre>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Start periodic alert monitor
   */
  private startAlertMonitor(): void {
    // Clean up old window entries every hour
    setInterval(() => {
      const now = Date.now();
      const currentWindow = Math.floor(now / this.alertConfig.windowMs);

      // Remove entries older than 2 windows
      for (const [key] of this.failureWindow.entries()) {
        if (key.startsWith('window:')) {
          const window = parseInt(key.replace('window:', ''));
          if (window < currentWindow - 1) {
            this.failureWindow.delete(key);
          }
        }
      }
    }, this.alertConfig.windowMs);
  }

  /**
   * Manually retry a dead letter job
   */
  async retryDeadLetterJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.deadLetterQueue.getJob(jobId);

      if (!job) {
        this.logger.warn(`Dead letter job ${jobId} not found`);
        return false;
      }

      const deadLetterJob = job.data as DeadLetterJob;

      // Create a new notification job from the dead letter job
      const notificationJob: NotificationJob = {
        id: deadLetterJob.id,
        userProfileId: deadLetterJob.userProfileId,
        channels: deadLetterJob.channels,
        priority: deadLetterJob.priority,
        payload: deadLetterJob.payload,
        retryCount: (deadLetterJob.retryCount || 0) + 1,
        maxRetries: deadLetterJob.maxRetries,
      };

      // Re-queue to main notification queue
      await this.prisma.$transaction(async (tx) => {
        // Update audit log
        await tx.auditLog.create({
          data: {
            id: `dlq_retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            action: 'UPDATE',
            entityType: 'notification_retry',
            entityId: jobId,
            actorId: 'admin',
            module: 'notification',
            metadata: {
              actorType: 'admin',
              originalJobId: deadLetterJob.originalJobId,
              retryAttempt: deadLetterJob.failureCount + 1,
              manualRetry: true,
            },
          },
        });
      });

      // Remove from dead letter queue
      await job.remove();

      this.logger.log(`Dead letter job ${jobId} queued for retry`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to retry dead letter job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Get dead letter queue statistics
   */
  async getStatistics(): Promise<{
    totalJobs: number;
    failedJobs: number;
    processedJobs: number;
    oldestJob?: Date;
    failuresByChannel: Record<string, number>;
    failuresByPriority: Record<string, number>;
    recentFailures: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.deadLetterQueue.getWaitingCount(),
      this.deadLetterQueue.getActiveCount(),
      this.deadLetterQueue.getCompletedCount(),
      this.deadLetterQueue.getFailedCount(),
    ]);

    const jobs = await this.deadLetterQueue.getJobs([
      'waiting',
      'active',
      'completed',
      'failed',
    ]);

    let oldestJob: Date | undefined;
    const failuresByChannel: Record<string, number> = {};
    const failuresByPriority: Record<string, number> = {};

    for (const job of jobs) {
      const data = job.data as DeadLetterJob;

      // Track oldest job
      if (!oldestJob || data.lastFailureAt < oldestJob) {
        oldestJob = data.lastFailureAt;
      }

      // Track failures by channel
      for (const channel of data.channels) {
        failuresByChannel[channel] = (failuresByChannel[channel] || 0) + 1;
      }

      // Track failures by priority
      failuresByPriority[data.priority] =
        (failuresByPriority[data.priority] || 0) + 1;
    }

    // Count recent failures (last hour)
    const now = Date.now();
    const currentWindow = Math.floor(now / this.alertConfig.windowMs);
    const recentFailures =
      this.failureWindow.get(`window:${currentWindow}`) || 0;

    return {
      totalJobs: waiting + active + completed + failed,
      failedJobs: failed,
      processedJobs: completed,
      oldestJob,
      failuresByChannel,
      failuresByPriority,
      recentFailures,
    };
  }

  /**
   * Clear dead letter queue (emergency use only)
   */
  async clearDeadLetterQueue(): Promise<void> {
    await this.deadLetterQueue.empty();
    this.failureWindow.clear();
    this.failureCount = 0;
    this.logger.warn('Dead letter queue has been cleared');
  }

  /**
   * Update alert configuration
   */
  updateAlertConfig(config: Partial<AlertConfig>): void {
    Object.assign(this.alertConfig, config);
    this.logger.log('Alert configuration updated', this.alertConfig);
  }
}
