import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { RedisPermissionCacheService } from '../../../cache/services/redis-permission-cache.service';
import { PermissionMatrixService } from '../services/permission-matrix.service';
import { JsonSchemaValidatorService } from '../services/json-schema-validator.service';
import { PermissionMetricsService } from '../services/permission-metrics.service';
import { CircuitBreakerService } from '../services/circuit-breaker.service';

/**
 * Factory functions for creating mock services used in permission module tests
 */

/**
 * Creates a mock PrismaService with commonly used methods
 */
export function createMockPrismaService() {
  return {
    permission: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    userPermission: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    rolePermission: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    userRole: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    resourcePermission: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    permissionDependency: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    permissionCheckLog: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    permissionCache: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    roleHierarchy: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(async (fn) => {
      // By default, execute the transaction function with the mock prisma service
      if (typeof fn === 'function') {
        return fn(createMockPrismaService());
      }
      // For array of operations
      return Promise.all(fn);
    }),
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $executeRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  };
}

/**
 * Creates a mock AuditService
 */
export function createMockAuditService() {
  return {
    log: jest.fn().mockResolvedValue(undefined),
    logBatch: jest.fn().mockResolvedValue(undefined),
    getAuditLogs: jest.fn().mockResolvedValue([]),
  };
}

/**
 * Creates a mock RedisPermissionCacheService
 */
export function createMockCacheService() {
  return {
    getCachedPermissionCheck: jest.fn().mockResolvedValue(null),
    cachePermissionCheck: jest.fn().mockResolvedValue(undefined),
    invalidateUserCache: jest.fn().mockResolvedValue(undefined),
    invalidateRoleCache: jest.fn().mockResolvedValue(undefined),
    invalidateAllCaches: jest.fn().mockResolvedValue(undefined),
    getCacheStats: jest.fn().mockResolvedValue({
      hits: 0,
      misses: 0,
      hitRate: 0,
    }),
  };
}

/**
 * Creates a mock PermissionMatrixService
 */
export function createMockMatrixService() {
  return {
    trackUserActivity: jest.fn().mockResolvedValue(undefined),
    getFromMatrix: jest.fn().mockResolvedValue(null),
    invalidateUserMatrix: jest.fn().mockResolvedValue(undefined),
    computeUserMatrix: jest.fn().mockResolvedValue(undefined),
    getMatrixStats: jest.fn().mockResolvedValue({
      totalUsers: 0,
      activeUsers: 0,
      matrixSize: 0,
    }),
  };
}

/**
 * Creates a mock JsonSchemaValidatorService
 */
export function createMockValidatorService() {
  return {
    validateAndSanitizeConditions: jest.fn((conditions) => conditions),
    validatePermissionConditions: jest.fn().mockResolvedValue(true),
    validateRoleConditions: jest.fn().mockResolvedValue(true),
    getSchema: jest.fn().mockResolvedValue({}),
  };
}

/**
 * Creates a mock PermissionMetricsService
 */
export function createMockMetricsService() {
  return {
    updateActiveChecks: jest.fn(),
    recordPermissionCheck: jest.fn(),
    recordCacheHit: jest.fn(),
    recordCacheMiss: jest.fn(),
    recordCheckDuration: jest.fn(),
    recordDbQueryDuration: jest.fn(),
    recordBatchCheck: jest.fn(),
    recordCacheInvalidation: jest.fn(),
    recordDbError: jest.fn(),
    getMetrics: jest.fn().mockResolvedValue({
      totalChecks: 0,
      cacheHitRate: 0,
      avgCheckDuration: 0,
    }),
  };
}

/**
 * Creates a mock CircuitBreakerService
 */
export function createMockCircuitBreaker() {
  return {
    executeWithBreaker: jest.fn().mockImplementation(async (_, fn, fallback) => {
      try {
        return await fn();
      } catch (error) {
        if (fallback) {
          return await fallback();
        }
        throw error;
      }
    }),
    getCircuitState: jest.fn().mockReturnValue('CLOSED'),
    resetCircuit: jest.fn(),
  };
}

/**
 * Creates a complete set of mocked services for permission module testing
 */
export function createPermissionTestingModule(
  customProviders?: any[],
): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      {
        provide: PrismaService,
        useValue: createMockPrismaService(),
      },
      {
        provide: AuditService,
        useValue: createMockAuditService(),
      },
      {
        provide: RedisPermissionCacheService,
        useValue: createMockCacheService(),
      },
      {
        provide: PermissionMatrixService,
        useValue: createMockMatrixService(),
      },
      {
        provide: JsonSchemaValidatorService,
        useValue: createMockValidatorService(),
      },
      {
        provide: PermissionMetricsService,
        useValue: createMockMetricsService(),
      },
      {
        provide: CircuitBreakerService,
        useValue: createMockCircuitBreaker(),
      },
      ...(customProviders || []),
    ],
  }).compile();
}

/**
 * Helper to setup common test scenarios
 */
export class PermissionTestScenario {
  constructor(
    private prisma: ReturnType<typeof createMockPrismaService>,
    private cache: ReturnType<typeof createMockCacheService>,
    private matrix: ReturnType<typeof createMockMatrixService>,
  ) {}

  /**
   * Setup a scenario where permission check hits cache
   */
  setupCacheHit(userId: string, resource: string, isAllowed: boolean) {
    this.cache.getCachedPermissionCheck.mockResolvedValueOnce({
      isAllowed,
    });
  }

  /**
   * Setup a scenario where permission check hits matrix
   */
  setupMatrixHit(userId: string, resource: string, isAllowed: boolean, grantedBy: string[]) {
    this.matrix.getFromMatrix.mockResolvedValueOnce({
      isAllowed,
      grantedBy,
    });
  }

  /**
   * Setup a scenario with direct user permission
   */
  setupDirectPermission(
    userId: string,
    permissionId: string,
    isGranted: boolean,
  ) {
    this.prisma.permission.findFirst.mockResolvedValueOnce({
      id: permissionId,
      resource: 'test',
      action: 'READ',
    });

    this.prisma.userPermission.findFirst.mockResolvedValueOnce({
      id: 'up-123',
      userProfileId: userId,
      permissionId,
      isGranted,
    });
  }

  /**
   * Setup a scenario with role-based permission
   */
  setupRolePermission(
    userId: string,
    roleId: string,
    roleName: string,
    permissionId: string,
  ) {
    this.prisma.permission.findFirst.mockResolvedValueOnce({
      id: permissionId,
      resource: 'test',
      action: 'READ',
    });

    this.prisma.userPermission.findFirst.mockResolvedValueOnce(null);

    this.prisma.userRole.findMany.mockResolvedValueOnce([
      {
        id: 'ur-123',
        userProfileId: userId,
        roleId,
        role: {
          id: roleId,
          name: roleName,
          rolePermissions: [
            {
              id: 'rp-123',
              roleId,
              permissionId,
              isGranted: true,
            },
          ],
        },
      },
    ]);
  }

  /**
   * Reset all mocks
   */
  reset() {
    jest.clearAllMocks();
  }
}