import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { NotificationMetricsService } from '../services/metrics.service';
import { ALERT_THRESHOLDS } from '../providers/metrics.provider';

@ApiTags('Notification Metrics')
@Controller('api/v1/notifications/metrics')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class NotificationMetricsController {
  constructor(private readonly metricsService: NotificationMetricsService) {}

  @Get('snapshot')
  @ApiOperation({ summary: 'Get current metrics snapshot' })
  @ApiResponse({
    status: 200,
    description: 'Returns current notification metrics snapshot',
  })
  async getMetricsSnapshot() {
    const snapshot = await this.metricsService.getMetricsSnapshot();

    return {
      snapshot,
      thresholds: ALERT_THRESHOLDS,
      timestamp: new Date(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get notification system health status' })
  @ApiResponse({
    status: 200,
    description: 'Returns notification system health metrics',
  })
  async getHealthMetrics() {
    const snapshot = await this.metricsService.getMetricsSnapshot();

    // Calculate health score based on metrics
    const healthScore = this.calculateHealthScore(snapshot);

    return {
      status:
        healthScore > 80
          ? 'healthy'
          : healthScore > 60
            ? 'degraded'
            : 'unhealthy',
      score: healthScore,
      details: snapshot,
      recommendations: this.getHealthRecommendations(snapshot, healthScore),
    };
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get active alert conditions' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of active alert conditions',
  })
  async getActiveAlerts() {
    const snapshot = await this.metricsService.getMetricsSnapshot();
    const alerts: any[] = [];

    // Check queue size alerts
    if (snapshot.queueSizes) {
      for (const [queue, size] of Object.entries(snapshot.queueSizes)) {
        if ((size as number) >= ALERT_THRESHOLDS.QUEUE_SIZE_CRITICAL) {
          alerts.push({
            severity: 'critical',
            type: 'queue_size',
            queue,
            value: size,
            threshold: ALERT_THRESHOLDS.QUEUE_SIZE_CRITICAL,
            message: `Queue ${queue} size is critical: ${size}`,
          });
        } else if ((size as number) >= ALERT_THRESHOLDS.QUEUE_SIZE_WARNING) {
          alerts.push({
            severity: 'warning',
            type: 'queue_size',
            queue,
            value: size,
            threshold: ALERT_THRESHOLDS.QUEUE_SIZE_WARNING,
            message: `Queue ${queue} size warning: ${size}`,
          });
        }
      }
    }

    // Check error rates
    if (snapshot.errorRates) {
      for (const [channel, rate] of Object.entries(snapshot.errorRates)) {
        if ((rate as number) >= ALERT_THRESHOLDS.ERROR_RATE_CRITICAL) {
          alerts.push({
            severity: 'critical',
            type: 'error_rate',
            channel,
            value: rate,
            threshold: ALERT_THRESHOLDS.ERROR_RATE_CRITICAL,
            message: `Error rate for ${channel} is critical: ${rate}%`,
          });
        } else if ((rate as number) >= ALERT_THRESHOLDS.ERROR_RATE_WARNING) {
          alerts.push({
            severity: 'warning',
            type: 'error_rate',
            channel,
            value: rate,
            threshold: ALERT_THRESHOLDS.ERROR_RATE_WARNING,
            message: `Error rate for ${channel} warning: ${rate}%`,
          });
        }
      }
    }

    return {
      count: alerts.length,
      alerts,
      timestamp: new Date(),
    };
  }

  private calculateHealthScore(snapshot: any): number {
    let score = 100;

    // Deduct points for queue sizes
    if (snapshot.queueSizes) {
      for (const size of Object.values(snapshot.queueSizes)) {
        if ((size as number) >= ALERT_THRESHOLDS.QUEUE_SIZE_CRITICAL) {
          score -= 30;
        } else if ((size as number) >= ALERT_THRESHOLDS.QUEUE_SIZE_WARNING) {
          score -= 15;
        }
      }
    }

    // Deduct points for error rates
    if (snapshot.errorRates) {
      for (const rate of Object.values(snapshot.errorRates)) {
        if ((rate as number) >= ALERT_THRESHOLDS.ERROR_RATE_CRITICAL) {
          score -= 25;
        } else if ((rate as number) >= ALERT_THRESHOLDS.ERROR_RATE_WARNING) {
          score -= 10;
        }
      }
    }

    // Deduct points for circuit breaker status
    if (snapshot.circuitBreakerStatus) {
      for (const [service, status] of Object.entries(
        snapshot.circuitBreakerStatus,
      )) {
        if (status === 'open') {
          score -= 20;
        } else if (status === 'half-open') {
          score -= 10;
        }
      }
    }

    return Math.max(0, score);
  }

  private getHealthRecommendations(
    snapshot: any,
    healthScore: number,
  ): string[] {
    const recommendations: string[] = [];

    if (healthScore < 80) {
      if (snapshot.queueSizes) {
        for (const [queue, size] of Object.entries(snapshot.queueSizes)) {
          if ((size as number) >= ALERT_THRESHOLDS.QUEUE_SIZE_WARNING) {
            recommendations.push(
              `Scale up ${queue} queue processing or investigate processing bottlenecks`,
            );
          }
        }
      }

      if (snapshot.errorRates) {
        for (const [channel, rate] of Object.entries(snapshot.errorRates)) {
          if ((rate as number) >= ALERT_THRESHOLDS.ERROR_RATE_WARNING) {
            recommendations.push(
              `Investigate ${channel} channel failures and implement retry strategies`,
            );
          }
        }
      }

      if (snapshot.circuitBreakerStatus) {
        for (const [service, status] of Object.entries(
          snapshot.circuitBreakerStatus,
        )) {
          if (status === 'open') {
            recommendations.push(
              `Service ${service} circuit breaker is open - check service health and dependencies`,
            );
          }
        }
      }
    }

    if (recommendations.length === 0 && healthScore === 100) {
      recommendations.push('System is healthy - no action required');
    }

    return recommendations;
  }
}
