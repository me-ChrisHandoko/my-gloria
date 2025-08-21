import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateRoleDto } from '../dto/role/create-role.dto';
import { UpdateRoleDto } from '../dto/role/update-role.dto';
import {
  AssignRoleDto,
  RevokeRoleDto,
  RolePermissionDto,
} from '../dto/role/assign-role.dto';
import { AuditService } from '../../audit/services/audit.service';
import { Prisma, Role, UserRole, RolePermission } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(createRoleDto: CreateRoleDto, createdBy: string): Promise<Role> {
    // Check if role code already exists
    const existing = await this.prisma.role.findUnique({
      where: { code: createRoleDto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Role with code ${createRoleDto.code} already exists`,
      );
    }

    const role = await this.prisma.$transaction(async (tx) => {
      // Create the role
      const newRole = await tx.role.create({
        data: {
          id: uuidv7(),
          code: createRoleDto.code,
          name: createRoleDto.name,
          description: createRoleDto.description,
          hierarchyLevel: createRoleDto.hierarchyLevel,
          isSystemRole: createRoleDto.isSystemRole || false,
          createdBy,
        },
      });

      // Assign permissions if provided
      if (createRoleDto.permissionIds?.length) {
        await this.assignPermissionsToRole(
          tx,
          newRole.id,
          createRoleDto.permissionIds,
          createdBy,
        );
      }

      // Create hierarchy relationships if parent roles provided
      if (createRoleDto.parentRoleIds?.length) {
        await this.createRoleHierarchy(
          tx,
          newRole.id,
          createRoleDto.parentRoleIds,
        );
      }

      // Log audit
      await this.auditService.log({
        actorId: createdBy,
        action: 'CREATE',
        module: 'role',
        entityType: 'Role',
        entityId: newRole.id,
        entityDisplay: newRole.name,
        newValues: newRole,
        metadata: { roleCode: newRole.code },
      });

      return newRole;
    });

    return this.findOne(role.id);
  }

  async findAll(filters?: {
    hierarchyLevel?: number;
    isSystemRole?: boolean;
    isActive?: boolean;
    includePermissions?: boolean;
  }): Promise<Role[]> {
    const where: Prisma.RoleWhereInput = {};

    if (filters?.hierarchyLevel !== undefined)
      where.hierarchyLevel = filters.hierarchyLevel;
    if (filters?.isSystemRole !== undefined)
      where.isSystemRole = filters.isSystemRole;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    return this.prisma.role.findMany({
      where,
      include: {
        rolePermissions: filters?.includePermissions
          ? {
              include: {
                permission: true,
              },
            }
          : false,
        childRoles: {
          include: {
            role: true,
          },
        },
        parentRoles: {
          include: {
            parentRole: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
      orderBy: [{ hierarchyLevel: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: {
              include: {
                group: true,
              },
            },
          },
        },
        userRoles: {
          where: { isActive: true },
          include: {
            userProfile: {
              include: {
                dataKaryawan: {
                  select: {
                    nama: true,
                    nip: true,
                  },
                },
              },
            },
          },
        },
        childRoles: {
          include: {
            role: true,
          },
        },
        parentRoles: {
          include: {
            parentRole: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async findByCode(code: string): Promise<Role> {
    const role = await this.prisma.role.findUnique({
      where: { code },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with code ${code} not found`);
    }

    return role;
  }

  async update(
    id: string,
    updateRoleDto: UpdateRoleDto,
    modifiedBy: string,
  ): Promise<Role> {
    const existing = await this.findOne(id);

    if (existing.isSystemRole) {
      throw new BadRequestException('System roles cannot be modified');
    }

    // Check for code uniqueness if updating code
    if (updateRoleDto.code && updateRoleDto.code !== existing.code) {
      const codeExists = await this.prisma.role.findUnique({
        where: { code: updateRoleDto.code },
      });

      if (codeExists) {
        throw new ConflictException(
          `Role with code ${updateRoleDto.code} already exists`,
        );
      }
    }

    const role = await this.prisma.$transaction(async (tx) => {
      // Extract non-relation fields for update
      const { permissionIds, parentRoleIds, ...updateData } = updateRoleDto;

      const updated = await tx.role.update({
        where: { id },
        data: updateData,
      });

      // Update permissions if provided
      if (permissionIds !== undefined) {
        // Remove existing permissions
        await tx.rolePermission.deleteMany({
          where: { roleId: id },
        });

        // Add new permissions
        if (permissionIds.length > 0) {
          await this.assignPermissionsToRole(tx, id, permissionIds, modifiedBy);
        }
      }

      // Update hierarchy if provided
      if (parentRoleIds !== undefined) {
        // Remove existing hierarchy
        await tx.roleHierarchy.deleteMany({
          where: { roleId: id },
        });

        // Add new hierarchy
        if (parentRoleIds.length > 0) {
          await this.createRoleHierarchy(tx, id, parentRoleIds);
        }
      }

      // Log audit
      await this.auditService.log({
        actorId: modifiedBy,
        action: 'UPDATE',
        module: 'role',
        entityType: 'Role',
        entityId: updated.id,
        entityDisplay: updated.name,
        oldValues: existing,
        newValues: updated,
        metadata: {
          changedFields: Object.keys(updateRoleDto),
        },
      });

      // Invalidate permission cache for affected users
      await this.invalidateRolePermissionCache(id);

      return updated;
    });

    return this.findOne(role.id);
  }

  async remove(id: string, deletedBy: string): Promise<void> {
    const role = await this.findOne(id);

    if (role.isSystemRole) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    // Check if role is assigned to any users
    const assignedUsers = await this.prisma.userRole.count({
      where: { roleId: id, isActive: true },
    });

    if (assignedUsers > 0) {
      throw new BadRequestException(
        `Cannot delete role that is assigned to ${assignedUsers} users`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete the role (cascades to permissions and hierarchy)
      await tx.role.delete({
        where: { id },
      });

      // Log audit
      await this.auditService.log({
        actorId: deletedBy,
        action: 'DELETE',
        module: 'role',
        entityType: 'Role',
        entityId: role.id,
        entityDisplay: role.name,
        oldValues: role,
      });

      // Invalidate permission cache
      await this.invalidateRolePermissionCache(id);
    });
  }

  async assignRole(
    roleId: string,
    assignRoleDto: AssignRoleDto,
    assignedBy: string,
  ): Promise<UserRole> {
    const role = await this.findOne(roleId);

    // Check if user exists
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { id: assignRoleDto.userProfileId },
    });

    if (!userProfile) {
      throw new NotFoundException(
        `User profile ${assignRoleDto.userProfileId} not found`,
      );
    }

    // Check if role is already assigned
    const existing = await this.prisma.userRole.findFirst({
      where: {
        userProfileId: assignRoleDto.userProfileId,
        roleId,
        isActive: true,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Role ${role.name} is already assigned to this user`,
      );
    }

    const userRole = await this.prisma.$transaction(async (tx) => {
      const newUserRole = await tx.userRole.create({
        data: {
          id: uuidv7(),
          userProfileId: assignRoleDto.userProfileId,
          roleId,
          assignedBy,
          validFrom: assignRoleDto.validFrom
            ? new Date(assignRoleDto.validFrom)
            : new Date(),
          validUntil: assignRoleDto.validUntil
            ? new Date(assignRoleDto.validUntil)
            : null,
        },
      });

      // Log audit
      await this.auditService.log({
        actorId: assignedBy,
        action: 'ASSIGN',
        module: 'role',
        entityType: 'UserRole',
        entityId: newUserRole.id,
        entityDisplay: `${role.name} to user ${assignRoleDto.userProfileId}`,
        newValues: newUserRole,
        metadata: {
          targetUserId: assignRoleDto.userProfileId,
          roleName: role.name,
        },
      });

      // Invalidate user's permission cache
      await this.invalidateUserPermissionCache(assignRoleDto.userProfileId);

      return newUserRole;
    });

    return userRole;
  }

  async revokeRole(
    roleId: string,
    revokeRoleDto: RevokeRoleDto,
    revokedBy: string,
  ): Promise<void> {
    const role = await this.findOne(roleId);

    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userProfileId: revokeRoleDto.userProfileId,
        roleId,
        isActive: true,
      },
    });

    if (!userRole) {
      throw new NotFoundException(
        `Role ${role.name} is not assigned to this user`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.update({
        where: { id: userRole.id },
        data: { isActive: false },
      });

      // Log audit
      await this.auditService.log({
        actorId: revokedBy,
        action: 'REVOKE',
        module: 'role',
        entityType: 'UserRole',
        entityId: userRole.id,
        entityDisplay: `${role.name} from user ${revokeRoleDto.userProfileId}`,
        oldValues: userRole,
        metadata: {
          targetUserId: revokeRoleDto.userProfileId,
          roleName: role.name,
        },
      });

      // Invalidate user's permission cache
      await this.invalidateUserPermissionCache(revokeRoleDto.userProfileId);
    });
  }

  async assignPermissions(
    roleId: string,
    permissions: RolePermissionDto[],
    grantedBy: string,
  ): Promise<RolePermission[]> {
    const role = await this.findOne(roleId);

    if (role.isSystemRole) {
      throw new BadRequestException(
        'Cannot modify permissions for system roles',
      );
    }

    const rolePermissions = await this.prisma.$transaction(async (tx) => {
      const created: RolePermission[] = [];

      for (const perm of permissions) {
        // Check if permission exists
        const permission = await tx.permission.findUnique({
          where: { id: perm.permissionId },
        });

        if (!permission) {
          throw new NotFoundException(
            `Permission ${perm.permissionId} not found`,
          );
        }

        // Check if already assigned
        const existing = await tx.rolePermission.findUnique({
          where: {
            roleId_permissionId: {
              roleId,
              permissionId: perm.permissionId,
            },
          },
        });

        if (existing) {
          // Update existing
          const updated = await tx.rolePermission.update({
            where: { id: existing.id },
            data: {
              isGranted: perm.isGranted ?? true,
              conditions: perm.conditions,
              validFrom: perm.validFrom
                ? new Date(perm.validFrom)
                : existing.validFrom,
              validUntil: perm.validUntil
                ? new Date(perm.validUntil)
                : existing.validUntil,
              grantedBy,
              grantReason: perm.grantReason,
            },
          });
          created.push(updated);
        } else {
          // Create new
          const newPerm = await tx.rolePermission.create({
            data: {
              id: uuidv7(),
              roleId,
              permissionId: perm.permissionId,
              isGranted: perm.isGranted ?? true,
              conditions: perm.conditions,
              validFrom: perm.validFrom ? new Date(perm.validFrom) : new Date(),
              validUntil: perm.validUntil ? new Date(perm.validUntil) : null,
              grantedBy,
              grantReason: perm.grantReason,
            },
          });
          created.push(newPerm);
        }
      }

      // Log audit
      await this.auditService.log({
        actorId: grantedBy,
        action: 'UPDATE',
        module: 'role',
        entityType: 'RolePermission',
        entityId: roleId,
        entityDisplay: `Permissions for ${role.name}`,
        newValues: { permissions: created.map((p) => p.permissionId) },
      });

      // Invalidate permission cache
      await this.invalidateRolePermissionCache(roleId);

      return created;
    });

    return rolePermissions;
  }

  async removePermission(
    roleId: string,
    permissionId: string,
    removedBy: string,
  ): Promise<void> {
    const role = await this.findOne(roleId);

    if (role.isSystemRole) {
      throw new BadRequestException(
        'Cannot modify permissions for system roles',
      );
    }

    const rolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    if (!rolePermission) {
      throw new NotFoundException('Permission not assigned to this role');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.delete({
        where: { id: rolePermission.id },
      });

      // Log audit
      await this.auditService.log({
        actorId: removedBy,
        action: 'DELETE',
        module: 'role',
        entityType: 'RolePermission',
        entityId: rolePermission.id,
        entityDisplay: `Permission ${permissionId} from ${role.name}`,
        oldValues: rolePermission,
      });

      // Invalidate permission cache
      await this.invalidateRolePermissionCache(roleId);
    });
  }

  async getInheritedPermissions(roleId: string): Promise<any[]> {
    // Get role with hierarchy
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        parentRoles: {
          include: {
            parentRole: {
              include: {
                rolePermissions: {
                  where: { isGranted: true },
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        rolePermissions: {
          where: { isGranted: true },
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    const permissions = new Map<string, any>();

    // Add direct permissions
    role.rolePermissions.forEach((rp) => {
      permissions.set(rp.permission.id, {
        ...rp.permission,
        source: 'direct',
        roleId: role.id,
        roleName: role.name,
      });
    });

    // Add inherited permissions
    for (const hierarchy of role.parentRoles) {
      if (hierarchy.inheritPermissions) {
        hierarchy.parentRole.rolePermissions.forEach((rp) => {
          if (!permissions.has(rp.permission.id)) {
            permissions.set(rp.permission.id, {
              ...rp.permission,
              source: 'inherited',
              roleId: hierarchy.parentRole.id,
              roleName: hierarchy.parentRole.name,
            });
          }
        });
      }
    }

    return Array.from(permissions.values());
  }

  // Private helper methods
  private async assignPermissionsToRole(
    tx: any,
    roleId: string,
    permissionIds: string[],
    grantedBy: string,
  ): Promise<void> {
    const rolePermissions = permissionIds.map((permissionId) => ({
      id: uuidv7(),
      roleId,
      permissionId,
      isGranted: true,
      grantedBy,
    }));

    await tx.rolePermission.createMany({
      data: rolePermissions,
    });
  }

  private async createRoleHierarchy(
    tx: any,
    roleId: string,
    parentRoleIds: string[],
  ): Promise<void> {
    const hierarchies = parentRoleIds.map((parentRoleId) => ({
      id: uuidv7(),
      roleId,
      parentRoleId,
      inheritPermissions: true,
    }));

    await tx.roleHierarchy.createMany({
      data: hierarchies,
    });
  }

  private async invalidateRolePermissionCache(roleId: string): Promise<void> {
    // Find all users with this role
    const affectedUsers = await this.prisma.userRole.findMany({
      where: { roleId, isActive: true },
      select: { userProfileId: true },
    });

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

  private async invalidateUserPermissionCache(
    userProfileId: string,
  ): Promise<void> {
    await this.prisma.permissionCache.updateMany({
      where: { userProfileId },
      data: { isValid: false },
    });
  }
}
