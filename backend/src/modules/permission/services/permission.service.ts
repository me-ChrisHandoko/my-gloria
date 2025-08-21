import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePermissionDto } from '../dto/permission/create-permission.dto';
import { UpdatePermissionDto } from '../dto/permission/update-permission.dto';
import {
  CheckPermissionDto,
  PermissionCheckResultDto,
} from '../dto/permission/check-permission.dto';
import { AuditService } from '../../audit/services/audit.service';
import {
  Prisma,
  Permission,
  PermissionAction,
  PermissionScope,
} from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class PermissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    createPermissionDto: CreatePermissionDto,
    createdBy: string,
  ): Promise<Permission> {
    // Check if permission code already exists
    const existing = await this.prisma.permission.findUnique({
      where: { code: createPermissionDto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Permission with code ${createPermissionDto.code} already exists`,
      );
    }

    // Check if resource-action-scope combination already exists
    if (createPermissionDto.scope) {
      const existingCombination = await this.prisma.permission.findFirst({
        where: {
          resource: createPermissionDto.resource,
          action: createPermissionDto.action,
          scope: createPermissionDto.scope,
        },
      });

      if (existingCombination) {
        throw new ConflictException(
          `Permission for ${createPermissionDto.resource}.${createPermissionDto.action} with scope ${createPermissionDto.scope} already exists`,
        );
      }
    }

    const permission = await this.prisma.$transaction(async (tx) => {
      // Extract dependencies from DTO
      const { dependencies, ...permissionData } = createPermissionDto;

      // Create the permission
      const newPermission = await tx.permission.create({
        data: {
          id: uuidv7(),
          ...permissionData,
          createdBy,
        },
        include: {
          group: true,
          dependencies: {
            include: {
              dependsOn: true,
            },
          },
        },
      });

      // Handle dependencies if provided
      if (createPermissionDto.dependencies?.length) {
        await this.createDependencies(
          tx,
          newPermission.id,
          createPermissionDto.dependencies,
        );
      }

      // Log audit
      await this.auditService.log({
        actorId: createdBy,
        action: 'CREATE',
        module: 'permission',
        entityType: 'Permission',
        entityId: newPermission.id,
        entityDisplay: newPermission.code,
        newValues: newPermission,
        metadata: { permissionCode: newPermission.code },
      });

      return newPermission;
    });

    return permission;
  }

  async findAll(filters?: {
    resource?: string;
    action?: PermissionAction;
    scope?: PermissionScope;
    groupId?: string;
    isActive?: boolean;
  }): Promise<Permission[]> {
    const where: Prisma.PermissionWhereInput = {};

    if (filters?.resource) where.resource = filters.resource;
    if (filters?.action) where.action = filters.action;
    if (filters?.scope) where.scope = filters.scope;
    if (filters?.groupId) where.groupId = filters.groupId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    return this.prisma.permission.findMany({
      where,
      include: {
        group: true,
        dependencies: {
          include: {
            dependsOn: true,
          },
        },
        dependentOn: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }, { scope: 'asc' }],
    });
  }

  async findOne(id: string): Promise<Permission> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
      include: {
        group: true,
        dependencies: {
          include: {
            dependsOn: true,
          },
        },
        dependentOn: {
          include: {
            permission: true,
          },
        },
        rolePermissions: {
          include: {
            role: true,
          },
        },
        userPermissions: {
          include: {
            userProfile: true,
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    return permission;
  }

  async findByCode(code: string): Promise<Permission> {
    const permission = await this.prisma.permission.findUnique({
      where: { code },
      include: {
        group: true,
        dependencies: {
          include: {
            dependsOn: true,
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with code ${code} not found`);
    }

    return permission;
  }

  async update(
    id: string,
    updatePermissionDto: UpdatePermissionDto,
    modifiedBy: string,
  ): Promise<Permission> {
    const existing = await this.findOne(id);

    if (existing.isSystemPermission) {
      throw new BadRequestException('System permissions cannot be modified');
    }

    // Check for code uniqueness if updating code
    if (
      updatePermissionDto.code &&
      updatePermissionDto.code !== existing.code
    ) {
      const codeExists = await this.prisma.permission.findUnique({
        where: { code: updatePermissionDto.code },
      });

      if (codeExists) {
        throw new ConflictException(
          `Permission with code ${updatePermissionDto.code} already exists`,
        );
      }
    }

    const permission = await this.prisma.$transaction(async (tx) => {
      // Extract dependencies and other non-direct fields from DTO
      const { dependencies, ...permissionData } = updatePermissionDto;

      const updated = await tx.permission.update({
        where: { id },
        data: {
          ...permissionData,
          updatedAt: new Date(), // Explicitly set updatedAt
        },
        include: {
          group: true,
          dependencies: {
            include: {
              dependsOn: true,
            },
          },
        },
      });

      // Handle dependencies update if provided
      if (updatePermissionDto.dependencies) {
        // Remove existing dependencies
        await tx.permissionDependency.deleteMany({
          where: { permissionId: id },
        });

        // Add new dependencies
        if (updatePermissionDto.dependencies.length > 0) {
          await this.createDependencies(
            tx,
            id,
            updatePermissionDto.dependencies,
          );
        }
      }

      // Log audit
      await this.auditService.log({
        actorId: modifiedBy,
        action: 'UPDATE',
        module: 'permission',
        entityType: 'Permission',
        entityId: updated.id,
        entityDisplay: updated.code,
        oldValues: existing,
        newValues: updated,
        metadata: {
          changedFields: Object.keys(permissionData),
        },
      });

      // Invalidate permission cache for affected users
      await this.invalidatePermissionCache(id);

      return updated;
    });

    return permission;
  }

  async remove(id: string, deletedBy: string): Promise<void> {
    const permission = await this.findOne(id);

    if (permission.isSystemPermission) {
      throw new BadRequestException('System permissions cannot be deleted');
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete the permission (cascades to dependencies)
      await tx.permission.delete({
        where: { id },
      });

      // Log audit
      await this.auditService.log({
        actorId: deletedBy,
        action: 'DELETE',
        module: 'permission',
        entityType: 'Permission',
        entityId: permission.id,
        entityDisplay: permission.code,
        oldValues: permission,
      });

      // Invalidate permission cache for affected users
      await this.invalidatePermissionCache(id);
    });
  }

  async checkPermission(
    checkDto: CheckPermissionDto,
  ): Promise<PermissionCheckResultDto> {
    const startTime = Date.now();
    const result: PermissionCheckResultDto = {
      isAllowed: false,
      grantedBy: [],
    };

    try {
      // Check cache first
      const cached = await this.getCachedPermission(
        checkDto.userId,
        checkDto.resource,
        checkDto.action,
        checkDto.scope,
      );
      if (cached !== null) {
        result.isAllowed = cached;
        result.checkDuration = Date.now() - startTime;
        return result;
      }

      // Check resource-specific permissions if resourceId provided
      if (checkDto.resourceId) {
        const resourcePermission = await this.checkResourcePermission(
          checkDto.userId,
          checkDto.resource,
          checkDto.action,
          checkDto.resourceId,
        );
        if (resourcePermission.isGranted) {
          result.isAllowed = true;
          result.grantedBy?.push('resource-specific');
        }
      }

      // Check direct user permissions
      const userPermission = await this.checkUserPermission(
        checkDto.userId,
        checkDto.resource,
        checkDto.action,
        checkDto.scope,
      );
      if (userPermission.isGranted) {
        result.isAllowed = true;
        result.grantedBy?.push('direct-user-permission');
      } else if (userPermission.isDenied) {
        result.isAllowed = false;
        result.reason = 'Explicitly denied by user permission';
        result.checkDuration = Date.now() - startTime;
        await this.logPermissionCheck(checkDto, result);
        return result;
      }

      // Check role-based permissions
      const rolePermission = await this.checkRolePermission(
        checkDto.userId,
        checkDto.resource,
        checkDto.action,
        checkDto.scope,
      );
      if (rolePermission.isGranted) {
        result.isAllowed = true;
        result.grantedBy?.push(...rolePermission.roles);
      }

      // Cache the result
      await this.cachePermission(
        checkDto.userId,
        checkDto.resource,
        checkDto.action,
        checkDto.scope,
        result.isAllowed,
      );

      if (!result.isAllowed && !result.reason) {
        result.reason = 'No permission granted';
      }

      result.checkDuration = Date.now() - startTime;
      await this.logPermissionCheck(checkDto, result);
      return result;
    } catch (error) {
      result.isAllowed = false;
      result.reason = 'Permission check failed';
      result.checkDuration = Date.now() - startTime;
      await this.logPermissionCheck(checkDto, result);
      throw error;
    }
  }

  // Private helper methods
  private async createDependencies(
    tx: any,
    permissionId: string,
    dependencyIds: string[],
  ): Promise<void> {
    const dependencies = dependencyIds.map((depId) => ({
      id: uuidv7(),
      permissionId,
      dependsOnId: depId,
      isRequired: true,
    }));

    await tx.permissionDependency.createMany({
      data: dependencies,
    });
  }

  private async checkUserPermission(
    userId: string,
    resource: string,
    action: PermissionAction,
    scope?: PermissionScope,
  ): Promise<{ isGranted: boolean; isDenied: boolean }> {
    const permission = await this.prisma.permission.findFirst({
      where: {
        resource,
        action,
        scope: scope || null,
      },
    });

    if (!permission) {
      return { isGranted: false, isDenied: false };
    }

    const userPermission = await this.prisma.userPermission.findFirst({
      where: {
        userProfileId: userId,
        permissionId: permission.id,
        isGranted: true,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        validFrom: { lte: new Date() },
      },
      orderBy: { priority: 'desc' },
    });

    if (!userPermission) {
      return { isGranted: false, isDenied: false };
    }

    return {
      isGranted: userPermission.isGranted,
      isDenied: !userPermission.isGranted,
    };
  }

  private async checkRolePermission(
    userId: string,
    resource: string,
    action: PermissionAction,
    scope?: PermissionScope,
  ): Promise<{ isGranted: boolean; roles: string[] }> {
    const permission = await this.prisma.permission.findFirst({
      where: {
        resource,
        action,
        scope: scope || null,
      },
    });

    if (!permission) {
      return { isGranted: false, roles: [] };
    }

    // Get user's active roles
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userProfileId: userId,
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        validFrom: { lte: new Date() },
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              where: {
                permissionId: permission.id,
                OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
                validFrom: { lte: new Date() },
              },
            },
          },
        },
      },
    });

    const grantingRoles: string[] = [];
    let isGranted = false;

    for (const userRole of userRoles) {
      const rolePermission = userRole.role.rolePermissions[0];
      if (rolePermission?.isGranted) {
        isGranted = true;
        grantingRoles.push(userRole.role.name);
      }
    }

    return { isGranted, roles: grantingRoles };
  }

  private async checkResourcePermission(
    userId: string,
    resource: string,
    action: PermissionAction,
    resourceId: string,
  ): Promise<{ isGranted: boolean }> {
    const permission = await this.prisma.permission.findFirst({
      where: {
        resource,
        action,
      },
    });

    if (!permission) {
      return { isGranted: false };
    }

    const resourcePermission = await this.prisma.resourcePermission.findFirst({
      where: {
        userProfileId: userId,
        permissionId: permission.id,
        resourceType: resource,
        resourceId,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        validFrom: { lte: new Date() },
      },
    });

    return { isGranted: resourcePermission?.isGranted || false };
  }

  private async getCachedPermission(
    userId: string,
    resource: string,
    action: PermissionAction,
    scope?: PermissionScope,
  ): Promise<boolean | null> {
    const cacheKey = `${userId}:${resource}:${action}:${scope || 'none'}`;

    const cached = await this.prisma.permissionCache.findFirst({
      where: {
        userProfileId: userId,
        cacheKey,
        isValid: true,
        expiresAt: { gte: new Date() },
      },
    });

    if (!cached) return null;

    const permissions = cached.permissions as any;
    return permissions?.isAllowed || false;
  }

  private async cachePermission(
    userId: string,
    resource: string,
    action: PermissionAction,
    scope: PermissionScope | undefined,
    isAllowed: boolean,
  ): Promise<void> {
    const cacheKey = `${userId}:${resource}:${action}:${scope || 'none'}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await this.prisma.permissionCache.upsert({
      where: {
        userProfileId_cacheKey: {
          userProfileId: userId,
          cacheKey,
        },
      },
      create: {
        id: uuidv7(),
        userProfileId: userId,
        cacheKey,
        permissions: { isAllowed },
        computedAt: new Date(),
        expiresAt,
        isValid: true,
      },
      update: {
        permissions: { isAllowed },
        computedAt: new Date(),
        expiresAt,
        isValid: true,
      },
    });
  }

  private async invalidatePermissionCache(permissionId: string): Promise<void> {
    // Find all users affected by this permission change
    const affectedUsers = await this.prisma.$queryRaw<
      { userProfileId: string }[]
    >`
      SELECT DISTINCT user_profile_id as "userProfileId"
      FROM gloria_ops.user_permissions 
      WHERE permission_id = ${permissionId}
      UNION
      SELECT DISTINCT ur.user_profile_id as "userProfileId"
      FROM gloria_ops.user_roles ur
      JOIN gloria_ops.role_permissions rp ON ur.role_id = rp.role_id
      WHERE rp.permission_id = ${permissionId}
    `;

    // Invalidate cache for all affected users
    if (affectedUsers.length > 0) {
      await this.prisma.permissionCache.updateMany({
        where: {
          userProfileId: {
            in: affectedUsers.map((u) => u.userProfileId),
          },
        },
        data: {
          isValid: false,
        },
      });
    }
  }

  private async logPermissionCheck(
    checkDto: CheckPermissionDto,
    result: PermissionCheckResultDto,
  ): Promise<void> {
    await this.prisma.permissionCheckLog.create({
      data: {
        id: uuidv7(),
        userProfileId: checkDto.userId,
        resource: checkDto.resource,
        action: checkDto.action.toString(),
        scope: checkDto.scope?.toString(),
        resourceId: checkDto.resourceId,
        isAllowed: result.isAllowed,
        deniedReason: result.reason,
        checkDuration: result.checkDuration || 0,
        metadata: {
          grantedBy: result.grantedBy,
        },
      },
    });
  }
}
