import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationModule } from './modules/organization/organization.module';
// Use consolidated permission module instead of separate modules
import { PermissionModule } from './modules/permission/permission.module';
import { CacheModule } from './cache/cache.module';
import { ScheduledTaskModule } from './scheduled/scheduled.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import {
  RLSContextMiddleware,
  RLSBypassMiddleware,
  RLSDebugMiddleware,
} from './middleware/rls-context.middleware';
import { RowLevelSecurityService } from './security/row-level-security.service';
import { RLSHelperService } from './security/rls-helper.service';
import configuration from './config/configuration';
import notificationConfig from './config/notification.config';
import { validateConfig } from './config/config.validation';
import { UserProfileModule } from './modules/user-profile/user-profile.module';
import { AuditModule } from './modules/audit/audit.module';
import { ApprovalModule } from './modules/approval/approval.module';
import { ModuleManagementModule } from './modules/module-management/module-management.module';
import { NotificationModule } from './modules/notification/notification.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';

@Module({
  imports: [
    // Configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, notificationConfig],
      envFilePath: ['.env', '.env.local'],
      cache: true,
      validate: validateConfig,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000, // convert to milliseconds
        limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      },
    ]),

    // Database
    PrismaModule,

    // Cache (Redis)
    CacheModule,

    // Queue Management (Bull)
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),

    // Health checks
    HealthModule,

    // Authentication
    AuthModule,

    // Features
    UsersModule,
    OrganizationModule,

    // Permission & Role Management - Now consolidated into single module
    PermissionModule,

    UserProfileModule,

    // Audit Module for compliance and tracking
    AuditModule,

    // Approval Module for workflow management
    ApprovalModule,

    ModuleManagementModule,

    NotificationModule,

    SystemConfigModule,

    // Scheduled Tasks - temporarily disabled for debugging
    // ScheduledTaskModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Row Level Security services
    RowLevelSecurityService,
    RLSHelperService,
    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Temporarily disable all middleware to debug startup issue
    // // RLS Bypass middleware for system operations (applied first)
    // consumer
    //   .apply(RLSBypassMiddleware)
    //   .forRoutes(
    //     { path: 'health/(.*)', method: RequestMethod.ALL },
    //     { path: 'system/(.*)', method: RequestMethod.ALL },
    //   );
    // // RLS Debug middleware (development only)
    // if (process.env.NODE_ENV === 'development') {
    //   consumer
    //     .apply(RLSDebugMiddleware)
    //     .forRoutes({ path: '(.*)', method: RequestMethod.ALL });
    // }
    // // RLS Context middleware for authenticated routes
    // consumer
    //   .apply(RLSContextMiddleware)
    //   .exclude(
    //     { path: 'health/(.*)', method: RequestMethod.ALL },
    //     { path: 'auth/webhook', method: RequestMethod.POST },
    //     { path: '', method: RequestMethod.GET }, // Root health check
    //   )
    //   .forRoutes({ path: '(.*)', method: RequestMethod.ALL });
  }
}
