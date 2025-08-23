import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PermissionAction, PermissionScope } from '@prisma/client';
import type {
  EffectivePermissionDto,
  UserPermissionSummaryDto,
} from '../../modules/permission/dto/user-permission/effective-permissions.dto';

interface RedisClient {
  scan: (cursor: string, ...args: string[]) => Promise<[string, string[]]>;
  del: (...keys: string[]) => Promise<number>;
  pipeline: () => RedisPipeline;
  eval: (script: string, numKeys: number, ...args: any[]) => Promise<unknown>;
}

interface RedisPipeline {
  set: (
    key: string,
    value: string,
    mode?: string,
    duration?: number,
  ) => RedisPipeline;
  get: (key: string) => RedisPipeline;
  exec: () => Promise<Array<[Error | null, unknown]>>;
}

interface CacheStore {
  client?: RedisClient;
  redis?: RedisClient;
  _client?: RedisClient;
}

interface CacheWithStores {
  stores?: CacheStore[];
  [key: string]: any; // Allow other cache properties
}

interface PermissionCacheData {
  resource: string;
  action: PermissionAction;
  scope?: PermissionScope;
  resourceId?: string;
  isAllowed: boolean;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

interface CacheWarmingConfig {
  enabled: boolean;
  threshold: number; // Number of hits to consider user as frequently active
  warmupWindow: number; // Time window in seconds to track activity
  batchSize: number; // Number of permissions to warm up at once
}

@Injectable()
export class RedisPermissionCacheService {
  private readonly logger = new Logger(RedisPermissionCacheService.name);

  // Cache key prefixes
  private readonly CACHE_PREFIX = 'perm:';
  private readonly USER_CACHE_PREFIX = 'user:';
  private readonly ROLE_CACHE_PREFIX = 'role:';
  private readonly METRICS_PREFIX = 'metrics:';
  private readonly WARMUP_PREFIX = 'warmup:';

  // TTL configurations
  private readonly DEFAULT_TTL = 300; // 5 minutes
  private readonly CRITICAL_TTL = 60; // 1 minute for critical operations
  private readonly READ_TTL = 600; // 10 minutes for read operations
  private readonly WARMUP_TTL = 3600; // 1 hour for warmup data

  // Cache warming configuration
  private readonly warmingConfig: CacheWarmingConfig = {
    enabled: true,
    threshold: 10,
    warmupWindow: 3600, // 1 hour
    batchSize: 50,
  };

  // Metrics tracking
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
  };

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get Redis client for advanced operations
   */
  private getRedisClient(): RedisClient {
    // For cache-manager v7 with ioredis, we need to access the client differently
    const cacheWithStores = this.cacheManager as CacheWithStores;
    const stores = cacheWithStores.stores;

    if (!stores || stores.length === 0) {
      throw new Error('No cache stores configured');
    }

    // Get the first store (should be our Redis store)
    const store = stores[0];
    const client = store.client || store.redis || store._client;

    if (!client) {
      throw new Error('Redis client not available');
    }

    return client;
  }

  /**
   * Generate cache key for permission check
   */
  private getPermissionCacheKey(
    userId: string,
    resource: string,
    action: PermissionAction,
    scope?: PermissionScope,
    resourceId?: string,
  ): string {
    const parts = [
      userId,
      resource,
      action,
      scope || 'none',
      resourceId || 'all',
    ];
    return this.CACHE_PREFIX + parts.join(':');
  }

  /**
   * Generate cache key for user permissions summary
   */
  private getUserCacheKey(userId: string): string {
    return `${this.USER_CACHE_PREFIX}${userId}:summary`;
  }

  /**
   * Generate cache key for role permissions
   */
  private getRoleCacheKey(roleId: string): string {
    return `${this.ROLE_CACHE_PREFIX}${roleId}:permissions`;
  }

  /**
   * Generate cache key for user activity tracking (for warmup)
   */
  private getUserActivityKey(userId: string): string {
    return `${this.WARMUP_PREFIX}activity:${userId}`;
  }

  /**
   * Cache permission check result with improved metadata
   */
  async cachePermissionCheck(
    userId: string,
    resource: string,
    action: PermissionAction,
    scope: PermissionScope | undefined,
    resourceId: string | undefined,
    isAllowed: boolean,
    ttl?: number,
  ): Promise<void> {
    const key = this.getPermissionCacheKey(
      userId,
      resource,
      action,
      scope,
      resourceId,
    );

    const effectiveTtl = ttl || this.getTTLForPermission(resource, action);

    await this.cacheManager.set(
      key,
      {
        isAllowed,
        cachedAt: new Date().toISOString(),
        ttl: effectiveTtl,
        resource,
        action,
        scope,
        resourceId,
      },
      effectiveTtl,
    );

    this.metrics.sets++;

    // Track user activity for cache warming
    if (this.warmingConfig.enabled) {
      await this.trackUserActivity(userId);
    }
  }

  /**
   * Get cached permission check result with improved validation
   */
  async getCachedPermissionCheck(
    userId: string,
    resource: string,
    action: PermissionAction,
    scope?: PermissionScope,
    resourceId?: string,
  ): Promise<{ isAllowed: boolean } | null> {
    const key = this.getPermissionCacheKey(
      userId,
      resource,
      action,
      scope,
      resourceId,
    );

    const cached = await this.cacheManager.get<{
      isAllowed: boolean;
      cachedAt: string;
      ttl: number;
      resource: string;
      action: PermissionAction;
    }>(key);

    if (cached) {
      this.metrics.hits++;
      this.updateHitRate();
      return { isAllowed: cached.isAllowed };
    }

    this.metrics.misses++;
    this.updateHitRate();
    return null;
  }

  /**
   * Invalidate all caches for a user using Redis SCAN
   */
  async invalidateUserCache(userId: string): Promise<void> {
    const userKey = this.getUserCacheKey(userId);
    await this.cacheManager.del(userKey);

    // Use SCAN to find and delete all permission keys for this user
    const pattern = `${this.CACHE_PREFIX}${userId}:*`;
    await this.deleteByPatternWithScan(pattern);

    this.logger.debug(`Invalidated all caches for user ${userId}`);
  }

  /**
   * Invalidate all caches for a role with improved user tracking
   */
  async invalidateRoleCache(roleId: string): Promise<void> {
    const roleKey = this.getRoleCacheKey(roleId);
    await this.cacheManager.del(roleKey);

    // Track which users need cache invalidation
    const affectedUsers = await this.getUsersWithRole(roleId);

    // Invalidate cache for each affected user
    await Promise.all(
      affectedUsers.map((userId) => this.invalidateUserCache(userId)),
    );

    this.logger.debug(
      `Invalidated cache for role ${roleId} and ${affectedUsers.length} users`,
    );
  }

  /**
   * Delete cache entries by pattern using Redis SCAN command
   */
  private async deleteByPatternWithScan(pattern: string): Promise<void> {
    try {
      const client = this.getRedisClient();
      let cursor = '0';
      const keysToDelete: string[] = [];

      // Use SCAN to iterate through keys matching pattern
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          '100',
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          keysToDelete.push(...keys);
        }

        // Delete in batches to avoid memory issues
        if (keysToDelete.length >= 1000) {
          await client.del(...keysToDelete);
          this.metrics.deletes += keysToDelete.length;
          keysToDelete.length = 0;
        }
      } while (cursor !== '0');

      // Delete remaining keys
      if (keysToDelete.length > 0) {
        await client.del(...keysToDelete);
        this.metrics.deletes += keysToDelete.length;
      }
    } catch (error) {
      this.logger.error(`Failed to delete keys by pattern ${pattern}`, error);
      throw error;
    }
  }

  /**
   * Warm up cache for frequently active users
   */
  async warmupUserCache(
    userId: string,
    permissions?: PermissionCacheData[],
  ): Promise<void> {
    if (!this.warmingConfig.enabled) {
      return;
    }

    const activityCount = await this.getUserActivityCount(userId);

    if (activityCount >= this.warmingConfig.threshold) {
      this.logger.debug(
        `Warming up cache for frequently active user ${userId}`,
      );

      // If permissions are provided, cache them
      if (permissions && permissions.length > 0) {
        const pipeline = this.getRedisClient().pipeline();

        // Batch cache operations
        for (const perm of permissions.slice(0, this.warmingConfig.batchSize)) {
          const key = this.getPermissionCacheKey(
            userId,
            perm.resource,
            perm.action,
            perm.scope,
            perm.resourceId,
          );

          pipeline.set(
            key,
            JSON.stringify({
              isAllowed: perm.isAllowed,
              cachedAt: new Date().toISOString(),
              ttl: this.getTTLForPermission(perm.resource, perm.action),
              resource: perm.resource,
              action: perm.action,
              scope: perm.scope,
              resourceId: perm.resourceId,
            }),
            'EX',
            this.getTTLForPermission(perm.resource, perm.action),
          );
        }

        await pipeline.exec();
        this.metrics.sets += permissions.length;
      }
    }
  }

  /**
   * Track user activity for cache warming decisions
   */
  private async trackUserActivity(userId: string): Promise<void> {
    const key = this.getUserActivityKey(userId);
    const client = this.getRedisClient();

    // Use Redis INCR with expiration
    const script = `
      local key = KEYS[1]
      local ttl = ARGV[1]
      local count = redis.call('incr', key)
      if count == 1 then
        redis.call('expire', key, ttl)
      end
      return count
    `;

    await client.eval(script, 1, key, this.warmingConfig.warmupWindow);
  }

  /**
   * Get user activity count
   */
  private async getUserActivityCount(userId: string): Promise<number> {
    const key = this.getUserActivityKey(userId);
    const count = await this.cacheManager.get<string>(key);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Get users with a specific role
   */
  private async getUsersWithRole(roleId: string): Promise<string[]> {
    // Import PrismaService from the module context
    // This would typically be injected in the constructor
    // For now, we'll use the Redis client to track role-user associations

    // In production, this should query from the database:
    // const userRoles = await this.prisma.userRole.findMany({
    //   where: { roleId, isActive: true },
    //   select: { userProfileId: true }
    // });
    // return userRoles.map(ur => ur.userProfileId);

    // Temporary implementation using cache tracking
    const pattern = `${this.USER_CACHE_PREFIX}*:roles:${roleId}`;
    const client = this.getRedisClient();
    const users: string[] = [];

    let cursor = '0';
    do {
      const [nextCursor, keys] = await client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        '100',
      );
      cursor = nextCursor;

      // Extract user IDs from keys
      for (const key of keys) {
        const match = key.match(/user:([^:]+):/);
        if (match && match[1]) {
          users.push(match[1]);
        }
      }
    } while (cursor !== '0');

    return [...new Set(users)]; // Remove duplicates
  }

  /**
   * Get cache statistics with improved metrics
   */
  async getCacheStats(): Promise<{
    size: number;
    memoryUsage: string;
    hitRate: number;
    metrics: CacheMetrics;
  }> {
    try {
      const client = this.getRedisClient();

      // Count keys with our prefixes
      let totalKeys = 0;
      const prefixes = [
        this.CACHE_PREFIX,
        this.USER_CACHE_PREFIX,
        this.ROLE_CACHE_PREFIX,
      ];

      for (const prefix of prefixes) {
        let cursor = '0';
        do {
          const [nextCursor, keys] = await client.scan(
            cursor,
            'MATCH',
            `${prefix}*`,
            'COUNT',
            '100',
          );
          cursor = nextCursor;
          totalKeys += keys.length;
        } while (cursor !== '0');
      }

      // Get memory usage (this is a simplified version)
      const info = (await client.eval(
        'return redis.call("info", "memory")',
        0,
      )) as string;
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'Unknown';

      return {
        size: totalKeys,
        memoryUsage,
        hitRate: this.metrics.hitRate,
        metrics: { ...this.metrics },
      };
    } catch (error) {
      this.logger.error('Failed to get cache statistics', error);
      return {
        size: 0,
        memoryUsage: '0 MB',
        hitRate: 0,
        metrics: { ...this.metrics },
      };
    }
  }

  /**
   * Get custom TTL for specific permission types
   */
  private getTTLForPermission(
    resource: string,
    action: PermissionAction,
  ): number {
    // Critical permissions have shorter TTL
    if (
      (resource === 'user' ||
        resource === 'role' ||
        resource === 'permission') &&
      (action === PermissionAction.DELETE || action === PermissionAction.UPDATE)
    ) {
      return this.CRITICAL_TTL;
    }

    // Read operations can have longer TTL
    if (action === PermissionAction.READ) {
      return this.READ_TTL;
    }

    return this.DEFAULT_TTL;
  }

  /**
   * Update hit rate metric
   */
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    if (total > 0) {
      this.metrics.hitRate = (this.metrics.hits / total) * 100;
    }
  }

  /**
   * Reset metrics (for monitoring/reporting purposes)
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
    };
  }

  /**
   * Cache user permissions summary
   */
  async cacheUserPermissions(
    userId: string,
    summary: UserPermissionSummaryDto,
    ttl?: number,
  ): Promise<void> {
    const key = this.getUserCacheKey(userId);
    await this.cacheManager.set(key, summary, ttl || this.DEFAULT_TTL);
  }

  /**
   * Get cached user permissions summary
   */
  async getCachedUserPermissions(
    userId: string,
  ): Promise<UserPermissionSummaryDto | null> {
    const key = this.getUserCacheKey(userId);
    return (await this.cacheManager.get<UserPermissionSummaryDto>(key)) ?? null;
  }

  /**
   * Cache role permissions
   */
  async cacheRolePermissions(
    roleId: string,
    permissions: EffectivePermissionDto[],
    ttl?: number,
  ): Promise<void> {
    const key = this.getRoleCacheKey(roleId);
    await this.cacheManager.set(key, permissions, ttl || this.DEFAULT_TTL);
  }

  /**
   * Get cached role permissions
   */
  async getCachedRolePermissions(
    roleId: string,
  ): Promise<EffectivePermissionDto[] | null> {
    const key = this.getRoleCacheKey(roleId);
    return (await this.cacheManager.get<EffectivePermissionDto[]>(key)) ?? null;
  }

  /**
   * Batch check permissions (for performance optimization)
   */
  async batchCheckPermissions(
    checks: Array<{
      userId: string;
      resource: string;
      action: PermissionAction;
      scope?: PermissionScope;
      resourceId?: string;
    }>,
  ): Promise<Map<string, { isAllowed: boolean } | null>> {
    const results = new Map<string, { isAllowed: boolean } | null>();
    const keys: string[] = [];

    // Generate keys for all checks
    for (const check of checks) {
      const key = this.getPermissionCacheKey(
        check.userId,
        check.resource,
        check.action,
        check.scope,
        check.resourceId,
      );
      keys.push(key);
    }

    // Batch get from Redis
    const pipeline = this.getRedisClient().pipeline();
    for (const key of keys) {
      pipeline.get(key);
    }

    const values = await pipeline.exec();

    // Process results
    for (let i = 0; i < checks.length; i++) {
      const [error, value] = values[i];
      if (!error && value) {
        const cached = JSON.parse(value as string) as { isAllowed: boolean };
        results.set(keys[i], { isAllowed: cached.isAllowed });
        this.metrics.hits++;
      } else {
        results.set(keys[i], null);
        this.metrics.misses++;
      }
    }

    this.updateHitRate();
    return results;
  }
}
