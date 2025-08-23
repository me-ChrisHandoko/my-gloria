import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RedisPermissionCacheService } from './redis-permission-cache.service';
import { PermissionAction, PermissionScope } from '@prisma/client';
import {
  EffectivePermissionDto,
  UserPermissionSummaryDto,
} from '../../modules/permission/dto/user-permission/effective-permissions.dto';

describe('RedisPermissionCacheService', () => {
  let service: RedisPermissionCacheService;
  let mockCacheManager: any;
  let mockRedisClient: any;

  beforeEach(async () => {
    // Mock Redis client
    mockRedisClient = {
      scan: jest.fn(),
      del: jest.fn(),
      pipeline: jest.fn(),
      eval: jest.fn(),
    };

    // Mock cache manager
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      stores: [{
        client: mockRedisClient,
      }],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisPermissionCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<RedisPermissionCacheService>(RedisPermissionCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Permission Check Caching', () => {
    it('should cache permission check result', async () => {
      const userId = 'user-123';
      const resource = 'document';
      const action = PermissionAction.READ;
      const scope = PermissionScope.OWN;
      const resourceId = 'doc-456';
      const isAllowed = true;

      await service.cachePermissionCheck(
        userId,
        resource,
        action,
        scope,
        resourceId,
        isAllowed,
      );

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('perm:user-123:document:READ:OWN:doc-456'),
        expect.objectContaining({
          isAllowed: true,
          resource: 'document',
          action: PermissionAction.READ,
          scope: PermissionScope.OWN,
          resourceId: 'doc-456',
        }),
        600, // READ operation has 10 minute TTL
      );
    });

    it('should get cached permission check result', async () => {
      const cachedData = {
        isAllowed: true,
        cachedAt: new Date().toISOString(),
        ttl: 300,
        resource: 'document',
        action: PermissionAction.READ,
      };

      mockCacheManager.get.mockResolvedValue(cachedData);

      const result = await service.getCachedPermissionCheck(
        'user-123',
        'document',
        PermissionAction.READ,
        PermissionScope.OWN,
        'doc-456',
      );

      expect(result).toEqual({ isAllowed: true });
      expect(mockCacheManager.get).toHaveBeenCalledWith(
        'perm:user-123:document:READ:OWN:doc-456',
      );
    });

    it('should return null for cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.getCachedPermissionCheck(
        'user-123',
        'document',
        PermissionAction.READ,
      );

      expect(result).toBeNull();
    });

    it('should use critical TTL for DELETE operations', async () => {
      await service.cachePermissionCheck(
        'user-123',
        'user',
        PermissionAction.DELETE,
        undefined,
        undefined,
        true,
      );

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        60, // Critical TTL
      );
    });
  });

  describe('Pattern-based Deletion with SCAN', () => {
    it('should invalidate user cache using SCAN', async () => {
      const userId = 'user-123';
      const keys = [
        'perm:user-123:document:READ:OWN:doc-1',
        'perm:user-123:document:WRITE:OWN:doc-2',
        'perm:user-123:user:DELETE:ALL:all',
      ];

      mockRedisClient.scan
        .mockResolvedValueOnce(['100', keys.slice(0, 2)])
        .mockResolvedValueOnce(['0', [keys[2]]]);

      await service.invalidateUserCache(userId);

      expect(mockCacheManager.del).toHaveBeenCalledWith(
        'user:user-123:summary',
      );
      expect(mockRedisClient.scan).toHaveBeenCalledWith(
        '0',
        'MATCH', 'perm:user-123:*',
        'COUNT', '100',
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith(...keys);
    });

    it('should handle large number of keys in batches', async () => {
      const userId = 'user-123';
      const keys: string[] = [];
      
      // Generate 2500 keys
      for (let i = 0; i < 2500; i++) {
        keys.push(`perm:user-123:resource:READ:OWN:res-${i}`);
      }

      mockRedisClient.scan
        .mockResolvedValueOnce(['1000', keys.slice(0, 1000)])
        .mockResolvedValueOnce(['2000', keys.slice(1000, 2000)])
        .mockResolvedValueOnce(['0', keys.slice(2000)]);

      await service.invalidateUserCache(userId);

      // Should delete in batches of 1000
      expect(mockRedisClient.del).toHaveBeenCalledTimes(3);
      expect(mockRedisClient.del).toHaveBeenNthCalledWith(1, ...keys.slice(0, 1000));
      expect(mockRedisClient.del).toHaveBeenNthCalledWith(2, ...keys.slice(1000, 2000));
      expect(mockRedisClient.del).toHaveBeenNthCalledWith(3, ...keys.slice(2000));
    });
  });

  describe('Cache Warming', () => {
    it('should track user activity', async () => {
      const userId = 'user-123';
      
      mockRedisClient.eval.mockResolvedValue(1);

      await service.cachePermissionCheck(
        userId,
        'document',
        PermissionAction.READ,
        undefined,
        undefined,
        true,
      );

      expect(mockRedisClient.eval).toHaveBeenCalledWith(
        expect.stringContaining('incr'),
        1,
        `warmup:activity:${userId}`,
        3600, // warmup window
      );
    });

    it('should warm up cache for frequently active users', async () => {
      const userId = 'user-123';
      const permissions = [
        {
          resource: 'document',
          action: PermissionAction.READ,
          scope: PermissionScope.OWN,
          resourceId: 'doc-1',
          isAllowed: true,
        },
        {
          resource: 'user',
          action: PermissionAction.UPDATE,
          scope: PermissionScope.OWN,
          resourceId: 'user-1',
          isAllowed: true,
        },
      ];

      // Mock activity count above threshold
      mockCacheManager.get.mockResolvedValue('15');
      const mockPipeline = {
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);

      await service.warmupUserCache(userId, permissions);

      expect(mockRedisClient.pipeline).toHaveBeenCalled();
      expect(mockPipeline.set).toHaveBeenCalledTimes(2);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should not warm up cache for inactive users', async () => {
      const userId = 'user-123';
      const permissions = [{ resource: 'document', action: PermissionAction.READ, isAllowed: true }];

      // Mock activity count below threshold
      mockCacheManager.get.mockResolvedValue('5');

      await service.warmupUserCache(userId, permissions);

      expect(mockRedisClient.pipeline).not.toHaveBeenCalled();
    });
  });

  describe('Batch Operations', () => {
    it('should batch check permissions', async () => {
      const checks = [
        {
          userId: 'user-1',
          resource: 'document',
          action: PermissionAction.READ,
          scope: PermissionScope.OWN,
          resourceId: 'doc-1',
        },
        {
          userId: 'user-1',
          resource: 'document',
          action: PermissionAction.UPDATE,
          scope: PermissionScope.OWN,
          resourceId: 'doc-1',
        },
        {
          userId: 'user-2',
          resource: 'user',
          action: PermissionAction.UPDATE,
        },
      ];

      const mockPipeline = {
        get: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, JSON.stringify({ isAllowed: true })],
          [null, null], // Cache miss
          [null, JSON.stringify({ isAllowed: false })],
        ]),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);

      const results = await service.batchCheckPermissions(checks);

      expect(mockRedisClient.pipeline).toHaveBeenCalled();
      expect(mockPipeline.get).toHaveBeenCalledTimes(3);
      expect(results.size).toBe(3);
    });
  });

  describe('Cache Statistics', () => {
    it('should return cache statistics', async () => {
      mockRedisClient.scan.mockImplementation(() => Promise.resolve(['0', []]));
      mockRedisClient.eval.mockResolvedValue('used_memory_human:1.5M\r\n');

      const stats = await service.getCacheStats();

      expect(stats).toMatchObject({
        size: expect.any(Number),
        memoryUsage: expect.any(String),
        hitRate: expect.any(Number),
        metrics: expect.objectContaining({
          hits: expect.any(Number),
          misses: expect.any(Number),
          sets: expect.any(Number),
          deletes: expect.any(Number),
          hitRate: expect.any(Number),
        }),
      });
    });

    it('should calculate hit rate correctly', async () => {
      // Generate some hits and misses
      mockCacheManager.get
        .mockResolvedValueOnce({ isAllowed: true }) // hit
        .mockResolvedValueOnce({ isAllowed: false }) // hit
        .mockResolvedValueOnce(null) // miss
        .mockResolvedValueOnce(null) // miss
        .mockResolvedValueOnce({ isAllowed: true }); // hit

      // Make 5 cache checks
      for (let i = 0; i < 5; i++) {
        await service.getCachedPermissionCheck(
          'user-123',
          'document',
          PermissionAction.READ,
        );
      }

      const stats = await service.getCacheStats();
      expect(stats.metrics.hits).toBe(3);
      expect(stats.metrics.misses).toBe(2);
      expect(stats.metrics.hitRate).toBe(60); // 3/5 * 100
    });
  });

  describe('TTL Management', () => {
    it('should use different TTLs based on operation type', async () => {
      const testCases = [
        {
          resource: 'user',
          action: PermissionAction.DELETE,
          expectedTTL: 60, // Critical
        },
        {
          resource: 'document',
          action: PermissionAction.READ,
          expectedTTL: 600, // Read
        },
        {
          resource: 'document',
          action: PermissionAction.UPDATE,
          expectedTTL: 300, // Default
        },
      ];

      for (const testCase of testCases) {
        await service.cachePermissionCheck(
          'user-123',
          testCase.resource,
          testCase.action,
          undefined,
          undefined,
          true,
        );

        expect(mockCacheManager.set).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.any(Object),
          testCase.expectedTTL,
        );
      }
    });
  });

  describe('Role Cache Management', () => {
    it('should cache role permissions', async () => {
      const roleId = 'role-123';
      const permissions: EffectivePermissionDto[] = [
        {
          id: 'perm-1',
          code: 'document.read',
          name: 'Read Documents',
          resource: 'document',
          action: PermissionAction.READ,
          scope: PermissionScope.OWN,
          source: 'role',
          priority: 100,
          grantedBy: 'admin',
        },
      ];

      await service.cacheRolePermissions(roleId, permissions);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'role:role-123:permissions',
        permissions,
        300, // Default TTL
      );
    });

    it('should invalidate role cache and affected users', async () => {
      const roleId = 'role-123';
      const userKeys = [
        'user:user-1:roles:role-123',
        'user:user-2:roles:role-123',
      ];

      mockRedisClient.scan
        .mockResolvedValueOnce(['0', userKeys])
        .mockResolvedValue(['0', []]);

      await service.invalidateRoleCache(roleId);

      expect(mockCacheManager.del).toHaveBeenCalledWith(
        'role:role-123:permissions',
      );
      
      // Should invalidate cache for users with this role
      expect(mockRedisClient.scan).toHaveBeenCalled();
    });
  });

  describe('User Permission Summary', () => {
    it('should cache user permission summary', async () => {
      const userId = 'user-123';
      const summary: UserPermissionSummaryDto = {
        userProfileId: userId,
        userName: 'Test User',
        isSuperadmin: false,
        permissions: [],
        roles: [],
        statistics: {
          totalPermissions: 10,
          directPermissions: 5,
          rolePermissions: 5,
          inheritedPermissions: 0,
          deniedPermissions: 0,
        },
        generatedAt: new Date(),
      };

      await service.cacheUserPermissions(userId, summary);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'user:user-123:summary',
        summary,
        300,
      );
    });

    it('should get cached user permission summary', async () => {
      const summary: UserPermissionSummaryDto = {
        userProfileId: 'user-123',
        userName: 'Test User',
        isSuperadmin: false,
        permissions: [],
        roles: [],
        statistics: {
          totalPermissions: 10,
          directPermissions: 5,
          rolePermissions: 5,
          inheritedPermissions: 0,
          deniedPermissions: 0,
        },
        generatedAt: new Date(),
      };

      mockCacheManager.get.mockResolvedValue(summary);

      const result = await service.getCachedUserPermissions('user-123');

      expect(result).toEqual(summary);
      expect(mockCacheManager.get).toHaveBeenCalledWith('user:user-123:summary');
    });
  });
});