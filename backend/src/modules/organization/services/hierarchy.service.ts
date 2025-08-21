import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  SetHierarchyDto,
  HierarchyNodeDto,
  OrgChartDto,
  ReportingChainDto,
  HierarchyValidationResultDto,
} from '../dto/hierarchy.dto';
import { HierarchyValidator } from '../../../validators/hierarchy.validator';
import { RowLevelSecurityService } from '../../../security/row-level-security.service';
import { AuditService } from '../../audit/services/audit.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class HierarchyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyValidator: HierarchyValidator,
    private readonly rlsService: RowLevelSecurityService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Set position hierarchy with validation and transaction
   */
  async setHierarchy(dto: SetHierarchyDto, userId: string): Promise<any> {
    // Validate hierarchy changes
    await this.hierarchyValidator.validateHierarchy(dto);

    const context = await this.rlsService.getUserContext(userId);
    const canAccess = await this.rlsService.canAccessRecord(
      context,
      'Position',
      dto.positionId,
      'UPDATE',
    );

    if (!canAccess) {
      throw new ForbiddenException(
        'Access denied to update position hierarchy',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Get position details
      const position = await tx.position.findUnique({
        where: { id: dto.positionId },
        select: { name: true },
      });

      if (!position) {
        throw new NotFoundException('Position not found');
      }

      // Get current hierarchy for audit
      const currentHierarchy = await tx.positionHierarchy.findUnique({
        where: { positionId: dto.positionId },
      });

      // Upsert hierarchy
      const hierarchy = await tx.positionHierarchy.upsert({
        where: { positionId: dto.positionId },
        create: {
          id: uuidv7(),
          positionId: dto.positionId,
          reportsToId: dto.reportsToId,
          coordinatorId: dto.coordinatorId,
        },
        update: {
          reportsToId: dto.reportsToId,
          coordinatorId: dto.coordinatorId,
        },
        include: {
          position: true,
          reportsTo: true,
          coordinator: true,
        },
      });

      // Audit the change
      await this.auditService.auditHierarchyChange(
        { actorId: userId, module: 'ORGANIZATION' },
        {
          positionId: dto.positionId,
          positionName: position.name,
          oldReportsTo: currentHierarchy?.reportsToId || undefined,
          newReportsTo: dto.reportsToId,
          oldCoordinator: currentHierarchy?.coordinatorId || undefined,
          newCoordinator: dto.coordinatorId,
        },
      );

      return hierarchy;
    });
  }

  /**
   * Get organizational chart
   */
  async getOrgChart(
    rootPositionId: string | null,
    userId: string,
  ): Promise<OrgChartDto> {
    const context = await this.rlsService.getUserContext(userId);

    // Build query based on access level
    const positionFilter: any = { isActive: true };

    if (!context.isSuperadmin) {
      if (context.schoolIds.length > 0) {
        positionFilter.schoolId = { in: context.schoolIds };
      }
      if (context.departmentIds.length > 0) {
        positionFilter.OR = [{ departmentId: { in: context.departmentIds } }];
      }
    }

    // Get all positions with hierarchy in batch
    const [positions, hierarchies, userPositions] = await Promise.all([
      this.prisma.position.findMany({
        where: positionFilter,
        include: {
          department: true,
          school: true,
        },
      }),
      this.prisma.positionHierarchy.findMany({
        where: {
          position: positionFilter,
        },
      }),
      this.prisma.userPosition.findMany({
        where: {
          isActive: true,
          position: positionFilter,
        },
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
      }),
    ]);

    // Create position map
    const positionMap = new Map(positions.map((p) => [p.id, p]));
    const hierarchyMap = new Map(hierarchies.map((h) => [h.positionId, h]));
    const userPositionMap = new Map<string, any[]>();

    userPositions.forEach((up) => {
      if (!userPositionMap.has(up.positionId)) {
        userPositionMap.set(up.positionId, []);
      }
      userPositionMap.get(up.positionId)!.push(up);
    });

    // Build tree structure
    const rootNode = this.buildOrgChartNode(
      rootPositionId,
      positionMap,
      hierarchyMap,
      userPositionMap,
      new Set(),
    );

    // Calculate metadata
    const metadata = {
      totalPositions: positions.length,
      totalEmployees: userPositions.length,
      hierarchyLevels: Math.max(...positions.map((p) => p.hierarchyLevel)),
      departmentCount: new Set(
        positions.map((p) => p.departmentId).filter(Boolean),
      ).size,
    };

    return {
      root: rootNode,
      metadata,
    };
  }

  /**
   * Get position hierarchy details
   */
  async getPositionHierarchy(positionId: string, userId: string): Promise<any> {
    const context = await this.rlsService.getUserContext(userId);
    const canAccess = await this.rlsService.canAccessRecord(
      context,
      'Position',
      positionId,
      'READ',
    );

    if (!canAccess) {
      throw new ForbiddenException('Access denied to view position hierarchy');
    }

    const hierarchy = await this.prisma.positionHierarchy.findUnique({
      where: { positionId },
      include: {
        position: {
          include: {
            department: true,
            userPositions: {
              where: { isActive: true },
              include: {
                userProfile: {
                  include: {
                    dataKaryawan: {
                      select: { nama: true },
                    },
                  },
                },
              },
            },
          },
        },
        reportsTo: {
          include: {
            userPositions: {
              where: { isActive: true },
              include: {
                userProfile: {
                  include: {
                    dataKaryawan: {
                      select: { nama: true },
                    },
                  },
                },
              },
            },
          },
        },
        coordinator: {
          include: {
            userPositions: {
              where: { isActive: true },
              include: {
                userProfile: {
                  include: {
                    dataKaryawan: {
                      select: { nama: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!hierarchy) {
      throw new NotFoundException('Position hierarchy not found');
    }

    // Get direct reports
    const directReports = await this.prisma.positionHierarchy.findMany({
      where: { reportsToId: positionId },
      include: {
        position: {
          include: {
            userPositions: {
              where: { isActive: true },
              include: {
                userProfile: {
                  include: {
                    dataKaryawan: {
                      select: { nama: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Get coordinated positions
    const coordinatedPositions = await this.prisma.positionHierarchy.findMany({
      where: { coordinatorId: positionId },
      include: {
        position: {
          include: {
            userPositions: {
              where: { isActive: true },
              include: {
                userProfile: {
                  include: {
                    dataKaryawan: {
                      select: { nama: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      position: hierarchy.position,
      reportsTo: hierarchy.reportsTo,
      coordinator: hierarchy.coordinator,
      directReports: directReports.map((dr) => dr.position),
      coordinatedPositions: coordinatedPositions.map((cp) => cp.position),
    };
  }

  /**
   * Get reporting chain for a position
   */
  async getReportingChain(
    positionId: string,
    userId: string,
  ): Promise<ReportingChainDto> {
    const context = await this.rlsService.getUserContext(userId);
    const canAccess = await this.rlsService.canAccessRecord(
      context,
      'Position',
      positionId,
      'READ',
    );

    if (!canAccess) {
      throw new ForbiddenException('Access denied to view reporting chain');
    }

    const position = await this.prisma.position.findUnique({
      where: { id: positionId },
      select: { id: true, name: true },
    });

    if (!position) {
      throw new NotFoundException('Position not found');
    }

    const chain = await this.hierarchyValidator.getReportingChain(positionId);

    // Get details for each position in chain
    const chainDetails = await Promise.all(
      chain.map(async (posId, index) => {
        const pos = await this.prisma.position.findUnique({
          where: { id: posId },
          include: {
            department: true,
            userPositions: {
              where: { isActive: true },
              include: {
                userProfile: {
                  include: {
                    dataKaryawan: {
                      select: { nama: true },
                    },
                  },
                },
              },
            },
          },
        });

        return {
          level: index + 1,
          positionId: pos!.id,
          positionName: pos!.name,
          departmentName: pos!.department?.name,
          holderName:
            pos!.userPositions[0]?.userProfile.dataKaryawan?.nama || undefined,
        };
      }),
    );

    return {
      positionId: position.id,
      positionName: position.name,
      reportingChain: chainDetails,
      chainLength: chainDetails.length,
    };
  }

  /**
   * Get all subordinates for a position
   */
  async getSubordinates(positionId: string, userId: string): Promise<any[]> {
    const context = await this.rlsService.getUserContext(userId);
    const canAccess = await this.rlsService.canAccessRecord(
      context,
      'Position',
      positionId,
      'READ',
    );

    if (!canAccess) {
      throw new ForbiddenException('Access denied to view subordinates');
    }

    const subordinateIds =
      await this.hierarchyValidator.getSubordinates(positionId);

    if (subordinateIds.length === 0) {
      return [];
    }

    const subordinates = await this.prisma.position.findMany({
      where: {
        id: { in: subordinateIds },
      },
      include: {
        department: true,
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
        },
      },
      orderBy: [{ hierarchyLevel: 'asc' }, { name: 'asc' }],
    });

    return subordinates;
  }

  /**
   * Validate hierarchy consistency
   */
  async validateHierarchy(
    userId: string,
  ): Promise<HierarchyValidationResultDto> {
    const context = await this.rlsService.getUserContext(userId);

    if (!context.isSuperadmin) {
      throw new ForbiddenException('Only superadmins can validate hierarchy');
    }

    const result = await this.hierarchyValidator.validateHierarchyConsistency();

    // Get additional details for issues
    const detailedResult: HierarchyValidationResultDto = {
      valid: result.valid,
      issues: result.issues,
      circularReferences: [],
      orphanedPositions: [],
    };

    // Find circular references
    if (result.issues.some((issue) => issue.includes('Circular reference'))) {
      const allHierarchies = await this.prisma.positionHierarchy.findMany({
        include: {
          position: true,
        },
      });

      for (const hierarchy of allHierarchies) {
        if (hierarchy.reportsToId) {
          const hasCircular =
            await this.hierarchyValidator.detectCircularReference(
              hierarchy.positionId,
              hierarchy.reportsToId,
              'reportsTo',
            );

          if (hasCircular) {
            detailedResult.circularReferences!.push({
              positionId: hierarchy.positionId,
              positionName: hierarchy.position.name,
              conflictWith: hierarchy.reportsToId,
            });
          }
        }
      }
    }

    // Find orphaned positions
    const orphanedPositions = await this.prisma.position.findMany({
      where: {
        isActive: true,
        hierarchyLevel: { gt: 1 },
        hierarchies: {
          none: {},
        },
      },
    });

    detailedResult.orphanedPositions = orphanedPositions.map((pos) => ({
      positionId: pos.id,
      positionName: pos.name,
      reason: 'No hierarchy definition',
    }));

    // Audit the validation
    await this.auditService.log(
      { actorId: userId, module: 'ORGANIZATION' },
      {
        entityType: 'HIERARCHY_VALIDATION',
        entityId: 'SYSTEM',
        action: 'READ' as any,
        metadata: {
          valid: result.valid,
          issueCount: result.issues.length,
          timestamp: new Date(),
        },
      },
    );

    return detailedResult;
  }

  /**
   * Build org chart node recursively
   */
  private buildOrgChartNode(
    positionId: string | null,
    positionMap: Map<string, any>,
    hierarchyMap: Map<string, any>,
    userPositionMap: Map<string, any[]>,
    visited: Set<string>,
  ): HierarchyNodeDto {
    // Handle root case
    if (!positionId) {
      // Find positions without reportsTo
      const rootPositions = Array.from(hierarchyMap.values())
        .filter((h) => !h.reportsToId)
        .map((h) => h.positionId);

      if (rootPositions.length === 0) {
        // No hierarchy defined, use highest level position
        const topPosition = Array.from(positionMap.values()).sort(
          (a, b) => a.hierarchyLevel - b.hierarchyLevel,
        )[0];

        if (topPosition) {
          positionId = topPosition.id;
        }
      } else {
        positionId = rootPositions[0];
      }
    }

    if (!positionId || visited.has(positionId)) {
      return {} as HierarchyNodeDto;
    }

    visited.add(positionId);

    const position = positionMap.get(positionId);
    if (!position) {
      return {} as HierarchyNodeDto;
    }

    const hierarchy = hierarchyMap.get(positionId);
    const holders = userPositionMap.get(positionId) || [];
    const currentHolder = holders.find((h) => !h.isPlt);

    // Find direct reports
    const directReportIds = Array.from(hierarchyMap.values())
      .filter((h) => h.reportsToId === positionId)
      .map((h) => h.positionId);

    const directReports = directReportIds
      .map((id) =>
        this.buildOrgChartNode(
          id,
          positionMap,
          hierarchyMap,
          userPositionMap,
          visited,
        ),
      )
      .filter((node) => node.positionId);

    // Calculate total subordinates
    const totalSubordinates = this.countSubordinates(directReports);

    const node: HierarchyNodeDto = {
      positionId: position.id,
      positionName: position.name,
      positionCode: position.code,
      departmentName: position.department?.name,
      hierarchyLevel: position.hierarchyLevel,
      currentHolder: currentHolder
        ? {
            userProfileId: currentHolder.userProfileId,
            name: currentHolder.userProfile.dataKaryawan?.nama || 'Unknown',
            nip: currentHolder.userProfile.dataKaryawan?.nip || '',
            isPlt: currentHolder.isPlt,
          }
        : undefined,
      reportsTo: hierarchy?.reportsToId
        ? {
            positionId: hierarchy.reportsToId,
            positionName: positionMap.get(hierarchy.reportsToId)?.name,
            holderName: userPositionMap.get(hierarchy.reportsToId)?.[0]
              ?.userProfile.dataKaryawan?.nama,
          }
        : undefined,
      coordinator: hierarchy?.coordinatorId
        ? {
            positionId: hierarchy.coordinatorId,
            positionName: positionMap.get(hierarchy.coordinatorId)?.name,
            holderName: userPositionMap.get(hierarchy.coordinatorId)?.[0]
              ?.userProfile.dataKaryawan?.nama,
          }
        : undefined,
      directReports,
      totalSubordinates,
    };

    return node;
  }

  /**
   * Count total subordinates recursively
   */
  private countSubordinates(directReports: HierarchyNodeDto[]): number {
    let count = directReports.length;

    directReports.forEach((report) => {
      count += report.totalSubordinates;
    });

    return count;
  }
}
