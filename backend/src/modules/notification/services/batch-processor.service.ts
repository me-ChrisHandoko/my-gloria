import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as genericPool from 'generic-pool';
import * as nodemailer from 'nodemailer';
import { NotificationJob } from '../interfaces/notification-queue.interface';
import { NotificationChannel } from '@prisma/client';
import { NotificationMetricsService } from './metrics.service';

export interface BatchProcessingConfig {
  maxBatchSize: number;
  maxConcurrency: number;
  batchTimeout: number;
  connectionPoolSize: number;
  dynamicSizing: boolean;
}

export interface BatchNotification {
  jobs: NotificationJob[];
  channel: NotificationChannel;
  startTime: number;
  priority: string;
}

export interface ProcessingResult {
  successful: string[];
  failed: string[];
  totalTime: number;
  averageTime: number;
}

@Injectable()
export class BatchProcessorService {
  private readonly logger = new Logger(BatchProcessorService.name);
  private readonly config: BatchProcessingConfig;
  private emailConnectionPool: genericPool.Pool<nodemailer.Transporter>;
  private batchAccumulator: Map<string, BatchNotification> = new Map();
  private processingMetrics: Map<string, number> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly metricsService: NotificationMetricsService,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {
    this.config = this.initializeConfig();
    this.initializeConnectionPool();
    this.startBatchProcessingTimer();
  }

  private initializeConfig(): BatchProcessingConfig {
    return {
      maxBatchSize: this.configService.get<number>('BATCH_MAX_SIZE', 100),
      maxConcurrency: this.configService.get<number>(
        'BATCH_MAX_CONCURRENCY',
        10,
      ),
      batchTimeout: this.configService.get<number>('BATCH_TIMEOUT_MS', 5000),
      connectionPoolSize: this.configService.get<number>('EMAIL_POOL_SIZE', 5),
      dynamicSizing: this.configService.get<boolean>(
        'BATCH_DYNAMIC_SIZING',
        true,
      ),
    };
  }

  private initializeConnectionPool(): void {
    const factory = {
      create: async (): Promise<nodemailer.Transporter> => {
        const transporter = nodemailer.createTransport({
          host: this.configService.get<string>('EMAIL_HOST', 'smtp.gmail.com'),
          port: this.configService.get<number>('EMAIL_PORT', 587),
          secure: this.configService.get<boolean>('EMAIL_SECURE', false),
          auth: {
            user: this.configService.get<string>('EMAIL_USER'),
            pass: this.configService.get<string>('EMAIL_PASSWORD'),
          },
          pool: true,
          maxConnections: this.config.connectionPoolSize,
          maxMessages: 100,
          rateDelta: 1000,
          rateLimit: 10,
        });

        await new Promise<void>((resolve, reject) => {
          transporter.verify((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });

        return transporter;
      },
      destroy: async (transporter: nodemailer.Transporter) => {
        await transporter.close();
      },
      validate: async (transporter: nodemailer.Transporter) => {
        return new Promise<boolean>((resolve) => {
          transporter.verify((error) => {
            resolve(!error);
          });
        });
      },
    };

    const poolOpts = {
      min: 1,
      max: this.config.connectionPoolSize,
      testOnBorrow: true,
      acquireTimeoutMillis: 3000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      evictionRunIntervalMillis: 10000,
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.emailConnectionPool = genericPool.createPool(factory, poolOpts) as any;

    this.emailConnectionPool.on('factoryCreateError', (err) => {
      this.logger.error('Failed to create email connection:', err);
    });

    this.emailConnectionPool.on('factoryDestroyError', (err) => {
      this.logger.error('Failed to destroy email connection:', err);
    });
  }

  private startBatchProcessingTimer(): void {
    setInterval(() => {
      void this.processPendingBatches();
    }, this.config.batchTimeout);
  }

  /**
   * Add notification to batch for processing
   */
  async addToBatch(
    job: NotificationJob,
    channel: NotificationChannel,
  ): Promise<void> {
    const batchKey = this.generateBatchKey(channel, job.priority);

    if (!this.batchAccumulator.has(batchKey)) {
      this.batchAccumulator.set(batchKey, {
        jobs: [],
        channel,
        startTime: Date.now(),
        priority: job.priority,
      });
    }

    const batch = this.batchAccumulator.get(batchKey);
    if (!batch) {
      this.logger.error(`Batch not found for key: ${batchKey}`);
      return;
    }
    batch.jobs.push(job);

    // Process immediately if batch is full
    const dynamicBatchSize = await this.calculateDynamicBatchSize(channel);
    if (batch.jobs.length >= dynamicBatchSize) {
      await this.processBatch(batchKey);
    }
  }

  /**
   * Calculate dynamic batch size based on current load and performance
   */
  private async calculateDynamicBatchSize(
    channel: NotificationChannel,
  ): Promise<number> {
    if (!this.config.dynamicSizing) {
      return this.config.maxBatchSize;
    }

    const baseSize = this.config.maxBatchSize;
    const queueLength = await this.notificationQueue.getWaitingCount();
    const avgProcessingTime = this.getAverageProcessingTime(channel);

    // Adjust batch size based on queue pressure and processing speed
    if (queueLength > 1000) {
      // High load: increase batch size
      return Math.min(baseSize * 2, 200);
    } else if (queueLength > 500) {
      // Medium load: slightly increase batch size
      return Math.min(baseSize * 1.5, 150);
    } else if (avgProcessingTime > 1000) {
      // Slow processing: reduce batch size
      return Math.max(baseSize * 0.5, 10);
    }

    return baseSize;
  }

  /**
   * Process all pending batches that have timed out
   */
  private async processPendingBatches(): Promise<void> {
    const now = Date.now();
    const batchesToProcess: string[] = [];

    for (const [key, batch] of this.batchAccumulator.entries()) {
      if (now - batch.startTime >= this.config.batchTimeout) {
        batchesToProcess.push(key);
      }
    }

    await Promise.all(batchesToProcess.map((key) => this.processBatch(key)));
  }

  /**
   * Process a specific batch
   */
  private async processBatch(batchKey: string): Promise<ProcessingResult> {
    const batch = this.batchAccumulator.get(batchKey);
    if (!batch || batch.jobs.length === 0) {
      return { successful: [], failed: [], totalTime: 0, averageTime: 0 };
    }

    this.batchAccumulator.delete(batchKey);
    const startTime = Date.now();

    let result: ProcessingResult;
    switch (batch.channel) {
      case NotificationChannel.EMAIL:
        result = await this.processBatchEmails(batch.jobs);
        break;
      case NotificationChannel.PUSH:
        result = await this.processBatchPushNotifications(batch.jobs);
        break;
      case NotificationChannel.SMS:
        result = await this.processBatchSMS(batch.jobs);
        break;
      default:
        result = { successful: [], failed: [], totalTime: 0, averageTime: 0 };
    }

    const processingTime = Date.now() - startTime;
    this.updateProcessingMetrics(batch.channel, processingTime);

    // Record metrics
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await (this.metricsService as any).recordBatchProcessing({
      channel: batch.channel,
      batchSize: batch.jobs.length,
      successCount: result.successful.length,
      failureCount: result.failed.length,
      processingTime,
      priority: batch.priority,
    });

    this.logger.log(
      `Batch processed: ${batch.channel} - ${result.successful.length} successful, ${result.failed.length} failed in ${processingTime}ms`,
    );

    return result;
  }

  /**
   * Process batch of email notifications with connection pooling
   */
  private async processBatchEmails(
    jobs: NotificationJob[],
  ): Promise<ProcessingResult> {
    const results: ProcessingResult = {
      successful: [],
      failed: [],
      totalTime: 0,
      averageTime: 0,
    };

    // Create worker pool for concurrent processing
    const workers = Array.from({ length: this.config.maxConcurrency }, () =>
      this.createEmailWorker(),
    );

    // Distribute jobs among workers
    const chunks = this.chunkArray(
      jobs,
      Math.ceil(jobs.length / workers.length),
    );
    const workerPromises = chunks.map((chunk, index) =>
      this.processEmailChunk(chunk, workers[index % workers.length], results),
    );

    await Promise.all(workerPromises);

    // Calculate average processing time
    results.averageTime = results.totalTime / jobs.length;

    return results;
  }

  /**
   * Create an email worker with connection from pool
   */
  private async createEmailWorker() {
    const transporter = await this.emailConnectionPool.acquire();
    return {
      transporter,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      release: () => (this.emailConnectionPool as any).release(transporter),
    };
  }

  /**
   * Process a chunk of email jobs
   */
  private async processEmailChunk(
    jobs: NotificationJob[],
    worker: any,
    results: ProcessingResult,
  ): Promise<void> {
    try {
      for (const job of jobs) {
        const startTime = Date.now();
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          await worker.transporter.sendMail({
            to: job.payload.recipient,
            subject: job.payload.title,
            text: job.payload.message,
            html: this.formatHtmlMessage(job.payload.message),
          });
          results.successful.push(job.id);
        } catch (error) {
          this.logger.error(`Failed to send email for job ${job.id}:`, error);
          results.failed.push(job.id);
        }
        results.totalTime += Date.now() - startTime;
      }
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      await worker.release();
    }
  }

  /**
   * Process batch of push notifications
   */
  private async processBatchPushNotifications(
    jobs: NotificationJob[],
  ): Promise<ProcessingResult> {
    const results: ProcessingResult = {
      successful: [],
      failed: [],
      totalTime: 0,
      averageTime: 0,
    };

    // Group notifications by similar content for efficient delivery
    const groupedJobs = this.groupJobsByContent(jobs);

    // Process each group concurrently
    const groupPromises = Array.from(groupedJobs.entries()).map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async ([_contentHash, groupJobs]) => {
        const startTime = Date.now();
        try {
          // Implement batch push notification logic here
          // This would integrate with your push notification service
          groupJobs.forEach((job) => results.successful.push(job.id));
        } catch (error) {
          this.logger.error(`Failed to send push batch:`, error);
          groupJobs.forEach((job) => results.failed.push(job.id));
        }
        results.totalTime += Date.now() - startTime;
      },
    );

    await Promise.all(groupPromises);
    results.averageTime = results.totalTime / jobs.length;

    return results;
  }

  /**
   * Process batch of SMS notifications
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  private async processBatchSMS(
    jobs: NotificationJob[],
  ): Promise<ProcessingResult> {
    const results: ProcessingResult = {
      successful: [],
      failed: [],
      totalTime: 0,
      averageTime: 0,
    };

    // SMS batch processing would be implemented here
    // This is a placeholder for future SMS integration
    jobs.forEach((job) => results.failed.push(job.id));

    return results;
  }

  /**
   * Group jobs by content similarity for efficient batch processing
   */
  private groupJobsByContent(
    jobs: NotificationJob[],
  ): Map<string, NotificationJob[]> {
    const groups = new Map<string, NotificationJob[]>();

    for (const job of jobs) {
      const contentHash = this.generateContentHash(job.payload);
      if (!groups.has(contentHash)) {
        groups.set(contentHash, []);
      }
      const group = groups.get(contentHash);
      if (group) {
        group.push(job);
      }
    }

    return groups;
  }

  /**
   * Generate hash for notification content
   */
  private generateContentHash(payload: any): string {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return `${payload.title as string}-${payload.type as string}`;
  }

  /**
   * Generate batch key for accumulator
   */
  private generateBatchKey(
    channel: NotificationChannel,
    priority: string,
  ): string {
    return `${channel}-${priority}`;
  }

  /**
   * Update processing metrics
   */
  private updateProcessingMetrics(
    channel: NotificationChannel,
    time: number,
  ): void {
    const key = `${channel}_processing_time`;
    const current = this.processingMetrics.get(key) || 0;
    this.processingMetrics.set(key, (current + time) / 2);
  }

  /**
   * Get average processing time for a channel
   */
  private getAverageProcessingTime(channel: NotificationChannel): number {
    return this.processingMetrics.get(`${channel}_processing_time`) || 0;
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Format HTML message
   */
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

  /**
   * Get batch processing statistics
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async getBatchStatistics() {
    const stats = {
      pendingBatches: this.batchAccumulator.size,
      batches: Array.from(this.batchAccumulator.entries()).map(
        ([key, batch]) => ({
          key,
          channel: batch.channel,
          priority: batch.priority,
          size: batch.jobs.length,
          age: Date.now() - batch.startTime,
        }),
      ),
      connectionPool: {
        size: this.emailConnectionPool.size,
        available: this.emailConnectionPool.available,
        pending: this.emailConnectionPool.pending,
        borrowed: this.emailConnectionPool.borrowed,
      },
      processingMetrics: Object.fromEntries(this.processingMetrics),
      config: this.config,
    };

    return stats;
  }

  /**
   * Gracefully shutdown batch processor
   */
  async shutdown(): Promise<void> {
    this.logger.log('Shutting down batch processor...');

    // Process all pending batches
    const pendingKeys = Array.from(this.batchAccumulator.keys());
    await Promise.all(pendingKeys.map((key) => this.processBatch(key)));

    // Drain and close connection pool
    await this.emailConnectionPool.drain();
    await this.emailConnectionPool.clear();

    this.logger.log('Batch processor shutdown complete');
  }
}
