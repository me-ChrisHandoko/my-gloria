import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import {
  GrantPermissionDto,
  RevokePermissionDto,
  BulkGrantPermissionsDto,
} from '../dto/user-permission/grant-permission.dto';
import {
  EffectivePermissionDto,
  UserPermissionSummaryDto,
} from '../dto/user-permission/effective-permissions.dto';
import {
  UserPermission,
  Prisma,
  PermissionAction,
  PermissionScope,
} from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class UserPermissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async grantPermission(
    userProfileId: string,
    grantDto: GrantPermissionDto,
    grantedBy: string,
  ): Promise<UserPermission> {
    // Validate user exists
    const user = await this.prisma.userProfile.findUnique({
      where: { id: userProfileId },
      include: {
        dataKaryawan: {
          select: { nama: true, nip: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User profile ${userProfileId} not found`);
    }

    // Validate permission exists
    const permission = await this.prisma.permission.findUnique({
      where: { id: grantDto.permissionId },
    });

    if (!permission) {
      throw new NotFoundException(
        `Permission ${grantDto.permissionId} not found`,
      );
    }

    // Check if already granted
    const existing = await this.prisma.userPermission.findUnique({
      where: {
        userProfileId_permissionId: {
          userProfileId,
          permissionId: grantDto.permissionId,
        },
      },
    });

    if (existing && existing.isGranted) {
      throw new ConflictException(
        `Permission ${permission.code} is already granted to user ${user.dataKaryawan?.nama}`,
      );
    }

    const userPermission = await this.prisma.$transaction(async (tx) => {
      let result: UserPermission;

      if (existing) {
        // Reactivate existing permission
        result = await tx.userPermission.update({
          where: { id: existing.id },
          data: {
            isGranted: grantDto.isGranted ?? true,
            conditions: grantDto.conditions,
            validFrom: grantDto.validFrom
              ? new Date(grantDto.validFrom)
              : new Date(),
            validUntil: grantDto.validUntil
              ? new Date(grantDto.validUntil)
              : null,
            grantedBy,
            grantReason: grantDto.grantReason,
            priority: grantDto.priority ?? 100,
            isTemporary: grantDto.isTemporary ?? false,
          },
        });
      } else {
        // Create new permission
        result = await tx.userPermission.create({
          data: {
            id: uuidv7(),
            userProfileId,
            permissionId: grantDto.permissionId,
            isGranted: grantDto.isGranted ?? true,
            conditions: grantDto.conditions,
            validFrom: grantDto.validFrom
              ? new Date(grantDto.validFrom)
              : new Date(),
            validUntil: grantDto.validUntil
              ? new Date(grantDto.validUntil)
              : null,
            grantedBy,
            grantReason: grantDto.grantReason,
            priority: grantDto.priority ?? 100,
            isTemporary: grantDto.isTemporary ?? false,
          },
        });
      }

      // Log audit
      await this.auditService.log({
        actorId: grantedBy,
        action: 'ASSIGN',
        module: 'user-permission',
        entityType: 'UserPermission',
        entityId: result.id,
        entityDisplay: `${permission.code} to ${user.dataKaryawan?.nama}`,
        newValues: result,
        metadata: {
          targetUserId: userProfileId,
          permissionCode: permission.code,
          userName: user.dataKaryawan?.nama,
        },
      });

      // Invalidate cache
      await this.invalidateUserCache(userProfileId);

      return result;
    });

    return userPermission;
  }

  async revokePermission(
    userProfileId: string,
    revokeDto: RevokePermissionDto,
    revokedBy: string,
  ): Promise<void> {
    const userPermission = await this.prisma.userPermission.findFirst({
      where: {
        userProfileId,
        permissionId: revokeDto.permissionId,
        isGranted: true,
      },
      include: {
        permission: true,
        userProfile: {
          include: {
            dataKaryawan: {
              select: { nama: true },
            },
          },
        },
      },
    });

    if (!userPermission) {
      throw new NotFoundException(
        'Permission not found or not active for this user',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Mark as inactive
      await tx.userPermission.update({
        where: { id: userPermission.id },
        data: { isGranted: false },
      });

      // Log audit
      await this.auditService.log({
        actorId: revokedBy,
        action: 'REVOKE',
        module: 'user-permission',
        entityType: 'UserPermission',
        entityId: userPermission.id,
        entityDisplay: `${userPermission.permission.code} from ${userPermission.userProfile.dataKaryawan?.nama}`,
        oldValues: userPermission,
        metadata: {
          targetUserId: userProfileId,
          revokeReason: revokeDto.revokeReason,
          permissionCode: userPermission.permission.code,
        },
      });

      // Invalidate cache
      await this.invalidateUserCache(userProfileId);
    });
  }

  async bulkGrantPermissions(
    bulkDto: BulkGrantPermissionsDto,
    grantedBy: string,
  ): Promise<UserPermission[]> {
    const results: UserPermission[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const permDto of bulkDto.permissions) {
        const existing = await tx.userPermission.findUnique({
          where: {
            userProfileId_permissionId: {
              userProfileId: bulkDto.userProfileId,
              permissionId: permDto.permissionId,
            },
          },
        });

        let result: UserPermission;

        if (existing) {
          result = await tx.userPermission.update({
            where: { id: existing.id },
            data: {
              isGranted: permDto.isGranted ?? true,
              conditions: permDto.conditions,
              validFrom: permDto.validFrom
                ? new Date(permDto.validFrom)
                : new Date(),
              validUntil: permDto.validUntil
                ? new Date(permDto.validUntil)
                : null,
              grantedBy,
              grantReason: permDto.grantReason,
              priority: permDto.priority ?? 100,
              isTemporary: permDto.isTemporary ?? false,
            },
          });
        } else {
          result = await tx.userPermission.create({
            data: {
              id: uuidv7(),
              userProfileId: bulkDto.userProfileId,
              permissionId: permDto.permissionId,
              isGranted: permDto.isGranted ?? true,
              conditions: permDto.conditions,
              validFrom: permDto.validFrom
                ? new Date(permDto.validFrom)
                : new Date(),
              validUntil: permDto.validUntil
                ? new Date(permDto.validUntil)
                : null,
              grantedBy,
              grantReason: permDto.grantReason,
              priority: permDto.priority ?? 100,
              isTemporary: permDto.isTemporary ?? false,
            },
          });
        }

        results.push(result);
      }

      // Log audit
      await this.auditService.log({
        actorId: grantedBy,
        action: 'ASSIGN',
        module: 'user-permission',
        entityType: 'UserPermission',
        entityId: bulkDto.userProfileId,
        entityDisplay: `Bulk grant ${bulkDto.permissions.length} permissions`,
        newValues: {
          permissionIds: bulkDto.permissions.map((p) => p.permissionId),
        },
        metadata: {
          targetUserId: bulkDto.userProfileId,
        },
      });

      // Invalidate cache
      await this.invalidateUserCache(bulkDto.userProfileId);
    });

    return results;
  }

  async getEffectivePermissions(
    userProfileId: string,
  ): Promise<UserPermissionSummaryDto> {
    // Get user with all permission sources
    const user = await this.prisma.userProfile.findUnique({
      where: { id: userProfileId },
      include: {
        dataKaryawan: {
          select: { nama: true, nip: true },
        },
        // Direct permissions
        userPermissions: {
          where: {
            isGranted: true,
            OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
            validFrom: { lte: new Date() },
          },
          include: {
            permission: {
              include: {
                group: true,
              },
            },
          },
          orderBy: { priority: 'desc' },
        },
        // Roles with permissions
        roles: {
          where: {
            isActive: true,
            OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
            validFrom: { lte: new Date() },
          },
          include: {
            role: {
              include: {
                rolePermissions: {
                  where: {
                    OR: [
                      { validUntil: null },
                      { validUntil: { gte: new Date() } },
                    ],
                    validFrom: { lte: new Date() },
                  },
                  include: {
                    permission: {
                      include: {
                        group: true,
                      },
                    },
                  },
                },
                parentRoles: {
                  include: {
                    parentRole: {
                      include: {
                        rolePermissions: {
                          where: {
                            isGranted: true,
                            OR: [
                              { validUntil: null },
                              { validUntil: { gte: new Date() } },
                            ],
                            validFrom: { lte: new Date() },
                          },
                          include: {
                            permission: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        // Resource-specific permissions
        resourcePermissions: {
          where: {
            OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
            validFrom: { lte: new Date() },
          },
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User profile ${userProfileId} not found`);
    }

    // Build effective permissions map
    const permissionsMap = new Map<string, EffectivePermissionDto>();

    // Process direct permissions (highest priority)
    user.userPermissions.forEach((up) => {
      const key = `${up.permission.resource}-${up.permission.action}-${up.permission.scope || 'none'}`;

      if (up.isGranted) {
        permissionsMap.set(key, {
          id: up.permission.id,
          code: up.permission.code,
          name: up.permission.name,
          resource: up.permission.resource,
          action: up.permission.action,
          scope: up.permission.scope ?? undefined,
          source: 'direct',
          grantedBy: 'Direct Assignment',
          conditions: up.conditions,
          priority: up.priority,
          validUntil: up.validUntil ?? undefined,
        });
      } else {
        // Explicit deny
        permissionsMap.delete(key);
      }
    });

    // Process role permissions
    user.roles.forEach((ur) => {
      // Direct role permissions
      ur.role.rolePermissions.forEach((rp) => {
        if (rp.isGranted) {
          const key = `${rp.permission.resource}-${rp.permission.action}-${rp.permission.scope || 'none'}`;

          if (!permissionsMap.has(key)) {
            permissionsMap.set(key, {
              id: rp.permission.id,
              code: rp.permission.code,
              name: rp.permission.name,
              resource: rp.permission.resource,
              action: rp.permission.action,
              scope: rp.permission.scope ?? undefined,
              source: 'role',
              grantedBy: ur.role.name,
              conditions: rp.conditions,
              validUntil: rp.validUntil ?? undefined,
            });
          }
        }
      });

      // Inherited permissions from parent roles
      ur.role.parentRoles.forEach((hierarchy) => {
        if (hierarchy.inheritPermissions) {
          hierarchy.parentRole.rolePermissions.forEach((rp) => {
            const key = `${rp.permission.resource}-${rp.permission.action}-${rp.permission.scope || 'none'}`;

            if (!permissionsMap.has(key)) {
              permissionsMap.set(key, {
                id: rp.permission.id,
                code: rp.permission.code,
                name: rp.permission.name,
                resource: rp.permission.resource,
                action: rp.permission.action,
                scope: rp.permission.scope ?? undefined,
                source: 'inherited',
                grantedBy: `${hierarchy.parentRole.name} (inherited)`,
                conditions: rp.conditions,
                validUntil: rp.validUntil ?? undefined,
              });
            }
          });
        }
      });
    });

    // Process resource-specific permissions
    user.resourcePermissions.forEach((rp) => {
      if (rp.isGranted) {
        const key = `${rp.permission.resource}-${rp.permission.action}-resource-${rp.resourceId}`;

        permissionsMap.set(key, {
          id: rp.permission.id,
          code: rp.permission.code,
          name: rp.permission.name,
          resource: rp.permission.resource,
          action: rp.permission.action,
          scope: undefined,
          source: 'resource',
          grantedBy: `Resource: ${rp.resourceId}`,
          conditions: { resourceId: rp.resourceId },
          validUntil: rp.validUntil ?? undefined,
        });
      }
    });

    const effectivePermissions = Array.from(permissionsMap.values());

    // Calculate statistics
    const statistics = {
      totalPermissions: effectivePermissions.length,
      directPermissions: effectivePermissions.filter(
        (p) => p.source === 'direct',
      ).length,
      rolePermissions: effectivePermissions.filter((p) => p.source === 'role')
        .length,
      inheritedPermissions: effectivePermissions.filter(
        (p) => p.source === 'inherited',
      ).length,
      deniedPermissions: user.userPermissions.filter((up) => !up.isGranted)
        .length,
    };

    // Build summary
    const summary: UserPermissionSummaryDto = {
      userProfileId: user.id,
      userName: user.dataKaryawan?.nama || 'Unknown',
      isSuperadmin: user.isSuperadmin,
      permissions: effectivePermissions,
      roles: user.roles.map((ur) => ({
        id: ur.role.id,
        code: ur.role.code,
        name: ur.role.name,
        hierarchyLevel: ur.role.hierarchyLevel,
      })),
      statistics,
      generatedAt: new Date(),
      cacheExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };

    return summary;
  }

  async getUserPermissions(userProfileId: string): Promise<UserPermission[]> {
    return this.prisma.userPermission.findMany({
      where: {
        userProfileId,
        isGranted: true,
      },
      include: {
        permission: {
          include: {
            group: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getExpiringPermissions(days: number = 7): Promise<UserPermission[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    return this.prisma.userPermission.findMany({
      where: {
        isGranted: true,
        isTemporary: true,
        validUntil: {
          lte: expiryDate,
          gte: new Date(),
        },
      },
      include: {
        userProfile: {
          include: {
            dataKaryawan: {
              select: { nama: true, nip: true },
            },
          },
        },
        permission: true,
      },
      orderBy: { validUntil: 'asc' },
    });
  }

  async cleanupExpiredPermissions(): Promise<number> {
    const result = await this.prisma.userPermission.updateMany({
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

    if (result.count > 0) {
      // Log audit
      await this.auditService.log({
        actorId: 'SYSTEM',
        action: 'UPDATE',
        module: 'user-permission',
        entityType: 'UserPermission',
        entityId: 'BATCH',
        entityDisplay: `Cleaned up ${result.count} expired permissions`,
        metadata: { count: result.count },
      });

      // Invalidate all caches
      await this.prisma.permissionCache.updateMany({
        where: {},
        data: { isValid: false },
      });
    }

    return result.count;
  }

  private async invalidateUserCache(userProfileId: string): Promise<void> {
    await this.prisma.permissionCache.updateMany({
      where: { userProfileId },
      data: { isValid: false },
    });
  }
}
