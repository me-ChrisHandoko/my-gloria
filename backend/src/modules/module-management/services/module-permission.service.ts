import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CacheService } from '../../../cache/cache.service';
import { ModuleAccessService } from './module-access.service';
import { PermissionAction } from '@prisma/client';

export interface ModulePermissionResult {
  hasAccess: boolean;
  moduleId: string;
  moduleCode: string;
  permissions: PermissionAction[];
  source: 'ROLE' | 'USER' | 'OVERRIDE' | 'NONE';
  reason?: string;
}

@Injectable()
export class ModulePermissionService {
  private readonly logger = new Logger(ModulePermissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly moduleAccessService: ModuleAccessService,
  ) {}

  /**
   * Check if user has access to a module
   */
  async checkModuleAccess(
    userProfileId: string,
    moduleCode: string,
    action?: PermissionAction,
  ): Promise<ModulePermissionResult> {
    // Get module by code
    const module = await this.prisma.module.findUnique({
      where: { code: moduleCode },
    });

    if (!module) {
      throw new NotFoundException(`Module with code ${moduleCode} not found`);
    }

    // Check cache first
    const cacheKey = `module_perm:${userProfileId}:${module.id}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      const result = JSON.parse(cached);
      
      // Check specific action if provided
      if (action && !result.permissions.includes(action)) {
        throw new ForbiddenException(`You don't have ${action} permission for module ${module.name}`);
      }
      
      return result;
    }

    // Initialize result
    const result: ModulePermissionResult = {
      hasAccess: false,
      moduleId: module.id,
      moduleCode: module.code,
      permissions: [],
      source: 'NONE',
    };

    // Get all user permissions for this module
    const userPermissions = await this.moduleAccessService.getUserModulePermissions(userProfileId);
    const modulePermission = userPermissions.find(p => p.moduleId === module.id);

    if (modulePermission) {
      result.hasAccess = modulePermission.permissions.length > 0;
      result.permissions = modulePermission.permissions;
      result.source = modulePermission.source;
    }

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, JSON.stringify(result), 300);

    // Check specific action if provided
    if (action && !result.permissions.includes(action)) {
      throw new ForbiddenException(`You don't have ${action} permission for module ${module.name}`);
    }

    return result;
  }

  /**
   * Check if user can perform an action on a module
   */
  async canPerformAction(
    userProfileId: string,
    moduleCode: string,
    action: PermissionAction,
  ): Promise<boolean> {
    try {
      const result = await this.checkModuleAccess(userProfileId, moduleCode, action);
      return result.permissions.includes(action);
    } catch (error) {
      this.logger.error(`Error checking module permission: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all modules user has access to
   */
  async getUserAccessibleModules(userProfileId: string): Promise<any[]> {
    const permissions = await this.moduleAccessService.getUserModulePermissions(userProfileId);
    
    const moduleIds = permissions.map(p => p.moduleId);
    
    const modules = await this.prisma.module.findMany({
      where: {
        id: { in: moduleIds },
        isActive: true,
      },
      include: {
        parent: true,
        children: {
          where: {
            id: { in: moduleIds },
            isActive: true,
          },
        },
      },
      orderBy: [
        { parentId: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    // Attach permissions to each module
    return modules.map(module => {
      const permission = permissions.find(p => p.moduleId === module.id);
      return {
        ...module,
        permissions: permission?.permissions || [],
        source: permission?.source || 'NONE',
      };
    });
  }

  /**
   * Check module access by Clerk User ID
   */
  async checkModuleAccessByClerkId(
    clerkUserId: string,
    moduleCode: string,
    action?: PermissionAction,
  ): Promise<ModulePermissionResult> {
    const userProfile = await this.moduleAccessService.getUserProfileByClerkId(clerkUserId);
    return this.checkModuleAccess(userProfile.id, moduleCode, action);
  }

  /**
   * Invalidate module permission cache for a user
   */
  async invalidateUserCache(userProfileId: string): Promise<void> {
    // Get all modules
    const modules = await this.prisma.module.findMany({
      select: { id: true },
    });

    // Delete all cached permissions for this user
    await Promise.all(
      modules.map(module =>
        this.cacheService.del(`module_perm:${userProfileId}:${module.id}`),
      ),
    );

    // Also delete the module access cache
    await this.cacheService.del(`module_access:${userProfileId}`);

    this.logger.log(`Module permission cache invalidated for user ${userProfileId}`);
  }

  /**
   * Invalidate module permission cache for all users with a role
   */
  async invalidateRoleCache(roleId: string): Promise<void> {
    // Get all users with this role
    const userRoles = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userProfileId: true },
    });

    // Invalidate cache for each user
    await Promise.all(
      userRoles.map(ur => this.invalidateUserCache(ur.userProfileId)),
    );

    this.logger.log(`Module permission cache invalidated for role ${roleId}`);
  }

  /**
   * Check if module requires authentication
   */
  async requiresAuth(moduleCode: string): Promise<boolean> {
    const module = await this.prisma.module.findUnique({
      where: { code: moduleCode },
      select: { requiredPlan: true },
    });

    // If module has a required plan, it requires auth
    return module?.requiredPlan !== null;
  }

  /**
   * Validate module permissions for a list of modules
   */
  async validateBulkAccess(
    userProfileId: string,
    moduleCodes: string[],
    action?: PermissionAction,
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    await Promise.all(
      moduleCodes.map(async (code) => {
        try {
          const result = await this.checkModuleAccess(userProfileId, code, action);
          if (action) {
            results.set(code, result.permissions.includes(action));
          } else {
            results.set(code, result.hasAccess);
          }
        } catch (error) {
          results.set(code, false);
        }
      }),
    );

    return results;
  }
}