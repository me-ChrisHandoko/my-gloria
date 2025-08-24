import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job, JobOptions } from 'bull';
import { QUEUE_NAMES, JOB_NAMES, BACKUP_JOB_PRIORITY } from '../constants/queue.constants';

export interface BackupJobData {
  backupId: string;
  databaseUrl?: string;
  tables?: string[];
  format?: 'custom' | 'plain' | 'directory' | 'tar';
  compression?: boolean;
  excludeTables?: string[];
  includeSchemas?: string[];
  userId: string;
  organizationId?: string;
  metadata?: Record<string, any>;
}

export interface RestoreJobData {
  backupId: string;
  filePath: string;
  databaseUrl?: string;
  clean?: boolean;
  ifExists?: boolean;
  noOwner?: boolean;
  userId: string;
  organizationId?: string;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.BACKUP) private readonly backupQueue: Queue,
  ) {}

  /**
   * Add a backup job to the queue
   */
  async addBackupJob(
    data: BackupJobData,
    options?: JobOptions,
  ): Promise<Job<BackupJobData>> {
    try {
      const job = await this.backupQueue.add(
        JOB_NAMES.BACKUP.CREATE_BACKUP,
        data,
        {
          priority: options?.priority || BACKUP_JOB_PRIORITY.MANUAL,
          attempts: options?.attempts || 2,
          backoff: options?.backoff || {
            type: 'fixed',
            delay: 60000, // 1 minute
          },
          ...options,
        },
      );

      this.logger.log(
        `Backup job ${job.id} added to queue for backup ${data.backupId}`,
      );

      return job;
    } catch (error) {
      this.logger.error(
        `Failed to add backup job for ${data.backupId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Add a restore job to the queue
   */
  async addRestoreJob(
    data: RestoreJobData,
    options?: JobOptions,
  ): Promise<Job<RestoreJobData>> {
    try {
      const job = await this.backupQueue.add(
        JOB_NAMES.BACKUP.RESTORE_BACKUP,
        data,
        {
          priority: options?.priority || BACKUP_JOB_PRIORITY.URGENT,
          attempts: options?.attempts || 1, // Restore jobs should not be retried automatically
          ...options,
        },
      );

      this.logger.log(
        `Restore job ${job.id} added to queue for backup ${data.backupId}`,
      );

      return job;
    } catch (error) {
      this.logger.error(
        `Failed to add restore job for ${data.backupId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Schedule a recurring backup job
   */
  async scheduleBackupJob(
    data: BackupJobData,
    cron: string,
    options?: JobOptions,
  ): Promise<Job<BackupJobData>> {
    try {
      const job = await this.backupQueue.add(
        JOB_NAMES.BACKUP.SCHEDULE_BACKUP,
        data,
        {
          repeat: {
            cron,
          },
          priority: BACKUP_JOB_PRIORITY.SCHEDULED,
          ...options,
        },
      );

      this.logger.log(
        `Scheduled backup job ${job.id} with cron ${cron}`,
      );

      return job;
    } catch (error) {
      this.logger.error(
        `Failed to schedule backup job`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string | number): Promise<void> {
    try {
      const job = await this.backupQueue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.log(`Job ${jobId} cancelled`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to cancel job ${jobId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string | number): Promise<Job | null> {
    try {
      return await this.backupQueue.getJob(jobId);
    } catch (error) {
      this.logger.error(
        `Failed to get job ${jobId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get all jobs with a specific status
   */
  async getJobsByStatus(
    status: 'completed' | 'failed' | 'delayed' | 'active' | 'waiting' | 'paused',
    start = 0,
    end = 20,
  ): Promise<Job[]> {
    try {
      return await this.backupQueue.getJobs([status], start, end);
    } catch (error) {
      this.logger.error(
        `Failed to get jobs with status ${status}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Clean old jobs
   */
  async cleanOldJobs(
    grace: number,
    limit = 100,
    status: 'completed' | 'failed' = 'completed',
  ): Promise<Job[]> {
    try {
      return await this.backupQueue.clean(grace, status, limit);
    } catch (error) {
      this.logger.error(
        `Failed to clean old ${status} jobs`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Pause the queue
   */
  async pauseQueue(): Promise<void> {
    try {
      await this.backupQueue.pause();
      this.logger.log('Backup queue paused');
    } catch (error) {
      this.logger.error('Failed to pause queue', error.stack);
      throw error;
    }
  }

  /**
   * Resume the queue
   */
  async resumeQueue(): Promise<void> {
    try {
      await this.backupQueue.resume();
      this.logger.log('Backup queue resumed');
    } catch (error) {
      this.logger.error('Failed to resume queue', error.stack);
      throw error;
    }
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics() {
    try {
      const [
        waitingCount,
        activeCount,
        completedCount,
        failedCount,
        delayedCount,
        pausedCount,
      ] = await Promise.all([
        this.backupQueue.getWaitingCount(),
        this.backupQueue.getActiveCount(),
        this.backupQueue.getCompletedCount(),
        this.backupQueue.getFailedCount(),
        this.backupQueue.getDelayedCount(),
        this.backupQueue.isPaused(),
      ]);

      return {
        waiting: waitingCount,
        active: activeCount,
        completed: completedCount,
        failed: failedCount,
        delayed: delayedCount,
        paused: pausedCount,
      };
    } catch (error) {
      this.logger.error('Failed to get queue metrics', error.stack);
      throw error;
    }
  }
}