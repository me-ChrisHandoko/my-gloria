import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge, Summary } from 'prom-client';
import { PermissionAction, PermissionScope } from '@prisma/client';

@Injectable()
export class PermissionMetricsService {
  constructor(
    // Permission check metrics
    @InjectMetric('permission_check_total')
    private readonly permissionCheckCounter: Counter<string>,

    @InjectMetric('permission_check_allowed_total')
    private readonly permissionAllowedCounter: Counter<string>,

    @InjectMetric('permission_check_denied_total')
    private readonly permissionDeniedCounter: Counter<string>,

    @InjectMetric('permission_check_duration_ms')
    private readonly checkDurationHistogram: Histogram<string>,

    // Cache metrics
    @InjectMetric('permission_cache_hits_total')
    private readonly cacheHitsCounter: Counter<string>,

    @InjectMetric('permission_cache_misses_total')
    private readonly cacheMissesCounter: Counter<string>,

    @InjectMetric('permission_cache_invalidations_total')
    private readonly cacheInvalidationsCounter: Counter<string>,

    @InjectMetric('permission_matrix_hits_total')
    private readonly matrixHitsCounter: Counter<string>,

    // Database metrics
    @InjectMetric('permission_db_query_duration_ms')
    private readonly dbQueryHistogram: Histogram<string>,

    @InjectMetric('permission_db_errors_total')
    private readonly dbErrorsCounter: Counter<string>,

    // Batch operation metrics
    @InjectMetric('permission_batch_check_size')
    private readonly batchSizeHistogram: Histogram<string>,

    @InjectMetric('permission_batch_check_duration_ms')
    private readonly batchDurationHistogram: Histogram<string>,

    // Performance metrics
    @InjectMetric('permission_check_timeout_total')
    private readonly timeoutCounter: Counter<string>,

    @InjectMetric('permission_rate_limit_hits_total')
    private readonly rateLimitCounter: Counter<string>,

    // Circuit breaker metrics
    @InjectMetric('permission_circuit_breaker_status')
    private readonly circuitBreakerGauge: Gauge<string>,

    @InjectMetric('permission_circuit_breaker_failures_total')
    private readonly circuitBreakerFailuresCounter: Counter<string>,

    // System metrics
    @InjectMetric('permission_active_checks')
    private readonly activeChecksGauge: Gauge<string>,

    @InjectMetric('permission_check_queue_size')
    private readonly queueSizeGauge: Gauge<string>,

    // SLO metrics
    @InjectMetric('permission_slo_violation_total')
    private readonly sloViolationCounter: Counter<string>,

    @InjectMetric('permission_check_percentile_ms')
    private readonly checkPercentileSummary: Summary<string>,
  ) {}

  // Record permission check
  recordPermissionCheck(
    resource: string,
    action: PermissionAction,
    scope?: PermissionScope,
    isAllowed?: boolean,
  ): void {
    const labels = {
      resource,
      action,
      scope: scope || 'none',
    };

    this.permissionCheckCounter.inc(labels);

    if (isAllowed !== undefined) {
      if (isAllowed) {
        this.permissionAllowedCounter.inc(labels);
      } else {
        this.permissionDeniedCounter.inc(labels);
      }
    }
  }

  // Record check duration
  recordCheckDuration(
    resource: string,
    action: PermissionAction,
    durationMs: number,
    source: 'direct' | 'cache' | 'matrix' | 'database',
  ): void {
    const labels = {
      resource,
      action,
      source,
    };

    this.checkDurationHistogram.observe(labels, durationMs);
    this.checkPercentileSummary.observe(labels, durationMs);

    // Check SLO violations (e.g., 95th percentile should be < 100ms)
    if (durationMs > 100) {
      this.sloViolationCounter.inc({
        slo_type: 'latency',
        threshold: '100ms',
      });
    }
  }

  // Record cache metrics
  recordCacheHit(cacheType: 'redis' | 'matrix'): void {
    this.cacheHitsCounter.inc({ cache_type: cacheType });
    if (cacheType === 'matrix') {
      this.matrixHitsCounter.inc();
    }
  }

  recordCacheMiss(cacheType: 'redis' | 'matrix'): void {
    this.cacheMissesCounter.inc({ cache_type: cacheType });
  }

  recordCacheInvalidation(
    reason: 'permission_update' | 'role_update' | 'user_update' | 'ttl_expired',
    count: number = 1,
  ): void {
    this.cacheInvalidationsCounter.inc({ reason }, count);
  }

  // Record database metrics
  recordDbQueryDuration(
    operation: 'check_permission' | 'find_permission' | 'batch_check' | 'invalidate_cache',
    durationMs: number,
  ): void {
    this.dbQueryHistogram.observe({ operation }, durationMs);
  }

  recordDbError(
    operation: string,
    errorType: 'connection' | 'query' | 'transaction' | 'timeout',
  ): void {
    this.dbErrorsCounter.inc({ operation, error_type: errorType });
  }

  // Record batch operation metrics
  recordBatchCheck(size: number, durationMs: number, cacheHits: number): void {
    this.batchSizeHistogram.observe(size);
    this.batchDurationHistogram.observe(durationMs);
    
    const cacheHitRate = (cacheHits / size) * 100;
    if (cacheHitRate < 80) {
      this.sloViolationCounter.inc({
        slo_type: 'cache_hit_rate',
        threshold: '80%',
      });
    }
  }

  // Record performance issues
  recordTimeout(resource: string, action: PermissionAction): void {
    this.timeoutCounter.inc({ resource, action });
  }

  recordRateLimitHit(userId: string): void {
    this.rateLimitCounter.inc({ user_id: userId });
  }

  // Circuit breaker metrics
  updateCircuitBreakerStatus(
    service: 'database' | 'cache' | 'matrix',
    status: 'open' | 'closed' | 'half_open',
  ): void {
    this.circuitBreakerGauge.set({ service }, status === 'open' ? 1 : status === 'half_open' ? 0.5 : 0);
  }

  recordCircuitBreakerFailure(service: string, reason: string): void {
    this.circuitBreakerFailuresCounter.inc({ service, reason });
  }

  // System metrics
  updateActiveChecks(count: number): void {
    this.activeChecksGauge.set(count);
  }

  updateQueueSize(queueName: string, size: number): void {
    this.queueSizeGauge.set({ queue: queueName }, size);
  }

  // Get current metrics for health checks
  async getHealthMetrics(): Promise<{
    avgCheckDuration: number;
    cacheHitRate: number;
    errorRate: number;
    activeChecks: number;
  }> {
    // This would typically query the metrics store
    // For now, return placeholder values
    return {
      avgCheckDuration: 25,
      cacheHitRate: 85,
      errorRate: 0.1,
      activeChecks: 5,
    };
  }
}