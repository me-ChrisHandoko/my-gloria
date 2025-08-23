import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { v7 as uuidv7 } from 'uuid';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditableChange } from '../interfaces/audit.interface';

export interface AuditQueueData {
  entry: AuditableChange;
  retryCount?: number;
  lastError?: string;
}

@Injectable()
export class AuditQueueService {
  private readonly logger = new Logger(AuditQueueService.name);

  constructor(
    @InjectQueue('audit-logs') private readonly auditQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Add audit log entry to queue with retry mechanism
   */
  async addToQueue(entry: AuditableChange): Promise<void> {
    try {
      await this.auditQueue.add(
        'process-audit-log',
        { entry },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2 seconds
          },
          removeOnComplete: true,
          removeOnFail: false, // Keep failed jobs for analysis
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to add audit log to queue: ${error.message}`,
        error.stack,
      );
      // Fallback: Try to log directly if queue fails
      await this.fallbackDirectLog(entry);
    }
  }

  /**
   * Add multiple audit log entries to queue (batch operation)
   */
  async addBatchToQueue(entries: AuditableChange[]): Promise<void> {
    try {
      const jobs = entries.map((entry) => ({
        name: 'process-audit-log',
        data: { entry },
        opts: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }));

      await this.auditQueue.addBulk(jobs);
    } catch (error) {
      this.logger.error(
        `Failed to add batch audit logs to queue: ${error.message}`,
        error.stack,
      );
      // Fallback: Try to log directly if queue fails
      await this.fallbackBatchLog(entries);
    }
  }

  /**
   * Process audit log from queue
   */
  async processAuditLog(job: Job<AuditQueueData>): Promise<void> {
    const { entry } = job.data;

    try {
      await this.prisma.auditLog.create({
        data: {
          id: entry.id || this.generateId(),
          actorId: entry.actorId,
          actorProfileId: entry.actorProfileId,
          action: entry.action,
          module: entry.module,
          entityType: entry.entityType,
          entityId: entry.entityId,
          entityDisplay: entry.entityDisplay,
          oldValues: entry.oldValues,
          newValues: entry.newValues,
          changedFields: entry.changedFields || undefined,
          targetUserId: entry.targetUserId,
          metadata: entry.metadata,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          createdAt: entry.createdAt || new Date(),
        },
      });

      this.logger.log(
        `Successfully processed audit log for ${entry.entityType}:${entry.entityId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process audit log (attempt ${job.attemptsMade}/${job.opts.attempts}): ${error.message}`,
        error.stack,
      );

      // Update job data with error information
      job.data.retryCount = job.attemptsMade;
      job.data.lastError = error.message;

      // If this is the last attempt, send to dead letter queue
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        await this.moveToDeadLetterQueue(job.data);
      }

      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Process batch of audit logs
   */
  async processBatchAuditLogs(entries: AuditableChange[]): Promise<void> {
    try {
      const data = entries.map((entry) => ({
        id: entry.id || this.generateId(),
        actorId: entry.actorId,
        actorProfileId: entry.actorProfileId,
        action: entry.action,
        module: entry.module,
        entityType: entry.entityType,
        entityId: entry.entityId,
        entityDisplay: entry.entityDisplay,
        oldValues: entry.oldValues,
        newValues: entry.newValues,
        changedFields: entry.changedFields || undefined,
        targetUserId: entry.targetUserId,
        metadata: entry.metadata,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        createdAt: entry.createdAt || new Date(),
      }));

      await this.prisma.auditLog.createMany({
        data,
        skipDuplicates: true,
      });

      this.logger.log(
        `Successfully processed batch of ${entries.length} audit logs`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process batch audit logs: ${error.message}`,
        error.stack,
      );
      // Fallback to individual processing
      for (const entry of entries) {
        await this.addToQueue(entry);
      }
    }
  }

  /**
   * Fallback direct logging when queue is unavailable
   */
  private async fallbackDirectLog(entry: AuditableChange): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: entry.id || this.generateId(),
          actorId: entry.actorId,
          actorProfileId: entry.actorProfileId,
          action: entry.action,
          module: entry.module,
          entityType: entry.entityType,
          entityId: entry.entityId,
          entityDisplay: entry.entityDisplay,
          oldValues: entry.oldValues,
          newValues: entry.newValues,
          changedFields: entry.changedFields || undefined,
          targetUserId: entry.targetUserId,
          metadata: entry.metadata,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          createdAt: entry.createdAt || new Date(),
        },
      });

      this.logger.warn(
        `Used fallback direct logging for ${entry.entityType}:${entry.entityId}`,
      );
    } catch (error) {
      this.logger.error(
        `Fallback direct logging also failed: ${error.message}`,
        error.stack,
      );
      // At this point, we might want to write to a file or send an alert
      await this.emergencyLog(entry, error);
    }
  }

  /**
   * Fallback batch logging when queue is unavailable
   */
  private async fallbackBatchLog(entries: AuditableChange[]): Promise<void> {
    try {
      const data = entries.map((entry) => ({
        id: entry.id || this.generateId(),
        actorId: entry.actorId,
        actorProfileId: entry.actorProfileId,
        action: entry.action,
        module: entry.module,
        entityType: entry.entityType,
        entityId: entry.entityId,
        entityDisplay: entry.entityDisplay,
        oldValues: entry.oldValues,
        newValues: entry.newValues,
        changedFields: entry.changedFields || undefined,
        targetUserId: entry.targetUserId,
        metadata: entry.metadata,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        createdAt: entry.createdAt || new Date(),
      }));

      await this.prisma.auditLog.createMany({
        data,
        skipDuplicates: true,
      });

      this.logger.warn(
        `Used fallback batch logging for ${entries.length} entries`,
      );
    } catch (error) {
      this.logger.error(
        `Fallback batch logging failed: ${error.message}`,
        error.stack,
      );
      // Fall back to individual logging
      for (const entry of entries) {
        await this.fallbackDirectLog(entry);
      }
    }
  }

  /**
   * Move failed audit log to dead letter queue
   */
  private async moveToDeadLetterQueue(data: AuditQueueData): Promise<void> {
    try {
      await this.auditQueue.add('dead-letter', data, {
        removeOnComplete: false,
        removeOnFail: false,
      });

      this.logger.error(
        `Moved failed audit log to dead letter queue: ${data.entry.entityType}:${data.entry.entityId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to move audit log to dead letter queue: ${error.message}`,
        error.stack,
      );
      await this.emergencyLog(data.entry, error);
    }
  }

  /**
   * Emergency logging when all else fails
   */
  private async emergencyLog(
    entry: AuditableChange,
    error: any,
  ): Promise<void> {
    // This could write to a file, send an alert, or use another backup mechanism
    const emergencyData = {
      timestamp: new Date().toISOString(),
      entry,
      error: {
        message: error.message,
        stack: error.stack,
      },
    };

    this.logger.error(
      `EMERGENCY: All audit logging mechanisms failed`,
      JSON.stringify(emergencyData),
    );

    // You could implement file writing here if needed
    // For example: await fs.writeFile('/var/log/audit-emergency.log', ...)
  }

  /**
   * Generate unique ID for audit log
   */
  private generateId(): string {
    return uuidv7();
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<any> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.auditQueue.getWaitingCount(),
      this.auditQueue.getActiveCount(),
      this.auditQueue.getCompletedCount(),
      this.auditQueue.getFailedCount(),
      this.auditQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  /**
   * Process dead letter queue items (for manual review/retry)
   */
  async processDeadLetterQueue(): Promise<void> {
    const deadLetterJobs = await this.auditQueue.getJobs(['failed']);

    for (const job of deadLetterJobs) {
      if (job.name === 'dead-letter') {
        this.logger.log(`Processing dead letter job: ${job.id}`);
        // You can implement manual review or retry logic here
      }
    }
  }
}
