import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../prisma/prisma.module';
import { CacheModule } from '../../cache/cache.module';
import { AuditModule } from '../audit/audit.module';

// Controllers
import { PermissionController } from './controllers/permission.controller';
import { RoleController } from './controllers/role.controller';
import { UserPermissionController } from './controllers/user-permission.controller';
import { PermissionPolicyController } from './controllers/permission-policy.controller';
import { PermissionGroupController } from './controllers/permission-group.controller';

// Core Services
import { PermissionService } from './services/permission.service';
import { RoleService } from './services/role.service';
import { UserPermissionService } from './services/user-permission.service';
import { PermissionPolicyService } from './services/permission-policy.service';
import { PermissionGroupService } from './services/permission-group.service';
import { PermissionMatrixService } from './services/permission-matrix.service';
import { PermissionLogRetentionService } from './services/permission-log-retention.service';
import { JsonSchemaValidatorService } from './services/json-schema-validator.service';

// Read Model Services
import { PermissionReadModelService } from './services/permission-read-model.service';

// Plugin Architecture Services
import { PluginRegistryService } from './services/plugin-registry.service';
import { PolicyEngineV2Service } from './services/policy-engine-v2.service';

// Plugins
import { TimeBasedPolicyPlugin } from './plugins/time-based-policy.plugin';
import { LocationBasedPolicyPlugin } from './plugins/location-based-policy.plugin';
import { AttributeBasedPolicyPlugin } from './plugins/attribute-based-policy.plugin';

// Policy Engines
import { TimeBasedPolicyEngine } from './engines/time-based-policy.engine';
import { LocationBasedPolicyEngine } from './engines/location-based-policy.engine';
import { AttributeBasedPolicyEngine } from './engines/attribute-based-policy.engine';

// CQRS Handlers
import { GrantPermissionHandler } from './cqrs/handlers/grant-permission.handler';
import { CheckPermissionHandler } from './cqrs/handlers/check-permission.handler';

// Guards & Decorators
import { PermissionGuard } from './guards/permission.guard';

// Legacy Service (for backward compatibility)
import { PolicyEngineService } from './services/policy-engine.service';

/**
 * Enhanced Permission Module with Architecture Improvements
 *
 * Key improvements:
 * 1. Plugin-based policy engine architecture for extensibility
 * 2. CQRS pattern implementation for clear separation of concerns
 * 3. Separate read model for optimized queries
 * 4. Eliminated circular dependencies through proper layering
 *
 * Architecture layers:
 * - Controllers: HTTP interface
 * - Command/Query Handlers: Business logic orchestration
 * - Services: Core business logic
 * - Read Model: Optimized query services
 * - Plugins: Extensible policy evaluation
 * - Infrastructure: Database, caching, audit
 */
@Module({
  imports: [
    PrismaModule,
    CacheModule,
    AuditModule,
    CqrsModule, // For CQRS implementation
  ],
  controllers: [
    PermissionController,
    RoleController,
    UserPermissionController,
    PermissionPolicyController,
    PermissionGroupController,
  ],
  providers: [
    // Core Services
    PermissionService,
    RoleService,
    UserPermissionService,
    PermissionPolicyService,
    PermissionGroupService,
    PermissionMatrixService,
    PermissionLogRetentionService,
    JsonSchemaValidatorService,

    // Read Model Services
    PermissionReadModelService,

    // Plugin Architecture
    PluginRegistryService,
    PolicyEngineV2Service,

    // Plugins
    TimeBasedPolicyPlugin,
    LocationBasedPolicyPlugin,
    AttributeBasedPolicyPlugin,

    // Policy Engines
    TimeBasedPolicyEngine,
    LocationBasedPolicyEngine,
    AttributeBasedPolicyEngine,

    // CQRS Handlers
    GrantPermissionHandler,
    CheckPermissionHandler,

    // Guards
    PermissionGuard,

    // Legacy (for backward compatibility)
    PolicyEngineService,
  ],
  exports: [
    // Export services that other modules might need
    PermissionService,
    RoleService,
    UserPermissionService,
    PermissionPolicyService,
    PermissionGuard,
    PermissionReadModelService, // Export read model for queries
    PolicyEngineV2Service, // Export new policy engine
  ],
})
export class PermissionV2Module {}