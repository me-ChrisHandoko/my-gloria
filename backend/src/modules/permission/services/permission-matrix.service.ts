import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisPermissionCacheService } from '../../../cache/services/redis-permission-cache.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v7 as uuidv7 } from 'uuid';
import { PermissionAction, PermissionScope } from '@prisma/client';

interface PermissionMatrixEntry {
  id: string;
  userProfileId: string;
  permissionKey: string;
  isAllowed: boolean;
  grantedBy: string[];
  computedAt: Date;
  expiresAt: Date;
  priority: number;
  metadata?: any;
}

interface ActiveUser {
  userProfileId: string;
  lastActiveAt: Date;
  permissionCheckCount: number;
  isHighPriority: boolean;
}

@Injectable()
export class PermissionMatrixService {
  private readonly logger = new Logger(PermissionMatrixService.name);
  private readonly MATRIX_EXPIRY_HOURS = 24; // Matrix entries expire after 24 hours
  private readonly HIGH_PRIORITY_THRESHOLD = 100; // Users with >100 checks/day are high priority
  private readonly BATCH_SIZE = 100; // Process users in batches

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: RedisPermissionCacheService,
  ) {}

  /**
   * Track user activity for permission matrix computation
   */
  async trackUserActivity(userProfileId: string): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO gloria_ops.active_user_tracking (id, user_profile_id, last_active_at, permission_check_count)
      VALUES (${uuidv7()}, ${userProfileId}, CURRENT_TIMESTAMP, 1)
      ON CONFLICT (user_profile_id) 
      DO UPDATE SET 
        last_active_at = CURRENT_TIMESTAMP,
        permission_check_count = active_user_tracking.permission_check_count + 1,
        last_permission_check_at = CURRENT_TIMESTAMP,
        is_high_priority = CASE 
          WHEN active_user_tracking.permission_check_count + 1 > ${this.HIGH_PRIORITY_THRESHOLD} 
          THEN true 
          ELSE active_user_tracking.is_high_priority 
        END
    `;
  }

  /**
   * Get pre-computed permission from matrix
   */
  async getFromMatrix(
    userProfileId: string,
    resource: string,
    action: PermissionAction,
    scope?: PermissionScope,
  ): Promise<PermissionMatrixEntry | null> {
    const permissionKey = this.buildPermissionKey(resource, action, scope);
    
    const result = await this.prisma.$queryRaw<PermissionMatrixEntry[]>`
      SELECT * FROM gloria_ops.permission_matrix
      WHERE user_profile_id = ${userProfileId}
        AND permission_key = ${permissionKey}
        AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `;

    return result[0] || null;
  }

  /**
   * Compute and store permission matrix for a user
   */
  async computeUserMatrix(userProfileId: string): Promise<void> {
    this.logger.log(`Computing permission matrix for user: ${userProfileId}`);
    
    try {
      // Get all active permissions
      const permissions = await this.prisma.permission.findMany({
        where: { isActive: true },
        include: {
          userPermissions: {
            where: {
              userProfileId,
              OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
              validFrom: { lte: new Date() },
            },
          },
          rolePermissions: {
            where: {
              OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
              validFrom: { lte: new Date() },
            },
            include: {
              role: {
                include: {
                  userRoles: {
                    where: {
                      userProfileId,
                      isActive: true,
                      OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
                      validFrom: { lte: new Date() },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const matrixEntries: PermissionMatrixEntry[] = [];
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.MATRIX_EXPIRY_HOURS);

      // Process each permission
      for (const permission of permissions) {
        const permissionKey = this.buildPermissionKey(
          permission.resource,
          permission.action,
          permission.scope,
        );

        let isAllowed = false;
        const grantedBy: string[] = [];
        let priority = 0;

        // Check direct user permissions (highest priority)
        const userPermission = permission.userPermissions[0];
        if (userPermission) {
          isAllowed = userPermission.isGranted;
          grantedBy.push('direct-user-permission');
          priority = userPermission.priority || 100;
        } else {
          // Check role-based permissions
          for (const rolePermission of permission.rolePermissions) {
            if (rolePermission.role.userRoles.length > 0 && rolePermission.isGranted) {
              isAllowed = true;
              grantedBy.push(rolePermission.role.name);
              priority = Math.max(priority, 50);
            }
          }
        }

        if (isAllowed || userPermission) {
          matrixEntries.push({
            id: uuidv7(),
            userProfileId,
            permissionKey,
            isAllowed,
            grantedBy,
            computedAt: new Date(),
            expiresAt,
            priority,
            metadata: {
              permissionId: permission.id,
              resource: permission.resource,
              action: permission.action,
              scope: permission.scope,
            },
          });
        }
      }

      // Bulk insert matrix entries
      if (matrixEntries.length > 0) {
        await this.bulkUpsertMatrixEntries(matrixEntries);
        
        // Invalidate Redis cache to force using matrix
        await this.cacheService.invalidateUserCache(userProfileId);
      }

      this.logger.log(`Computed ${matrixEntries.length} permissions for user: ${userProfileId}`);
    } catch (error) {
      this.logger.error(`Failed to compute matrix for user ${userProfileId}:`, error);
      throw error;
    }
  }

  /**
   * Bulk upsert matrix entries
   */
  private async bulkUpsertMatrixEntries(entries: PermissionMatrixEntry[]): Promise<void> {
    if (entries.length === 0) return;

    const values = entries.map(entry => `(
      '${entry.id}',
      '${entry.userProfileId}',
      '${entry.permissionKey}',
      ${entry.isAllowed},
      ARRAY[${entry.grantedBy.map(g => `'${g}'`).join(',')}]::TEXT[],
      '${entry.computedAt.toISOString()}',
      '${entry.expiresAt.toISOString()}',
      ${entry.priority},
      '${JSON.stringify(entry.metadata)}'::JSONB
    )`).join(',');

    await this.prisma.$executeRawUnsafe(`
      INSERT INTO gloria_ops.permission_matrix 
      (id, user_profile_id, permission_key, is_allowed, granted_by, computed_at, expires_at, priority, metadata)
      VALUES ${values}
      ON CONFLICT (user_profile_id, permission_key) 
      DO UPDATE SET
        is_allowed = EXCLUDED.is_allowed,
        granted_by = EXCLUDED.granted_by,
        computed_at = EXCLUDED.computed_at,
        expires_at = EXCLUDED.expires_at,
        priority = EXCLUDED.priority,
        metadata = EXCLUDED.metadata
    `);
  }

  /**
   * Build permission key for matrix lookup
   */
  private buildPermissionKey(
    resource: string,
    action: PermissionAction,
    scope?: PermissionScope | null,
  ): string {
    return `${resource}:${action}:${scope || 'null'}`;
  }

  /**
   * Scheduled job to compute matrix for active users
   */
  @Cron(CronExpression.EVERY_HOUR)
  async computeActiveUsersMatrix(): Promise<void> {
    this.logger.log('Starting scheduled permission matrix computation');

    try {
      // Get high-priority active users first
      const highPriorityUsers = await this.prisma.$queryRaw<ActiveUser[]>`
        SELECT user_profile_id as "userProfileId", last_active_at as "lastActiveAt",
               permission_check_count as "permissionCheckCount", is_high_priority as "isHighPriority"
        FROM gloria_ops.active_user_tracking
        WHERE is_high_priority = true
          AND last_active_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        ORDER BY permission_check_count DESC
        LIMIT ${this.BATCH_SIZE}
      `;

      // Process high-priority users
      for (const user of highPriorityUsers) {
        await this.computeUserMatrix(user.userProfileId);
      }

      // Get regular active users
      const regularUsers = await this.prisma.$queryRaw<ActiveUser[]>`
        SELECT user_profile_id as "userProfileId", last_active_at as "lastActiveAt",
               permission_check_count as "permissionCheckCount", is_high_priority as "isHighPriority"
        FROM gloria_ops.active_user_tracking
        WHERE is_high_priority = false
          AND last_active_at > CURRENT_TIMESTAMP - INTERVAL '48 hours'
          AND permission_check_count > 10
        ORDER BY last_active_at DESC
        LIMIT ${this.BATCH_SIZE}
      `;

      // Process regular users
      for (const user of regularUsers) {
        await this.computeUserMatrix(user.userProfileId);
      }

      this.logger.log(`Completed matrix computation for ${highPriorityUsers.length + regularUsers.length} users`);
    } catch (error) {
      this.logger.error('Failed to compute active users matrix:', error);
    }
  }

  /**
   * Clean up expired matrix entries
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredEntries(): Promise<void> {
    this.logger.log('Cleaning up expired permission matrix entries');

    try {
      const result = await this.prisma.$executeRaw`
        DELETE FROM gloria_ops.permission_matrix
        WHERE expires_at < CURRENT_TIMESTAMP
      `;

      this.logger.log(`Deleted ${result} expired matrix entries`);

      // Reset inactive users
      const resetResult = await this.prisma.$executeRaw`
        UPDATE gloria_ops.active_user_tracking
        SET permission_check_count = 0,
            is_high_priority = false
        WHERE last_active_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
      `;

      this.logger.log(`Reset ${resetResult} inactive users`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired entries:', error);
    }
  }

  /**
   * Invalidate user's matrix when permissions change
   */
  async invalidateUserMatrix(userProfileId: string): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM gloria_ops.permission_matrix
      WHERE user_profile_id = ${userProfileId}
    `;
    
    // Recompute immediately for high-priority users
    const user = await this.prisma.$queryRaw<ActiveUser[]>`
      SELECT is_high_priority as "isHighPriority"
      FROM gloria_ops.active_user_tracking
      WHERE user_profile_id = ${userProfileId}
      LIMIT 1
    `;

    if (user[0]?.isHighPriority) {
      await this.computeUserMatrix(userProfileId);
    }
  }
}