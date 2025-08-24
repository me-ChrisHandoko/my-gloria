import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  CircuitBreakerService,
  CircuitBreakerMetrics,
  CircuitState,
} from '../services/circuit-breaker.service';
import { EmailService } from '../email.service';
import { PushService } from '../push.service';

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  circuitState?: string;
  metrics?: CircuitBreakerMetrics;
  lastCheck?: Date;
  message?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: ServiceHealth[];
  summary: {
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    unhealthyServices: number;
  };
}

@ApiTags('Notification Health')
@Controller('api/v1/notifications/health')
export class NotificationHealthController {
  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly emailService: EmailService,
    private readonly pushService: PushService,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Check health status of notification services' })
  @ApiResponse({
    status: 200,
    description: 'Health check successful',
    type: Object,
  })
  async checkHealth(): Promise<HealthCheckResponse> {
    const services: ServiceHealth[] = [];

    // Check Redis Connection
    const redisHealth = await this.checkRedisHealth();
    services.push(redisHealth);

    // Check Email Service
    const emailMetrics = this.emailService.getCircuitMetrics();
    const emailHealth = this.evaluateServiceHealth(
      'Email Service',
      emailMetrics,
      this.emailService.isEmailServiceConfigured(),
    );
    services.push(emailHealth);

    // Check Push Service
    const pushMetrics = this.pushService.getCircuitMetrics();
    const pushHealth = this.evaluateServiceHealth(
      'Push Service',
      pushMetrics,
      this.pushService.isPushServiceConfigured(),
    );
    services.push(pushHealth);

    // Calculate overall status
    const summary = {
      totalServices: services.length,
      healthyServices: services.filter((s) => s.status === 'healthy').length,
      degradedServices: services.filter((s) => s.status === 'degraded').length,
      unhealthyServices: services.filter((s) => s.status === 'unhealthy')
        .length,
    };

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (summary.unhealthyServices > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degradedServices > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      services,
      summary,
    };
  }

  @Get('circuits')
  @ApiOperation({ summary: 'Get detailed circuit breaker metrics' })
  @ApiResponse({
    status: 200,
    description: 'Circuit breaker metrics retrieved successfully',
    type: Object,
  })
  getCircuitMetrics(): Map<string, CircuitBreakerMetrics> {
    return this.circuitBreakerService.getAllMetrics();
  }

  @Get('email')
  @ApiOperation({ summary: 'Check email service health' })
  @ApiResponse({
    status: 200,
    description: 'Email service health check successful',
    type: Object,
  })
  checkEmailHealth(): ServiceHealth {
    const metrics = this.emailService.getCircuitMetrics();
    return this.evaluateServiceHealth(
      'Email Service',
      metrics,
      this.emailService.isEmailServiceConfigured(),
    );
  }

  @Get('push')
  @ApiOperation({ summary: 'Check push notification service health' })
  @ApiResponse({
    status: 200,
    description: 'Push service health check successful',
    type: Object,
  })
  checkPushHealth(): ServiceHealth {
    const metrics = this.pushService.getCircuitMetrics();
    return this.evaluateServiceHealth(
      'Push Service',
      metrics,
      this.pushService.isPushServiceConfigured(),
    );
  }

  private evaluateServiceHealth(
    serviceName: string,
    metrics: CircuitBreakerMetrics | undefined,
    isConfigured: boolean,
  ): ServiceHealth {
    const health: ServiceHealth = {
      name: serviceName,
      status: 'healthy',
      lastCheck: new Date(),
    };

    if (!isConfigured) {
      health.status = 'unhealthy';
      health.message = 'Service is not configured';
      return health;
    }

    if (!metrics) {
      health.status = 'healthy';
      health.message =
        'No circuit breaker metrics available (service may not have been used yet)';
      return health;
    }

    health.circuitState = metrics.state;
    health.metrics = metrics;

    // Evaluate health based on circuit state and metrics
    switch (metrics.state) {
      case CircuitState.OPEN:
        health.status = 'unhealthy';
        health.message = `Circuit is OPEN. ${metrics.consecutiveFailures} consecutive failures detected.`;
        break;

      case CircuitState.HALF_OPEN:
        health.status = 'degraded';
        health.message = 'Circuit is HALF_OPEN. Service is recovering.';
        break;

      case CircuitState.CLOSED:
        // Check failure rate even when closed
        if (metrics.totalRequests > 0) {
          const failureRate =
            (metrics.failedRequests / metrics.totalRequests) * 100;

          if (failureRate > 20) {
            health.status = 'degraded';
            health.message = `High failure rate detected: ${failureRate.toFixed(2)}%`;
          } else {
            health.status = 'healthy';
            health.message = `Service is operating normally. Success rate: ${(100 - failureRate).toFixed(2)}%`;
          }
        } else {
          health.status = 'healthy';
          health.message =
            'Service is healthy but has not processed any requests yet';
        }
        break;

      default:
        health.status = 'healthy';
        health.message = 'Service status unknown';
    }

    // Add response time warning if applicable
    if (metrics.averageResponseTime > 1000) {
      health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded';
      health.message =
        (health.message || '') +
        ` High average response time: ${metrics.averageResponseTime.toFixed(0)}ms`;
    }

    return health;
  }

  private async checkRedisHealth(): Promise<ServiceHealth> {
    const health: ServiceHealth = {
      name: 'Redis Queue Service',
      status: 'healthy',
      lastCheck: new Date(),
    };

    try {
      // Check Redis connection
      const client = this.notificationQueue.client;

      if (!client || client.status !== 'ready') {
        health.status = 'unhealthy';
        health.message = `Redis connection status: ${client?.status || 'disconnected'}`;
        return health;
      }

      // Try to ping Redis
      const pingResult = await client.ping();
      if (pingResult !== 'PONG') {
        health.status = 'degraded';
        health.message = 'Redis ping failed';
        return health;
      }

      // Check queue health
      const [waiting, active, failed] = await Promise.all([
        this.notificationQueue.getWaitingCount(),
        this.notificationQueue.getActiveCount(),
        this.notificationQueue.getFailedCount(),
      ]);

      // Evaluate queue health
      if (failed > 100) {
        health.status = 'degraded';
        health.message = `High number of failed jobs: ${failed}`;
      } else if (waiting > 1000) {
        health.status = 'degraded';
        health.message = `High queue backlog: ${waiting} waiting jobs`;
      } else {
        health.status = 'healthy';
        health.message = `Queue operational - waiting: ${waiting}, active: ${active}, failed: ${failed}`;
      }
    } catch (error) {
      health.status = 'unhealthy';
      health.message = `Redis health check failed: ${error instanceof Error ? error.message : String(error)}`;
    }

    return health;
  }

  @Get('redis')
  @ApiOperation({ summary: 'Check Redis queue service health' })
  @ApiResponse({
    status: 200,
    description: 'Redis service health check successful',
    type: Object,
  })
  async getRedisHealth(): Promise<ServiceHealth> {
    return this.checkRedisHealth();
  }
}
