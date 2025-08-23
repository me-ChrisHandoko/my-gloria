import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RowLevelSecurityService,
  PermissionScope,
} from '../../security/row-level-security.service';
import { v7 as uuidv7 } from 'uuid';

export interface ImpersonationContext {
  originalUserId: string;
  originalClerkUserId: string;
  impersonatedUserId?: string;
  impersonatedRole?: string;
  impersonatedPosition?: string;
  impersonatedSchool?: string;
  impersonatedDepartment?: string;
  impersonationMode: 'role' | 'position' | 'user' | 'none';
  startedAt: Date;
  expiresAt: Date;
}

@Injectable()
export class RoleSwitchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rlsService: RowLevelSecurityService,
  ) {}

  /**
   * Start impersonation as a different role/position
   * Only superadmins can impersonate
   */
  async startImpersonation(
    clerkUserId: string,
    options: {
      roleId?: string;
      positionId?: string;
      userId?: string;
      schoolId?: string;
      departmentId?: string;
    },
  ): Promise<ImpersonationContext> {
    // Verify the user is a superadmin
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { clerkUserId },
      include: {
        positions: {
          where: { isActive: true },
          include: {
            position: true,
          },
        },
        roles: {
          where: { isActive: true },
          include: {
            role: true,
          },
        },
      },
    });

    if (!userProfile || !userProfile.isSuperadmin) {
      throw new ForbiddenException(
        'Only superadmins can impersonate other users/roles',
      );
    }

    // Create impersonation context based on options
    let impersonationContext: ImpersonationContext = {
      originalUserId: userProfile.id,
      originalClerkUserId: userProfile.clerkUserId,
      impersonationMode: 'none',
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
    };

    // Option 1: Impersonate specific user
    if (options.userId) {
      const targetUser = await this.prisma.userProfile.findUnique({
        where: { id: options.userId },
        include: {
          positions: {
            where: { isActive: true },
            include: {
              position: {
                include: {
                  school: true,
                  department: true,
                },
              },
            },
          },
          roles: {
            where: { isActive: true },
            include: {
              role: true,
            },
          },
        },
      });

      if (!targetUser) {
        throw new NotFoundException('Target user not found');
      }

      impersonationContext = {
        ...impersonationContext,
        impersonatedUserId: targetUser.id,
        impersonationMode: 'user',
        impersonatedSchool: targetUser.positions[0]?.position.school?.id,
        impersonatedDepartment:
          targetUser.positions[0]?.position.department?.id,
      };

      // Log the impersonation
      await this.logImpersonation(
        userProfile.id,
        'START',
        `Impersonating user: ${targetUser.nip}`,
      );

      return impersonationContext;
    }

    // Option 2: Impersonate specific position
    if (options.positionId) {
      const position = await this.prisma.position.findUnique({
        where: { id: options.positionId },
        include: {
          school: true,
          department: true,
        },
      });

      if (!position) {
        throw new NotFoundException('Position not found');
      }

      impersonationContext = {
        ...impersonationContext,
        impersonatedPosition: position.id,
        impersonatedSchool: position.school?.id,
        impersonatedDepartment: position.department?.id,
        impersonationMode: 'position',
      };

      // Log the impersonation
      await this.logImpersonation(
        userProfile.id,
        'START',
        `Impersonating position: ${position.name}`,
      );

      return impersonationContext;
    }

    // Option 3: Impersonate specific role
    if (options.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: options.roleId },
      });

      if (!role) {
        throw new NotFoundException('Role not found');
      }

      // If school/department specified, use them for context
      if (options.schoolId) {
        const school = await this.prisma.school.findUnique({
          where: { id: options.schoolId },
        });
        if (!school) {
          throw new NotFoundException('School not found');
        }
        impersonationContext.impersonatedSchool = school.id;
      }

      if (options.departmentId) {
        const department = await this.prisma.department.findUnique({
          where: { id: options.departmentId },
        });
        if (!department) {
          throw new NotFoundException('Department not found');
        }
        impersonationContext.impersonatedDepartment = department.id;
      }

      impersonationContext = {
        ...impersonationContext,
        impersonatedRole: role.id,
        impersonationMode: 'role',
      };

      // Log the impersonation
      await this.logImpersonation(
        userProfile.id,
        'START',
        `Impersonating role: ${role.name}`,
      );

      return impersonationContext;
    }

    throw new BadRequestException(
      'Must specify either userId, positionId, or roleId for impersonation',
    );
  }

  /**
   * Stop impersonation and return to original context
   */
  async stopImpersonation(clerkUserId: string): Promise<void> {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { clerkUserId },
    });

    if (!userProfile) {
      throw new NotFoundException('User not found');
    }

    // Log the stop
    await this.logImpersonation(
      userProfile.id,
      'STOP',
      'Stopped impersonation',
    );
  }

  /**
   * Get modified user context for impersonation
   */
  async getImpersonatedContext(
    clerkUserId: string,
    impersonationContext: ImpersonationContext,
  ): Promise<any> {
    // If not impersonating, return normal context
    if (impersonationContext.impersonationMode === 'none') {
      return this.rlsService.getUserContext(clerkUserId);
    }

    // Get base context
    const baseContext = await this.rlsService.getUserContext(clerkUserId);

    // Impersonating a specific user
    if (
      impersonationContext.impersonationMode === 'user' &&
      impersonationContext.impersonatedUserId
    ) {
      const impersonatedUser = await this.prisma.userProfile.findUnique({
        where: { id: impersonationContext.impersonatedUserId },
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
          roles: {
            where: { isActive: true },
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!impersonatedUser) {
        throw new NotFoundException('Impersonated user not found');
      }

      // Build context as if we were the impersonated user
      const departmentIds = new Set<string>();
      const schoolIds = new Set<string>();
      const positionIds = new Set<string>();

      impersonatedUser.positions.forEach((up) => {
        positionIds.add(up.positionId);
        if (up.position.departmentId) {
          departmentIds.add(up.position.departmentId);
        }
        if (up.position.schoolId) {
          schoolIds.add(up.position.schoolId);
        }
      });

      // Calculate permission scopes for impersonated user
      const permissionScopes = new Map<string, PermissionScope>();
      impersonatedUser.roles.forEach((userRole) => {
        userRole.role.rolePermissions.forEach((rp) => {
          if (rp.permission) {
            const key = `${rp.permission.resource}:${rp.permission.action}`;
            const scope =
              (rp.permission.scope as PermissionScope) || PermissionScope.OWN;
            permissionScopes.set(key, scope);
          }
        });
      });

      return {
        ...baseContext,
        userProfileId: impersonatedUser.id,
        isSuperadmin: false, // Always false when impersonating
        isImpersonating: true,
        originalUserId: impersonationContext.originalUserId,
        positionIds: Array.from(positionIds),
        departmentIds: Array.from(departmentIds),
        schoolIds: Array.from(schoolIds),
        permissionScopes,
      };
    }

    // Impersonating a position
    if (
      impersonationContext.impersonationMode === 'position' &&
      impersonationContext.impersonatedPosition
    ) {
      const position = await this.prisma.position.findUnique({
        where: { id: impersonationContext.impersonatedPosition },
        include: {
          department: true,
          school: true,
        },
      });

      if (!position) {
        throw new NotFoundException('Impersonated position not found');
      }

      // Get typical permissions for this position level
      const permissionScope = this.getPermissionScopeForPosition(
        position.hierarchyLevel,
      );

      return {
        ...baseContext,
        isSuperadmin: false,
        isImpersonating: true,
        originalUserId: impersonationContext.originalUserId,
        positionIds: [position.id],
        departmentIds: position.departmentId ? [position.departmentId] : [],
        schoolIds: position.schoolId ? [position.schoolId] : [],
        permissionScopes: new Map([
          ['organization:read', permissionScope],
          ['organization:update', permissionScope],
        ]),
      };
    }

    // Impersonating a role
    if (
      impersonationContext.impersonationMode === 'role' &&
      impersonationContext.impersonatedRole
    ) {
      const role = await this.prisma.role.findUnique({
        where: { id: impersonationContext.impersonatedRole },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (!role) {
        throw new NotFoundException('Impersonated role not found');
      }

      // Build permission scopes from role
      const permissionScopes = new Map<string, PermissionScope>();
      role.rolePermissions.forEach((rp) => {
        if (rp.permission) {
          const key = `${rp.permission.resource}:${rp.permission.action}`;
          const scope =
            (rp.permission.scope as PermissionScope) || PermissionScope.OWN;
          permissionScopes.set(key, scope);
        }
      });

      return {
        ...baseContext,
        isSuperadmin: false,
        isImpersonating: true,
        originalUserId: impersonationContext.originalUserId,
        departmentIds: impersonationContext.impersonatedDepartment
          ? [impersonationContext.impersonatedDepartment]
          : [],
        schoolIds: impersonationContext.impersonatedSchool
          ? [impersonationContext.impersonatedSchool]
          : [],
        permissionScopes,
      };
    }

    return baseContext;
  }

  /**
   * Get available roles/positions for impersonation
   */
  async getAvailableImpersonationTargets(clerkUserId: string): Promise<{
    roles: any[];
    positions: any[];
    users: any[];
  }> {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { clerkUserId },
    });

    if (!userProfile || !userProfile.isSuperadmin) {
      throw new ForbiddenException(
        'Only superadmins can view impersonation targets',
      );
    }

    // Get all active roles
    const roles = await this.prisma.role.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        hierarchyLevel: true,
      },
      orderBy: { hierarchyLevel: 'asc' },
    });

    // Get sample positions
    const positions = await this.prisma.position.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        hierarchyLevel: true,
        school: {
          select: {
            id: true,
            name: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { hierarchyLevel: 'asc' },
      take: 20,
    });

    // Get sample users (non-superadmins)
    const users = await this.prisma.userProfile.findMany({
      where: {
        isActive: true,
        isSuperadmin: false,
      },
      select: {
        id: true,
        nip: true,
        dataKaryawan: {
          select: {
            nama: true,
            email: true,
            bagianKerja: true,
            lokasi: true,
          },
        },
        positions: {
          where: { isActive: true },
          select: {
            position: {
              select: {
                name: true,
              },
            },
          },
        },
        roles: {
          where: { isActive: true },
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      take: 20,
    });

    return {
      roles,
      positions,
      users: users.map((u) => ({
        id: u.id,
        nip: u.nip,
        name: u.dataKaryawan?.nama,
        email: u.dataKaryawan?.email,
        department: u.dataKaryawan?.bagianKerja,
        location: u.dataKaryawan?.lokasi,
        currentPosition: u.positions[0]?.position.name,
        currentRole: u.roles[0]?.role.name,
      })),
    };
  }

  /**
   * Get permission scope based on position hierarchy level
   */
  private getPermissionScopeForPosition(
    hierarchyLevel: number,
  ): PermissionScope {
    if (hierarchyLevel <= 1) {
      return PermissionScope.ALL; // Board/Directors
    } else if (hierarchyLevel <= 2) {
      return PermissionScope.SCHOOL; // Principal/Head of School
    } else if (hierarchyLevel <= 4) {
      return PermissionScope.DEPARTMENT; // Head of Department
    } else {
      return PermissionScope.OWN; // Staff
    }
  }

  /**
   * Log impersonation activity for audit
   */
  private async logImpersonation(
    actorId: string,
    action: 'START' | 'STOP',
    details: string,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        id: this.generateId(),
        actorId: actorId,
        actorProfileId: actorId,
        action: action === 'START' ? 'CREATE' : 'DELETE',
        module: 'AUTH',
        entityType: 'Impersonation',
        entityId: actorId,
        entityDisplay: details,
        metadata: {
          action: `IMPERSONATION_${action}`,
          details,
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date(),
      },
    });
  }

  private generateId(): string {
    return uuidv7();
  }
}
