import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApprovalLoggerService } from '../logging/approval-logger.service';
import { ApprovalMetricsService } from '../metrics/approval-metrics.service';
import { ApprovalContext } from '../logging/logging.interface';
import { Prisma } from '@prisma/client';

export interface AuditEntry {
  id?: string;
  requestId: string;
  action: string;
  actor: string;
  actorRole?: string;
  timestamp: Date;
  details: Record<string, any>;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

@Injectable()
export class ApprovalAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: ApprovalLoggerService,
    private readonly metrics: ApprovalMetricsService,
  ) {}

  /**
   * Create an audit entry for an approval action
   */
  async createAuditEntry(
    entry: AuditEntry,
    context: ApprovalContext,
  ): Promise<void> {
    const timerId = this.metrics.startTimer('audit.create', context);

    try {
      // Enrich audit entry with context
      const enrichedEntry = {
        ...entry,
        correlationId: context.correlationId,
        timestamp: entry.timestamp || new Date(),
      };

      // Store in database
      await this.prisma.auditLog.create({
        data: {
          id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          module: 'APPROVAL',
          entityType: 'APPROVAL_REQUEST',
          entityId: entry.requestId,
          action: entry.action as any, // Cast to AuditAction enum
          actorId: entry.actor,
          createdAt: enrichedEntry.timestamp,
          metadata:
            entry.previousState || entry.newState || entry.details
              ? {
                  previousState: entry.previousState,
                  newState: entry.newState,
                  actorRole: entry.actorRole,
                  ipAddress: entry.ipAddress,
                  userAgent: entry.userAgent,
                  correlationId: enrichedEntry.correlationId,
                  details: enrichedEntry.details,
                }
              : undefined,
        },
      });

      // Log the audit action
      this.logger.logAction('AUDIT_ENTRY_CREATED', context, {
        action: entry.action,
        actor: entry.actor,
        requestId: entry.requestId,
      });

      this.metrics.endTimer(timerId, true);
    } catch (error) {
      this.metrics.endTimer(timerId, false);
      this.logger.logError(error as Error, context, {
        operation: 'audit.create',
        entry,
      });

      // Don't throw - audit failures shouldn't break the main flow
      // But log it as a critical issue
      this.logger.logWarning(
        'Failed to create audit entry - continuing with operation',
        context,
        { error: (error as Error).message },
      );
    }
  }

  /**
   * Audit a state transition
   */
  async auditStateTransition(
    requestId: string,
    fromStatus: string,
    toStatus: string,
    actor: string,
    reason?: string,
    context?: ApprovalContext,
  ): Promise<void> {
    const loggingContext = context || this.logger.createContext(requestId);

    await this.createAuditEntry(
      {
        requestId,
        action: `STATE_TRANSITION_${fromStatus}_TO_${toStatus}`,
        actor,
        timestamp: new Date(),
        details: {
          fromStatus,
          toStatus,
          reason,
        },
        previousState: { status: fromStatus },
        newState: { status: toStatus },
      },
      loggingContext,
    );

    // Also log the state transition
    this.logger.logStateTransition(requestId, fromStatus, toStatus, actor, {
      reason,
    });
  }

  /**
   * Audit an approval action
   */
  async auditApprovalAction(
    requestId: string,
    stepId: string,
    action: 'APPROVED' | 'REJECTED' | 'DELEGATED' | 'ESCALATED',
    actor: string,
    comments?: string,
    context?: ApprovalContext,
  ): Promise<void> {
    const loggingContext = context || this.logger.createContext(requestId);
    const startTime = Date.now();

    await this.createAuditEntry(
      {
        requestId,
        action: `APPROVAL_${action}`,
        actor,
        timestamp: new Date(),
        details: {
          stepId,
          action,
          comments,
        },
      },
      loggingContext,
    );

    // Track metrics for the approval action
    const duration = Date.now() - startTime;
    if (action === 'APPROVED') {
      this.metrics.trackApprovalAction('approved', duration);
    } else if (action === 'REJECTED') {
      this.metrics.trackApprovalAction('rejected', duration);
    }
  }

  /**
   * Audit a delegation action
   */
  async auditDelegation(
    requestId: string,
    fromUser: string,
    toUser: string,
    reason: string,
    validFrom: Date,
    validTo: Date,
    context?: ApprovalContext,
  ): Promise<void> {
    const loggingContext = context || this.logger.createContext(requestId);

    await this.createAuditEntry(
      {
        requestId,
        action: 'DELEGATION_CREATED',
        actor: fromUser,
        timestamp: new Date(),
        details: {
          fromUser,
          toUser,
          reason,
          validFrom,
          validTo,
        },
      },
      loggingContext,
    );

    this.metrics.incrementCounter('delegations');
  }

  /**
   * Audit a workflow initiation
   */
  async auditWorkflowInitiation(
    requestId: string,
    module: string,
    requester: string,
    details: Record<string, any>,
    context?: ApprovalContext,
  ): Promise<void> {
    const loggingContext = context || this.logger.createContext(requestId);

    await this.createAuditEntry(
      {
        requestId,
        action: 'WORKFLOW_INITIATED',
        actor: requester,
        timestamp: new Date(),
        details: {
          module,
          ...details,
        },
      },
      loggingContext,
    );

    this.metrics.trackWorkflow(module, 'started');
  }

  /**
   * Audit a workflow completion
   */
  async auditWorkflowCompletion(
    requestId: string,
    module: string,
    finalStatus: string,
    duration: number,
    context?: ApprovalContext,
  ): Promise<void> {
    const loggingContext = context || this.logger.createContext(requestId);

    await this.createAuditEntry(
      {
        requestId,
        action: 'WORKFLOW_COMPLETED',
        actor: 'SYSTEM',
        timestamp: new Date(),
        details: {
          module,
          finalStatus,
          duration,
        },
      },
      loggingContext,
    );

    this.metrics.trackWorkflow(module, 'completed', duration);
  }

  /**
   * Audit an error or exception
   */
  async auditError(
    requestId: string,
    error: Error,
    operation: string,
    actor: string,
    context?: ApprovalContext,
  ): Promise<void> {
    const loggingContext = context || this.logger.createContext(requestId);

    await this.createAuditEntry(
      {
        requestId,
        action: 'ERROR_OCCURRED',
        actor,
        timestamp: new Date(),
        details: {
          operation,
          errorMessage: error.message,
          errorName: error.name,
          errorStack: error.stack,
        },
      },
      loggingContext,
    );

    this.metrics.incrementCounter('failedRequests');
  }

  /**
   * Get audit trail for a request
   */
  async getAuditTrail(
    requestId: string,
    context?: ApprovalContext,
  ): Promise<any[]> {
    const loggingContext = context || this.logger.createContext(requestId);
    const timerId = this.metrics.startTimer('audit.getTrail', loggingContext);

    try {
      const entries = await this.prisma.auditLog.findMany({
        where: {
          entityType: 'APPROVAL_REQUEST',
          entityId: requestId,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      this.metrics.endTimer(timerId, true);

      this.logger.logAction('AUDIT_TRAIL_RETRIEVED', loggingContext, {
        requestId,
        entryCount: entries.length,
      });

      return entries;
    } catch (error) {
      this.metrics.endTimer(timerId, false);
      this.logger.logError(error as Error, loggingContext, {
        operation: 'audit.getTrail',
        requestId,
      });
      throw error;
    }
  }

  /**
   * Search audit logs with filters
   */
  async searchAuditLogs(
    filters: {
      requestId?: string;
      actor?: string;
      action?: string;
      fromDate?: Date;
      toDate?: Date;
      module?: string;
    },
    pagination: {
      page: number;
      limit: number;
    },
    context?: ApprovalContext,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const loggingContext = context || this.logger.createContext('audit-search');
    const timerId = this.metrics.startTimer('audit.search', loggingContext);

    try {
      const where: any = {
        entityType: 'APPROVAL_REQUEST',
      };

      if (filters.requestId) {
        where.entityId = filters.requestId;
      }

      if (filters.actor) {
        where.actorId = filters.actor;
      }

      if (filters.action) {
        where.action = { contains: filters.action };
      }

      if (filters.fromDate || filters.toDate) {
        where.timestamp = {};
        if (filters.fromDate) {
          where.timestamp.gte = filters.fromDate;
        }
        if (filters.toDate) {
          where.timestamp.lte = filters.toDate;
        }
      }

      const skip = (pagination.page - 1) * pagination.limit;

      const [data, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          skip,
          take: pagination.limit,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      this.metrics.endTimer(timerId, true);

      this.logger.logAction('AUDIT_SEARCH_COMPLETED', loggingContext, {
        filters,
        resultCount: data.length,
        totalCount: total,
      });

      return {
        data,
        total,
        page: pagination.page,
        limit: pagination.limit,
      };
    } catch (error) {
      this.metrics.endTimer(timerId, false);
      this.logger.logError(error as Error, loggingContext, {
        operation: 'audit.search',
        filters,
      });
      throw error;
    }
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(
    startDate: Date,
    endDate: Date,
    context?: ApprovalContext,
  ): Promise<{
    summary: Record<string, any>;
    topActors: Array<{ actor: string; count: number }>;
    actionBreakdown: Record<string, number>;
    moduleBreakdown: Record<string, number>;
  }> {
    const loggingContext = context || this.logger.createContext('audit-report');
    const timerId = this.metrics.startTimer('audit.report', loggingContext);

    try {
      const logs = await this.prisma.auditLog.findMany({
        where: {
          entityType: 'APPROVAL_REQUEST',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Process logs for report
      const actionCounts: Record<string, number> = {};
      const actorCounts: Record<string, number> = {};
      const moduleCounts: Record<string, number> = {};

      for (const log of logs) {
        // Count actions
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;

        // Count actors
        actorCounts[log.actorId] = (actorCounts[log.actorId] || 0) + 1;

        // Extract and count modules
        const metadata = log.metadata as any;
        if (metadata?.details?.module) {
          moduleCounts[metadata.details.module] =
            (moduleCounts[metadata.details.module] || 0) + 1;
        }
      }

      // Get top actors
      const topActors = Object.entries(actorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([actor, count]) => ({ actor, count }));

      const report = {
        summary: {
          totalEntries: logs.length,
          uniqueActors: Object.keys(actorCounts).length,
          uniqueActions: Object.keys(actionCounts).length,
          dateRange: { startDate, endDate },
        },
        topActors,
        actionBreakdown: actionCounts,
        moduleBreakdown: moduleCounts,
      };

      this.metrics.endTimer(timerId, true);

      this.logger.logAction('AUDIT_REPORT_GENERATED', loggingContext, {
        startDate,
        endDate,
        entryCount: logs.length,
      });

      return report;
    } catch (error) {
      this.metrics.endTimer(timerId, false);
      this.logger.logError(error as Error, loggingContext, {
        operation: 'audit.report',
        startDate,
        endDate,
      });
      throw error;
    }
  }
}
