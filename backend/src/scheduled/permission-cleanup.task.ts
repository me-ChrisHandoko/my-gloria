import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval, Timeout } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionCacheService } from '../cache/services/permission-cache.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PermissionCleanupTask {
  private readonly logger = new Logger(PermissionCleanupTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: PermissionCacheService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Run cleanup every day at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleExpiredPermissions() {
    this.logger.log('Starting expired permissions cleanup...');

    try {
      // Clean up expired user permissions
      const expiredUserPermissions =
        await this.prisma.userPermission.updateMany({
          where: {
            isGranted: true,
            validUntil: {
              lt: new Date(),
            },
          },
          data: {
            isGranted: false,
          },
        });

      if (expiredUserPermissions.count > 0) {
        this.logger.log(
          `Deactivated ${expiredUserPermissions.count} expired user permissions`,
        );

        await this.auditService.log({
          actorId: 'SYSTEM',
          action: 'UPDATE',
          module: 'scheduled-task',
          entityType: 'UserPermission',
          entityId: 'BATCH',
          entityDisplay: `Expired permissions cleanup`,
          metadata: {
            task: 'expiredPermissions',
            count: expiredUserPermissions.count,
          },
        });
      }

      // Clean up expired role assignments
      const expiredRoles = await this.prisma.userRole.updateMany({
        where: {
          isActive: true,
          validUntil: {
            lt: new Date(),
          },
        },
        data: {
          isActive: false,
        },
      });

      if (expiredRoles.count > 0) {
        this.logger.log(
          `Deactivated ${expiredRoles.count} expired role assignments`,
        );

        await this.auditService.log({
          actorId: 'SYSTEM',
          action: 'UPDATE',
          module: 'scheduled-task',
          entityType: 'UserRole',
          entityId: 'BATCH',
          entityDisplay: `Expired roles cleanup`,
          metadata: {
            task: 'expiredRoles',
            count: expiredRoles.count,
          },
        });
      }

      // Clean up expired policy assignments
      const expiredPolicies = await this.prisma.policyAssignment.deleteMany({
        where: {
          validUntil: {
            lt: new Date(),
          },
        },
      });

      if (expiredPolicies.count > 0) {
        this.logger.log(
          `Removed ${expiredPolicies.count} expired policy assignments`,
        );

        await this.auditService.log({
          actorId: 'SYSTEM',
          action: 'DELETE',
          module: 'scheduled-task',
          entityType: 'PolicyAssignment',
          entityId: 'BATCH',
          entityDisplay: `Expired policy assignments cleanup`,
          metadata: {
            task: 'expiredPolicies',
            count: expiredPolicies.count,
          },
        });
      }

      // Invalidate all permission caches after cleanup
      if (
        expiredUserPermissions.count > 0 ||
        expiredRoles.count > 0 ||
        expiredPolicies.count > 0
      ) {
        await this.cacheService.invalidateAllUserCaches();
        this.logger.log('Invalidated all user permission caches');
      }

      this.logger.log('Expired permissions cleanup completed');
    } catch (error) {
      this.logger.error('Error during expired permissions cleanup', error);

      await this.auditService.log({
        actorId: 'SYSTEM',
        action: 'UPDATE',
        module: 'scheduled-task',
        entityType: 'Error',
        entityId: 'permission-cleanup',
        entityDisplay: 'Expired permissions cleanup failed',
        metadata: {
          error: error.message,
          stack: error.stack,
        },
      });
    }
  }

  /**
   * Clean up old permission check logs every week
   */
  @Cron(CronExpression.EVERY_WEEK)
  async cleanupPermissionLogs() {
    this.logger.log('Starting permission logs cleanup...');

    try {
      // Keep logs for 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedLogs = await this.prisma.permissionCheckLog.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      if (deletedLogs.count > 0) {
        this.logger.log(
          `Deleted ${deletedLogs.count} old permission check logs`,
        );

        await this.auditService.log({
          actorId: 'SYSTEM',
          action: 'DELETE',
          module: 'scheduled-task',
          entityType: 'PermissionCheckLog',
          entityId: 'BATCH',
          entityDisplay: `Old permission logs cleanup`,
          metadata: {
            task: 'logCleanup',
            count: deletedLogs.count,
            olderThan: thirtyDaysAgo,
          },
        });
      }

      this.logger.log('Permission logs cleanup completed');
    } catch (error) {
      this.logger.error('Error during permission logs cleanup', error);
    }
  }

  /**
   * Refresh permission cache every hour
   */
  @Interval(3600000) // 1 hour in milliseconds
  async refreshPermissionCache() {
    this.logger.debug('Starting permission cache refresh...');

    try {
      // Get cache stats before refresh
      const stats = await this.cacheService.getCacheStats();

      // Clear expired cache entries
      await this.prisma.permissionCache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      // Mark invalid caches as expired
      await this.prisma.permissionCache.updateMany({
        where: {
          isValid: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        data: {
          expiresAt: new Date(),
        },
      });

      this.logger.debug('Permission cache refresh completed');
    } catch (error) {
      this.logger.error('Error during permission cache refresh', error);
    }
  }

  /**
   * Send notifications for expiring permissions (runs daily at 9 AM)
   */
  @Cron('0 9 * * *')
  async notifyExpiringPermissions() {
    this.logger.log('Checking for expiring permissions...');

    try {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      // Find permissions expiring in the next 7 days
      const expiringPermissions = await this.prisma.userPermission.findMany({
        where: {
          isGranted: true,
          isTemporary: true,
          validUntil: {
            gte: new Date(),
            lte: sevenDaysFromNow,
          },
        },
        include: {
          userProfile: {
            include: {
              dataKaryawan: {
                select: {
                  nama: true,
                  email: true,
                },
              },
            },
          },
          permission: true,
        },
      });

      if (expiringPermissions.length > 0) {
        this.logger.log(
          `Found ${expiringPermissions.length} expiring permissions`,
        );

        // Group by user for notification
        const userNotifications = new Map<string, any[]>();

        for (const exp of expiringPermissions) {
          const userId = exp.userProfileId;
          if (!userNotifications.has(userId)) {
            userNotifications.set(userId, []);
          }
          userNotifications.get(userId)?.push(exp);
        }

        // Create notifications for each user
        for (const [userId, permissions] of userNotifications) {
          const permissionList = permissions
            .map((p) => p.permission.name)
            .join(', ');

          await this.prisma.notification.create({
            data: {
              id: require('uuid').v7(),
              userProfileId: userId,
              type: 'GENERAL',
              title: 'Permissions Expiring Soon',
              message: `The following permissions will expire within 7 days: ${permissionList}`,
              data: {
                permissions: permissions.map((p) => ({
                  id: p.id,
                  name: p.permission.name,
                  expiresAt: p.validUntil,
                })),
              },
              priority: 'MEDIUM',
            },
          });
        }

        await this.auditService.log({
          actorId: 'SYSTEM',
          action: 'CREATE',
          module: 'scheduled-task',
          entityType: 'Notification',
          entityId: 'BATCH',
          entityDisplay: `Expiring permissions notifications`,
          metadata: {
            task: 'expiringNotifications',
            userCount: userNotifications.size,
            permissionCount: expiringPermissions.length,
          },
        });
      }

      this.logger.log('Expiring permissions check completed');
    } catch (error) {
      this.logger.error('Error during expiring permissions check', error);
    }
  }

  /**
   * Run initial cleanup on application startup (after 10 seconds)
   */
  @Timeout(10000)
  async handleStartupCleanup() {
    this.logger.log('Running initial permission cleanup...');
    await this.handleExpiredPermissions();
  }
}
