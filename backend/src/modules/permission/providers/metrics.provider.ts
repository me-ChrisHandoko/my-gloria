import { makeCounterProvider, makeHistogramProvider, makeGaugeProvider, makeSummaryProvider } from '@willsoto/nestjs-prometheus';

export const permissionMetricsProviders = [
  // Permission check metrics
  makeCounterProvider({
    name: 'permission_check_total',
    help: 'Total number of permission checks',
    labelNames: ['resource', 'action', 'scope'],
  }),
  makeCounterProvider({
    name: 'permission_check_allowed_total',
    help: 'Total number of allowed permission checks',
    labelNames: ['resource', 'action', 'scope'],
  }),
  makeCounterProvider({
    name: 'permission_check_denied_total',
    help: 'Total number of denied permission checks',
    labelNames: ['resource', 'action', 'scope'],
  }),
  makeHistogramProvider({
    name: 'permission_check_duration_ms',
    help: 'Duration of permission checks in milliseconds',
    labelNames: ['resource', 'action', 'source'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  }),

  // Cache metrics
  makeCounterProvider({
    name: 'permission_cache_hits_total',
    help: 'Total number of permission cache hits',
    labelNames: ['cache_type'],
  }),
  makeCounterProvider({
    name: 'permission_cache_misses_total',
    help: 'Total number of permission cache misses',
    labelNames: ['cache_type'],
  }),
  makeCounterProvider({
    name: 'permission_cache_invalidations_total',
    help: 'Total number of permission cache invalidations',
    labelNames: ['reason'],
  }),
  makeCounterProvider({
    name: 'permission_matrix_hits_total',
    help: 'Total number of permission matrix hits',
  }),

  // Database metrics
  makeHistogramProvider({
    name: 'permission_db_query_duration_ms',
    help: 'Duration of permission database queries in milliseconds',
    labelNames: ['operation'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  }),
  makeCounterProvider({
    name: 'permission_db_errors_total',
    help: 'Total number of permission database errors',
    labelNames: ['operation', 'error_type'],
  }),

  // Batch operation metrics
  makeHistogramProvider({
    name: 'permission_batch_check_size',
    help: 'Size of batch permission checks',
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  }),
  makeHistogramProvider({
    name: 'permission_batch_check_duration_ms',
    help: 'Duration of batch permission checks in milliseconds',
    buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  }),

  // Performance metrics
  makeCounterProvider({
    name: 'permission_check_timeout_total',
    help: 'Total number of permission check timeouts',
    labelNames: ['resource', 'action'],
  }),
  makeCounterProvider({
    name: 'permission_rate_limit_hits_total',
    help: 'Total number of permission rate limit hits',
    labelNames: ['user_id'],
  }),

  // Circuit breaker metrics
  makeGaugeProvider({
    name: 'permission_circuit_breaker_status',
    help: 'Status of permission circuit breakers (0=closed, 0.5=half_open, 1=open)',
    labelNames: ['service'],
  }),
  makeCounterProvider({
    name: 'permission_circuit_breaker_failures_total',
    help: 'Total number of circuit breaker failures',
    labelNames: ['service', 'reason'],
  }),

  // System metrics
  makeGaugeProvider({
    name: 'permission_active_checks',
    help: 'Number of currently active permission checks',
  }),
  makeGaugeProvider({
    name: 'permission_check_queue_size',
    help: 'Size of permission check queue',
    labelNames: ['queue'],
  }),

  // SLO metrics
  makeCounterProvider({
    name: 'permission_slo_violation_total',
    help: 'Total number of SLO violations',
    labelNames: ['slo_type', 'threshold'],
  }),
  makeSummaryProvider({
    name: 'permission_check_percentile_ms',
    help: 'Permission check duration percentiles',
    labelNames: ['resource', 'action', 'source'],
    percentiles: [0.5, 0.9, 0.95, 0.99],
    maxAgeSeconds: 600,
    ageBuckets: 5,
  }),
];