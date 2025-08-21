import {
  PrismaClient,
  PermissionAction,
  PermissionScope,
} from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

export class PermissionService {
  private prisma: PrismaClient;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(
    userProfileId: string,
    resource: string,
    action: PermissionAction,
    scope?: PermissionScope,
    resourceId?: string,
  ): Promise<boolean> {
    try {
      // 1. Check cache first for performance
      const cached = await this.checkCache(
        userProfileId,
        resource,
        action,
        scope,
      );
      if (cached !== null) return cached;

      // 2. Check direct user permissions (highest priority)
      const userPerm = await this.checkUserPermission(
        userProfileId,
        resource,
        action,
        scope,
      );
      if (userPerm !== null) {
        await this.cachePermission(
          userProfileId,
          resource,
          action,
          scope,
          userPerm,
        );
        return userPerm;
      }

      // 3. Check role permissions (including inherited)
      const rolePerm = await this.checkRolePermissions(
        userProfileId,
        resource,
        action,
        scope,
      );
      if (rolePerm !== null) {
        await this.cachePermission(
          userProfileId,
          resource,
          action,
          scope,
          rolePerm,
        );
        return rolePerm;
      }

      // 4. Check if user is superadmin
      const userProfile = await this.prisma.userProfile.findUnique({
        where: { id: userProfileId },
        select: { isSuperadmin: true },
      });

      if (userProfile?.isSuperadmin) {
        await this.cachePermission(
          userProfileId,
          resource,
          action,
          scope,
          true,
        );
        return true;
      }

      // Default deny and cache the result
      await this.cachePermission(userProfileId, resource, action, scope, false);
      return false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check permission cache
   */
  private async checkCache(
    userProfileId: string,
    resource: string,
    action: PermissionAction,
    scope?: PermissionScope,
  ): Promise<boolean | null> {
    const cacheKey = `user:${userProfileId}:${resource}:${action}:${scope || 'any'}`;

    const cached = await this.prisma.permissionCache.findFirst({
      where: {
        userProfileId,
        cacheKey,
        isValid: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (cached) {
      const permissions = cached.permissions as any;
      return permissions.granted || false;
    }

    return null;
  }

  /**
   * Check direct user permissions
   */
  private async checkUserPermission(
    userProfileId: string,
    resource: string,
    action: PermissionAction,
    scope?: PermissionScope,
  ): Promise<boolean | null> {
    const userPermission = await this.prisma.userPermission.findFirst({
      where: {
        userProfileId,
        permission: {
          resource,
          action,
          ...(scope && { scope }),
          isActive: true,
        },
        validFrom: { lte: new Date() },
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      orderBy: { priority: 'desc' },
    });

    return userPermission ? userPermission.isGranted : null;
  }

  /**
   * Check role-based permissions
   */
  private async checkRolePermissions(
    userProfileId: string,
    resource: string,
    action: PermissionAction,
    scope?: PermissionScope,
  ): Promise<boolean | null> {
    // Get user's active roles
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userProfileId,
        isActive: true,
        validFrom: { lte: new Date() },
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              where: {
                permission: {
                  resource,
                  action,
                  ...(scope && { scope }),
                  isActive: true,
                },
                validFrom: { lte: new Date() },
                OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
              },
              include: { permission: true },
            },
          },
        },
      },
    });

    // Check direct role permissions
    for (const userRole of userRoles) {
      for (const rolePerm of userRole.role.rolePermissions) {
        if (rolePerm.isGranted) return true;
        if (!rolePerm.isGranted) return false; // Explicit deny
      }
    }

    // Check inherited permissions
    const roleIds = userRoles.map((ur) => ur.roleId);
    if (roleIds.length > 0) {
      const inherited = await this.checkInheritedPermissions(
        roleIds,
        resource,
        action,
        scope,
      );
      if (inherited !== null) return inherited;
    }

    return null;
  }

  /**
   * Check inherited permissions through role hierarchy
   */
  private async checkInheritedPermissions(
    roleIds: string[],
    resource: string,
    action: PermissionAction,
    scope?: PermissionScope,
  ): Promise<boolean | null> {
    const hierarchies = await this.prisma.roleHierarchy.findMany({
      where: {
        roleId: { in: roleIds },
        inheritPermissions: true,
      },
      include: {
        parentRole: {
          include: {
            rolePermissions: {
              where: {
                permission: {
                  resource,
                  action,
                  ...(scope && { scope }),
                  isActive: true,
                },
                isGranted: true,
              },
            },
          },
        },
      },
    });

    for (const hierarchy of hierarchies) {
      if (hierarchy.parentRole.rolePermissions.length > 0) {
        return true;
      }
    }

    // Recursively check parent's parents
    const parentRoleIds = hierarchies.map((h) => h.parentRoleId);
    if (parentRoleIds.length > 0) {
      return this.checkInheritedPermissions(
        parentRoleIds,
        resource,
        action,
        scope,
      );
    }

    return null;
  }

  /**
   * Cache permission result
   */
  private async cachePermission(
    userProfileId: string,
    resource: string,
    action: PermissionAction,
    scope: PermissionScope | undefined,
    granted: boolean,
  ): Promise<void> {
    const cacheKey = `user:${userProfileId}:${resource}:${action}:${scope || 'any'}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.cacheTimeout);

    await this.prisma.permissionCache.upsert({
      where: {
        userProfileId_cacheKey: {
          userProfileId,
          cacheKey,
        },
      },
      update: {
        permissions: { granted },
        computedAt: now,
        expiresAt,
        isValid: true,
      },
      create: {
        id: uuidv7(),
        userProfileId,
        cacheKey,
        permissions: { granted },
        computedAt: now,
        expiresAt,
        isValid: true,
      },
    });
  }

  /**
   * Invalidate permission cache for a user or all users
   */
  async invalidateCache(userProfileId?: string): Promise<void> {
    if (userProfileId) {
      await this.prisma.permissionCache.updateMany({
        where: { userProfileId },
        data: { isValid: false },
      });
    } else {
      await this.prisma.permissionCache.updateMany({
        data: { isValid: false },
      });
    }
  }

  /**
   * Grant permission to a user
   */
  async grantUserPermission(
    userProfileId: string,
    permissionId: string,
    grantedBy: string,
    reason: string,
    validUntil?: Date,
    isTemporary: boolean = false,
  ): Promise<void> {
    await this.prisma.userPermission.create({
      data: {
        id: uuidv7(),
        userProfileId,
        permissionId,
        isGranted: true,
        grantedBy,
        grantReason: reason,
        validUntil,
        isTemporary,
        priority: 100,
      },
    });

    // Invalidate cache for this user
    await this.invalidateCache(userProfileId);
  }

  /**
   * Revoke permission from a user
   */
  async revokeUserPermission(
    userProfileId: string,
    permissionId: string,
  ): Promise<void> {
    await this.prisma.userPermission.deleteMany({
      where: {
        userProfileId,
        permissionId,
      },
    });

    // Invalidate cache for this user
    await this.invalidateCache(userProfileId);
  }

  /**
   * Grant permission to a role
   */
  async grantRolePermission(
    roleId: string,
    permissionId: string,
    grantedBy: string,
    reason?: string,
  ): Promise<void> {
    await this.prisma.rolePermission.create({
      data: {
        id: uuidv7(),
        roleId,
        permissionId,
        isGranted: true,
        grantedBy,
        grantReason: reason,
      },
    });

    // Invalidate cache for all users with this role
    const users = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userProfileId: true },
    });

    for (const user of users) {
      await this.invalidateCache(user.userProfileId);
    }
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userProfileId: string): Promise<any[]> {
    // Get direct permissions
    const directPerms = await this.prisma.userPermission.findMany({
      where: {
        userProfileId,
        isGranted: true,
        validFrom: { lte: new Date() },
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      include: {
        permission: true,
      },
    });

    // Get role permissions
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userProfileId,
        isActive: true,
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              where: { isGranted: true },
              include: { permission: true },
            },
          },
        },
      },
    });

    const permissions = new Map();

    // Add direct permissions
    for (const perm of directPerms) {
      const key = `${perm.permission.resource}:${perm.permission.action}:${perm.permission.scope || 'any'}`;
      permissions.set(key, {
        ...perm.permission,
        source: 'direct',
        grantedBy: perm.grantedBy,
        validUntil: perm.validUntil,
      });
    }

    // Add role permissions
    for (const userRole of userRoles) {
      for (const rolePerm of userRole.role.rolePermissions) {
        const key = `${rolePerm.permission.resource}:${rolePerm.permission.action}:${rolePerm.permission.scope || 'any'}`;
        if (!permissions.has(key)) {
          permissions.set(key, {
            ...rolePerm.permission,
            source: 'role',
            roleId: userRole.roleId,
            roleName: userRole.role.name,
          });
        }
      }
    }

    return Array.from(permissions.values());
  }

  /**
   * Check multiple permissions at once
   */
  async hasPermissions(
    userProfileId: string,
    permissions: Array<{
      resource: string;
      action: PermissionAction;
      scope?: PermissionScope;
    }>,
  ): Promise<boolean> {
    for (const perm of permissions) {
      const hasPermission = await this.hasPermission(
        userProfileId,
        perm.resource,
        perm.action,
        perm.scope,
      );
      if (!hasPermission) return false;
    }
    return true;
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(
    userProfileId: string,
    permissions: Array<{
      resource: string;
      action: PermissionAction;
      scope?: PermissionScope;
    }>,
  ): Promise<boolean> {
    for (const perm of permissions) {
      const hasPermission = await this.hasPermission(
        userProfileId,
        perm.resource,
        perm.action,
        perm.scope,
      );
      if (hasPermission) return true;
    }
    return false;
  }
}

export default PermissionService;
