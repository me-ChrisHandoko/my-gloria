import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreatePositionDto,
  UpdatePositionDto,
  PositionFilterDto,
  PositionAvailabilityDto,
} from '../dto/position.dto';
import { PositionValidator } from '../../../validators/position.validator';
import { RowLevelSecurityService } from '../../../security/row-level-security.service';
import { AuditService } from '../../../audit/audit.service';
import { Prisma } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class PositionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly positionValidator: PositionValidator,
    private readonly rlsService: RowLevelSecurityService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a new position with transaction
   */
  async create(dto: CreatePositionDto, userId: string): Promise<any> {
    // Check for duplicate code
    const existing = await this.prisma.position.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Position with code ${dto.code} already exists`,
      );
    }

    // Validate department/school alignment
    if (dto.departmentId && dto.schoolId) {
      const department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });

      if (department && department.schoolId !== dto.schoolId) {
        throw new ConflictException('Department and school mismatch');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const position = await tx.position.create({
        data: {
          id: uuidv7(),
          ...dto,
          createdBy: userId,
          modifiedBy: userId,
        },
        include: {
          department: true,
          school: true,
        },
      });

      // Create hierarchy entry
      await tx.positionHierarchy.create({
        data: {
          id: uuidv7(),
          positionId: position.id,
        },
      });

      await this.auditService.logCreate(
        { actorId: userId, module: 'ORGANIZATION' },
        'Position',
        position.id,
        position,
        position.name,
      );

      return position;
    });
  }

  /**
   * Find all positions with RLS and filters
   */
  async findAll(filters: PositionFilterDto, userId: string): Promise<any[]> {
    const context = await this.rlsService.getUserContext(userId);

    const where: Prisma.PositionWhereInput = {};

    // Apply filters
    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }

    if (filters.schoolId) {
      where.schoolId = filters.schoolId;
    }

    if (filters.hierarchyLevel !== undefined) {
      where.hierarchyLevel = filters.hierarchyLevel;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.isUnique !== undefined) {
      where.isUnique = filters.isUnique;
    }

    // Sanitize search input
    if (filters.search) {
      const sanitizedSearch = this.sanitizeSearchInput(filters.search);
      where.OR = [
        { name: { contains: sanitizedSearch, mode: 'insensitive' } },
        { code: { contains: sanitizedSearch, mode: 'insensitive' } },
      ];
    }

    // Apply RLS
    if (!context.isSuperadmin) {
      const rlsFilter: Prisma.PositionWhereInput = {};

      if (context.schoolIds.length > 0) {
        rlsFilter.schoolId = { in: context.schoolIds };
      }

      if (context.departmentIds.length > 0) {
        rlsFilter.OR = [{ departmentId: { in: context.departmentIds } }];
      }

      where.AND = [where, rlsFilter];
    }

    const positions = await this.prisma.position.findMany({
      where,
      include: {
        department: true,
        school: true,
        userPositions: {
          where: { isActive: true },
          select: {
            id: true,
            isPlt: true,
            userProfile: {
              select: {
                id: true,
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
        _count: {
          select: {
            userPositions: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: [{ hierarchyLevel: 'asc' }, { name: 'asc' }],
    });

    // Filter by availability if requested
    if (filters.hasAvailableSlots) {
      return positions.filter((pos) => {
        const activeHolders = pos.userPositions.filter(
          (up) => !up.isPlt,
        ).length;
        return activeHolders < pos.maxHolders;
      });
    }

    return positions;
  }

  /**
   * Find one position by ID
   */
  async findOne(id: string, userId: string): Promise<any> {
    const context = await this.rlsService.getUserContext(userId);
    const canAccess = await this.rlsService.canAccessRecord(
      context,
      'Position',
      id,
      'READ',
    );

    if (!canAccess) {
      throw new ForbiddenException('Access denied to this position');
    }

    const position = await this.prisma.position.findUnique({
      where: { id },
      include: {
        department: true,
        school: true,
        hierarchies: {
          include: {
            reportsTo: true,
            coordinator: true,
          },
        },
        userPositions: {
          where: { isActive: true },
          include: {
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
          orderBy: {
            startDate: 'desc',
          },
        },
      },
    });

    if (!position) {
      throw new NotFoundException('Position not found');
    }

    // Get reporting line
    const reportingLine = await this.getReportingLine(id);

    return {
      ...position,
      reportingLine,
      currentHolders: position.userPositions.filter((up) => !up.isPlt),
      pltHolders: position.userPositions.filter((up) => up.isPlt),
    };
  }

  /**
   * Update position with transaction
   */
  async update(
    id: string,
    dto: UpdatePositionDto,
    userId: string,
  ): Promise<any> {
    const context = await this.rlsService.getUserContext(userId);
    const canAccess = await this.rlsService.canAccessRecord(
      context,
      'Position',
      id,
      'UPDATE',
    );

    if (!canAccess) {
      throw new ForbiddenException('Access denied to update this position');
    }

    return this.prisma.$transaction(async (tx) => {
      const oldPosition = await tx.position.findUnique({
        where: { id },
        include: {
          userPositions: {
            where: { isActive: true },
          },
        },
      });

      if (!oldPosition) {
        throw new NotFoundException('Position not found');
      }

      // Validate changes
      if (
        dto.maxHolders !== undefined &&
        dto.maxHolders < oldPosition.userPositions.length
      ) {
        throw new ConflictException(
          `Cannot reduce maxHolders below current holder count (${oldPosition.userPositions.length})`,
        );
      }

      const updated = await tx.position.update({
        where: { id },
        data: {
          ...dto,
          modifiedBy: userId,
        },
        include: {
          department: true,
          school: true,
        },
      });

      await this.auditService.logUpdate(
        { actorId: userId, module: 'ORGANIZATION' },
        'Position',
        id,
        oldPosition,
        updated,
        updated.name,
      );

      return updated;
    });
  }

  /**
   * Delete position with validation
   */
  async remove(id: string, userId: string): Promise<void> {
    const context = await this.rlsService.getUserContext(userId);
    const canAccess = await this.rlsService.canAccessRecord(
      context,
      'Position',
      id,
      'DELETE',
    );

    if (!canAccess) {
      throw new ForbiddenException('Access denied to delete this position');
    }

    await this.prisma.$transaction(async (tx) => {
      // Check for active assignments
      const activeAssignments = await tx.userPosition.count({
        where: {
          positionId: id,
          isActive: true,
        },
      });

      if (activeAssignments > 0) {
        throw new ConflictException(
          `Cannot delete position with ${activeAssignments} active assignment(s)`,
        );
      }

      // Check for dependent positions in hierarchy
      const dependents = await tx.positionHierarchy.count({
        where: {
          OR: [{ reportsToId: id }, { coordinatorId: id }],
        },
      });

      if (dependents > 0) {
        throw new ConflictException(
          `Cannot delete position with ${dependents} dependent position(s) in hierarchy`,
        );
      }

      const position = await tx.position.findUnique({
        where: { id },
      });

      if (!position) {
        throw new NotFoundException('Position not found');
      }

      // Delete hierarchy entry first
      await tx.positionHierarchy.deleteMany({
        where: { positionId: id },
      });

      // Delete position
      await tx.position.delete({
        where: { id },
      });

      await this.auditService.logDelete(
        { actorId: userId, module: 'ORGANIZATION' },
        'Position',
        id,
        position,
        position.name,
      );
    });
  }

  /**
   * Get position holders with history
   */
  async getHolders(id: string, userId: string): Promise<any> {
    const context = await this.rlsService.getUserContext(userId);
    const canAccess = await this.rlsService.canAccessRecord(
      context,
      'Position',
      id,
      'READ',
    );

    if (!canAccess) {
      throw new ForbiddenException('Access denied to this position');
    }

    const position = await this.prisma.position.findUnique({
      where: { id },
      include: {
        userPositions: {
          include: {
            userProfile: {
              include: {
                dataKaryawan: {
                  select: {
                    nama: true,
                    nip: true,
                    email: true,
                    noPonsel: true,
                  },
                },
              },
            },
          },
          orderBy: {
            startDate: 'desc',
          },
        },
      },
    });

    if (!position) {
      throw new NotFoundException('Position not found');
    }

    const now = new Date();

    return {
      position: {
        id: position.id,
        code: position.code,
        name: position.name,
        maxHolders: position.maxHolders,
        isUnique: position.isUnique,
      },
      currentHolders: position.userPositions.filter(
        (up) => up.isActive && !up.isPlt,
      ),
      pltHolders: position.userPositions.filter(
        (up) => up.isActive && up.isPlt,
      ),
      historicalHolders: position.userPositions.filter(
        (up) => !up.isActive || (up.endDate && up.endDate < now),
      ),
    };
  }

  /**
   * Check position availability
   */
  async checkAvailability(
    id: string,
    userId: string,
  ): Promise<PositionAvailabilityDto> {
    const context = await this.rlsService.getUserContext(userId);
    const canAccess = await this.rlsService.canAccessRecord(
      context,
      'Position',
      id,
      'READ',
    );

    if (!canAccess) {
      throw new ForbiddenException('Access denied to this position');
    }

    const position = await this.prisma.position.findUnique({
      where: { id },
      include: {
        userPositions: {
          where: {
            isActive: true,
            OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
          },
          include: {
            userProfile: {
              include: {
                dataKaryawan: {
                  select: {
                    nama: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!position) {
      throw new NotFoundException('Position not found');
    }

    const activeHolders = position.userPositions.filter((up) => !up.isPlt);
    const availableSlots = Math.max(
      0,
      position.maxHolders - activeHolders.length,
    );

    return {
      positionId: position.id,
      positionName: position.name,
      isAvailable: availableSlots > 0 || !position.isUnique,
      maxHolders: position.maxHolders,
      currentHolders: activeHolders.length,
      availableSlots,
      currentAssignments: position.userPositions.map((up) => ({
        userProfileId: up.userProfileId,
        userName: up.userProfile.dataKaryawan?.nama || 'Unknown',
        startDate: up.startDate,
        endDate: up.endDate || undefined,
        isPlt: up.isPlt,
      })),
    };
  }

  /**
   * Get reporting line for a position
   */
  private async getReportingLine(positionId: string): Promise<any[]> {
    const line: any[] = [];
    let currentId = positionId;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);

      const hierarchy = await this.prisma.positionHierarchy.findUnique({
        where: { positionId: currentId },
        include: {
          reportsTo: {
            include: {
              department: true,
            },
          },
        },
      });

      if (hierarchy?.reportsTo) {
        line.push({
          positionId: hierarchy.reportsTo.id,
          positionName: hierarchy.reportsTo.name,
          departmentName: hierarchy.reportsTo.department?.name,
        });
        currentId = hierarchy.reportsTo.id;
      } else {
        break;
      }

      // Safety check
      if (line.length > 20) {
        break;
      }
    }

    return line;
  }

  /**
   * Sanitize search input
   */
  private sanitizeSearchInput(input: string): string {
    return input
      .replace(/[%_\\'";]/g, '')
      .trim()
      .substring(0, 100);
  }
}
