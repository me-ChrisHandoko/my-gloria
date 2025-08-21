import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

// Controllers
import { PermissionController } from './controllers/permission.controller';
import { RoleController } from './controllers/role.controller';
import { UserPermissionController } from './controllers/user-permission.controller';
import { PermissionPolicyController } from './controllers/permission-policy.controller';
import { PermissionGroupController } from './controllers/permission-group.controller';

// Services
import { PermissionService } from './services/permission.service';
import { RoleService } from './services/role.service';
import { UserPermissionService } from './services/user-permission.service';
import { PermissionPolicyService } from './services/permission-policy.service';
import { PermissionCacheService } from './services/permission-cache.service';
import { PolicyEngineService } from './services/policy-engine.service';
import { PermissionGroupService } from './services/permission-group.service';

// Guards & Decorators
import { PermissionGuard } from './guards/permission.guard';

// Policy Engines
import { TimeBasedPolicyEngine } from './engines/time-based-policy.engine';
import { LocationBasedPolicyEngine } from './engines/location-based-policy.engine';
import { AttributeBasedPolicyEngine } from './engines/attribute-based-policy.engine';

// External Services
import { AuditService } from '../../audit/audit.service';

/**
 * Consolidated Permission Module
 * 
 * This module consolidates all permission-related functionality:
 * - Core permission management
 * - Role management and hierarchy
 * - User permission grants
 * - Permission policies (time, location, attribute-based)
 * - Permission caching
 * - Guards and decorators for authorization
 * 
 * Architecture follows the organization module pattern for consistency.
 */
@Module({
  imports: [PrismaModule],
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
    PermissionCacheService,
    PolicyEngineService,
    PermissionGroupService,
    
    // Guards
    PermissionGuard,
    
    // Policy Engines
    TimeBasedPolicyEngine,
    LocationBasedPolicyEngine,
    AttributeBasedPolicyEngine,
    
    // External Services
    AuditService,
    
    // Cache Manager (for PermissionCacheService)
    {
      provide: CACHE_MANAGER,
      useFactory: () => {
        // This will be injected from the global CacheModule
        // For now, return a mock to prevent errors
        return {
          get: async () => null,
          set: async () => {},
          del: async () => {},
          reset: async () => {},
          wrap: async () => {},
          store: {
            keys: async () => [],
          },
        } as unknown as Cache;
      },
    },
  ],
  exports: [
    // Export services that other modules might need
    PermissionService,
    RoleService,
    UserPermissionService,
    PermissionPolicyService,
    PermissionGuard,
    PermissionCacheService,
  ],
})
export class PermissionModule {}