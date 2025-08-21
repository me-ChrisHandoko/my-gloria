import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AssignPositionDto,
  TerminatePositionDto,
  TransferPositionDto,
  UserPositionFilterDto,
  UserPositionHistoryDto,
  PermissionScopeEnum,
} from '../dto/user-position.dto';
import { v7 as uuidv7 } from 'uuid';
import { PositionValidator } from '../../../validators/position.validator';
import { RowLevelSecurityService } from '../../../security/row-level-security.service';
import { AuditService } from '../../audit/services/audit.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserPositionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly positionValidator: PositionValidator,
    private readonly rlsService: RowLevelSecurityService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Assign position to user with transaction and validation
   */
  async assignPosition(dto: AssignPositionDto, userId: string): Promise<any> {
    // Validate assignment
    await this.positionValidator.validateAssignment(dto);

    // Check appointer authority if provided
    if (dto.appointedBy) {
      await this.positionValidator.validateAppointer(
        dto.appointedBy,
        dto.positionId,
      );
    }

    const context = await this.rlsService.getUserContext(userId);

    // Check if user can assign to this position
    const canAccess = await this.rlsService.canAccessRecord(
      context,
      'Position',
      dto.positionId,
      'UPDATE',
    );

    if (!canAccess && !context.isSuperadmin) {
      throw new ForbiddenException(
        'You do not have permission to assign this position',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Get position and user details for audit
      const [position, userProfile] = await Promise.all([
        tx.position.findUnique({
          where: { id: dto.positionId },
          select: { name: true, departmentId: true, hierarchyLevel: true },
        }),
        tx.userProfile.findUnique({
          where: { id: dto.userProfileId },
          include: {
            dataKaryawan: {
              select: { nama: true, nip: true },
            },
          },
        }),
      ]);

      if (!position) {
        throw new NotFoundException('Position not found');
      }

      if (!userProfile) {
        throw new NotFoundException('User profile not found');
      }

      // Determine permission scope based on position hierarchy
      let permissionScope = dto.permissionScope;
      if (!permissionScope) {
        if (position.hierarchyLevel <= 2) {
          permissionScope = PermissionScopeEnum.SCHOOL;
        } else if (position.hierarchyLevel <= 4) {
          permissionScope = PermissionScopeEnum.DEPARTMENT;
        } else {
          permissionScope = PermissionScopeEnum.OWN;
        }
      }

      // Create assignment
      const assignment = await tx.userPosition.create({
        data: {
          id: uuidv7(),
          userProfileId: dto.userProfileId,
          positionId: dto.positionId,
          startDate: dto.startDate,
          endDate: dto.endDate,
          isPlt: dto.isPlt || false,
          appointedBy: dto.appointedBy || userId,
          skNumber: dto.skNumber,
          notes: dto.notes,
          isActive: true,
        },
        include: {
          position: {
            include: {
              department: true,
              school: true,
            },
          },
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
      });

      // Audit the assignment
      await this.auditService.auditPositionAssignment(
        { actorId: userId, module: 'ORGANIZATION' },
        {
          userProfileId: dto.userProfileId,
          positionId: dto.positionId,
          positionName: position.name,
          userName: userProfile.dataKaryawan?.nama || 'Unknown',
          isPlt: assignment.isPlt,
          startDate: assignment.startDate,
          endDate: assignment.endDate || undefined,
        },
      );

      return assignment;
    });
  }

  /**
   * Terminate position assignment with transaction
   */
  async terminatePosition(
    dto: TerminatePositionDto,
    userId: string,
  ): Promise<any> {
    await this.positionValidator.validateTermination(
      dto.userPositionId,
      dto.endDate,
    );

    const context = await this.rlsService.getUserContext(userId);

    return this.prisma.$transaction(async (tx) => {
      const userPosition = await tx.userPosition.findUnique({
        where: { id: dto.userPositionId },
        include: {
          position: true,
          userProfile: {
            include: {
              dataKaryawan: {
                select: { nama: true },
              },
            },
          },
        },
      });

      if (!userPosition) {
        throw new NotFoundException('Position assignment not found');
      }

      // Check access
      const canAccess = await this.rlsService.canAccessRecord(
        context,
        'UserPosition',
        dto.userPositionId,
        'UPDATE',
      );

      if (!canAccess && userPosition.userProfileId !== context.userProfileId) {
        throw new ForbiddenException(
          'Access denied to terminate this position',
        );
      }

      // Update assignment
      const terminated = await tx.userPosition.update({
        where: { id: dto.userPositionId },
        data: {
          endDate: dto.endDate,
          isActive: false,
          notes: dto.reason ? `Terminated: ${dto.reason}` : undefined,
        },
      });

      // Audit the termination
      await this.auditService.log(
        { actorId: userId, module: 'ORGANIZATION' },
        {
          entityType: 'UserPosition',
          entityId: dto.userPositionId,
          entityDisplay: `${userPosition.position.name} - ${userPosition.userProfile.dataKaryawan?.nama}`,
          action: 'UPDATE' as any,
          oldValues: { endDate: null, isActive: true },
          newValues: { endDate: dto.endDate, isActive: false },
          metadata: { reason: dto.reason },
        },
      );

      return terminated;
    });
  }

  /**
   * Transfer user to new position with transaction
   */
  async transferPosition(
    dto: TransferPositionDto,
    userId: string,
  ): Promise<any> {
    const context = await this.rlsService.getUserContext(userId);

    // Validate new position assignment
    await this.positionValidator.validateAssignment({
      userProfileId: dto.userProfileId,
      positionId: dto.toPositionId,
      startDate: dto.transferDate,
      appointedBy: userId,
    });

    return this.prisma.$transaction(async (tx) => {
      // Find current position assignment
      const currentAssignment = await tx.userPosition.findFirst({
        where: {
          userProfileId: dto.userProfileId,
          positionId: dto.fromPositionId,
          isActive: true,
        },
        include: {
          position: true,
          userProfile: {
            include: {
              dataKaryawan: {
                select: { nama: true },
              },
            },
          },
        },
      });

      if (!currentAssignment) {
        throw new NotFoundException('Current position assignment not found');
      }

      // Check access
      const canAccess = await this.rlsService.canAccessRecord(
        context,
        'Position',
        dto.toPositionId,
        'UPDATE',
      );

      if (!canAccess && !context.isSuperadmin) {
        throw new ForbiddenException('Access denied to assign to new position');
      }

      // Get new position details
      const newPosition = await tx.position.findUnique({
        where: { id: dto.toPositionId },
        select: { name: true, hierarchyLevel: true },
      });

      if (!newPosition) {
        throw new NotFoundException('New position not found');
      }

      // Terminate current position
      await tx.userPosition.update({
        where: { id: currentAssignment.id },
        data: {
          endDate: new Date(dto.transferDate.getTime() - 1), // End one day before transfer
          isActive: false,
          notes: `Transferred to ${newPosition.name}`,
        },
      });

      // Determine permission scope for new position
      let permissionScope: PermissionScopeEnum;
      if (newPosition.hierarchyLevel <= 2) {
        permissionScope = PermissionScopeEnum.SCHOOL;
      } else if (newPosition.hierarchyLevel <= 4) {
        permissionScope = PermissionScopeEnum.DEPARTMENT;
      } else {
        permissionScope = PermissionScopeEnum.OWN;
      }

      // Create new position assignment
      const newAssignment = await tx.userPosition.create({
        data: {
          id: uuidv7(),
          userProfileId: dto.userProfileId,
          positionId: dto.toPositionId,
          startDate: dto.transferDate,
          appointedBy: userId,
          skNumber: dto.skNumber,
          notes:
            dto.reason || `Transferred from ${currentAssignment.position.name}`,
          isActive: true,
        },
        include: {
          position: {
            include: {
              department: true,
              school: true,
            },
          },
        },
      });

      // Audit the transfer
      await this.auditService.logOrganizationalChange(
        { actorId: userId, module: 'ORGANIZATION' },
        {
          type: 'POSITION_ASSIGNMENT',
          entityId: dto.userProfileId,
          entityName:
            currentAssignment.userProfile.dataKaryawan?.nama || 'Unknown',
          details: {
            action: 'TRANSFER',
            fromPosition: currentAssignment.position.name,
            toPosition: newPosition.name,
            transferDate: dto.transferDate,
            reason: dto.reason,
          },
        },
      );

      return newAssignment;
    });
  }

  /**
   * Find all user positions with filters
   */
  async findAll(
    filters: UserPositionFilterDto,
    userId: string,
  ): Promise<any[]> {
    const context = await this.rlsService.getUserContext(userId);

    const where: Prisma.UserPositionWhereInput = {};

    // Apply filters
    if (filters.userProfileId) {
      where.userProfileId = filters.userProfileId;
    }

    if (filters.positionId) {
      where.positionId = filters.positionId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.isPlt !== undefined) {
      where.isPlt = filters.isPlt;
    }

    if (filters.startDateFrom || filters.startDateTo) {
      where.startDate = {};
      if (filters.startDateFrom) {
        where.startDate.gte = filters.startDateFrom;
      }
      if (filters.startDateTo) {
        where.startDate.lte = filters.startDateTo;
      }
    }

    // Apply RLS
    if (!context.isSuperadmin) {
      // Limit to positions in user's departments/schools
      where.position = {
        OR: [
          { departmentId: { in: context.departmentIds } },
          { schoolId: { in: context.schoolIds } },
        ],
      };
    }

    // Include historical records if requested
    if (!filters.includeHistory) {
      where.OR = [{ endDate: null }, { endDate: { gte: new Date() } }];
    }

    const userPositions = await this.prisma.userPosition.findMany({
      where,
      include: {
        position: {
          include: {
            department: true,
            school: true,
          },
        },
        userProfile: {
          include: {
            dataKaryawan: {
              select: {
                nama: true,
                nip: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [{ startDate: 'desc' }, { position: { hierarchyLevel: 'asc' } }],
    });

    return userPositions;
  }

  /**
   * Get user position history
   */
  async getUserHistory(
    userProfileId: string,
    userId: string,
  ): Promise<UserPositionHistoryDto[]> {
    const context = await this.rlsService.getUserContext(userId);

    // Check if user can access this profile
    if (!context.isSuperadmin && userProfileId !== context.userProfileId) {
      const userProfile = await this.prisma.userProfile.findUnique({
        where: { id: userProfileId },
        include: {
          positions: {
            where: { isActive: true },
            select: {
              position: {
                select: {
                  departmentId: true,
                  schoolId: true,
                },
              },
            },
          },
        },
      });

      if (!userProfile) {
        throw new NotFoundException('User profile not found');
      }

      // Check if user has access to any of the person's departments/schools
      const hasAccess = userProfile.positions.some((up) => {
        return (
          (up.position.departmentId &&
            context.departmentIds.includes(up.position.departmentId)) ||
          (up.position.schoolId &&
            context.schoolIds.includes(up.position.schoolId))
        );
      });

      if (!hasAccess) {
        throw new ForbiddenException('Access denied to this user history');
      }
    }

    const positions = await this.prisma.userPosition.findMany({
      where: { userProfileId },
      include: {
        position: {
          include: {
            department: true,
            school: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return positions.map((up) => ({
      id: up.id,
      positionId: up.positionId,
      positionName: up.position.name,
      departmentName: up.position.department?.name,
      schoolName: up.position.school?.name,
      startDate: up.startDate,
      endDate: up.endDate || undefined,
      isActive: up.isActive,
      isPlt: up.isPlt,
      skNumber: up.skNumber || undefined,
      appointedBy: up.appointedBy || undefined,
      duration: this.calculateDuration(up.startDate, up.endDate || new Date()),
    }));
  }

  /**
   * Get current active positions for a user
   */
  async getActivePositions(
    userProfileId: string,
    userId: string,
  ): Promise<any[]> {
    const context = await this.rlsService.getUserContext(userId);

    // Check access
    if (!context.isSuperadmin && userProfileId !== context.userProfileId) {
      throw new ForbiddenException('Access denied to view positions');
    }

    return this.prisma.userPosition.findMany({
      where: {
        userProfileId,
        isActive: true,
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      include: {
        position: {
          include: {
            department: true,
            school: true,
            hierarchies: {
              include: {
                reportsTo: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Calculate duration between dates
   */
  private calculateDuration(startDate: Date, endDate: Date): string {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = diffDays % 30;

    const parts: string[] = [];
    if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
    if (days > 0 && years === 0)
      parts.push(`${days} day${days > 1 ? 's' : ''}`);

    return parts.join(' ') || '0 days';
  }
}
