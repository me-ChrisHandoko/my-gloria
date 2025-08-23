import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrganizationModule } from '../organization/organization.module';
import { PermissionModule } from '../permission/permission.module';
import { AuditModule } from '../audit/audit.module';
import { CacheModule } from '../../cache/cache.module';
import { NotificationModule } from '../notification/notification.module';

// Controllers
import { ApprovalMatrixController } from './controllers/approval-matrix.controller';
import { RequestController } from './controllers/request.controller';
import { ApprovalStepController } from './controllers/approval-step.controller';
import { DelegationController } from './controllers/delegation.controller';
import { ApprovalMetricsController } from './controllers/metrics.controller';

// Services
import { WorkflowService } from './services/workflow.service';
import { ApprovalMatrixService } from './services/approval-matrix.service';
import { RequestService } from './services/request.service';
import { DelegationService } from './services/delegation.service';
import { ApprovalValidatorService } from './services/approval-validator.service';
import { ApprovalBusinessRulesService } from './services/approval-business-rules.service';
// ApprovalAuditService removed - using consolidated AuditService from AuditModule
import { ApprovalNotificationService } from './services/approval-notification.service';

// Logging and Metrics
import { ApprovalLoggerService } from './logging/approval-logger.service';
import { ApprovalMetricsService } from './metrics/approval-metrics.service';

// Repositories
import { RequestRepository } from './repositories/request.repository';
import { ApprovalStepRepository } from './repositories/approval-step.repository';
import { ApprovalMatrixRepository } from './repositories/approval-matrix.repository';
import { DelegationRepository } from './repositories/delegation.repository';

// Filters and Interceptors
import { OptimisticLockExceptionFilter } from './filters/optimistic-lock-exception.filter';
import { VersionInterceptor } from './interceptors/version.interceptor';
import { ApprovalLoggingInterceptor } from './interceptors/logging.interceptor';

// Event Handlers
import { ApprovalEventHandlers } from './events/approval.event-handlers';

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 10,
      verboseMemoryLeak: true,
    }),
    OrganizationModule,
    PermissionModule,
    AuditModule,
    CacheModule,
    NotificationModule,
  ],
  controllers: [
    ApprovalMatrixController,
    RequestController,
    ApprovalStepController,
    DelegationController,
    ApprovalMetricsController,
  ],
  providers: [
    // Repositories
    RequestRepository,
    ApprovalStepRepository,
    ApprovalMatrixRepository,
    DelegationRepository,
    // Services
    WorkflowService,
    ApprovalMatrixService,
    RequestService,
    DelegationService,
    ApprovalValidatorService,
    ApprovalBusinessRulesService,
    // ApprovalAuditService removed - using AuditService from AuditModule
    ApprovalNotificationService,
    // Logging and Metrics
    ApprovalLoggerService,
    ApprovalMetricsService,
    // Event Handlers
    ApprovalEventHandlers,
    // Register the exception filter for this module
    {
      provide: APP_FILTER,
      useClass: OptimisticLockExceptionFilter,
    },
    // Register the version interceptor for this module
    {
      provide: APP_INTERCEPTOR,
      useClass: VersionInterceptor,
    },
    // Register the logging interceptor for this module
    {
      provide: APP_INTERCEPTOR,
      useClass: ApprovalLoggingInterceptor,
    },
  ],
  exports: [
    // Export repositories for potential use in other modules
    RequestRepository,
    ApprovalStepRepository,
    ApprovalMatrixRepository,
    DelegationRepository,
    // Export services
    WorkflowService,
    ApprovalMatrixService,
    RequestService,
    DelegationService,
    ApprovalBusinessRulesService,
    // ApprovalAuditService removed - using AuditService from AuditModule
    // Export logging and metrics
    ApprovalLoggerService,
    ApprovalMetricsService,
  ],
})
export class ApprovalModule {}
