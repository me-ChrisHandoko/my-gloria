import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from './permission.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { RedisPermissionCacheService } from '../../../cache/services/redis-permission-cache.service';
import { PermissionMatrixService } from './permission-matrix.service';
import { JsonSchemaValidatorService } from './json-schema-validator.service';
import { PermissionMetricsService } from './permission-metrics.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { PermissionException } from '../exceptions/permission.exception';
import { PermissionAction, PermissionScope, Permission, Prisma } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

// Mock implementations
const mockPrismaService = {
  permission: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  userPermission: {
    findFirst: jest.fn(),
  },
  userRole: {
    findMany: jest.fn(),
  },
  resourcePermission: {
    findFirst: jest.fn(),
  },
  permissionDependency: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  permissionCheckLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(async (fn) => fn(mockPrismaService)),
  $queryRaw: jest.fn(),
};

const mockAuditService = {
  log: jest.fn(),
};

const mockCacheService = {
  getCachedPermissionCheck: jest.fn(),
  cachePermissionCheck: jest.fn(),
  invalidateUserCache: jest.fn(),
  invalidateRoleCache: jest.fn(),
};

const mockMatrixService = {
  trackUserActivity: jest.fn(),
  getFromMatrix: jest.fn(),
  invalidateUserMatrix: jest.fn(),
};

const mockValidatorService = {
  validateAndSanitizeConditions: jest.fn(),
};

const mockMetricsService = {
  updateActiveChecks: jest.fn(),
  recordPermissionCheck: jest.fn(),
  recordCacheHit: jest.fn(),
  recordCacheMiss: jest.fn(),
  recordCheckDuration: jest.fn(),
  recordDbQueryDuration: jest.fn(),
  recordBatchCheck: jest.fn(),
  recordCacheInvalidation: jest.fn(),
  recordDbError: jest.fn(),
};

const mockCircuitBreaker = {
  executeWithBreaker: jest.fn(),
};

describe('PermissionService', () => {
  let service: PermissionService;
  let prisma: typeof mockPrismaService;
  let auditService: typeof mockAuditService;
  let cacheService: typeof mockCacheService;
  let matrixService: typeof mockMatrixService;
  let validatorService: typeof mockValidatorService;
  let metricsService: typeof mockMetricsService;
  let circuitBreaker: typeof mockCircuitBreaker;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: RedisPermissionCacheService, useValue: mockCacheService },
        { provide: PermissionMatrixService, useValue: mockMatrixService },
        { provide: JsonSchemaValidatorService, useValue: mockValidatorService },
        { provide: PermissionMetricsService, useValue: mockMetricsService },
        { provide: CircuitBreakerService, useValue: mockCircuitBreaker },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    prisma = module.get(PrismaService);
    auditService = module.get(AuditService);
    cacheService = module.get(RedisPermissionCacheService);
    matrixService = module.get(PermissionMatrixService);
    validatorService = module.get(JsonSchemaValidatorService);
    metricsService = module.get(PermissionMetricsService);
    circuitBreaker = module.get(CircuitBreakerService);

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default circuit breaker behavior
    circuitBreaker.executeWithBreaker.mockImplementation(async (_, fn) => fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('create', () => {
    const mockCreateDto = {
      code: 'user.create',
      name: 'Create User',
      description: 'Permission to create users',
      resource: 'user',
      action: PermissionAction.CREATE,
      scope: PermissionScope.OWN,
      conditions: { department: 'IT' },
      dependencies: ['perm-1', 'perm-2'],
    };

    const mockUserId = 'user-123';

    it('should create a new permission successfully', async () => {
      const mockId = uuidv7();
      const mockCreatedPermission = {
        id: mockId,
        ...mockCreateDto,
        dependencies: undefined,
        createdBy: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.permission.findUnique.mockResolvedValue(null);
      prisma.permission.findFirst.mockResolvedValue(null);
      prisma.permission.create.mockResolvedValue(mockCreatedPermission);
      validatorService.validateAndSanitizeConditions.mockReturnValue(mockCreateDto.conditions);

      const result = await service.create(mockCreateDto, mockUserId);

      expect(result).toEqual(mockCreatedPermission);
      expect(prisma.permission.findUnique).toHaveBeenCalledWith({
        where: { code: mockCreateDto.code },
      });
      expect(validatorService.validateAndSanitizeConditions).toHaveBeenCalledWith(
        mockCreateDto.conditions,
        'permission',
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: mockUserId,
          action: 'CREATE',
          module: 'permission',
          entityType: 'Permission',
        }),
      );
    });

    it('should throw error if permission code already exists', async () => {
      prisma.permission.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(service.create(mockCreateDto, mockUserId)).rejects.toThrow(
        PermissionException.alreadyExists(mockCreateDto.code),
      );
    });

    it('should throw error if resource-action-scope combination exists', async () => {
      prisma.permission.findUnique.mockResolvedValue(null);
      prisma.permission.findFirst.mockResolvedValue({ id: 'existing-id' });

      await expect(service.create(mockCreateDto, mockUserId)).rejects.toThrow(
        PermissionException.combinationExists(
          mockCreateDto.resource,
          mockCreateDto.action,
          mockCreateDto.scope,
        ),
      );
    });

    it('should create permission dependencies when provided', async () => {
      const mockId = uuidv7();
      const mockCreatedPermission = {
        id: mockId,
        ...mockCreateDto,
        dependencies: undefined,
        createdBy: mockUserId,
      };

      prisma.permission.findUnique.mockResolvedValue(null);
      prisma.permission.findFirst.mockResolvedValue(null);
      prisma.permission.create.mockResolvedValue(mockCreatedPermission);
      validatorService.validateAndSanitizeConditions.mockReturnValue(mockCreateDto.conditions);

      await service.create(mockCreateDto, mockUserId);

      expect(prisma.permissionDependency.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            permissionId: mockId,
            dependsOnId: 'perm-1',
            isRequired: true,
          }),
          expect.objectContaining({
            permissionId: mockId,
            dependsOnId: 'perm-2',
            isRequired: true,
          }),
        ]),
      });
    });
  });

  describe('findAll', () => {
    it('should return all permissions without filters', async () => {
      const mockPermissions = [
        { id: '1', code: 'perm1' },
        { id: '2', code: 'perm2' },
      ];
      prisma.permission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.findAll();

      expect(result).toEqual(mockPermissions);
      expect(prisma.permission.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it('should apply filters correctly', async () => {
      const filters = {
        resource: 'user',
        action: PermissionAction.CREATE,
        scope: PermissionScope.OWN,
        groupId: 'group-123',
        isActive: true,
      };

      await service.findAll(filters);

      expect(prisma.permission.findMany).toHaveBeenCalledWith({
        where: filters,
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });
  });

  describe('findOne', () => {
    const mockId = 'perm-123';

    it('should return a permission by id', async () => {
      const mockPermission = {
        id: mockId,
        code: 'user.create',
      };
      prisma.permission.findUnique.mockResolvedValue(mockPermission);

      const result = await service.findOne(mockId);

      expect(result).toEqual(mockPermission);
      expect(prisma.permission.findUnique).toHaveBeenCalledWith({
        where: { id: mockId },
        include: expect.any(Object),
      });
    });

    it('should throw error if permission not found', async () => {
      prisma.permission.findUnique.mockResolvedValue(null);

      await expect(service.findOne(mockId)).rejects.toThrow(
        PermissionException.notFound(mockId),
      );
    });
  });

  describe('findByCode', () => {
    const mockCode = 'user.create';

    it('should return a permission by code', async () => {
      const mockPermission = {
        id: 'perm-123',
        code: mockCode,
      };
      prisma.permission.findUnique.mockResolvedValue(mockPermission);

      const result = await service.findByCode(mockCode);

      expect(result).toEqual(mockPermission);
      expect(prisma.permission.findUnique).toHaveBeenCalledWith({
        where: { code: mockCode },
        include: expect.any(Object),
      });
    });

    it('should throw error if permission code not found', async () => {
      prisma.permission.findUnique.mockResolvedValue(null);

      await expect(service.findByCode(mockCode)).rejects.toThrow(
        PermissionException.codeNotFound(mockCode),
      );
    });
  });

  describe('update', () => {
    const mockId = 'perm-123';
    const mockUpdateDto = {
      name: 'Updated Permission',
      description: 'Updated description',
      conditions: { department: 'HR' },
    };
    const mockUserId = 'user-123';

    it('should update a permission successfully', async () => {
      const existingPermission = {
        id: mockId,
        code: 'user.create',
        isSystemPermission: false,
      };
      const updatedPermission = {
        ...existingPermission,
        ...mockUpdateDto,
      };

      // Mock findOne to return existing permission
      prisma.permission.findUnique.mockResolvedValueOnce(existingPermission);
      prisma.permission.update.mockResolvedValue(updatedPermission);
      validatorService.validateAndSanitizeConditions.mockReturnValue(mockUpdateDto.conditions);
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.update(mockId, mockUpdateDto, mockUserId);

      expect(result).toEqual(updatedPermission);
      expect(validatorService.validateAndSanitizeConditions).toHaveBeenCalledWith(
        mockUpdateDto.conditions,
        'permission',
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: mockUserId,
          action: 'UPDATE',
          module: 'permission',
          entityType: 'Permission',
        }),
      );
    });

    it('should throw error if updating system permission', async () => {
      const systemPermission = {
        id: mockId,
        code: 'system.admin',
        isSystemPermission: true,
      };
      prisma.permission.findUnique.mockResolvedValueOnce(systemPermission);

      await expect(service.update(mockId, mockUpdateDto, mockUserId)).rejects.toThrow(
        PermissionException.systemPermissionImmutable(),
      );
    });

    it('should throw error if updating to existing code', async () => {
      const existingPermission = {
        id: mockId,
        code: 'user.create',
        isSystemPermission: false,
      };
      const updateWithNewCode = {
        ...mockUpdateDto,
        code: 'user.update',
      };
      const conflictingPermission = {
        id: 'other-id',
        code: 'user.update',
      };

      prisma.permission.findUnique
        .mockResolvedValueOnce(existingPermission)
        .mockResolvedValueOnce(conflictingPermission);

      await expect(service.update(mockId, updateWithNewCode, mockUserId)).rejects.toThrow(
        PermissionException.alreadyExists(updateWithNewCode.code),
      );
    });

    it('should handle permission dependencies update', async () => {
      const existingPermission = {
        id: mockId,
        code: 'user.create',
        isSystemPermission: false,
      };
      const updateWithDependencies = {
        ...mockUpdateDto,
        dependencies: ['dep-1', 'dep-2'],
      };

      prisma.permission.findUnique.mockResolvedValueOnce(existingPermission);
      prisma.permission.update.mockResolvedValue(existingPermission);
      validatorService.validateAndSanitizeConditions.mockReturnValue(mockUpdateDto.conditions);
      prisma.$queryRaw.mockResolvedValue([]);

      await service.update(mockId, updateWithDependencies, mockUserId);

      expect(prisma.permissionDependency.deleteMany).toHaveBeenCalledWith({
        where: { permissionId: mockId },
      });
      expect(prisma.permissionDependency.createMany).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const mockId = 'perm-123';
    const mockUserId = 'user-123';

    it('should delete a permission successfully', async () => {
      const mockPermission = {
        id: mockId,
        code: 'user.create',
        isSystemPermission: false,
      };
      prisma.permission.findUnique.mockResolvedValueOnce(mockPermission);
      prisma.$queryRaw.mockResolvedValue([]);

      await service.remove(mockId, mockUserId);

      expect(prisma.permission.delete).toHaveBeenCalledWith({
        where: { id: mockId },
      });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: mockUserId,
          action: 'DELETE',
          module: 'permission',
          entityType: 'Permission',
        }),
      );
    });

    it('should throw error if deleting system permission', async () => {
      const systemPermission = {
        id: mockId,
        code: 'system.admin',
        isSystemPermission: true,
      };
      prisma.permission.findUnique.mockResolvedValueOnce(systemPermission);

      await expect(service.remove(mockId, mockUserId)).rejects.toThrow(
        PermissionException.systemPermissionDeleteForbidden(),
      );
    });
  });

  describe('checkPermission', () => {
    const mockCheckDto = {
      userId: 'user-123',
      resource: 'user',
      action: PermissionAction.CREATE,
      scope: PermissionScope.OWN,
    };

    beforeEach(() => {
      // Mock circuit breaker to execute functions immediately
      circuitBreaker.executeWithBreaker.mockImplementation(async (_, fn, fallback) => {
        try {
          return await fn();
        } catch (error) {
          if (fallback) {
            return await fallback();
          }
          throw error;
        }
      });
      
      // Mock permissionCheckLog.create to avoid errors
      prisma.permissionCheckLog.create.mockResolvedValue({});
    });

    it('should allow permission from matrix cache', async () => {
      const matrixEntry = {
        isAllowed: true,
        grantedBy: ['matrix-cache'],
      };
      matrixService.getFromMatrix.mockResolvedValue(matrixEntry);

      const result = await service.checkPermission(mockCheckDto);

      expect(result.isAllowed).toBe(true);
      expect(result.grantedBy).toContain('matrix-cache');
      expect(metricsService.recordCacheHit).toHaveBeenCalledWith('matrix');
    });

    it('should allow permission from Redis cache', async () => {
      matrixService.getFromMatrix.mockResolvedValue(null);
      cacheService.getCachedPermissionCheck.mockResolvedValue({ isAllowed: true });

      const result = await service.checkPermission(mockCheckDto);

      expect(result.isAllowed).toBe(true);
      expect(metricsService.recordCacheHit).toHaveBeenCalledWith('redis');
    });

    it('should check database permissions when cache misses', async () => {
      matrixService.getFromMatrix.mockResolvedValue(null);
      cacheService.getCachedPermissionCheck.mockResolvedValue(null);
      
      // Mock permission exists
      prisma.permission.findFirst.mockResolvedValue({
        id: 'perm-123',
        resource: 'user',
        action: PermissionAction.CREATE,
        scope: PermissionScope.OWN,
      });

      // Mock user has direct permission
      prisma.userPermission.findFirst.mockResolvedValue({
        id: 'up-123',
        isGranted: true,
      });
      
      // Mock no role permissions needed for this test
      prisma.userRole.findMany.mockResolvedValue([]);

      // Mock successful log creation
      prisma.permissionCheckLog.create.mockResolvedValue({});

      const result = await service.checkPermission(mockCheckDto);

      expect(result.isAllowed).toBe(true);
      expect(result.grantedBy).toContain('direct-user-permission');
      expect(cacheService.cachePermissionCheck).toHaveBeenCalled();
    });

    it('should check role-based permissions', async () => {
      matrixService.getFromMatrix.mockResolvedValue(null);
      cacheService.getCachedPermissionCheck.mockResolvedValue(null);
      
      // Mock permission exists
      prisma.permission.findFirst.mockResolvedValue({
        id: 'perm-123',
        resource: 'user',
        action: PermissionAction.CREATE,
      });

      // No direct user permission
      prisma.userPermission.findFirst.mockResolvedValue(null);

      // Mock user has role with permission
      prisma.userRole.findMany.mockResolvedValue([
        {
          id: 'ur-123',
          role: {
            id: 'role-123',
            name: 'Admin',
            rolePermissions: [
              {
                id: 'rp-123',
                isGranted: true,
              },
            ],
          },
        },
      ]);

      const result = await service.checkPermission(mockCheckDto);

      expect(result.isAllowed).toBe(true);
      expect(result.grantedBy).toContain('Admin');
    });

    it('should deny permission when explicitly denied by user permission', async () => {
      matrixService.getFromMatrix.mockResolvedValue(null);
      cacheService.getCachedPermissionCheck.mockResolvedValue(null);
      
      // Mock permission exists
      prisma.permission.findFirst.mockResolvedValue({
        id: 'perm-123',
        resource: 'user',
        action: PermissionAction.CREATE,
      });

      // Mock user has explicit deny
      prisma.userPermission.findFirst.mockResolvedValue({
        id: 'up-123',
        isGranted: false,
      });

      const result = await service.checkPermission(mockCheckDto);

      expect(result.isAllowed).toBe(false);
      expect(result.reason).toBe('Explicitly denied by user permission');
    });

    it('should handle permission check timeout', async () => {
      // Mock a slow database operation
      matrixService.getFromMatrix.mockResolvedValue(null);
      cacheService.getCachedPermissionCheck.mockResolvedValue(null);
      
      // Create a promise that never resolves to simulate timeout
      prisma.permission.findFirst.mockImplementation(() => 
        new Promise(() => {})  // Never resolves
      );

      // Override service timeout for faster test
      (service as any).checkTimeoutMs = 100;

      const checkPromise = service.checkPermission(mockCheckDto);
      
      // Fast-forward timers to trigger timeout
      jest.advanceTimersByTime(100);
      
      await expect(checkPromise).rejects.toThrow(
        PermissionException.timeout(
          mockCheckDto.userId,
          mockCheckDto.resource,
          mockCheckDto.action,
          100,
        ),
      );
    });

    it('should check resource-specific permissions', async () => {
      const checkWithResource = {
        ...mockCheckDto,
        resourceId: 'resource-123',
      };

      matrixService.getFromMatrix.mockResolvedValue(null);
      cacheService.getCachedPermissionCheck.mockResolvedValue(null);
      
      // Mock permission exists
      prisma.permission.findFirst.mockResolvedValue({
        id: 'perm-123',
        resource: 'user',
        action: PermissionAction.CREATE,
      });

      // Mock resource-specific permission
      prisma.resourcePermission.findFirst.mockResolvedValue({
        id: 'rp-123',
        isGranted: true,
      });

      // Mock no direct user permission
      prisma.userPermission.findFirst.mockResolvedValue(null);
      
      // Mock no role permissions
      prisma.userRole.findMany.mockResolvedValue([]);
      
      // Mock successful log creation
      prisma.permissionCheckLog.create.mockResolvedValue({});

      const result = await service.checkPermission(checkWithResource);

      expect(result.isAllowed).toBe(true);
      expect(result.grantedBy).toContain('resource-specific');
    });

    it('should log permission check results', async () => {
      matrixService.getFromMatrix.mockResolvedValue(null);
      cacheService.getCachedPermissionCheck.mockResolvedValue(null);
      prisma.permission.findFirst.mockResolvedValue(null);

      await service.checkPermission(mockCheckDto);

      expect(prisma.permissionCheckLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userProfileId: mockCheckDto.userId,
          resource: mockCheckDto.resource,
          action: mockCheckDto.action.toString(),
          isAllowed: false,
        }),
      });
    });
  });

  describe('batchCheckPermissions', () => {
    const mockBatchDto = {
      userId: 'user-123',
      permissions: [
        {
          resource: 'user',
          action: PermissionAction.CREATE,
          scope: PermissionScope.OWN,
        },
        {
          resource: 'role',
          action: PermissionAction.UPDATE,
          scope: PermissionScope.ALL,
        },
      ],
    };

    it('should check multiple permissions in batch', async () => {
      const mockPermissions = [
        {
          id: 'perm-1',
          resource: 'user',
          action: PermissionAction.CREATE,
          scope: PermissionScope.OWN,
          userPermissions: [{ isGranted: true }],
          rolePermissions: [],
        },
        {
          id: 'perm-2',
          resource: 'role',
          action: PermissionAction.UPDATE,
          scope: PermissionScope.ALL,
          userPermissions: [],
          rolePermissions: [],
        },
      ];

      prisma.permission.findMany.mockResolvedValue(mockPermissions);
      matrixService.getFromMatrix.mockResolvedValue(null);
      cacheService.getCachedPermissionCheck.mockResolvedValue(null);

      const result = await service.batchCheckPermissions(mockBatchDto);

      expect(result.totalChecked).toBe(2);
      expect(result.totalAllowed).toBe(1);
      expect(result.results['user:CREATE:OWN'].isAllowed).toBe(true);
      expect(result.results['role:UPDATE:ALL'].isAllowed).toBe(false);
    });

    it('should use cache for batch checks', async () => {
      // First permission from matrix
      matrixService.getFromMatrix
        .mockResolvedValueOnce({ isAllowed: true, grantedBy: ['matrix'] })
        .mockResolvedValueOnce(null);

      // Second permission from cache
      cacheService.getCachedPermissionCheck
        .mockResolvedValueOnce({ isAllowed: false });

      prisma.permission.findMany.mockResolvedValue([]);

      const result = await service.batchCheckPermissions(mockBatchDto);

      expect(result.cacheHits).toBe(2);
    });

    it('should throw error if batch size exceeds limit', async () => {
      const largeBatch = {
        userId: 'user-123',
        permissions: Array(101).fill({
          resource: 'user',
          action: PermissionAction.CREATE,
        }),
      };

      await expect(service.batchCheckPermissions(largeBatch)).rejects.toThrow(
        'Batch size exceeds maximum limit of 100',
      );
    });
  });

  describe('invalidatePermissionCache', () => {
    const mockPermissionId = 'perm-123';

    it('should invalidate cache for affected users and roles', async () => {
      const affectedUsers = [
        { userProfileId: 'user-1' },
        { userProfileId: 'user-2' },
      ];
      const affectedRoles = [
        { roleId: 'role-1' },
        { roleId: 'role-2' },
      ];

      prisma.$queryRaw
        .mockResolvedValueOnce(affectedUsers)
        .mockResolvedValueOnce(affectedRoles);

      await (service as any).invalidatePermissionCache(mockPermissionId);

      expect(cacheService.invalidateUserCache).toHaveBeenCalledTimes(2);
      expect(matrixService.invalidateUserMatrix).toHaveBeenCalledTimes(2);
      expect(cacheService.invalidateRoleCache).toHaveBeenCalledTimes(2);
      expect(metricsService.recordCacheInvalidation).toHaveBeenCalledWith(
        'permission_update',
        2,
      );
      expect(metricsService.recordCacheInvalidation).toHaveBeenCalledWith(
        'role_update',
        2,
      );
    });

    it('should handle circuit breaker failure', async () => {
      circuitBreaker.executeWithBreaker.mockImplementation(async (_, fn, fallback) => {
        if (fallback) {
          return await fallback();
        }
        throw new Error('Circuit breaker open');
      });

      await expect((service as any).invalidatePermissionCache(mockPermissionId))
        .rejects.toThrow(PermissionException.cacheError('invalidation', 'Circuit breaker open'));
    });
  });
});