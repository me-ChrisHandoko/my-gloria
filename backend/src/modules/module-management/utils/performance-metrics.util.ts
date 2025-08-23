import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Performance metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

/**
 * Performance metric data
 */
export interface PerformanceMetric {
  name: string;
  type: MetricType;
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
  unit?: string;
}

/**
 * Operation performance data
 */
export interface OperationPerformance {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Performance statistics
 */
export interface PerformanceStats {
  operation: string;
  count: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
  avgDuration: number;
  p50: number;
  p95: number;
  p99: number;
  successRate: number;
  errorRate: number;
}

/**
 * Performance threshold configuration
 */
export interface PerformanceThreshold {
  operation: string;
  warningMs: number;
  criticalMs: number;
}

/**
 * Performance metrics service for tracking operation performance
 */
@Injectable()
export class PerformanceMetricsService {
  private readonly logger = new Logger(PerformanceMetricsService.name);
  private readonly metrics = new Map<string, PerformanceMetric[]>();
  private readonly operations = new Map<string, OperationPerformance[]>();
  private readonly thresholds = new Map<string, PerformanceThreshold>();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeDefaultThresholds();
  }

  /**
   * Initialize default performance thresholds
   */
  private initializeDefaultThresholds(): void {
    const defaults: PerformanceThreshold[] = [
      { operation: 'module.create', warningMs: 200, criticalMs: 500 },
      { operation: 'module.update', warningMs: 150, criticalMs: 400 },
      { operation: 'module.delete', warningMs: 100, criticalMs: 300 },
      { operation: 'module.findAll', warningMs: 300, criticalMs: 1000 },
      { operation: 'module.findOne', warningMs: 50, criticalMs: 200 },
      { operation: 'module.tree', warningMs: 500, criticalMs: 2000 },
      { operation: 'access.validate', warningMs: 30, criticalMs: 100 },
      { operation: 'cache.get', warningMs: 5, criticalMs: 20 },
      { operation: 'cache.set', warningMs: 10, criticalMs: 30 },
      { operation: 'db.query', warningMs: 100, criticalMs: 500 },
    ];

    defaults.forEach((threshold) => {
      this.thresholds.set(threshold.operation, threshold);
    });
  }

  /**
   * Start tracking an operation
   */
  startOperation(
    operation: string,
    metadata?: Record<string, unknown>,
  ): string {
    const operationId = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const perf: OperationPerformance = {
      operation,
      startTime: Date.now(),
      metadata,
    };

    const operations = this.operations.get(operation) || [];
    operations.push(perf);
    this.operations.set(operation, operations);

    // Record counter metric
    this.recordMetric({
      name: `${operation}.started`,
      type: MetricType.COUNTER,
      value: 1,
      timestamp: new Date(),
    });

    return operationId;
  }

  /**
   * End tracking an operation
   */
  endOperation(
    operationId: string,
    success: boolean = true,
    error?: string,
  ): void {
    const [operation] = operationId.split('-');
    const operations = this.operations.get(operation);

    if (!operations || operations.length === 0) {
      this.logger.warn(`No active operation found for ${operationId}`);
      return;
    }

    const perf = operations[operations.length - 1];
    perf.endTime = Date.now();
    perf.duration = perf.endTime - perf.startTime;
    perf.success = success;
    perf.error = error;

    // Check performance thresholds
    this.checkThresholds(operation, perf.duration);

    // Record metrics
    this.recordMetric({
      name: `${operation}.duration`,
      type: MetricType.HISTOGRAM,
      value: perf.duration,
      timestamp: new Date(),
      unit: 'ms',
    });

    this.recordMetric({
      name: `${operation}.${success ? 'success' : 'failure'}`,
      type: MetricType.COUNTER,
      value: 1,
      timestamp: new Date(),
    });

    // Emit performance event
    this.eventEmitter.emit('performance.operation.completed', {
      operation,
      duration: perf.duration,
      success,
      error,
    });

    // Clean up old operations (keep last 1000)
    if (operations.length > 1000) {
      operations.shift();
    }
  }

  /**
   * Record a custom metric
   */
  recordMetric(metric: PerformanceMetric): void {
    const key = metric.name;
    const metrics = this.metrics.get(key) || [];
    metrics.push(metric);

    // Keep only last 10000 metrics per key
    if (metrics.length > 10000) {
      metrics.shift();
    }

    this.metrics.set(key, metrics);
  }

  /**
   * Get performance statistics for an operation
   */
  getOperationStats(
    operation: string,
    timeWindowMs?: number,
  ): PerformanceStats | null {
    const operations = this.operations.get(operation);

    if (!operations || operations.length === 0) {
      return null;
    }

    const cutoffTime = timeWindowMs ? Date.now() - timeWindowMs : 0;
    const relevantOps = operations.filter(
      (op) => op.endTime && op.endTime >= cutoffTime,
    );

    if (relevantOps.length === 0) {
      return null;
    }

    const durations = relevantOps
      .filter((op) => op.duration !== undefined)
      .map((op) => op.duration!);

    if (durations.length === 0) {
      return null;
    }

    durations.sort((a, b) => a - b);

    const successCount = relevantOps.filter((op) => op.success).length;
    const totalCount = relevantOps.length;

    return {
      operation,
      count: totalCount,
      totalDuration: durations.reduce((sum, d) => sum + d, 0),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      p50: this.getPercentile(durations, 50),
      p95: this.getPercentile(durations, 95),
      p99: this.getPercentile(durations, 99),
      successRate: (successCount / totalCount) * 100,
      errorRate: ((totalCount - successCount) / totalCount) * 100,
    };
  }

  /**
   * Get all performance statistics
   */
  getAllStats(timeWindowMs?: number): Map<string, PerformanceStats> {
    const allStats = new Map<string, PerformanceStats>();

    for (const operation of this.operations.keys()) {
      const stats = this.getOperationStats(operation, timeWindowMs);
      if (stats) {
        allStats.set(operation, stats);
      }
    }

    return allStats;
  }

  /**
   * Get metrics for a specific metric name
   */
  getMetrics(name: string, timeWindowMs?: number): PerformanceMetric[] {
    const metrics = this.metrics.get(name) || [];

    if (timeWindowMs) {
      const cutoffTime = new Date(Date.now() - timeWindowMs);
      return metrics.filter((m) => m.timestamp >= cutoffTime);
    }

    return metrics;
  }

  /**
   * Clear all metrics and operations
   */
  clear(): void {
    this.metrics.clear();
    this.operations.clear();
    this.logger.log('Performance metrics cleared');
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const lines: string[] = [];

    // Export operation metrics
    for (const [operation, stats] of this.getAllStats().entries()) {
      const safeName = operation.replace(/\./g, '_');

      lines.push(
        `# HELP ${safeName}_duration_ms Operation duration in milliseconds`,
      );
      lines.push(`# TYPE ${safeName}_duration_ms summary`);
      lines.push(`${safeName}_duration_ms{quantile="0.5"} ${stats.p50}`);
      lines.push(`${safeName}_duration_ms{quantile="0.95"} ${stats.p95}`);
      lines.push(`${safeName}_duration_ms{quantile="0.99"} ${stats.p99}`);
      lines.push(`${safeName}_duration_ms_sum ${stats.totalDuration}`);
      lines.push(`${safeName}_duration_ms_count ${stats.count}`);

      lines.push(`# HELP ${safeName}_success_rate Operation success rate`);
      lines.push(`# TYPE ${safeName}_success_rate gauge`);
      lines.push(`${safeName}_success_rate ${stats.successRate}`);
    }

    return lines.join('\n');
  }

  /**
   * Set performance threshold for an operation
   */
  setThreshold(operation: string, warningMs: number, criticalMs: number): void {
    this.thresholds.set(operation, { operation, warningMs, criticalMs });
  }

  /**
   * Check if operation exceeded thresholds
   */
  private checkThresholds(operation: string, duration: number): void {
    const threshold = this.thresholds.get(operation);

    if (!threshold) {
      return;
    }

    if (duration >= threshold.criticalMs) {
      this.logger.error(
        `CRITICAL: Operation ${operation} took ${duration}ms (threshold: ${threshold.criticalMs}ms)`,
      );

      this.eventEmitter.emit('performance.threshold.critical', {
        operation,
        duration,
        threshold: threshold.criticalMs,
      });
    } else if (duration >= threshold.warningMs) {
      this.logger.warn(
        `WARNING: Operation ${operation} took ${duration}ms (threshold: ${threshold.warningMs}ms)`,
      );

      this.eventEmitter.emit('performance.threshold.warning', {
        operation,
        duration,
        threshold: threshold.warningMs,
      });
    }
  }

  /**
   * Calculate percentile from sorted array
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }
}

/**
 * Performance tracking decorator
 */
export function TrackPerformance(operationName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const operation =
      operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const metricsService = this.performanceMetrics;

      if (!metricsService) {
        // Fallback to original method if metrics service not available
        return originalMethod.apply(this, args);
      }

      const operationId = metricsService.startOperation(operation, {
        args: args.length,
      });

      try {
        const result = await originalMethod.apply(this, args);
        metricsService.endOperation(operationId, true);
        return result;
      } catch (error) {
        metricsService.endOperation(operationId, false, error.message);
        throw error;
      }
    };

    return descriptor;
  };
}
