import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditableChange } from '../interfaces/audit.interface';
import { AuditQueueService } from './audit-queue.service';
import { AuditIntegrityService } from './audit-integrity.service';
import { ConfigService } from '@nestjs/config';

export enum AuditEventType {
  AUDIT_LOG_CREATED = 'audit.log.created',
  AUDIT_LOG_BATCH = 'audit.log.batch',
  AUDIT_LOG_FAILED = 'audit.log.failed',
  AUDIT_INTEGRITY_CHECK = 'audit.integrity.check',
  AUDIT_INTEGRITY_VIOLATION = 'audit.integrity.violation',
  AUDIT_QUEUE_THRESHOLD = 'audit.queue.threshold',
  AUDIT_EMERGENCY = 'audit.emergency',
}

export interface AuditEvent {
  type: AuditEventType;
  data: any;
  timestamp: Date;
  correlationId?: string;
}

export interface AuditLogEvent {
  entry: AuditableChange;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  async?: boolean;
  skipIntegrity?: boolean;
}

export interface BatchAuditLogEvent {
  entries: AuditableChange[];
  priority?: 'low' | 'normal' | 'high' | 'critical';
  async?: boolean;
}

@Injectable()
export class AuditEventService {
  private readonly logger = new Logger(AuditEventService.name);
  private readonly enableAsync: boolean;
  private readonly batchThreshold: number;
  private readonly criticalModules: Set<string>;
  private pendingBatch: AuditableChange[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly auditQueueService: AuditQueueService,
    private readonly integrityService: AuditIntegrityService,
    private readonly configService: ConfigService,
  ) {
    this.enableAsync = this.configService.get<boolean>(
      'AUDIT_ASYNC_ENABLED',
      true,
    );
    this.batchThreshold = this.configService.get<number>(
      'AUDIT_BATCH_THRESHOLD',
      10,
    );
    this.criticalModules = new Set(
      this.configService.get<string[]>('AUDIT_CRITICAL_MODULES', [
        'auth',
        'user',
        'permission',
        'approval',
      ]),
    );
  }

  /**
   * Emit audit log event with priority handling
   */
  async emitAuditLog(event: AuditLogEvent): Promise<void> {
    try {
      const correlationId = this.generateCorrelationId();

      // Critical modules bypass async and go direct
      if (this.isCriticalOperation(event.entry)) {
        event.priority = 'critical';
        event.async = false;
      }

      // Add integrity hash if not skipped
      if (!event.skipIntegrity) {
        const lastHash = await this.integrityService.getLastChainHash();
        const integrityData = await this.integrityService.generateIntegrityHash(
          event.entry,
          lastHash || undefined,
        );

        event.entry.metadata = {
          ...(event.entry.metadata || {}),
          integrity: integrityData,
          correlationId,
        };
      }

      // Emit the event
      const auditEvent: AuditEvent = {
        type: AuditEventType.AUDIT_LOG_CREATED,
        data: event,
        timestamp: new Date(),
        correlationId,
      };

      if (event.async !== false && this.enableAsync) {
        // Async processing
        this.eventEmitter.emit(AuditEventType.AUDIT_LOG_CREATED, auditEvent);

        // Add to batch if applicable
        if (event.priority !== 'critical' && event.priority !== 'high') {
          this.addToBatch(event.entry);
        }
      } else {
        // Sync processing for critical operations
        await this.processAuditLogSync(event);
      }

      this.logger.debug(
        `Emitted audit log event for ${event.entry.entityType}:${event.entry.entityId} (${correlationId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit audit log event: ${error.message}`,
        error.stack,
      );

      // Emit emergency event
      this.eventEmitter.emit(AuditEventType.AUDIT_EMERGENCY, {
        error,
        event,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle audit log created event
   */
  @OnEvent(AuditEventType.AUDIT_LOG_CREATED)
  async handleAuditLogCreated(event: AuditEvent): Promise<void> {
    try {
      const { data } = event;
      const logEvent = data as AuditLogEvent;

      // Process based on priority
      if (logEvent.priority === 'critical' || logEvent.priority === 'high') {
        await this.auditQueueService.addToQueue(logEvent.entry);
      } else {
        // Normal priority can be batched
        this.addToBatch(logEvent.entry);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle audit log created event: ${error.message}`,
        error.stack,
      );

      this.eventEmitter.emit(AuditEventType.AUDIT_LOG_FAILED, {
        originalEvent: event,
        error,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle batch audit log event
   */
  @OnEvent(AuditEventType.AUDIT_LOG_BATCH)
  async handleBatchAuditLog(event: AuditEvent): Promise<void> {
    try {
      const { data } = event;
      const batchEvent = data as BatchAuditLogEvent;

      // Add integrity to all entries
      let previousHash = await this.integrityService.getLastChainHash();

      for (const entry of batchEvent.entries) {
        const integrityData = await this.integrityService.generateIntegrityHash(
          entry,
          previousHash || undefined,
        );

        entry.metadata = {
          ...(entry.metadata || {}),
          integrity: integrityData,
          correlationId: event.correlationId,
        };

        previousHash = integrityData.hash;
      }

      await this.auditQueueService.addBatchToQueue(batchEvent.entries);

      this.logger.debug(
        `Processed batch of ${batchEvent.entries.length} audit logs`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle batch audit log event: ${error.message}`,
        error.stack,
      );

      this.eventEmitter.emit(AuditEventType.AUDIT_LOG_FAILED, {
        originalEvent: event,
        error,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle audit log failure
   */
  @OnEvent(AuditEventType.AUDIT_LOG_FAILED)
  async handleAuditLogFailed(event: any): Promise<void> {
    this.logger.error(`Audit log failure detected: ${JSON.stringify(event)}`);

    // Could implement alerting, fallback storage, etc.
    // For now, log the failure for monitoring
  }

  /**
   * Handle integrity violation
   */
  @OnEvent(AuditEventType.AUDIT_INTEGRITY_VIOLATION)
  async handleIntegrityViolation(event: any): Promise<void> {
    this.logger.error(
      `CRITICAL: Audit integrity violation detected: ${JSON.stringify(event)}`,
    );

    // This should trigger alerts and potentially lock down the system
    // Implementation depends on security requirements
  }

  /**
   * Process audit log synchronously
   */
  private async processAuditLogSync(event: AuditLogEvent): Promise<void> {
    await this.auditQueueService.addToQueue(event.entry);
  }

  /**
   * Add entry to batch for processing
   */
  private addToBatch(entry: AuditableChange): void {
    this.pendingBatch.push(entry);

    if (this.pendingBatch.length >= this.batchThreshold) {
      this.processBatch();
    } else if (!this.batchTimer) {
      // Set timer to process batch after delay
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, 5000); // 5 seconds
    }
  }

  /**
   * Process pending batch
   */
  private async processBatch(): Promise<void> {
    if (this.pendingBatch.length === 0) {
      return;
    }

    const batch = [...this.pendingBatch];
    this.pendingBatch = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const batchEvent: AuditEvent = {
      type: AuditEventType.AUDIT_LOG_BATCH,
      data: {
        entries: batch,
        priority: 'normal',
      },
      timestamp: new Date(),
      correlationId: this.generateCorrelationId(),
    };

    this.eventEmitter.emit(AuditEventType.AUDIT_LOG_BATCH, batchEvent);
  }

  /**
   * Check if operation is critical
   */
  private isCriticalOperation(entry: AuditableChange): boolean {
    return (
      this.criticalModules.has(entry.module) ||
      entry.action === 'DELETE' ||
      entry.entityType === 'Permission' ||
      entry.entityType === 'Role'
    );
  }

  /**
   * Generate correlation ID for tracking
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Emit integrity check event
   */
  async emitIntegrityCheck(startDate?: Date, endDate?: Date): Promise<void> {
    const event: AuditEvent = {
      type: AuditEventType.AUDIT_INTEGRITY_CHECK,
      data: { startDate, endDate },
      timestamp: new Date(),
      correlationId: this.generateCorrelationId(),
    };

    this.eventEmitter.emit(AuditEventType.AUDIT_INTEGRITY_CHECK, event);
  }

  /**
   * Handle scheduled integrity check
   */
  @OnEvent(AuditEventType.AUDIT_INTEGRITY_CHECK)
  async handleIntegrityCheck(event: AuditEvent): Promise<void> {
    try {
      const { startDate, endDate } = event.data;
      const result = await this.integrityService.verifyChainIntegrity(
        startDate,
        endDate,
      );

      if (!result.isValid) {
        this.eventEmitter.emit(AuditEventType.AUDIT_INTEGRITY_VIOLATION, {
          result,
          timestamp: new Date(),
        });
      }

      this.logger.log(
        `Integrity check completed: ${result.totalChecked} entries checked, ` +
          `${result.invalidEntries.length} invalid entries found`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to perform integrity check: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get event statistics
   */
  async getEventStatistics(): Promise<any> {
    const queueStats = await this.auditQueueService.getQueueStats();

    return {
      queue: queueStats,
      batch: {
        pending: this.pendingBatch.length,
        threshold: this.batchThreshold,
        timerActive: this.batchTimer !== null,
      },
      config: {
        asyncEnabled: this.enableAsync,
        criticalModules: Array.from(this.criticalModules),
      },
    };
  }
}
