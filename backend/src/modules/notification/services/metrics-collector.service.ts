import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { NotificationMetricsService } from './metrics.service';
import { ALERT_THRESHOLDS } from '../providers/metrics.provider';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class MetricsCollectorService implements OnModuleInit {
  private readonly logger = new Logger(MetricsCollectorService.name);
  private readonly alertState = new Map<string, boolean>();

  constructor(
    private readonly metricsService: NotificationMetricsService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('notifications') private readonly notificationQueue: Queue,
    @InjectQueue('dead-letter-notifications')
    private readonly deadLetterQueue: Queue,
    @InjectQueue('notifications-critical')
    private readonly criticalQueue: Queue,
    @InjectQueue('notifications-urgent') private readonly urgentQueue: Queue,
    @InjectQueue('notifications-high') private readonly highQueue: Queue,
    @InjectQueue('notifications-medium') private readonly mediumQueue: Queue,
    @InjectQueue('notifications-low') private readonly lowQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing metrics collector service');
    await this.collectInitialMetrics();
  }

  // Collect queue metrics every 10 seconds
  @Interval(10000)
  async collectQueueMetrics() {
    try {
      const queues = [
        { name: 'main', queue: this.notificationQueue },
        { name: 'dead-letter', queue: this.deadLetterQueue },
        { name: 'critical', queue: this.criticalQueue },
        { name: 'urgent', queue: this.urgentQueue },
        { name: 'high', queue: this.highQueue },
        { name: 'medium', queue: this.mediumQueue },
        { name: 'low', queue: this.lowQueue },
      ];

      for (const { name, queue } of queues) {
        try {
          // Check if the queue client is connected
          const client = queue.client;
          if (!client || client.status !== 'ready') {
            this.logger.warn(
              `Queue ${name} Redis client is not ready, skipping metrics collection`,
            );
            continue;
          }

          const [waiting, active, completed, failed, delayed] =
            await Promise.all([
              queue.getWaitingCount(),
              queue.getActiveCount(),
              queue.getCompletedCount(),
              queue.getFailedCount(),
              queue.getDelayedCount(),
            ]);

          const totalSize = waiting + active + delayed;

          // Update metrics
          this.metricsService.updateQueueSize(name, totalSize);

          if (name === 'dead-letter') {
            this.metricsService.updateDeadLetterQueueSize(totalSize);

            // Check alert thresholds for dead letter queue
            this.checkDeadLetterQueueAlerts(totalSize);
          } else {
            // Check alert thresholds for regular queues
            this.checkQueueSizeAlerts(name, totalSize);
          }

          // Log queue stats for debugging
          this.logger.debug(
            `Queue ${name}: waiting=${waiting}, active=${active}, completed=${completed}, failed=${failed}, delayed=${delayed}`,
          );
        } catch (queueError) {
          // Handle individual queue errors without stopping the entire metrics collection
          this.logger.error(
            `Error collecting metrics for queue ${name}:`,
            queueError,
          );

          // Emit an event for monitoring purposes
          this.eventEmitter.emit('notification.queue.error', {
            queue: name,
            error:
              queueError instanceof Error
                ? queueError.message
                : String(queueError),
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      this.logger.error('Error in queue metrics collection process', error);
    }
  }

  // Collect health metrics every 30 seconds
  @Interval(30000)
  async collectHealthMetrics() {
    try {
      // This would be integrated with actual health checks
      const healthStatus = this.checkSystemHealth();

      // Update circuit breaker metrics
      for (const [service, status] of Object.entries(
        healthStatus.circuitBreakers,
      )) {
        this.metricsService.updateCircuitBreakerStatus(
          service,
          status as 'open' | 'closed' | 'half-open',
        );
      }

      // Update connection metrics
      for (const [service, count] of Object.entries(healthStatus.connections)) {
        this.metricsService.updateActiveConnections(service, count);
      }
    } catch (error) {
      this.logger.error('Error collecting health metrics', error);
    }
  }

  // Calculate and emit performance statistics every minute
  @Interval(60000)
  async calculatePerformanceStats() {
    try {
      const snapshot = await this.metricsService.getMetricsSnapshot();

      // Emit performance report event
      this.eventEmitter.emit('notification.performance.report', snapshot);

      // Check for performance degradation
      this.checkPerformanceAlerts(snapshot);
    } catch (error) {
      this.logger.error('Error calculating performance stats', error);
    }
  }

  private async collectInitialMetrics() {
    try {
      await this.collectQueueMetrics();
      await this.collectHealthMetrics();
    } catch (error) {
      this.logger.error('Error during initial metrics collection', error);
      // Don't throw - allow the service to start even if initial collection fails
    }
  }

  private checkQueueSizeAlerts(queueName: string, size: number) {
    const warningKey = `queue_size_warning_${queueName}`;
    const criticalKey = `queue_size_critical_${queueName}`;

    if (size >= ALERT_THRESHOLDS.QUEUE_SIZE_CRITICAL) {
      if (!this.alertState.get(criticalKey)) {
        this.alertState.set(criticalKey, true);
        this.emitAlert(
          'critical',
          `Queue ${queueName} size critical: ${size}`,
          {
            queue: queueName,
            size,
            threshold: ALERT_THRESHOLDS.QUEUE_SIZE_CRITICAL,
          },
        );
      }
    } else if (size >= ALERT_THRESHOLDS.QUEUE_SIZE_WARNING) {
      this.alertState.set(criticalKey, false);
      if (!this.alertState.get(warningKey)) {
        this.alertState.set(warningKey, true);
        this.emitAlert('warning', `Queue ${queueName} size warning: ${size}`, {
          queue: queueName,
          size,
          threshold: ALERT_THRESHOLDS.QUEUE_SIZE_WARNING,
        });
      }
    } else {
      this.alertState.set(warningKey, false);
      this.alertState.set(criticalKey, false);
    }
  }

  private checkDeadLetterQueueAlerts(size: number) {
    const warningKey = 'dead_letter_queue_warning';
    const criticalKey = 'dead_letter_queue_critical';

    if (size >= ALERT_THRESHOLDS.DEAD_LETTER_QUEUE_CRITICAL) {
      if (!this.alertState.get(criticalKey)) {
        this.alertState.set(criticalKey, true);
        this.emitAlert(
          'critical',
          `Dead letter queue critical: ${size} failed notifications`,
          {
            size,
            threshold: ALERT_THRESHOLDS.DEAD_LETTER_QUEUE_CRITICAL,
          },
        );
      }
    } else if (size >= ALERT_THRESHOLDS.DEAD_LETTER_QUEUE_WARNING) {
      this.alertState.set(criticalKey, false);
      if (!this.alertState.get(warningKey)) {
        this.alertState.set(warningKey, true);
        this.emitAlert(
          'warning',
          `Dead letter queue warning: ${size} failed notifications`,
          {
            size,
            threshold: ALERT_THRESHOLDS.DEAD_LETTER_QUEUE_WARNING,
          },
        );
      }
    } else {
      this.alertState.set(warningKey, false);
      this.alertState.set(criticalKey, false);
    }
  }

  private checkPerformanceAlerts(snapshot: {
    averageProcessingTime?: Record<string, number>;
    errorRates?: Record<string, number>;
  }) {
    // Check average processing time
    if (snapshot.averageProcessingTime) {
      for (const [type, avgTime] of Object.entries(
        snapshot.averageProcessingTime,
      )) {
        if (avgTime >= ALERT_THRESHOLDS.PROCESSING_TIME_CRITICAL_MS) {
          this.emitAlert(
            'critical',
            `Processing time critical for ${type}: ${avgTime}ms`,
            {
              type,
              avgTime,
              threshold: ALERT_THRESHOLDS.PROCESSING_TIME_CRITICAL_MS,
            },
          );
        } else if (avgTime >= ALERT_THRESHOLDS.PROCESSING_TIME_WARNING_MS) {
          this.emitAlert(
            'warning',
            `Processing time warning for ${type}: ${avgTime}ms`,
            {
              type,
              avgTime,
              threshold: ALERT_THRESHOLDS.PROCESSING_TIME_WARNING_MS,
            },
          );
        }
      }
    }

    // Check error rates
    if (snapshot.errorRates) {
      for (const [channel, rate] of Object.entries(snapshot.errorRates)) {
        if (rate >= ALERT_THRESHOLDS.ERROR_RATE_CRITICAL) {
          this.emitAlert(
            'critical',
            `Error rate critical for ${channel}: ${rate}%`,
            {
              channel,
              rate,
              threshold: ALERT_THRESHOLDS.ERROR_RATE_CRITICAL,
            },
          );
        } else if (rate >= ALERT_THRESHOLDS.ERROR_RATE_WARNING) {
          this.emitAlert(
            'warning',
            `Error rate warning for ${channel}: ${rate}%`,
            {
              channel,
              rate,
              threshold: ALERT_THRESHOLDS.ERROR_RATE_WARNING,
            },
          );
        }
      }
    }
  }

  private emitAlert(
    severity: 'warning' | 'critical',
    message: string,
    metadata: Record<string, any>,
  ) {
    this.logger[severity === 'critical' ? 'error' : 'warn'](message, metadata);

    this.eventEmitter.emit('notification.alert', {
      severity,
      message,
      metadata,
      timestamp: new Date(),
    });
  }

  private checkSystemHealth() {
    // This would integrate with actual health checks
    return {
      circuitBreakers: {
        email: 'closed',
        push: 'closed',
        sms: 'closed',
      },
      connections: {
        email: 5,
        database: 10,
        redis: 3,
      },
    };
  }

  // Public method to record custom metrics
  recordCustomMetric(
    type: 'counter' | 'histogram' | 'gauge',
    name: string,
    value: number,
    labels?: Record<string, string>,
  ) {
    this.logger.debug(
      `Recording custom metric: ${type}/${name} = ${value}`,
      labels,
    );
    // Implementation would record to appropriate metric type
  }
}
