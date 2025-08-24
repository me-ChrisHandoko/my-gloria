import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export enum PermissionScope {
  OWN = 'OWN', // Data sendiri
  DEPARTMENT = 'DEPARTMENT', // Data departemen
  SCHOOL = 'SCHOOL', // Data sekolah
  ALL = 'ALL', // Semua data
}

export interface UserContext {
  userProfileId: string;
  clerkUserId: string;
  isSuperadmin: boolean;
  positionIds: string[];
  departmentIds: string[];
  schoolIds: string[];
  permissionScopes: Map<string, PermissionScope>;
}

@Injectable()
export class RowLevelSecurityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets user context for row-level security
   */
  async getUserContext(clerkUserId: string): Promise<UserContext> {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { clerkUserId },
      include: {
        positions: {
          where: { isActive: true },
          include: {
            position: {
              include: {
                department: true,
                school: true,
              },
            },
          },
        },
        moduleAccess: {
          where: { isActive: true },
        },
        roles: {
          where: { isActive: true },
          include: {
            role: {
              include: {
                moduleAccess: true,
              },
            },
          },
        },
      },
    });

    if (!userProfile) {
      // Return a minimal context for users without profiles
      // This allows them to at least see the UI without errors
      return {
        userProfileId: '',
        clerkUserId,
        isSuperadmin: false,
        positionIds: [],
        departmentIds: [],
        schoolIds: [],
        permissionScopes: new Map<string, PermissionScope>(),
      };
    }

    // Extract unique department and school IDs
    const departmentIds = new Set<string>();
    const schoolIds = new Set<string>();
    const positionIds = new Set<string>();

    userProfile.positions.forEach((up) => {
      positionIds.add(up.positionId);
      if (up.position.departmentId) {
        departmentIds.add(up.position.departmentId);
      }
      if (up.position.schoolId) {
        schoolIds.add(up.position.schoolId);
      }
    });

    // Determine permission scopes from roles and module access
    const permissionScopes = await this.calculatePermissionScopes(userProfile);

    return {
      userProfileId: userProfile.id,
      clerkUserId: userProfile.clerkUserId,
      isSuperadmin: userProfile.isSuperadmin,
      positionIds: Array.from(positionIds),
      departmentIds: Array.from(departmentIds),
      schoolIds: Array.from(schoolIds),
      permissionScopes,
    };
  }

  /**
   * Builds Prisma where clause for row-level security
   */
  buildSecurityFilter(
    context: UserContext,
    module: string,
    action: string,
  ): Prisma.JsonFilter | undefined {
    // Superadmins have access to everything
    if (context.isSuperadmin) {
      return undefined;
    }

    const scope =
      context.permissionScopes.get(`${module}:${action}`) ||
      PermissionScope.OWN;

    switch (scope) {
      case PermissionScope.ALL:
        return undefined; // No filter needed

      case PermissionScope.SCHOOL:
        return {
          OR: [
            { schoolId: { in: context.schoolIds } },
            {
              department: {
                schoolId: { in: context.schoolIds },
              },
            },
          ],
        } as any;

      case PermissionScope.DEPARTMENT:
        return {
          OR: [
            { departmentId: { in: context.departmentIds } },
            { userProfileId: context.userProfileId },
          ],
        } as any;

      case PermissionScope.OWN:
      default:
        return {
          userProfileId: context.userProfileId,
        } as any;
    }
  }

  /**
   * Validates if user can access a specific record
   */
  async canAccessRecord(
    context: UserContext,
    entityType: string,
    entityId: string,
    action: string,
  ): Promise<boolean> {
    if (context.isSuperadmin) {
      return true;
    }

    const scope =
      context.permissionScopes.get(`${entityType}:${action}`) ||
      PermissionScope.OWN;

    switch (entityType.toLowerCase()) {
      case 'userposition':
        return this.canAccessUserPosition(context, entityId, scope);

      case 'position':
        return this.canAccessPosition(context, entityId, scope);

      case 'department':
        return this.canAccessDepartment(context, entityId, scope);

      case 'school':
        return this.canAccessSchool(context, entityId, scope);

      default:
        return false;
    }
  }

  /**
   * Checks access to UserPosition records
   */
  private async canAccessUserPosition(
    context: UserContext,
    userPositionId: string,
    scope: PermissionScope,
  ): Promise<boolean> {
    const userPosition = await this.prisma.userPosition.findUnique({
      where: { id: userPositionId },
      include: {
        position: {
          include: {
            department: true,
            school: true,
          },
        },
      },
    });

    if (!userPosition) {
      return false;
    }

    switch (scope) {
      case PermissionScope.ALL:
        return true;

      case PermissionScope.SCHOOL:
        return userPosition.position.schoolId
          ? context.schoolIds.includes(userPosition.position.schoolId)
          : false;

      case PermissionScope.DEPARTMENT:
        return userPosition.position.departmentId
          ? context.departmentIds.includes(userPosition.position.departmentId)
          : userPosition.userProfileId === context.userProfileId;

      case PermissionScope.OWN:
      default:
        return userPosition.userProfileId === context.userProfileId;
    }
  }

  /**
   * Checks access to Position records
   */
  private async canAccessPosition(
    context: UserContext,
    positionId: string,
    scope: PermissionScope,
  ): Promise<boolean> {
    const position = await this.prisma.position.findUnique({
      where: { id: positionId },
    });

    if (!position) {
      return false;
    }

    switch (scope) {
      case PermissionScope.ALL:
        return true;

      case PermissionScope.SCHOOL:
        return position.schoolId
          ? context.schoolIds.includes(position.schoolId)
          : false;

      case PermissionScope.DEPARTMENT:
        return position.departmentId
          ? context.departmentIds.includes(position.departmentId)
          : false;

      case PermissionScope.OWN:
        return context.positionIds.includes(positionId);

      default:
        return false;
    }
  }

  /**
   * Checks access to Department records
   */
  private async canAccessDepartment(
    context: UserContext,
    departmentId: string,
    scope: PermissionScope,
  ): Promise<boolean> {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      return false;
    }

    switch (scope) {
      case PermissionScope.ALL:
        return true;

      case PermissionScope.SCHOOL:
        return department.schoolId
          ? context.schoolIds.includes(department.schoolId)
          : false;

      case PermissionScope.DEPARTMENT:
      case PermissionScope.OWN:
        return context.departmentIds.includes(departmentId);

      default:
        return false;
    }
  }

  /**
   * Checks access to School records
   */
  private async canAccessSchool(
    context: UserContext,
    schoolId: string,
    scope: PermissionScope,
  ): Promise<boolean> {
    switch (scope) {
      case PermissionScope.ALL:
        return true;

      case PermissionScope.SCHOOL:
      case PermissionScope.DEPARTMENT:
      case PermissionScope.OWN:
        return context.schoolIds.includes(schoolId);

      default:
        return false;
    }
  }

  /**
   * Calculates permission scopes from roles and module access
   */
  private async calculatePermissionScopes(
    userProfile: any,
  ): Promise<Map<string, PermissionScope>> {
    const scopes = new Map<string, PermissionScope>();

    // Process direct module access
    userProfile.moduleAccess.forEach((access: any) => {
      const permissions = access.permissions as string[];
      permissions.forEach((permission: string) => {
        const key = `${access.moduleId}:${permission}`;
        // Determine scope based on position hierarchy level
        const scope = this.determineScope(userProfile);
        scopes.set(key, scope);
      });
    });

    // Process role-based module access
    userProfile.roles.forEach((userRole: any) => {
      userRole.role.moduleAccess.forEach((access: any) => {
        const permissions = access.permissions as string[];
        permissions.forEach((permission: string) => {
          const key = `${access.moduleId}:${permission}`;
          const scope = this.determineScope(userProfile);
          // Use the most permissive scope
          const existingScope = scopes.get(key);
          if (
            !existingScope ||
            this.isScopeMorePermissive(scope, existingScope)
          ) {
            scopes.set(key, scope);
          }
        });
      });
    });

    return scopes;
  }

  /**
   * Determines scope based on user's position hierarchy
   */
  private determineScope(userProfile: any): PermissionScope {
    if (userProfile.isSuperadmin) {
      return PermissionScope.ALL;
    }

    // Check highest position hierarchy level
    let highestLevel = Number.MAX_SAFE_INTEGER;
    let hasSchoolLevel = false;
    let hasDepartmentLevel = false;

    userProfile.positions.forEach((up: any) => {
      if (up.position.hierarchyLevel < highestLevel) {
        highestLevel = up.position.hierarchyLevel;
      }
      if (up.position.hierarchyLevel <= 2) {
        hasSchoolLevel = true;
      }
      if (up.position.hierarchyLevel <= 4) {
        hasDepartmentLevel = true;
      }
    });

    if (highestLevel <= 1) {
      return PermissionScope.ALL; // Board/Directors level
    }
    if (hasSchoolLevel) {
      return PermissionScope.SCHOOL; // Principal level
    }
    if (hasDepartmentLevel) {
      return PermissionScope.DEPARTMENT; // Department head level
    }

    return PermissionScope.OWN; // Staff level
  }

  /**
   * Checks if one scope is more permissive than another
   */
  private isScopeMorePermissive(
    scope1: PermissionScope,
    scope2: PermissionScope,
  ): boolean {
    const scopeOrder = {
      [PermissionScope.ALL]: 4,
      [PermissionScope.SCHOOL]: 3,
      [PermissionScope.DEPARTMENT]: 2,
      [PermissionScope.OWN]: 1,
    };

    return scopeOrder[scope1] > scopeOrder[scope2];
  }

  /**
   * Applies row-level security to a Prisma query
   */
  async applyRowLevelSecurity<T>(
    query: Prisma.PrismaPromise<T>,
    context: UserContext,
    module: string,
    action: string,
  ): Promise<T> {
    // For superadmins, return query as-is
    if (context.isSuperadmin) {
      return query;
    }

    // Apply security filter based on scope
    const filter = this.buildSecurityFilter(context, module, action);

    // This would need to be implemented based on your specific Prisma setup
    // You might need to wrap the query or use Prisma middleware
    return query;
  }

  /**
   * Gets data access summary for a user
   */
  async getDataAccessSummary(clerkUserId: string): Promise<{
    scope: PermissionScope;
    departments: string[];
    schools: string[];
    positions: string[];
    modules: Array<{ module: string; permissions: string[] }>;
  }> {
    const context = await this.getUserContext(clerkUserId);

    // Determine overall scope
    let overallScope = PermissionScope.OWN;
    context.permissionScopes.forEach((scope) => {
      if (this.isScopeMorePermissive(scope, overallScope)) {
        overallScope = scope;
      }
    });

    // Group permissions by module
    const modulePermissions = new Map<string, Set<string>>();
    context.permissionScopes.forEach((scope, key) => {
      const [module, permission] = key.split(':');
      if (!modulePermissions.has(module)) {
        modulePermissions.set(module, new Set());
      }
      modulePermissions.get(module)!.add(permission);
    });

    const modules = Array.from(modulePermissions.entries()).map(
      ([module, permissions]) => ({
        module,
        permissions: Array.from(permissions),
      }),
    );

    return {
      scope: overallScope,
      departments: context.departmentIds,
      schools: context.schoolIds,
      positions: context.positionIds,
      modules,
    };
  }
}
