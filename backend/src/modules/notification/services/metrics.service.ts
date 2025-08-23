import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge, Summary } from 'prom-client';
import {
  NotificationType,
  Priority,
  NotificationChannel,
} from '@prisma/client';

@Injectable()
export class NotificationMetricsService {
  constructor(
    @InjectMetric('notification_sent_total')
    private readonly notificationSentCounter: Counter<string>,

    @InjectMetric('notification_failed_total')
    private readonly notificationFailedCounter: Counter<string>,

    @InjectMetric('notification_processing_duration_ms')
    private readonly processingDurationHistogram: Histogram<string>,

    @InjectMetric('notification_queue_size')
    private readonly queueSizeGauge: Gauge<string>,

    @InjectMetric('notification_delivery_rate')
    private readonly deliveryRateSummary: Summary<string>,

    @InjectMetric('notification_retry_count')
    private readonly retryCounter: Counter<string>,

    @InjectMetric('notification_channel_performance_ms')
    private readonly channelPerformanceHistogram: Histogram<string>,

    @InjectMetric('notification_dead_letter_queue_size')
    private readonly deadLetterQueueGauge: Gauge<string>,

    @InjectMetric('notification_rate_limit_hits')
    private readonly rateLimitCounter: Counter<string>,

    @InjectMetric('notification_circuit_breaker_status')
    private readonly circuitBreakerGauge: Gauge<string>,

    @InjectMetric('notification_batch_size')
    private readonly batchSizeHistogram: Histogram<string>,

    @InjectMetric('notification_template_render_duration_ms')
    private readonly templateRenderHistogram: Histogram<string>,

    @InjectMetric('notification_database_query_duration_ms')
    private readonly dbQueryHistogram: Histogram<string>,

    @InjectMetric('notification_active_connections')
    private readonly activeConnectionsGauge: Gauge<string>,
  ) {}

  // Record successful notification send
  recordNotificationSent(
    type: NotificationType,
    priority: Priority,
    channel: NotificationChannel,
  ): void {
    this.notificationSentCounter.inc({
      type,
      priority,
      channel,
    });
  }

  // Record failed notification
  recordNotificationFailed(
    type: NotificationType,
    priority: Priority,
    channel: NotificationChannel,
    reason: string,
  ): void {
    this.notificationFailedCounter.inc({
      type,
      priority,
      channel,
      reason,
    });
  }

  // Record processing duration
  recordProcessingDuration(
    type: NotificationType,
    priority: Priority,
    durationMs: number,
  ): void {
    this.processingDurationHistogram.observe(
      {
        type,
        priority,
      },
      durationMs,
    );
  }

  // Update queue size
  updateQueueSize(queueName: string, size: number): void {
    this.queueSizeGauge.set(
      {
        queue: queueName,
      },
      size,
    );
  }

  // Record delivery rate
  recordDeliveryRate(channel: NotificationChannel, rate: number): void {
    this.deliveryRateSummary.observe(
      {
        channel,
      },
      rate,
    );
  }

  // Record retry attempt
  recordRetry(
    type: NotificationType,
    channel: NotificationChannel,
    attemptNumber: number,
  ): void {
    this.retryCounter.inc({
      type,
      channel,
      attempt: attemptNumber.toString(),
    });
  }

  // Record channel performance
  recordChannelPerformance(
    channel: NotificationChannel,
    durationMs: number,
    success: boolean,
  ): void {
    this.channelPerformanceHistogram.observe(
      {
        channel,
        success: success.toString(),
      },
      durationMs,
    );
  }

  // Update dead letter queue size
  updateDeadLetterQueueSize(size: number): void {
    this.deadLetterQueueGauge.set(size);
  }

  // Record rate limit hit
  recordRateLimitHit(userId: string, type: NotificationType): void {
    this.rateLimitCounter.inc({
      type,
    });
  }

  // Update circuit breaker status
  updateCircuitBreakerStatus(
    service: string,
    status: 'open' | 'closed' | 'half-open',
  ): void {
    const statusValue = status === 'open' ? 0 : status === 'closed' ? 1 : 0.5;
    this.circuitBreakerGauge.set(
      {
        service,
      },
      statusValue,
    );
  }

  // Record batch size
  recordBatchSize(channel: NotificationChannel, size: number): void {
    this.batchSizeHistogram.observe(
      {
        channel,
      },
      size,
    );
  }

  // Record template render duration
  recordTemplateRenderDuration(templateType: string, durationMs: number): void {
    this.templateRenderHistogram.observe(
      {
        template: templateType,
      },
      durationMs,
    );
  }

  // Record database query duration
  recordDatabaseQueryDuration(operation: string, durationMs: number): void {
    this.dbQueryHistogram.observe(
      {
        operation,
      },
      durationMs,
    );
  }

  // Update active connections
  updateActiveConnections(service: string, count: number): void {
    this.activeConnectionsGauge.set(
      {
        service,
      },
      count,
    );
  }

  // Helper method to start timing
  startTimer(): () => number {
    const startTime = Date.now();
    return () => Date.now() - startTime;
  }

  // Get current metrics snapshot
  async getMetricsSnapshot() {
    return {
      queueSizes: await this.getQueueSizes(),
      deliveryRates: await this.getDeliveryRates(),
      errorRates: await this.getErrorRates(),
      averageProcessingTime: await this.getAverageProcessingTime(),
      circuitBreakerStatus: await this.getCircuitBreakerStatus(),
    };
  }

  private async getQueueSizes() {
    // Implementation would query actual queue sizes
    return {};
  }

  private async getDeliveryRates() {
    // Implementation would calculate delivery rates
    return {};
  }

  private async getErrorRates() {
    // Implementation would calculate error rates
    return {};
  }

  private async getAverageProcessingTime() {
    // Implementation would calculate average processing times
    return {};
  }

  private async getCircuitBreakerStatus() {
    // Implementation would get circuit breaker statuses
    return {};
  }

  // Record batch processing metrics
  async recordBatchProcessing(data: {
    channel: NotificationChannel;
    batchSize: number;
    successCount: number;
    failureCount: number;
    processingTime: number;
    priority: string;
  }): Promise<void> {
    this.recordBatchSize(data.channel, data.batchSize);
    this.recordChannelPerformance(
      data.channel,
      data.processingTime,
      data.successCount > 0,
    );

    // Record individual successes and failures
    for (let i = 0; i < data.successCount; i++) {
      this.recordNotificationSent(
        NotificationType.SYSTEM_UPDATE,
        data.priority as Priority,
        data.channel,
      );
    }

    for (let i = 0; i < data.failureCount; i++) {
      this.recordNotificationFailed(
        NotificationType.SYSTEM_UPDATE,
        data.priority as Priority,
        data.channel,
        'batch_processing_failure',
      );
    }
  }

  // Record notification aggregation metrics
  async recordNotificationAggregation(data: {
    type: NotificationType;
    buffered: number;
    aggregationKey: string;
  }): Promise<void> {
    this.updateQueueSize('aggregation_buffer', data.buffered);
  }

  // Record aggregation flush metrics
  async recordAggregationFlush(data: {
    type: NotificationType;
    count: number;
    timeInBuffer: number;
  }): Promise<void> {
    this.recordBatchSize(NotificationChannel.EMAIL, data.count);
    this.recordProcessingDuration(
      data.type,
      'MEDIUM' as Priority,
      data.timeInBuffer,
    );
  }
}
