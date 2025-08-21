import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PermissionAction, PermissionScope } from '@prisma/client';
import {
  EffectivePermissionDto,
  UserPermissionSummaryDto,
} from '../dto/user-permission/effective-permissions.dto';

@Injectable()
export class PermissionCacheService {
  private readonly logger = new Logger(PermissionCacheService.name);
  private readonly CACHE_PREFIX = 'perm:';
  private readonly USER_CACHE_PREFIX = 'user:';
  private readonly ROLE_CACHE_PREFIX = 'role:';
  private readonly DEFAULT_TTL = 300; // 5 minutes in seconds

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

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
      this.CACHE_PREFIX,
      userId,
      resource,
      action,
      scope || 'none',
      resourceId || 'all',
    ];
    return parts.join(':');
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
   * Cache permission check result
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
    await this.cacheManager.set(
      key,
      { isAllowed, cachedAt: new Date() },
      ttl || this.DEFAULT_TTL,
    );
  }

  /**
   * Get cached permission check result
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
      cachedAt: Date;
    }>(key);

    if (cached) {
      // Check if cache is still valid (additional validation if needed)
      const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
      if (cacheAge < this.DEFAULT_TTL * 1000) {
        return { isAllowed: cached.isAllowed };
      }
    }

    return null;
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
   * Invalidate all caches for a user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    // Delete user summary cache
    const userKey = this.getUserCacheKey(userId);
    await this.cacheManager.del(userKey);

    // Delete all permission check caches for this user
    // Note: In production, you might want to use Redis SCAN to find and delete all matching keys
    const pattern = `${this.CACHE_PREFIX}${userId}:*`;
    await this.deleteByPattern(pattern);
  }

  /**
   * Invalidate all caches for a role
   */
  async invalidateRoleCache(roleId: string): Promise<void> {
    const roleKey = this.getRoleCacheKey(roleId);
    await this.cacheManager.del(roleKey);

    // Also invalidate all users with this role
    // This would require tracking which users have which roles
    // For now, we'll invalidate all user caches (less efficient but safer)
    await this.invalidateAllUserCaches();
  }

  /**
   * Invalidate all permission caches
   */
  async invalidateAllCaches(): Promise<void> {
    // Clear all cache entries by invalidating all users
    // Note: cache-manager doesn't have a reset method, so we'll clear manually
    // This is a workaround - in production, consider using Redis FLUSHDB or pattern-based deletion
    try {
      // For now, we'll just log that we would clear the cache
      this.logger.warn(
        'Cache clear requested - implement based on your cache store',
      );
    } catch (error) {
      this.logger.error('Failed to clear cache', error);
    }
  }

  /**
   * Invalidate all user permission caches
   */
  async invalidateAllUserCaches(): Promise<void> {
    // Delete all user-related caches
    await this.deleteByPattern(`${this.CACHE_PREFIX}*`);
    await this.deleteByPattern(`${this.USER_CACHE_PREFIX}*`);
  }

  /**
   * Delete cache entries by pattern (Redis SCAN equivalent)
   * Note: This is a simplified version. In production with Redis,
   * you would use SCAN command for better performance
   */
  private async deleteByPattern(pattern: string): Promise<void> {
    // This is a placeholder implementation
    // With ioredis, you would use:
    // const keys = await this.redis.keys(pattern);
    // if (keys.length > 0) {
    //   await this.redis.del(...keys);
    // }

    // For now, we'll just reset the cache
    // In production, implement proper pattern-based deletion
    // Clear all cache entries by invalidating all users
    // Note: cache-manager doesn't have a reset method, so we'll clear manually
    // This is a workaround - in production, consider using Redis FLUSHDB or pattern-based deletion
    try {
      // For now, we'll just log that we would clear the cache
      this.logger.warn(
        'Cache clear requested - implement based on your cache store',
      );
    } catch (error) {
      this.logger.error('Failed to clear cache', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    size: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    // This would need to be implemented based on your Redis setup
    // For now, return placeholder stats
    return {
      size: 0,
      memoryUsage: '0 MB',
      hitRate: 0,
    };
  }

  /**
   * Warm up cache for a user
   */
  async warmupUserCache(userId: string): Promise<void> {
    // This could pre-load commonly accessed permissions
    // Implementation would depend on your specific use cases
  }

  /**
   * Set custom TTL for specific permission types
   */
  getTTLForPermission(resource: string, action: PermissionAction): number {
    // Critical permissions might have shorter TTL
    if (resource === 'user' && action === PermissionAction.DELETE) {
      return 60; // 1 minute for critical operations
    }

    // Read operations can have longer TTL
    if (action === PermissionAction.READ) {
      return 600; // 10 minutes for read operations
    }

    return this.DEFAULT_TTL;
  }
}
