import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateRoleModuleAccessDto,
  CreateUserModuleAccessDto,
  UpdateModuleAccessDto,
  BulkModuleAccessDto,
  ModuleAccessResponseDto,
  UserModulePermissionDto,
} from '../dto/module-access.dto';
import { CacheService } from '../../../cache/cache.service';
import { PermissionAction } from '@prisma/client';

@Injectable()
export class ModuleAccessService {
  private readonly logger = new Logger(ModuleAccessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Create role module access
   */
  async createRoleAccess(
    data: CreateRoleModuleAccessDto,
    createdBy: string,
  ): Promise<ModuleAccessResponseDto> {
    // Validate role and module exist
    const [role, module] = await Promise.all([
      this.prisma.role.findUnique({ where: { id: data.roleId } }),
      this.prisma.module.findUnique({ where: { id: data.moduleId } }),
    ]);

    if (!role) {
      throw new NotFoundException(`Role with ID ${data.roleId} not found`);
    }

    if (!module) {
      throw new NotFoundException(`Module with ID ${data.moduleId} not found`);
    }

    // Check if access already exists
    const existingAccess = await this.prisma.roleModuleAccess.findUnique({
      where: {
        roleId_moduleId: {
          roleId: data.roleId,
          moduleId: data.moduleId,
        },
      },
    });

    if (existingAccess) {
      throw new ConflictException('Role module access already exists');
    }

    try {
      const access = await this.prisma.roleModuleAccess.create({
        data: {
          id: this.generateId(),
          roleId: data.roleId,
          moduleId: data.moduleId,
          positionId: data.positionId,
          permissions: data.permissions,
          isActive: data.isActive ?? true,
          createdBy,
        },
        include: {
          role: true,
          module: true,
          position: true,
        },
      });

      // Invalidate cache for all users with this role
      await this.invalidateRoleUsersCache(data.roleId);

      this.logger.log(`Role module access created for role ${role.name} and module ${module.name}`);
      
      return this.mapToResponseDto(access);
    } catch (error) {
      this.logger.error(`Error creating role module access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create user module access
   */
  async createUserAccess(
    data: CreateUserModuleAccessDto,
    grantedBy: string,
  ): Promise<ModuleAccessResponseDto> {
    // Validate user and module exist
    const [userProfile, module] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { id: data.userProfileId } }),
      this.prisma.module.findUnique({ where: { id: data.moduleId } }),
    ]);

    if (!userProfile) {
      throw new NotFoundException(`User profile with ID ${data.userProfileId} not found`);
    }

    if (!module) {
      throw new NotFoundException(`Module with ID ${data.moduleId} not found`);
    }

    try {
      const access = await this.prisma.userModuleAccess.create({
        data: {
          id: this.generateId(),
          userProfileId: data.userProfileId,
          moduleId: data.moduleId,
          permissions: data.permissions,
          validFrom: data.validFrom ? new Date(data.validFrom) : new Date(),
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          reason: data.reason,
          isActive: data.isActive ?? true,
          grantedBy,
        },
        include: {
          userProfile: true,
          module: true,
        },
      });

      // Invalidate cache for this user
      await this.cacheService.del(`module_access:${data.userProfileId}`);

      this.logger.log(`User module access created for user ${data.userProfileId} and module ${module.name}`);
      
      return this.mapToResponseDto(access);
    } catch (error) {
      this.logger.error(`Error creating user module access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update role module access
   */
  async updateRoleAccess(
    roleId: string,
    moduleId: string,
    data: UpdateModuleAccessDto,
  ): Promise<ModuleAccessResponseDto> {
    const access = await this.prisma.roleModuleAccess.findUnique({
      where: {
        roleId_moduleId: { roleId, moduleId },
      },
    });

    if (!access) {
      throw new NotFoundException('Role module access not found');
    }

    try {
      const updated = await this.prisma.roleModuleAccess.update({
        where: {
          roleId_moduleId: { roleId, moduleId },
        },
        data: {
          permissions: data.permissions,
          isActive: data.isActive,
        },
        include: {
          role: true,
          module: true,
          position: true,
        },
      });

      // Invalidate cache for all users with this role
      await this.invalidateRoleUsersCache(roleId);

      this.logger.log(`Role module access updated for role ${roleId} and module ${moduleId}`);
      
      return this.mapToResponseDto(updated);
    } catch (error) {
      this.logger.error(`Error updating role module access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user module access
   */
  async updateUserAccess(
    userProfileId: string,
    moduleId: string,
    data: UpdateModuleAccessDto,
  ): Promise<ModuleAccessResponseDto> {
    const access = await this.prisma.userModuleAccess.findFirst({
      where: {
        userProfileId,
        moduleId,
      },
    });

    if (!access) {
      throw new NotFoundException('User module access not found');
    }

    try {
      const updated = await this.prisma.userModuleAccess.update({
        where: {
          id: access.id,
        },
        data: {
          permissions: data.permissions,
          validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
          isActive: data.isActive,
        },
        include: {
          userProfile: true,
          module: true,
        },
      });

      // Invalidate cache for this user
      await this.cacheService.del(`module_access:${userProfileId}`);

      this.logger.log(`User module access updated for user ${userProfileId} and module ${moduleId}`);
      
      return this.mapToResponseDto(updated);
    } catch (error) {
      this.logger.error(`Error updating user module access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete role module access
   */
  async deleteRoleAccess(roleId: string, moduleId: string): Promise<void> {
    const access = await this.prisma.roleModuleAccess.findUnique({
      where: {
        roleId_moduleId: { roleId, moduleId },
      },
    });

    if (!access) {
      throw new NotFoundException('Role module access not found');
    }

    try {
      await this.prisma.roleModuleAccess.delete({
        where: {
          roleId_moduleId: { roleId, moduleId },
        },
      });

      // Invalidate cache for all users with this role
      await this.invalidateRoleUsersCache(roleId);

      this.logger.log(`Role module access deleted for role ${roleId} and module ${moduleId}`);
    } catch (error) {
      this.logger.error(`Error deleting role module access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete user module access
   */
  async deleteUserAccess(userProfileId: string, moduleId: string): Promise<void> {
    const access = await this.prisma.userModuleAccess.findFirst({
      where: {
        userProfileId,
        moduleId,
      },
    });

    if (!access) {
      throw new NotFoundException('User module access not found');
    }

    try {
      await this.prisma.userModuleAccess.delete({
        where: {
          id: access.id,
        },
      });

      // Invalidate cache for this user
      await this.cacheService.del(`module_access:${userProfileId}`);

      this.logger.log(`User module access deleted for user ${userProfileId} and module ${moduleId}`);
    } catch (error) {
      this.logger.error(`Error deleting user module access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bulk assign module access
   */
  async bulkAssignAccess(
    data: BulkModuleAccessDto,
    grantedBy: string,
  ): Promise<void> {
    try {
      if (data.targetType === 'ROLE') {
        // Validate role exists
        const role = await this.prisma.role.findUnique({
          where: { id: data.targetId },
        });

        if (!role) {
          throw new NotFoundException(`Role with ID ${data.targetId} not found`);
        }

        // Create or update role module access for each module
        await this.prisma.$transaction(
          data.moduleIds.map(moduleId =>
            this.prisma.roleModuleAccess.upsert({
              where: {
                roleId_moduleId: {
                  roleId: data.targetId,
                  moduleId,
                },
              },
              update: {
                permissions: data.permissions,
                positionId: data.positionId,
                isActive: true,
              },
              create: {
                id: this.generateId(),
                roleId: data.targetId,
                moduleId,
                positionId: data.positionId,
                permissions: data.permissions,
                isActive: true,
                createdBy: grantedBy,
              },
            }),
          ),
        );

        // Invalidate cache for all users with this role
        await this.invalidateRoleUsersCache(data.targetId);
      } else {
        // Validate user profile exists
        const userProfile = await this.prisma.userProfile.findUnique({
          where: { id: data.targetId },
        });

        if (!userProfile) {
          throw new NotFoundException(`User profile with ID ${data.targetId} not found`);
        }

        // Create user module access for each module
        await this.prisma.$transaction(
          data.moduleIds.map(moduleId =>
            this.prisma.userModuleAccess.create({
              data: {
                id: this.generateId(),
                userProfileId: data.targetId,
                moduleId,
                permissions: data.permissions,
                validFrom: new Date(),
                isActive: true,
                grantedBy,
              },
            }),
          ),
        );

        // Invalidate cache for this user
        await this.cacheService.del(`module_access:${data.targetId}`);
      }

      this.logger.log(`Bulk module access assigned to ${data.targetType} ${data.targetId}`);
    } catch (error) {
      this.logger.error(`Error bulk assigning module access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user profile by Clerk ID
   */
  async getUserProfileByClerkId(clerkUserId: string): Promise<any> {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { clerkUserId },
    });

    if (!userProfile) {
      throw new NotFoundException(`User profile not found for Clerk ID ${clerkUserId}`);
    }

    return userProfile;
  }

  /**
   * Get user's module permissions
   */
  async getUserModulePermissions(userProfileId: string): Promise<UserModulePermissionDto[]> {
    // Check cache first
    const cacheKey = `module_access:${userProfileId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get user's roles
    const userRoles = await this.prisma.userRole.findMany({
      where: { userProfileId },
      select: { roleId: true },
    });

    const roleIds = userRoles.map(ur => ur.roleId);

    // Get all modules with their access settings
    const modules = await this.prisma.module.findMany({
      where: {
        isActive: true,
      },
      include: {
        roleAccess: {
          where: {
            roleId: { in: roleIds },
            isActive: true,
          },
        },
        userAccess: {
          where: {
            userProfileId,
            isActive: true,
            OR: [
              { validUntil: null },
              { validUntil: { gte: new Date() } },
            ],
          },
        },
        overrides: {
          where: {
            userProfileId,
            OR: [
              { validUntil: null },
              { validUntil: { gte: new Date() } },
            ],
          },
        },
      },
    });

    const permissions: UserModulePermissionDto[] = [];

    for (const module of modules) {
      const modulePermissions = new Set<PermissionAction>();
      let source: 'ROLE' | 'USER' | 'OVERRIDE' = 'ROLE';
      let validUntil: Date | null = null;

      // Aggregate permissions from roles
      for (const roleAccess of module.roleAccess) {
        const perms = roleAccess.permissions as PermissionAction[];
        perms.forEach(p => modulePermissions.add(p));
      }

      // Add user-specific permissions
      if (module.userAccess.length > 0) {
        const userAccess = module.userAccess[0];
        const perms = userAccess.permissions as PermissionAction[];
        perms.forEach(p => modulePermissions.add(p));
        source = 'USER';
        validUntil = userAccess.validUntil;
      }

      // Apply overrides
      for (const override of module.overrides) {
        if (override.isGranted) {
          modulePermissions.add(override.permissionType);
          source = 'OVERRIDE';
        } else {
          modulePermissions.delete(override.permissionType);
        }
      }

      // Only include modules with at least READ permission
      if (modulePermissions.has(PermissionAction.READ) || modulePermissions.size > 0) {
        permissions.push({
          moduleId: module.id,
          moduleCode: module.code,
          moduleName: module.name,
          permissions: Array.from(modulePermissions),
          source,
          validUntil: validUntil || undefined,
        });
      }
    }

    // Cache the results for 5 minutes
    await this.cacheService.set(cacheKey, JSON.stringify(permissions), 300);

    return permissions;
  }

  /**
   * Get role's module access
   */
  async getRoleModuleAccess(roleId: string): Promise<ModuleAccessResponseDto[]> {
    const accesses = await this.prisma.roleModuleAccess.findMany({
      where: { roleId },
      include: {
        module: true,
        position: true,
      },
    });

    return accesses.map(this.mapToResponseDto);
  }

  /**
   * Get user's direct module access
   */
  async getUserDirectModuleAccess(userProfileId: string): Promise<ModuleAccessResponseDto[]> {
    const accesses = await this.prisma.userModuleAccess.findMany({
      where: {
        userProfileId,
        isActive: true,
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } },
        ],
      },
      include: {
        module: true,
      },
    });

    return accesses.map(this.mapToResponseDto);
  }

  /**
   * Invalidate cache for all users with a specific role
   */
  private async invalidateRoleUsersCache(roleId: string): Promise<void> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userProfileId: true },
    });

    await Promise.all(
      userRoles.map(ur => this.cacheService.del(`module_access:${ur.userProfileId}`)),
    );
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Map database entity to response DTO
   */
  private mapToResponseDto(entity: any): ModuleAccessResponseDto {
    return {
      id: entity.id,
      moduleId: entity.moduleId,
      roleId: entity.roleId || undefined,
      userProfileId: entity.userProfileId || undefined,
      positionId: entity.positionId || undefined,
      permissions: entity.permissions as PermissionAction[],
      isActive: entity.isActive,
      validFrom: entity.validFrom || undefined,
      validUntil: entity.validUntil || undefined,
      reason: entity.reason || undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      module: entity.module || undefined,
      role: entity.role || undefined,
      userProfile: entity.userProfile || undefined,
      position: entity.position || undefined,
    };
  }
}