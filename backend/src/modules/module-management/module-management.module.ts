import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModuleController } from './controllers/module.controller';
import { ModuleAccessController } from './controllers/module-access.controller';
import { ModuleService } from './services/module.service';
import { ModuleAccessService } from './services/module-access.service';
import { ModulePermissionService } from './services/module-permission.service';
import { OverrideService } from './services/override.service';
import { ModuleTreeService } from './services/module-tree.service';
import { ModuleOperationsService } from './services/module-operations.service';
import { PermissionModule } from '../permission/permission.module';
import { CacheModule } from '../../cache/cache.module';
import { AuditModule } from '../audit/audit.module';
import { ModuleErrorHandlerInterceptor } from './interceptors/error-handler.interceptor';
import { CircularDependencyChecker } from './utils/circular-dependency.util';
import { StructuredLoggerFactory } from './utils/structured-logger.util';
import { PerformanceMetricsService } from './utils/performance-metrics.util';

@Module({
  imports: [
    PrismaModule,
    PermissionModule,
    CacheModule,
    AuditModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [ModuleController, ModuleAccessController],
  providers: [
    ModuleService,
    ModuleAccessService,
    ModulePermissionService,
    OverrideService,
    ModuleTreeService,
    ModuleOperationsService,
    CircularDependencyChecker,
    StructuredLoggerFactory,
    PerformanceMetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ModuleErrorHandlerInterceptor,
    },
  ],
  exports: [
    ModuleService,
    ModuleAccessService,
    ModulePermissionService,
    ModuleTreeService,
    ModuleOperationsService,
    StructuredLoggerFactory,
    PerformanceMetricsService,
  ],
})
export class ModuleManagementModule {}
