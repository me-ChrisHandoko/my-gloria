import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisPermissionCacheService } from '../../../cache/services/redis-permission-cache.service';
import { PermissionCheckResultDto } from '../dto/permission/check-permission.dto';
import { PolicyEngineV2Service } from './policy-engine-v2.service';
import { v7 as uuidv7 } from 'uuid';

/**
 * Read model service for permission queries
 * Optimized for read operations with caching and materialized views
 */
@Injectable()
export class PermissionReadModelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: RedisPermissionCacheService,
    private readonly policyEngine: PolicyEngineV2Service,
  ) {}

  /**
   * Check if a user has a specific permission
   * Optimized with caching and efficient queries
   */
  async checkPermission(
    userProfileId: string,
    resource: string,
    action: string,
    scope?: string,
    context?: Record<string, any>,
  ): Promise<PermissionCheckResultDto> {
    const startTime = Date.now();

    // Check cache first
    const cached = await this.cacheService.getCachedPermissionCheck(
      userProfileId,
      resource,
      action as any,
      scope as any,
    );
    if (cached !== null) {
      return {
        isAllowed: cached.isAllowed,
        checkDuration: Date.now() - startTime,
      };
    }

    // Get effective permissions using optimized query
    const effectivePermissions = await this.getEffectivePermissions(
      userProfileId,
    );

    // Check direct permission match
    const hasPermission = effectivePermissions.some(
      (p) =>
        p.resource === resource &&
        p.action === action &&
        (!scope || p.scope === scope || p.scope === 'ALL'),
    );

    // If direct permission found, cache and return
    if (hasPermission) {
      await this.cacheService.cachePermissionCheck(
        userProfileId,
        resource,
        action as any,
        scope as any,
        undefined, // resourceId
        true, // isAllowed
      );
      await this.logPermissionCheck(
        userProfileId,
        resource,
        action,
        true,
        Date.now() - startTime,
      );
      return {
        isAllowed: true,
        checkDuration: Date.now() - startTime,
      };
    }

    // Check policies if no direct permission
    const policyResults = await this.policyEngine.evaluatePolicies(
      userProfileId,
      context,
    );

    // Check if any policy grants the required permission
    let policyGranted = false;
    for (const [, result] of policyResults) {
      if (
        result.isApplicable &&
        result.grantedPermissions.some((code) => {
          const perm = effectivePermissions.find((p) => p.code === code);
          return (
            perm &&
            perm.resource === resource &&
            perm.action === action &&
            (!scope || perm.scope === scope || perm.scope === 'ALL')
          );
        })
      ) {
        policyGranted = true;
        break;
      }
    }

    // Cache the result
    await this.cacheService.cachePermissionCheck(
      userProfileId,
      resource,
      action as any,
      scope as any,
      undefined, // resourceId
      policyGranted, // isAllowed
    );
    await this.logPermissionCheck(
      userProfileId,
      resource,
      action,
      policyGranted,
      Date.now() - startTime,
    );

    return {
      isAllowed: policyGranted,
      checkDuration: Date.now() - startTime,
    };
  }

  /**
   * Get all effective permissions for a user
   * Uses materialized view for performance
   */
  async getEffectivePermissions(userProfileId: string) {
    // For now, skip cache and query directly
    // TODO: Implement proper permission caching strategy

    // Query using optimized view
    const permissions = await this.prisma.$queryRaw<
      Array<{
        id: string;
        code: string;
        resource: string;
        action: string;
        scope: string;
        source: string;
      }>
    >`
      WITH user_roles AS (
        SELECT role_id
        FROM gloria_ops.user_roles
        WHERE user_profile_id = ${userProfileId}
          AND is_active = true
      ),
      role_permissions AS (
        SELECT DISTINCT p.id, p.code, p.resource, p.action, p.scope, 'ROLE' as source
        FROM gloria_ops.permissions p
        INNER JOIN gloria_ops.role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id IN (SELECT role_id FROM user_roles)
      ),
      direct_permissions AS (
        SELECT DISTINCT p.id, p.code, p.resource, p.action, p.scope, 'DIRECT' as source
        FROM gloria_ops.permissions p
        INNER JOIN gloria_ops.user_permissions up ON p.id = up.permission_id
        WHERE up.user_profile_id = ${userProfileId}
          AND (up.valid_until IS NULL OR up.valid_until > NOW())
          AND up.valid_from <= NOW()
      )
      SELECT * FROM role_permissions
      UNION
      SELECT * FROM direct_permissions
    `;

    return permissions;
  }

  /**
   * Get user's permission matrix
   * Provides a complete view of permissions by resource and action
   */
  async getUserPermissionMatrix(userProfileId: string) {
    const permissions = await this.getEffectivePermissions(userProfileId);

    // Build matrix
    const matrix = new Map<string, Map<string, Set<string>>>();

    for (const perm of permissions) {
      if (!matrix.has(perm.resource)) {
        matrix.set(perm.resource, new Map());
      }

      const resourceMap = matrix.get(perm.resource)!;
      if (!resourceMap.has(perm.action)) {
        resourceMap.set(perm.action, new Set());
      }

      resourceMap.get(perm.action)!.add(perm.scope || 'ALL');
    }

    // Convert to serializable format
    const result: Record<string, Record<string, string[]>> = {};
    for (const [resource, actions] of matrix) {
      result[resource] = {};
      for (const [action, scopes] of actions) {
        result[resource][action] = Array.from(scopes);
      }
    }

    return result;
  }

  /**
   * Batch check multiple permissions
   * Optimized for checking multiple permissions at once
   */
  async batchCheckPermissions(
    userProfileId: string,
    checks: Array<{
      resource: string;
      action: string;
      scope?: string;
    }>,
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const effectivePermissions = await this.getEffectivePermissions(
      userProfileId,
    );

    for (const check of checks) {
      const key = `${check.resource}:${check.action}:${check.scope || 'ALL'}`;
      const hasPermission = effectivePermissions.some(
        (p) =>
          p.resource === check.resource &&
          p.action === check.action &&
          (!check.scope || p.scope === check.scope || p.scope === 'ALL'),
      );
      results.set(key, hasPermission);
    }

    return results;
  }


  private async logPermissionCheck(
    userProfileId: string,
    resource: string,
    action: string,
    isAllowed: boolean,
    duration: number,
  ): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO gloria_ops.permission_check_logs (
          id, user_profile_id, resource, action, is_allowed, check_duration, created_at
        ) VALUES (
          ${uuidv7()},
          ${userProfileId},
          ${resource},
          ${action},
          ${isAllowed},
          ${duration},
          NOW()
        )
      `;
    } catch (error) {
      console.error('Failed to log permission check:', error);
    }
  }
}