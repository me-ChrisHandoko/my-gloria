import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { ApprovalMetricsService } from '../metrics/approval-metrics.service';
import { AuditService } from '../../audit/services/audit.service';
import { ApprovalLoggerService } from '../logging/approval-logger.service';

@ApiTags('approval-metrics')
@Controller('approval/metrics')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class ApprovalMetricsController {
  constructor(
    private readonly metricsService: ApprovalMetricsService,
    private readonly auditService: AuditService,
    private readonly logger: ApprovalLoggerService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get current approval metrics' })
  @ApiResponse({
    status: 200,
    description: 'Current metrics snapshot',
    schema: {
      type: 'object',
      properties: {
        counters: {
          type: 'object',
          properties: {
            totalRequests: { type: 'number' },
            approvedRequests: { type: 'number' },
            rejectedRequests: { type: 'number' },
            cancelledRequests: { type: 'number' },
            failedRequests: { type: 'number' },
          },
        },
        averages: { type: 'object' },
        percentiles: { type: 'object' },
        responseTimes: { type: 'object' },
      },
    },
  })
  async getMetrics() {
    const context = this.logger.createContext('metrics-fetch');

    try {
      const metrics = this.metricsService.getMetrics();

      this.logger.logAction('METRICS_RETRIEVED', context, {
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.logError(error as Error, context, {
        operation: 'getMetrics',
      });
      throw error;
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Get approval system health status' })
  @ApiResponse({
    status: 200,
    description: 'Health status',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['healthy', 'degraded', 'unhealthy'],
        },
        details: {
          type: 'object',
          properties: {
            errorRate: { type: 'number' },
            avgResponseTime: { type: 'number' },
            totalRequests: { type: 'number' },
            failedRequests: { type: 'number' },
          },
        },
      },
    },
  })
  async getHealthStatus() {
    const context = this.logger.createContext('health-check');

    try {
      const health = this.metricsService.getHealthStatus();

      this.logger.logAction('HEALTH_CHECK', context, {
        status: health.status,
        ...health.details,
      });

      return {
        success: true,
        ...health,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.logError(error as Error, context, {
        operation: 'getHealthStatus',
      });

      return {
        success: false,
        status: 'unhealthy',
        details: {
          error: (error as Error).message,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('reset')
  @ApiOperation({ summary: 'Reset all metrics (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Metrics reset successfully',
  })
  async resetMetrics() {
    const context = this.logger.createContext('metrics-reset');

    try {
      this.metricsService.resetMetrics();

      this.logger.logAction('METRICS_RESET', context, {
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'Metrics reset successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.logError(error as Error, context, {
        operation: 'resetMetrics',
      });
      throw error;
    }
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get approval metrics summary' })
  @ApiResponse({
    status: 200,
    description: 'Metrics summary with key performance indicators',
  })
  async getMetricsSummary() {
    const context = this.logger.createContext('metrics-summary');

    try {
      const metrics = this.metricsService.getMetrics();
      const health = this.metricsService.getHealthStatus();

      // Calculate additional KPIs
      const totalProcessed =
        (metrics.counters.approvedRequests || 0) +
        (metrics.counters.rejectedRequests || 0) +
        (metrics.counters.cancelledRequests || 0);

      const approvalRate =
        totalProcessed > 0
          ? (metrics.counters.approvedRequests || 0) / totalProcessed
          : 0;

      const rejectionRate =
        totalProcessed > 0
          ? (metrics.counters.rejectedRequests || 0) / totalProcessed
          : 0;

      const summary = {
        kpis: {
          totalRequests: metrics.counters.totalRequests || 0,
          totalProcessed,
          pendingRequests:
            (metrics.counters.totalRequests || 0) - totalProcessed,
          approvalRate: Math.round(approvalRate * 100),
          rejectionRate: Math.round(rejectionRate * 100),
          failureRate: health.details.errorRate,
        },
        performance: {
          avgResponseTime: metrics.averages.workflow || 0,
          p95ResponseTime: metrics.percentiles.workflow?.p95 || 0,
          p99ResponseTime: metrics.percentiles.workflow?.p99 || 0,
        },
        health: {
          status: health.status,
          errorCount:
            (metrics.counters.validationErrors || 0) +
            (metrics.counters.authorizationErrors || 0) +
            (metrics.counters.databaseErrors || 0) +
            (metrics.counters.externalServiceErrors || 0),
        },
        operations: {
          approvalSteps: metrics.counters.approvalSteps || 0,
          delegations: metrics.counters.delegations || 0,
          notifications: metrics.counters.notifications || 0,
        },
      };

      this.logger.logAction('METRICS_SUMMARY_GENERATED', context, {
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        data: summary,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.logError(error as Error, context, {
        operation: 'getMetricsSummary',
      });
      throw error;
    }
  }
}
