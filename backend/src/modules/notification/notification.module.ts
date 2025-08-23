import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { CacheModule } from '../../cache/cache.module';
import { NotificationController } from './notification.controller';
import { NotificationHealthController } from './controllers/health.controller';
import { QueueManagementController } from './controllers/queue-management.controller';
import { NotificationMetricsController } from './controllers/metrics.controller';
import { NotificationPreferencesController } from './controllers/notification-preferences.controller';
import { TemplateController } from './controllers/template.controller';
import { NotificationService } from './notification.service';
import { NotificationPreferencesService } from './services/notification-preferences.service';
import { EmailService } from './email.service';
import { PushService } from './push.service';
import { TemplateService } from './template.service';
import { EnhancedTemplateService } from './services/enhanced-template.service';
import { TemplateMigrationService } from './services/template-migration.service';
import { QueueService } from './queue.service';
import { RateLimitService } from './services/rate-limit.service';
import { SanitizationService } from './services/sanitization.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { FallbackQueueService } from './services/fallback-queue.service';
import { DeadLetterQueueService } from './services/dead-letter-queue.service';
import { WeightedQueueService } from './services/weighted-queue.service';
import { NotificationMetricsService } from './services/metrics.service';
import { MetricsCollectorService } from './services/metrics-collector.service';
import { BatchProcessorService } from './services/batch-processor.service';
import { BatchAggregationService } from './services/batch-aggregation.service';
import { notificationMetricsProviders } from './providers/metrics.provider';
import { NotificationProviderFactory } from './factories/provider.factory';
import { PostmarkProvider } from './providers/postmark.provider';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuditModule,
    CacheModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
      path: '/metrics',
      defaultLabels: {
        app: 'notification-service',
      },
    }),
    // Main notification queue
    BullModule.registerQueue({
      name: 'notifications',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    // Dead letter queue for failed notifications
    BullModule.registerQueue({
      name: 'dead-letter-notifications',
      defaultJobOptions: {
        removeOnComplete: false,
        removeOnFail: false,
        attempts: 1,
      },
    }),
    // Weighted queues for different priorities
    BullModule.registerQueue({
      name: 'notifications-critical',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }),
    BullModule.registerQueue({
      name: 'notifications-urgent',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 4,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    BullModule.registerQueue({
      name: 'notifications-high',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
      },
    }),
    BullModule.registerQueue({
      name: 'notifications-medium',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'fixed',
          delay: 5000,
        },
      },
    }),
    BullModule.registerQueue({
      name: 'notifications-low',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 10000,
        },
      },
    }),
  ],
  controllers: [
    NotificationController,
    NotificationHealthController,
    QueueManagementController,
    NotificationMetricsController,
    NotificationPreferencesController,
    TemplateController,
  ],
  providers: [
    NotificationService,
    NotificationPreferencesService,
    EmailService,
    PushService,
    TemplateService,
    EnhancedTemplateService,
    TemplateMigrationService,
    QueueService,
    RateLimitService,
    SanitizationService,
    CircuitBreakerService,
    FallbackQueueService,
    DeadLetterQueueService,
    WeightedQueueService,
    NotificationMetricsService,
    MetricsCollectorService,
    BatchProcessorService,
    BatchAggregationService,
    NotificationProviderFactory,
    PostmarkProvider,
    ...notificationMetricsProviders,
  ],
  exports: [
    NotificationService,
    NotificationPreferencesService,
    EmailService,
    PushService,
    TemplateService,
    EnhancedTemplateService,
    RateLimitService,
    SanitizationService,
    CircuitBreakerService,
    FallbackQueueService,
    DeadLetterQueueService,
    WeightedQueueService,
    NotificationMetricsService,
    BatchProcessorService,
    BatchAggregationService,
    NotificationProviderFactory,
  ],
})
export class NotificationModule {}
