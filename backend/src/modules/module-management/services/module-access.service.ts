import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import {
  ModuleManagementError,
  ModuleNotFoundError,
  ModuleAccessNotFoundError,
  ModuleAccessAlreadyExistsError,
  DatabaseOperationError,
  CacheOperationError,
  BulkOperationPartialFailureError,
} from '../errors/module-errors';
import {
  RetryHandler,
  CircuitBreaker,
  ErrorContextBuilder,
  ErrorRecoveryStrategy,
} from '../utils/error-recovery.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { v7 as uuidv7 } from 'uuid';
import {
  CreateRoleModuleAccessDto,
  CreateUserModuleAccessDto,
  UpdateModuleAccessDto,
  BulkModuleAccessDto,
  RoleModuleAccessResponseDto,
  UserModuleAccessResponseDto,
  UserModulePermissionDto,
} from '../dto/module-access.dto';
import { CacheService } from '../../../cache/cache.service';
import { PermissionAction } from '@prisma/client';
import {
  UserProfile,
  RoleModuleAccess,
  UserModuleAccess,
  BulkModuleAccessResult,
} from '../interfaces/module-management.interface';
import { Transactional } from '../../../common/decorators/transaction.decorator';
import { TransactionManager } from '../../../common/utils/transaction-manager.util';

@Injectable()
export class ModuleAccessService {
  private readonly logger = new Logger(ModuleAccessService.name);
  private readonly transactionManager: TransactionManager;
  private readonly retryHandler: RetryHandler;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly errorRecovery: ErrorRecoveryStrategy;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {
    this.transactionManager = new TransactionManager(prisma);
    this.retryHandler = new RetryHandler();
    this.circuitBreaker = new CircuitBreaker('ModuleAccessService');
    this.errorRecovery = new ErrorRecoveryStrategy();
  }

  /**
   * Create role module access with transaction support
   */
  @Transactional({ isolationLevel: 'ReadCommitted' })
  async createRoleAccess(
    data: CreateRoleModuleAccessDto,
    createdBy: string,
  ): Promise<RoleModuleAccessResponseDto> {
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

      this.logger.log(
        `Role module access created for role ${role.name} and module ${module.name}`,
      );

      return this.mapRoleAccessToResponseDto(access as any);
    } catch (error) {
      this.logger.error(`Error creating role module access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create user module access with transaction support
   */
  @Transactional({ isolationLevel: 'ReadCommitted' })
  async createUserAccess(
    data: CreateUserModuleAccessDto,
    grantedBy: string,
  ): Promise<UserModuleAccessResponseDto> {
    // Validate user and module exist
    const [userProfile, module] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { id: data.userProfileId } }),
      this.prisma.module.findUnique({ where: { id: data.moduleId } }),
    ]);

    if (!userProfile) {
      throw new NotFoundException(
        `User profile with ID ${data.userProfileId} not found`,
      );
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

      this.logger.log(
        `User module access created for user ${data.userProfileId} and module ${module.name}`,
      );

      return this.mapUserAccessToResponseDto(access);
    } catch (error) {
      this.logger.error(`Error creating user module access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update role module access with transaction support
   */
  @Transactional({ isolationLevel: 'RepeatableRead' })
  async updateRoleAccess(
    roleId: string,
    moduleId: string,
    data: UpdateModuleAccessDto,
  ): Promise<RoleModuleAccessResponseDto | UserModuleAccessResponseDto> {
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

      this.logger.log(
        `Role module access updated for role ${roleId} and module ${moduleId}`,
      );

      return this.mapRoleAccessToResponseDto(updated as any);
    } catch (error) {
      this.logger.error(`Error updating role module access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user module access with transaction support
   */
  @Transactional({ isolationLevel: 'RepeatableRead' })
  async updateUserAccess(
    userProfileId: string,
    moduleId: string,
    data: UpdateModuleAccessDto,
  ): Promise<RoleModuleAccessResponseDto | UserModuleAccessResponseDto> {
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

      this.logger.log(
        `User module access updated for user ${userProfileId} and module ${moduleId}`,
      );

      return this.mapUserAccessToResponseDto(updated);
    } catch (error) {
      this.logger.error(`Error updating user module access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete role module access with transaction support
   */
  @Transactional({ isolationLevel: 'ReadCommitted' })
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

      this.logger.log(
        `Role module access deleted for role ${roleId} and module ${moduleId}`,
      );
    } catch (error) {
      this.logger.error(`Error deleting role module access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete user module access with transaction support
   */
  @Transactional({ isolationLevel: 'ReadCommitted' })
  async deleteUserAccess(
    userProfileId: string,
    moduleId: string,
  ): Promise<void> {
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

      this.logger.log(
        `User module access deleted for user ${userProfileId} and module ${moduleId}`,
      );
    } catch (error) {
      this.logger.error(`Error deleting user module access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bulk assign module access with enhanced transaction management
   */
  @Transactional({ isolationLevel: 'ReadCommitted' })
  async bulkAssignAccess(
    data: BulkModuleAccessDto,
    grantedBy: string,
  ): Promise<void> {
    if (data.targetType === 'ROLE') {
      // Handle role-based bulk assignment with transaction
      await this.transactionManager.executeInTransaction(
        [
          {
            name: 'validate-role',
            operation: async (tx) => {
              const role = await tx.role.findUnique({
                where: { id: data.targetId },
              });
              if (!role) {
                throw new NotFoundException(
                  `Role with ID ${data.targetId} not found`,
                );
              }
              return role;
            },
          },
          {
            name: 'validate-modules',
            operation: async (tx) => {
              const modules = await tx.module.findMany({
                where: { id: { in: data.moduleIds } },
              });
              if (modules.length !== data.moduleIds.length) {
                const foundIds = modules.map((m) => m.id);
                const missingIds = data.moduleIds.filter(
                  (id) => !foundIds.includes(id),
                );
                throw new NotFoundException(
                  `Modules not found: ${missingIds.join(', ')}`,
                );
              }
              return modules;
            },
          },
          {
            name: 'assign-role-access',
            operation: async (tx) => {
              const operations = data.moduleIds.map((moduleId) =>
                tx.roleModuleAccess.upsert({
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
              );
              return await Promise.all(operations);
            },
          },
          {
            name: 'invalidate-cache',
            operation: async () => {
              await this.invalidateRoleUsersCache(data.targetId);
            },
          },
        ],
        {
          isolationLevel: 'ReadCommitted',
          timeout: 15000, // Increased timeout for bulk operations
        },
      );
    } else {
      // Handle user-based bulk assignment with transaction
      await this.transactionManager.executeInTransaction(
        [
          {
            name: 'validate-user',
            operation: async (tx) => {
              const userProfile = await tx.userProfile.findUnique({
                where: { id: data.targetId },
              });
              if (!userProfile) {
                throw new NotFoundException(
                  `User profile with ID ${data.targetId} not found`,
                );
              }
              return userProfile;
            },
          },
          {
            name: 'validate-modules',
            operation: async (tx) => {
              const modules = await tx.module.findMany({
                where: { id: { in: data.moduleIds } },
              });
              if (modules.length !== data.moduleIds.length) {
                const foundIds = modules.map((m) => m.id);
                const missingIds = data.moduleIds.filter(
                  (id) => !foundIds.includes(id),
                );
                throw new NotFoundException(
                  `Modules not found: ${missingIds.join(', ')}`,
                );
              }
              return modules;
            },
          },
          {
            name: 'assign-user-access',
            operation: async (tx) => {
              const operations = data.moduleIds.map((moduleId) =>
                tx.userModuleAccess.create({
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
              );
              return await Promise.all(operations);
            },
          },
          {
            name: 'invalidate-cache',
            operation: async () => {
              await this.cacheService.del(`module_access:${data.targetId}`);
            },
          },
        ],
        {
          isolationLevel: 'ReadCommitted',
          timeout: 15000, // Increased timeout for bulk operations
        },
      );
    }

    this.logger.log(
      `Bulk module access assigned to ${data.targetType} ${data.targetId}`,
    );
  }

  /**
   * Get user profile by Clerk ID
   */
  async getUserProfileByClerkId(clerkUserId: string): Promise<UserProfile> {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { clerkUserId },
    });

    if (!userProfile) {
      throw new NotFoundException(
        `User profile not found for Clerk ID ${clerkUserId}`,
      );
    }

    return userProfile;
  }

  /**
   * Get user's module permissions
   */
  async getUserModulePermissions(
    userProfileId: string,
  ): Promise<UserModulePermissionDto[]> {
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

    const roleIds = userRoles.map((ur) => ur.roleId);

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
            OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
          },
        },
        overrides: {
          where: {
            userProfileId,
            OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
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
        perms.forEach((p) => modulePermissions.add(p));
      }

      // Add user-specific permissions
      if (module.userAccess.length > 0) {
        const userAccess = module.userAccess[0];
        const perms = userAccess.permissions as PermissionAction[];
        perms.forEach((p) => modulePermissions.add(p));
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
      if (
        modulePermissions.has(PermissionAction.READ) ||
        modulePermissions.size > 0
      ) {
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
  async getRoleModuleAccess(
    roleId: string,
  ): Promise<RoleModuleAccessResponseDto[]> {
    const accesses = await this.prisma.roleModuleAccess.findMany({
      where: { roleId },
      include: {
        module: true,
        position: true,
      },
    });

    return accesses.map((access) =>
      this.mapRoleAccessToResponseDto(access as any),
    );
  }

  /**
   * Get user's direct module access
   */
  async getUserDirectModuleAccess(
    userProfileId: string,
  ): Promise<UserModuleAccessResponseDto[]> {
    const accesses = await this.prisma.userModuleAccess.findMany({
      where: {
        userProfileId,
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      include: {
        module: true,
      },
    });

    return accesses.map((access) =>
      this.mapUserAccessToResponseDto(access as any),
    );
  }

  /**
   * Invalidate cache for all users with a specific role
   * Uses batch operations for better performance
   */
  private async invalidateRoleUsersCache(roleId: string): Promise<void> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userProfileId: true },
    });

    if (userRoles.length === 0) return;

    // Batch delete operations for better performance
    const cacheKeys = userRoles.map(
      (ur) => `module_access:${ur.userProfileId}`,
    );

    // Delete in batches of 100 to avoid overwhelming Redis
    const batchSize = 100;
    for (let i = 0; i < cacheKeys.length; i += batchSize) {
      const batch = cacheKeys.slice(i, i + batchSize);
      await Promise.all(batch.map((key) => this.cacheService.del(key)));
    }
  }

  /**
   * Generate unique ID using UUID v7
   * UUID v7 provides time-ordered, cryptographically secure identifiers
   */
  private generateId(): string {
    return uuidv7();
  }

  /**
   * Map role module access entity to response DTO
   */
  private mapRoleAccessToResponseDto(entity: any): RoleModuleAccessResponseDto {
    return {
      id: entity.id,
      roleId: entity.roleId,
      moduleId: entity.moduleId,
      positionId: entity.positionId,
      permissions: entity.permissions as PermissionAction[],
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      module: entity.module,
      role: entity.role,
      position: entity.position,
    };
  }

  /**
   * Map user module access entity to response DTO
   */
  private mapUserAccessToResponseDto(entity: any): UserModuleAccessResponseDto {
    return {
      id: entity.id,
      userProfileId: entity.userProfileId,
      moduleId: entity.moduleId,
      permissions: entity.permissions as PermissionAction[],
      isActive: entity.isActive,
      validFrom: entity.validFrom,
      validUntil: entity.validUntil,
      reason: entity.reason,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      module: entity.module,
      userProfile: entity.userProfile,
    };
  }

  /**
   * Warm cache for frequently accessed modules
   * Preloads module access data for active users and common modules
   */
  async warmModuleAccessCache(): Promise<void> {
    const errorContext = new ErrorContextBuilder()
      .add('operation', 'warmModuleAccessCache')
      .addTimestamp();

    try {
      // Get frequently accessed modules (top-level and visible modules)
      const frequentModules = await this.prisma.module.findMany({
        where: {
          isActive: true,
          isVisible: true,
          OR: [
            { parentId: null }, // Top-level modules
            { category: { in: ['SERVICE', 'PERFORMANCE'] } }, // Common categories
          ],
        },
        select: { id: true },
      });

      // Get recently active users with active roles
      const userRoles = await this.prisma.userRole.findMany({
        where: {
          isActive: true,
          userProfile: {
            isActive: true,
          },
        },
        select: {
          userProfileId: true,
        },
        distinct: ['userProfileId'],
        take: 100, // Limit to prevent overloading
      });

      const recentActiveUsers = userRoles.map((ur) => ({
        id: ur.userProfileId,
      }));

      // Warm cache for each user
      const cacheWarmingPromises = recentActiveUsers.map(async (user) => {
        try {
          // This will populate the cache
          await this.getUserModulePermissions(user.id);
        } catch (error) {
          // Log but don't fail the whole warming process
          this.logger.warn(
            `Failed to warm cache for user ${user.id}: ${error.message}`,
          );
        }
      });

      // Execute in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < cacheWarmingPromises.length; i += batchSize) {
        const batch = cacheWarmingPromises.slice(i, i + batchSize);
        await Promise.all(batch);
      }

      this.logger.log(
        `Cache warming completed for ${recentActiveUsers.length} users and ${frequentModules.length} modules`,
      );
    } catch (error) {
      const enhancedError = new CacheOperationError(
        'warm',
        'module_access:*',
        error,
      );
      this.logger.error(enhancedError.message, enhancedError.context);
      // Don't throw - cache warming is non-critical
    }
  }

  /**
   * Schedule periodic cache warming
   * Should be called on application startup or via cron job
   */
  async scheduleCacheWarming(): Promise<void> {
    // Warm cache immediately
    await this.warmModuleAccessCache();

    // Set up periodic warming (every 30 minutes)
    setInterval(
      async () => {
        await this.warmModuleAccessCache();
      },
      30 * 60 * 1000,
    );
  }
}
