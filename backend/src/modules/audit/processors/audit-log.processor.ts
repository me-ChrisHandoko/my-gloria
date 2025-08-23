import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import {
  AuditQueueService,
  AuditQueueData,
} from '../services/audit-queue.service';

@Processor('audit-logs')
export class AuditLogProcessor {
  private readonly logger = new Logger(AuditLogProcessor.name);

  constructor(private readonly auditQueueService: AuditQueueService) {}

  @Process('process-audit-log')
  async handleAuditLog(job: Job<AuditQueueData>) {
    this.logger.debug(
      `Processing audit log job ${job.id} (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`,
    );

    try {
      await this.auditQueueService.processAuditLog(job);

      this.logger.debug(`Successfully processed audit log job ${job.id}`);
      return { success: true, jobId: job.id };
    } catch (error) {
      this.logger.error(
        `Failed to process audit log job ${job.id}: ${error.message}`,
        error.stack,
      );

      // The error will be re-thrown by processAuditLog to trigger retry
      throw error;
    }
  }

  @Process('dead-letter')
  async handleDeadLetter(job: Job<AuditQueueData>) {
    this.logger.warn(
      `Processing dead letter job ${job.id} for ${job.data.entry.entityType}:${job.data.entry.entityId}`,
    );

    // Here you can implement custom logic for dead letter items
    // For example: send notifications, write to alternative storage, etc.

    return {
      success: false,
      jobId: job.id,
      reason: 'Moved to dead letter queue for manual review',
      lastError: job.data.lastError,
      retryCount: job.data.retryCount,
    };
  }
}
