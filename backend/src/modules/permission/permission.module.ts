import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CacheModule } from '../../cache/cache.module';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

// Controllers
import { PermissionController } from './controllers/permission.controller';
import { RoleController } from './controllers/role.controller';
import { UserPermissionController } from './controllers/user-permission.controller';
import { PermissionPolicyController } from './controllers/permission-policy.controller';
import { PermissionGroupController } from './controllers/permission-group.controller';
import { PermissionMonitoringController } from './controllers/monitoring.controller';
import { PermissionTemplateController } from './controllers/permission-template.controller';
import { PermissionDelegationController } from './controllers/permission-delegation.controller';
import { PermissionAnalyticsController } from './controllers/permission-analytics.controller';
import { PermissionBulkController } from './controllers/permission-bulk.controller';

// Services
import { PermissionService } from './services/permission.service';
import { RoleService } from './services/role.service';
import { UserPermissionService } from './services/user-permission.service';
import { PermissionPolicyService } from './services/permission-policy.service';
import { PolicyEngineService } from './services/policy-engine.service';
import { PermissionGroupService } from './services/permission-group.service';
import { PermissionMatrixService } from './services/permission-matrix.service';
import { PermissionLogRetentionService } from './services/permission-log-retention.service';
import { JsonSchemaValidatorService } from './services/json-schema-validator.service';
import { PermissionMetricsService } from './services/permission-metrics.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { PermissionTemplateService } from './services/permission-template.service';
import { PermissionDelegationService } from './services/permission-delegation.service';
import { PermissionAnalyticsService } from './services/permission-analytics.service';
import { PermissionBulkService } from './services/permission-bulk.service';
import { PermissionChangeHistoryService } from './services/permission-change-history.service';

// Guards & Decorators
import { PermissionGuard } from './guards/permission.guard';

// Policy Engines
import { TimeBasedPolicyEngine } from './engines/time-based-policy.engine';
import { LocationBasedPolicyEngine } from './engines/location-based-policy.engine';
import { AttributeBasedPolicyEngine } from './engines/attribute-based-policy.engine';

// External Services
import { AuditService } from '../audit/services/audit.service';

// Metrics Providers
import { permissionMetricsProviders } from './providers/metrics.provider';

/**
 * Consolidated Permission Module
 *
 * This module consolidates all permission-related functionality:
 * - Core permission management
 * - Role management and hierarchy
 * - User permission grants
 * - Permission policies (time, location, attribute-based)
 * - Permission caching (using Redis-based cache from CacheModule)
 * - Guards and decorators for authorization
 *
 * Architecture follows the organization module pattern for consistency.
 */
@Module({
  imports: [
    PrismaModule,
    CacheModule,
    // PrometheusModule removed to avoid route conflicts - metrics handled by notification module
  ],
  controllers: [
    PermissionController,
    RoleController,
    UserPermissionController,
    PermissionPolicyController,
    PermissionGroupController,
    PermissionMonitoringController,
    PermissionTemplateController,
    PermissionDelegationController,
    PermissionAnalyticsController,
    PermissionBulkController,
  ],
  providers: [
    // Core Services
    PermissionService,
    RoleService,
    UserPermissionService,
    PermissionPolicyService,
    PolicyEngineService,
    PermissionGroupService,
    PermissionMatrixService,
    PermissionLogRetentionService,
    JsonSchemaValidatorService,
    PermissionMetricsService,
    CircuitBreakerService,
    PermissionTemplateService,
    PermissionDelegationService,
    PermissionAnalyticsService,
    PermissionBulkService,
    PermissionChangeHistoryService,

    // Guards
    PermissionGuard,

    // Policy Engines
    TimeBasedPolicyEngine,
    LocationBasedPolicyEngine,
    AttributeBasedPolicyEngine,

    // External Services
    AuditService,
    
    // Metrics Providers
    ...permissionMetricsProviders,
  ],
  exports: [
    // Export services that other modules might need
    PermissionService,
    RoleService,
    UserPermissionService,
    PermissionPolicyService,
    PermissionGuard,
    PermissionTemplateService,
    PermissionDelegationService,
    PermissionAnalyticsService,
  ],
})
export class PermissionModule {}
