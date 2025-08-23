import {
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
  makeSummaryProvider,
} from '@willsoto/nestjs-prometheus';

export const notificationMetricsProviders = [
  // Counters
  makeCounterProvider({
    name: 'notification_sent_total',
    help: 'Total number of notifications sent',
    labelNames: ['type', 'priority', 'channel'],
  }),

  makeCounterProvider({
    name: 'notification_failed_total',
    help: 'Total number of failed notifications',
    labelNames: ['type', 'priority', 'channel', 'reason'],
  }),

  makeCounterProvider({
    name: 'notification_retry_count',
    help: 'Number of notification retry attempts',
    labelNames: ['type', 'channel', 'attempt'],
  }),

  makeCounterProvider({
    name: 'notification_rate_limit_hits',
    help: 'Number of rate limit hits',
    labelNames: ['type'],
  }),

  // Histograms
  makeHistogramProvider({
    name: 'notification_processing_duration_ms',
    help: 'Notification processing duration in milliseconds',
    labelNames: ['type', 'priority'],
    buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  }),

  makeHistogramProvider({
    name: 'notification_channel_performance_ms',
    help: 'Channel-specific notification delivery performance',
    labelNames: ['channel', 'success'],
    buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  }),

  makeHistogramProvider({
    name: 'notification_batch_size',
    help: 'Size of notification batches',
    labelNames: ['channel'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  }),

  makeHistogramProvider({
    name: 'notification_template_render_duration_ms',
    help: 'Template rendering duration in milliseconds',
    labelNames: ['template'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500],
  }),

  makeHistogramProvider({
    name: 'notification_database_query_duration_ms',
    help: 'Database query duration in milliseconds',
    labelNames: ['operation'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  }),

  // Gauges
  makeGaugeProvider({
    name: 'notification_queue_size',
    help: 'Current size of notification queues',
    labelNames: ['queue'],
  }),

  makeGaugeProvider({
    name: 'notification_dead_letter_queue_size',
    help: 'Current size of dead letter queue',
  }),

  makeGaugeProvider({
    name: 'notification_circuit_breaker_status',
    help: 'Circuit breaker status (0=open, 0.5=half-open, 1=closed)',
    labelNames: ['service'],
  }),

  makeGaugeProvider({
    name: 'notification_active_connections',
    help: 'Number of active connections',
    labelNames: ['service'],
  }),

  // Summary
  makeSummaryProvider({
    name: 'notification_delivery_rate',
    help: 'Notification delivery rate per channel',
    labelNames: ['channel'],
    percentiles: [0.5, 0.9, 0.95, 0.99],
    maxAgeSeconds: 600,
    ageBuckets: 5,
  }),
];

// Alert thresholds configuration
export const ALERT_THRESHOLDS = {
  // Queue size alerts
  QUEUE_SIZE_WARNING: 1000,
  QUEUE_SIZE_CRITICAL: 5000,
  DEAD_LETTER_QUEUE_WARNING: 100,
  DEAD_LETTER_QUEUE_CRITICAL: 500,

  // Performance alerts
  PROCESSING_TIME_WARNING_MS: 5000,
  PROCESSING_TIME_CRITICAL_MS: 10000,
  TEMPLATE_RENDER_WARNING_MS: 100,
  TEMPLATE_RENDER_CRITICAL_MS: 500,
  DB_QUERY_WARNING_MS: 100,
  DB_QUERY_CRITICAL_MS: 500,

  // Error rate alerts (percentage)
  ERROR_RATE_WARNING: 5,
  ERROR_RATE_CRITICAL: 10,

  // Delivery rate alerts (notifications per minute)
  DELIVERY_RATE_LOW: 10,
  DELIVERY_RATE_HIGH: 1000,

  // Rate limit alerts (hits per minute)
  RATE_LIMIT_WARNING: 50,
  RATE_LIMIT_CRITICAL: 100,

  // Connection pool alerts
  CONNECTION_POOL_WARNING: 80, // percentage
  CONNECTION_POOL_CRITICAL: 95, // percentage

  // Circuit breaker alerts
  CIRCUIT_BREAKER_OPEN_DURATION_WARNING_SECONDS: 60,
  CIRCUIT_BREAKER_OPEN_DURATION_CRITICAL_SECONDS: 300,
};
