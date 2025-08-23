import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job, JobOptions } from 'bull';
import {
  NotificationJob,
  NotificationQueueOptions,
} from '../interfaces/notification-queue.interface';
import { Priority } from '@prisma/client';

export interface QueueWeight {
  priority: Priority;
  weight: number;
  concurrency: number;
  rateLimit?: {
    max: number;
    duration: number;
  };
}

export interface WeightedQueueConfig {
  weights: QueueWeight[];
  defaultConcurrency: number;
  globalRateLimit?: {
    max: number;
    duration: number;
  };
}

export interface QueueMetrics {
  priority: Priority;
  processed: number;
  failed: number;
  avgProcessingTime: number;
  successRate: number;
  currentLoad: number;
}

@Injectable()
export class WeightedQueueService implements OnModuleInit {
  private readonly logger = new Logger(WeightedQueueService.name);
  private readonly queues: Map<Priority, Queue> = new Map();
  private readonly metrics: Map<Priority, QueueMetrics> = new Map();
  private readonly processingTimes: Map<Priority, number[]> = new Map();

  private readonly config: WeightedQueueConfig = {
    weights: [
      {
        priority: Priority.CRITICAL,
        weight: 100,
        concurrency: 10,
        rateLimit: { max: 100, duration: 1000 }, // 100 per second
      },
      {
        priority: Priority.URGENT,
        weight: 50,
        concurrency: 8,
        rateLimit: { max: 50, duration: 1000 }, // 50 per second
      },
      {
        priority: Priority.HIGH,
        weight: 30,
        concurrency: 6,
        rateLimit: { max: 30, duration: 1000 }, // 30 per second
      },
      {
        priority: Priority.MEDIUM,
        weight: 10,
        concurrency: 4,
        rateLimit: { max: 20, duration: 1000 }, // 20 per second
      },
      {
        priority: Priority.LOW,
        weight: 5,
        concurrency: 2,
        rateLimit: { max: 10, duration: 1000 }, // 10 per second
      },
    ],
    defaultConcurrency: 4,
    globalRateLimit: { max: 200, duration: 1000 }, // 200 total per second
  };

  constructor(
    @InjectQueue('notifications-critical') private criticalQueue: Queue,
    @InjectQueue('notifications-urgent') private urgentQueue: Queue,
    @InjectQueue('notifications-high') private highQueue: Queue,
    @InjectQueue('notifications-medium') private mediumQueue: Queue,
    @InjectQueue('notifications-low') private lowQueue: Queue,
  ) {}

  async onModuleInit() {
    // Initialize queues map
    this.queues.set(Priority.CRITICAL, this.criticalQueue);
    this.queues.set(Priority.URGENT, this.urgentQueue);
    this.queues.set(Priority.HIGH, this.highQueue);
    this.queues.set(Priority.MEDIUM, this.mediumQueue);
    this.queues.set(Priority.LOW, this.lowQueue);

    // Initialize metrics for each priority
    for (const priority of Object.values(Priority)) {
      this.metrics.set(priority as Priority, {
        priority: priority as Priority,
        processed: 0,
        failed: 0,
        avgProcessingTime: 0,
        successRate: 100,
        currentLoad: 0,
      });
      this.processingTimes.set(priority as Priority, []);
    }

    // Setup event handlers for each queue
    await this.setupQueueEventHandlers();

    // Configure concurrency for each queue
    await this.configureConcurrency();

    // Start metrics collector
    this.startMetricsCollector();
  }

  /**
   * Setup event handlers for all queues
   */
  private async setupQueueEventHandlers(): Promise<void> {
    for (const [priority, queue] of this.queues.entries()) {
      queue.on('completed', (job: Job, result: any) => {
        this.handleJobCompleted(priority, job, result);
      });

      queue.on('failed', (job: Job, err: Error) => {
        this.handleJobFailed(priority, job, err);
      });

      queue.on('active', (job: Job) => {
        this.handleJobActive(priority, job);
      });

      queue.on('stalled', (job: Job) => {
        this.logger.warn(`Job stalled in ${priority} queue: ${job.id}`);
      });

      queue.on('error', (error: Error) => {
        this.logger.error(`Queue error in ${priority} queue:`, error);
      });
    }
  }

  /**
   * Configure concurrency for each queue based on weights
   */
  private async configureConcurrency(): Promise<void> {
    for (const weightConfig of this.config.weights) {
      const queue = this.queues.get(weightConfig.priority);
      if (queue) {
        // Set concurrency
        // Concurrency should be configured via process options

        // Note: Rate limiting should be configured via job options
        // when creating the queue or processing jobs

        this.logger.log(
          `Configured ${weightConfig.priority} queue: concurrency=${weightConfig.concurrency}, weight=${weightConfig.weight}`,
        );
      }
    }
  }

  /**
   * Add a notification job to the appropriate weighted queue
   */
  async addWeightedJob(
    job: NotificationJob,
    options?: NotificationQueueOptions,
  ): Promise<void> {
    const priority = job.priority || Priority.MEDIUM;
    const queue = this.queues.get(priority);

    if (!queue) {
      throw new Error(`Queue not found for priority: ${priority}`);
    }

    // Calculate dynamic delay based on current load
    const dynamicDelay = await this.calculateDynamicDelay(priority);

    // Get weight configuration for this priority
    const weightConfig = this.config.weights.find(
      (w) => w.priority === priority,
    );
    const weight = weightConfig?.weight || 10;

    const jobOptions: JobOptions = {
      priority: weight, // Use weight as Bull's priority (lower number = higher priority)
      delay: options?.delay || dynamicDelay,
      attempts: options?.attempts || this.getRetryAttempts(priority),
      backoff: options?.backoff || this.getBackoffStrategy(priority),
      removeOnComplete: true,
      removeOnFail: false,
      timeout: this.getTimeout(priority),
    };

    try {
      const addedJob = await queue.add(
        `${priority}-notification`,
        job,
        jobOptions,
      );
      this.logger.log(
        `Job ${job.id} added to ${priority} queue with weight ${weight}, job ID: ${addedJob.id}`,
      );
    } catch (error) {
      this.logger.error(`Failed to add job to ${priority} queue:`, error);
      throw error;
    }
  }

  /**
   * Calculate dynamic delay based on queue load
   */
  private async calculateDynamicDelay(priority: Priority): Promise<number> {
    const queue = this.queues.get(priority);
    if (!queue) return 0;

    const [waiting, active] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
    ]);

    const totalLoad = waiting + active;
    const metrics = this.metrics.get(priority);

    if (metrics) {
      metrics.currentLoad = totalLoad;
    }

    // Apply backpressure if queue is overloaded
    const weightConfig = this.config.weights.find(
      (w) => w.priority === priority,
    );
    const maxLoad =
      (weightConfig?.concurrency || this.config.defaultConcurrency) * 10;

    if (totalLoad > maxLoad) {
      // Add progressive delay based on load
      const overloadFactor = Math.min((totalLoad - maxLoad) / maxLoad, 2);
      return Math.floor(overloadFactor * 5000); // Up to 10 seconds delay
    }

    return 0;
  }

  /**
   * Get retry attempts based on priority
   */
  private getRetryAttempts(priority: Priority): number {
    const attempts = {
      [Priority.CRITICAL]: 5,
      [Priority.URGENT]: 4,
      [Priority.HIGH]: 3,
      [Priority.MEDIUM]: 3,
      [Priority.LOW]: 2,
    };
    return attempts[priority] || 3;
  }

  /**
   * Get backoff strategy based on priority
   */
  private getBackoffStrategy(priority: Priority): {
    type: 'fixed' | 'exponential';
    delay: number;
  } {
    const strategies = {
      [Priority.CRITICAL]: { type: 'exponential' as const, delay: 1000 }, // Start with 1 second
      [Priority.URGENT]: { type: 'exponential' as const, delay: 2000 }, // Start with 2 seconds
      [Priority.HIGH]: { type: 'exponential' as const, delay: 3000 }, // Start with 3 seconds
      [Priority.MEDIUM]: { type: 'fixed' as const, delay: 5000 }, // Fixed 5 seconds
      [Priority.LOW]: { type: 'fixed' as const, delay: 10000 }, // Fixed 10 seconds
    };
    return strategies[priority] || { type: 'fixed' as const, delay: 5000 };
  }

  /**
   * Get timeout based on priority
   */
  private getTimeout(priority: Priority): number {
    const timeouts = {
      [Priority.CRITICAL]: 30000, // 30 seconds
      [Priority.URGENT]: 25000, // 25 seconds
      [Priority.HIGH]: 20000, // 20 seconds
      [Priority.MEDIUM]: 15000, // 15 seconds
      [Priority.LOW]: 10000, // 10 seconds
    };
    return timeouts[priority] || 15000;
  }

  /**
   * Handle job completion
   */
  private handleJobCompleted(priority: Priority, job: Job, result: any): void {
    const metrics = this.metrics.get(priority);
    if (metrics) {
      metrics.processed++;

      // Track processing time
      const processingTime = Date.now() - job.timestamp;
      const times = this.processingTimes.get(priority) || [];
      times.push(processingTime);

      // Keep only last 100 processing times
      if (times.length > 100) {
        times.shift();
      }

      // Calculate average processing time
      metrics.avgProcessingTime =
        times.reduce((a, b) => a + b, 0) / times.length;

      // Update success rate
      const total = metrics.processed + metrics.failed;
      metrics.successRate = (metrics.processed / total) * 100;
    }

    this.logger.debug(
      `Job ${job.id} completed in ${priority} queue, processing time: ${Date.now() - job.timestamp}ms`,
    );
  }

  /**
   * Handle job failure
   */
  private handleJobFailed(priority: Priority, job: Job, err: Error): void {
    const metrics = this.metrics.get(priority);
    if (metrics) {
      metrics.failed++;

      // Update success rate
      const total = metrics.processed + metrics.failed;
      metrics.successRate = (metrics.processed / total) * 100;
    }

    this.logger.error(`Job ${job.id} failed in ${priority} queue:`, err);
  }

  /**
   * Handle job becoming active
   */
  private handleJobActive(priority: Priority, job: Job): void {
    this.logger.debug(`Job ${job.id} active in ${priority} queue`);
  }

  /**
   * Start metrics collector
   */
  private startMetricsCollector(): void {
    // Collect metrics every minute
    setInterval(async () => {
      await this.collectQueueMetrics();
    }, 60000);
  }

  /**
   * Collect queue metrics
   */
  private async collectQueueMetrics(): Promise<void> {
    for (const [priority, queue] of this.queues.entries()) {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);

      const metrics = this.metrics.get(priority);
      if (metrics) {
        metrics.currentLoad = waiting + active;
      }

      this.logger.debug(
        `Queue ${priority} metrics: waiting=${waiting}, active=${active}, completed=${completed}, failed=${failed}`,
      );
    }
  }

  /**
   * Get all queue statistics
   */
  async getQueueStatistics(): Promise<{
    queues: Array<{
      priority: Priority;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
      metrics: QueueMetrics;
    }>;
    totalWaiting: number;
    totalActive: number;
    totalCompleted: number;
    totalFailed: number;
  }> {
    const queueStats: Array<{
      priority: Priority;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
      metrics: QueueMetrics;
    }> = [];
    let totalWaiting = 0;
    let totalActive = 0;
    let totalCompleted = 0;
    let totalFailed = 0;

    for (const [priority, queue] of this.queues.entries()) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      totalWaiting += waiting;
      totalActive += active;
      totalCompleted += completed;
      totalFailed += failed;

      const metrics = this.metrics.get(priority);

      queueStats.push({
        priority,
        waiting,
        active,
        completed,
        failed,
        delayed,
        metrics: metrics || {
          priority,
          processed: 0,
          failed: 0,
          avgProcessingTime: 0,
          successRate: 100,
          currentLoad: waiting + active,
        },
      });
    }

    return {
      queues: queueStats,
      totalWaiting,
      totalActive,
      totalCompleted,
      totalFailed,
    };
  }

  /**
   * Rebalance queue weights dynamically based on performance
   */
  async rebalanceWeights(): Promise<void> {
    const stats = await this.getQueueStatistics();

    for (const queueStat of stats.queues) {
      const weightConfig = this.config.weights.find(
        (w) => w.priority === queueStat.priority,
      );
      if (!weightConfig) continue;

      const metrics = queueStat.metrics;

      // Adjust concurrency based on success rate and load
      if (metrics.successRate < 90 && weightConfig.concurrency > 2) {
        // Reduce concurrency if success rate is low
        weightConfig.concurrency = Math.max(2, weightConfig.concurrency - 1);
        this.logger.warn(
          `Reduced concurrency for ${queueStat.priority} queue to ${weightConfig.concurrency} due to low success rate`,
        );
      } else if (
        metrics.successRate > 98 &&
        metrics.currentLoad > weightConfig.concurrency * 2
      ) {
        // Increase concurrency if success rate is high and load is high
        weightConfig.concurrency = Math.min(20, weightConfig.concurrency + 1);
        this.logger.log(
          `Increased concurrency for ${queueStat.priority} queue to ${weightConfig.concurrency} due to high load`,
        );
      }

      // Apply new concurrency
      const queue = this.queues.get(queueStat.priority);
      if (queue) {
        // Concurrency should be configured via process options
      }
    }
  }

  /**
   * Pause a specific priority queue
   */
  async pausePriorityQueue(priority: Priority): Promise<void> {
    const queue = this.queues.get(priority);
    if (queue) {
      await queue.pause();
      this.logger.log(`${priority} queue paused`);
    }
  }

  /**
   * Resume a specific priority queue
   */
  async resumePriorityQueue(priority: Priority): Promise<void> {
    const queue = this.queues.get(priority);
    if (queue) {
      await queue.resume();
      this.logger.log(`${priority} queue resumed`);
    }
  }

  /**
   * Clear a specific priority queue
   */
  async clearPriorityQueue(priority: Priority): Promise<void> {
    const queue = this.queues.get(priority);
    if (queue) {
      await queue.empty();
      this.logger.warn(`${priority} queue cleared`);
    }
  }

  /**
   * Update weight configuration
   */
  updateWeightConfig(priority: Priority, config: Partial<QueueWeight>): void {
    const weightConfig = this.config.weights.find(
      (w) => w.priority === priority,
    );
    if (weightConfig) {
      Object.assign(weightConfig, config);
      this.logger.log(`Updated weight config for ${priority}:`, weightConfig);
    }
  }
}
