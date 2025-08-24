import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QUEUE_NAMES } from '../constants/queue.constants';

export interface JobProgress {
  jobId: string;
  progress: number;
  stage?: string;
  message?: string;
  timestamp: Date;
}

export interface JobEvent {
  jobId: string;
  type: 'started' | 'completed' | 'failed' | 'progress' | 'stalled';
  data?: any;
  error?: any;
  timestamp: Date;
}

@Injectable()
export class QueueMonitoringService implements OnModuleInit {
  private readonly logger = new Logger(QueueMonitoringService.name);
  private readonly jobProgress = new Map<string, JobProgress>();

  constructor(
    @InjectQueue(QUEUE_NAMES.BACKUP) private readonly backupQueue: Queue,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.setupQueueEventListeners();
  }

  private setupQueueEventListeners() {
    // Job lifecycle events
    this.backupQueue.on('active', (job: Job) => {
      this.logger.log(`Job ${job.id} started processing`);
      this.emitJobEvent(job.id.toString(), 'started', { jobName: job.name });
    });

    this.backupQueue.on('completed', (job: Job, result: any) => {
      this.logger.log(`Job ${job.id} completed`);
      this.jobProgress.delete(job.id.toString());
      this.emitJobEvent(job.id.toString(), 'completed', result);
    });

    this.backupQueue.on('failed', (job: Job, error: Error) => {
      this.logger.error(`Job ${job.id} failed: ${error.message}`);
      this.jobProgress.delete(job.id.toString());
      this.emitJobEvent(job.id.toString(), 'failed', null, error);
    });

    this.backupQueue.on('progress', (job: Job, progress: number | any) => {
      const progressData = typeof progress === 'number' 
        ? { progress } 
        : progress;
      
      this.updateJobProgress(job.id.toString(), progressData);
      this.emitJobEvent(job.id.toString(), 'progress', progressData);
    });

    this.backupQueue.on('stalled', (job: Job) => {
      this.logger.warn(`Job ${job.id} stalled and will be retried`);
      this.emitJobEvent(job.id.toString(), 'stalled');
    });

    // Queue events
    this.backupQueue.on('error', (error: Error) => {
      this.logger.error(`Queue error: ${error.message}`, error.stack);
    });

    this.backupQueue.on('paused', () => {
      this.logger.log('Queue paused');
    });

    this.backupQueue.on('resumed', () => {
      this.logger.log('Queue resumed');
    });

    this.backupQueue.on('cleaned', (jobs: Job[], type: string) => {
      this.logger.log(`Cleaned ${jobs.length} ${type} jobs`);
    });
  }

  private emitJobEvent(
    jobId: string,
    type: JobEvent['type'],
    data?: any,
    error?: any,
  ) {
    const event: JobEvent = {
      jobId,
      type,
      data,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : undefined,
      timestamp: new Date(),
    };

    this.eventEmitter.emit(`queue.job.${type}`, event);
    this.eventEmitter.emit('queue.job.event', event);
  }

  private updateJobProgress(jobId: string, progressData: any) {
    const progress: JobProgress = {
      jobId,
      progress: progressData.progress || 0,
      stage: progressData.stage,
      message: progressData.message,
      timestamp: new Date(),
    };

    this.jobProgress.set(jobId, progress);
  }

  /**
   * Get current progress for a job
   */
  getJobProgress(jobId: string): JobProgress | undefined {
    return this.jobProgress.get(jobId);
  }

  /**
   * Get all active job progress
   */
  getAllJobProgress(): JobProgress[] {
    return Array.from(this.jobProgress.values());
  }

  /**
   * Monitor job until completion
   */
  async monitorJob(jobId: string | number): Promise<Job> {
    const job = await this.backupQueue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        const currentJob = await this.backupQueue.getJob(jobId);
        if (!currentJob) {
          clearInterval(checkInterval);
          reject(new Error(`Job ${jobId} disappeared`));
          return;
        }

        const state = await currentJob.getState();
        if (state === 'completed') {
          clearInterval(checkInterval);
          resolve(currentJob);
        } else if (state === 'failed') {
          clearInterval(checkInterval);
          reject(new Error(`Job ${jobId} failed`));
        }
      }, 1000); // Check every second

      // Timeout after 30 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error(`Job ${jobId} monitoring timeout`));
      }, 30 * 60 * 1000);
    });
  }

  /**
   * Get detailed job statistics
   */
  async getJobStatistics() {
    const jobs = await this.backupQueue.getJobs(['completed', 'failed']);
    
    const stats = {
      total: jobs.length,
      completed: 0,
      failed: 0,
      averageDuration: 0,
      successRate: 0,
      jobTypes: {} as Record<string, number>,
    };

    let totalDuration = 0;
    let durationCount = 0;

    for (const job of jobs) {
      const state = await job.getState();
      
      if (state === 'completed') {
        stats.completed++;
        if (job.finishedOn && job.processedOn) {
          totalDuration += job.finishedOn - job.processedOn;
          durationCount++;
        }
      } else if (state === 'failed') {
        stats.failed++;
      }

      // Count by job type
      const jobType = job.name;
      stats.jobTypes[jobType] = (stats.jobTypes[jobType] || 0) + 1;
    }

    stats.averageDuration = durationCount > 0 ? totalDuration / durationCount : 0;
    stats.successRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

    return stats;
  }

  /**
   * Get queue health status
   */
  async getQueueHealth() {
    try {
      const [metrics, isPaused, isReady] = await Promise.all([
        this.backupQueue.getJobCounts(),
        this.backupQueue.isPaused(),
        this.backupQueue.isReady(),
      ]);

      const health = {
        status: 'healthy',
        isPaused,
        isReady,
        metrics,
        issues: [] as string[],
      };

      // Check for potential issues
      if (metrics.failed > 10) {
        health.issues.push(`High number of failed jobs: ${metrics.failed}`);
      }

      if (metrics.waiting > 100) {
        health.issues.push(`Large backlog of waiting jobs: ${metrics.waiting}`);
      }

      if (metrics.delayed > 50) {
        health.issues.push(`Many delayed jobs: ${metrics.delayed}`);
      }

      if (health.issues.length > 0) {
        health.status = 'degraded';
      }

      if (!isReady || isPaused) {
        health.status = 'unhealthy';
      }

      return health;
    } catch (error) {
      this.logger.error('Failed to get queue health', error.stack);
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }
}