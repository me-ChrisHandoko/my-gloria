import { Injectable } from '@nestjs/common';
import { ApprovalLoggerService } from '../logging/approval-logger.service';
import {
  ApprovalContext,
  PerformanceMetrics,
} from '../logging/logging.interface';

interface MetricTimer {
  operation: string;
  startTime: number;
  context: ApprovalContext;
}

@Injectable()
export class ApprovalMetricsService {
  private readonly timers = new Map<string, MetricTimer>();
  private readonly metrics = new Map<string, number[]>();

  // Counter metrics
  private counters = {
    totalRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    cancelledRequests: 0,
    failedRequests: 0,

    // Operation counters
    approvalSteps: 0,
    delegations: 0,
    notifications: 0,

    // Error counters
    validationErrors: 0,
    authorizationErrors: 0,
    databaseErrors: 0,
    externalServiceErrors: 0,
  };

  // Histogram data for response times
  private responseTimes = {
    approval: [] as number[],
    rejection: [] as number[],
    workflow: [] as number[],
    query: [] as number[],
  };

  constructor(private readonly logger: ApprovalLoggerService) {}

  /**
   * Start timing an operation
   */
  startTimer(
    operation: string,
    context: ApprovalContext,
    metadata?: Record<string, any>,
  ): string {
    const timerId = `${operation}-${Date.now()}-${Math.random()}`;
    this.timers.set(timerId, {
      operation,
      startTime: Date.now(),
      context,
    });

    this.logger.logDebug(`Started timer for ${operation}`, context, metadata);
    return timerId;
  }

  /**
   * End timing and log the metrics
   */
  endTimer(
    timerId: string,
    success: boolean = true,
    metadata?: Record<string, any>,
  ): PerformanceMetrics | null {
    const timer = this.timers.get(timerId);
    if (!timer) {
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - timer.startTime;

    // Store metric for aggregation
    this.recordMetric(timer.operation, duration);

    // Log the performance
    this.logger.logPerformance(timer.operation, duration, timer.context, {
      success,
      ...metadata,
    });

    // Clean up
    this.timers.delete(timerId);

    return {
      operation: timer.operation,
      startTime: timer.startTime,
      endTime,
      duration,
      success,
    };
  }

  /**
   * Record a metric value for aggregation
   */
  private recordMetric(operation: string, value: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const values = this.metrics.get(operation)!;
    values.push(value);

    // Keep only last 1000 values to prevent memory issues
    if (values.length > 1000) {
      values.shift();
    }
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(
    counter: keyof typeof this.counters,
    value: number = 1,
  ): void {
    this.counters[counter] += value;
  }

  /**
   * Record response time for specific operation type
   */
  recordResponseTime(
    type: keyof typeof this.responseTimes,
    duration: number,
  ): void {
    this.responseTimes[type].push(duration);

    // Keep only last 1000 values
    if (this.responseTimes[type].length > 1000) {
      this.responseTimes[type].shift();
    }
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): Record<string, any> {
    const metricsSnapshot: Record<string, any> = {
      counters: { ...this.counters },
      averages: {},
      percentiles: {},
      responseTimes: {},
    };

    // Calculate averages for each operation
    for (const [operation, values] of this.metrics.entries()) {
      if (values.length > 0) {
        metricsSnapshot.averages[operation] = this.calculateAverage(values);
        metricsSnapshot.percentiles[operation] = {
          p50: this.calculatePercentile(values, 50),
          p90: this.calculatePercentile(values, 90),
          p95: this.calculatePercentile(values, 95),
          p99: this.calculatePercentile(values, 99),
        };
      }
    }

    // Calculate response time statistics
    for (const [type, times] of Object.entries(this.responseTimes)) {
      if (times.length > 0) {
        metricsSnapshot.responseTimes[type] = {
          average: this.calculateAverage(times),
          min: Math.min(...times),
          max: Math.max(...times),
          p50: this.calculatePercentile(times, 50),
          p90: this.calculatePercentile(times, 90),
          p95: this.calculatePercentile(times, 95),
        };
      }
    }

    return metricsSnapshot;
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics.clear();
    this.timers.clear();

    // Reset counters
    for (const key in this.counters) {
      this.counters[key as keyof typeof this.counters] = 0;
    }

    // Reset response times
    for (const key in this.responseTimes) {
      this.responseTimes[key as keyof typeof this.responseTimes] = [];
    }
  }

  /**
   * Calculate average of values
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate percentile of values
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Track approval workflow metrics
   */
  trackWorkflow(
    module: string,
    status: 'started' | 'completed' | 'failed',
    duration?: number,
  ): void {
    const key = `workflow_${module}_${status}`;
    this.incrementCounter('totalRequests');

    if (duration) {
      this.recordMetric(key, duration);
      this.recordResponseTime('workflow', duration);
    }
  }

  /**
   * Track approval action metrics
   */
  trackApprovalAction(
    action: 'approved' | 'rejected' | 'cancelled',
    duration: number,
  ): void {
    switch (action) {
      case 'approved':
        this.incrementCounter('approvedRequests');
        this.recordResponseTime('approval', duration);
        break;
      case 'rejected':
        this.incrementCounter('rejectedRequests');
        this.recordResponseTime('rejection', duration);
        break;
      case 'cancelled':
        this.incrementCounter('cancelledRequests');
        break;
    }
  }

  /**
   * Track error metrics
   */
  trackError(
    errorType: 'validation' | 'authorization' | 'database' | 'external',
  ): void {
    switch (errorType) {
      case 'validation':
        this.incrementCounter('validationErrors');
        break;
      case 'authorization':
        this.incrementCounter('authorizationErrors');
        break;
      case 'database':
        this.incrementCounter('databaseErrors');
        break;
      case 'external':
        this.incrementCounter('externalServiceErrors');
        break;
    }
  }

  /**
   * Get health status based on metrics
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  } {
    const metrics = this.getMetrics();
    const errorRate = this.calculateErrorRate();
    const avgResponseTime = metrics.averages.workflow || 0;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (errorRate > 0.1 || avgResponseTime > 5000) {
      status = 'unhealthy';
    } else if (errorRate > 0.05 || avgResponseTime > 2000) {
      status = 'degraded';
    }

    return {
      status,
      details: {
        errorRate,
        avgResponseTime,
        totalRequests: this.counters.totalRequests,
        failedRequests: this.counters.failedRequests,
      },
    };
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(): number {
    if (this.counters.totalRequests === 0) return 0;

    const totalErrors =
      this.counters.failedRequests +
      this.counters.validationErrors +
      this.counters.authorizationErrors +
      this.counters.databaseErrors +
      this.counters.externalServiceErrors;

    return totalErrors / this.counters.totalRequests;
  }
}
