import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateSchoolDto,
  UpdateSchoolDto,
  SchoolFilterDto,
} from '../dto/school.dto';
import { RowLevelSecurityService, UserContext } from '../../../security/row-level-security.service';
import { AuditService } from '../../audit/services/audit.service';
import { Prisma, School } from '@prisma/client';
import { BaseOrganizationService } from '../base/base-organization.service';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { PaginationResponseDto } from '../../../common/dto/pagination.dto';
import { OrganizationCacheService } from '../cache/organization-cache.service';
import { v7 as uuidv7 } from 'uuid';

interface SchoolWithRelations extends School {
  departments?: any[];
  positions?: any[];
  _count?: any;
}

@Injectable()
export class SchoolServiceRefactored extends BaseOrganizationService<
  SchoolWithRelations,
  CreateSchoolDto,
  UpdateSchoolDto,
  SchoolFilterDto
> {
  protected readonly entityName = 'school';
  protected readonly entityDisplayField = 'name';
  protected readonly uniqueFields = ['code'];

  constructor(
    prisma: PrismaService,
    rlsService: RowLevelSecurityService,
    auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    @Inject('SchoolCacheService')
    private readonly cacheService: OrganizationCacheService<any>,
  ) {
    super(prisma, rlsService, auditService);
  }

  /**
   * Build where clause with RLS and filters
   */
  protected buildWhereClause(
    filters: SchoolFilterDto,
    context: UserContext,
  ): Prisma.SchoolWhereInput {
    const where: Prisma.SchoolWhereInput = {};

    // Apply filters
    if (filters.lokasi) {
      where.lokasi = filters.lokasi;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Sanitize and apply search
    if (filters.search) {
      const sanitizedSearch = this.sanitizeSearchInput(filters.search);
      where.OR = [
        { name: { contains: sanitizedSearch, mode: 'insensitive' } },
        { code: { contains: sanitizedSearch, mode: 'insensitive' } },
        { address: { contains: sanitizedSearch, mode: 'insensitive' } },
      ];
    }

    // Apply RLS
    if (!context.isSuperadmin && context.schoolIds.length > 0) {
      where.id = { in: context.schoolIds };
    }

    return where;
  }

  /**
   * Get include options for queries
   */
  protected getIncludeOptions() {
    return {
      _count: {
        select: {
          departments: true,
          positions: true,
        },
      },
    };
  }

  /**
   * Transform entity for response
   */
  protected transformForResponse(school: SchoolWithRelations): any {
    return school;
  }

  /**
   * Validate before deletion
   */
  protected async validateDeletion(id: string, tx: any): Promise<void> {
    // Check for dependent departments
    const departmentCount = await tx.department.count({
      where: { schoolId: id },
    });

    if (departmentCount > 0) {
      throw BusinessException.invalidOperation(
        `Cannot delete school with ${departmentCount} department(s)`,
      );
    }

    // Check for direct positions
    const positionCount = await tx.position.count({
      where: { schoolId: id },
    });

    if (positionCount > 0) {
      throw BusinessException.invalidOperation(
        `Cannot delete school with ${positionCount} position(s)`,
      );
    }
  }

  /**
   * Override create to emit events
   */
  async create(dto: CreateSchoolDto, userId: string): Promise<any> {
    const school = await super.create(dto, userId);
    
    // Emit event for other services
    this.eventEmitter.emit('organization.school.created', {
      id: school.id,
      name: school.name,
      userId,
    });

    return school;
  }

  /**
   * Override update to emit events and invalidate cache
   */
  async update(id: string, dto: UpdateSchoolDto, userId: string): Promise<any> {
    const school = await super.update(id, dto, userId);
    
    // Invalidate cache
    await this.cacheService.delete(`school:${id}:*`);
    
    // Emit event
    this.eventEmitter.emit('organization.school.updated', {
      id: school.id,
      name: school.name,
      userId,
    });

    return school;
  }

  /**
   * Override remove to emit events
   */
  async remove(id: string, userId: string): Promise<void> {
    await super.remove(id, userId);
    
    // Emit event
    this.eventEmitter.emit('organization.school.deleted', {
      id,
      userId,
    });
  }

  /**
   * Find all schools with RLS, filters and pagination
   */
  async findAll(
    filters: SchoolFilterDto,
    userId: string,
  ): Promise<PaginationResponseDto<any>> {
    const context = await this.rlsService.getUserContext(userId);
    const where = this.buildWhereClause(filters, context);

    // Get pagination values
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await this.prisma.school.count({ where });

    const schools = await this.prisma.school.findMany({
      where,
      include: this.getIncludeOptions(),
      skip,
      take: limit,
      orderBy: filters.sortBy
        ? { [filters.sortBy]: filters.sortOrder || 'asc' }
        : [{ lokasi: 'asc' }, { name: 'asc' }],
    });

    // Get employee counts efficiently
    const schoolsWithCounts = await this.enrichWithEmployeeCounts(schools);

    return new PaginationResponseDto(schoolsWithCounts, total, page, limit);
  }

  /**
   * Find one school with caching
   */
  async findOne(id: string, userId: string): Promise<any> {
    // Check cache first
    const cacheKey = OrganizationCacheService.generateKey('school', id, 'full');
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Validate access
    await this.validateAccess(userId, id, 'READ');

    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        departments: {
          where: { isActive: true },
          include: {
            _count: {
              select: {
                positions: true,
                children: true,
              },
            },
          },
        },
        positions: {
          where: { isActive: true },
          include: {
            userPositions: {
              where: { isActive: true },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!school) {
      throw BusinessException.notFound('School', id);
    }

    // Calculate statistics
    const employeeCount = school.positions.reduce(
      (sum, pos) => sum + pos.userPositions.length,
      0,
    );

    const enrichedSchool = {
      ...school,
      employeeCount,
      departmentCount: school.departments.length,
      positionCount: school.positions.length,
    };

    // Cache the result
    await this.cacheService.set(cacheKey, enrichedSchool, {
      ttl: 5 * 60 * 1000, // 5 minutes
      invalidateOn: [`school.${id}.updated`, `school.${id}.deleted`],
    });

    return enrichedSchool;
  }

  /**
   * Get school hierarchy with caching
   */
  async getHierarchy(id: string, userId: string): Promise<any> {
    const cacheKey = OrganizationCacheService.generateKey('school', id, 'hierarchy');
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const context = await this.rlsService.getUserContext(userId);
    const canAccess = await this.rlsService.canAccessRecord(
      context,
      'School',
      id,
      'READ',
    );

    if (!canAccess) {
      throw BusinessException.unauthorized('Access denied to this school');
    }

    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        departments: {
          where: { isActive: true },
          include: {
            positions: {
              where: { isActive: true },
              include: {
                hierarchies: {
                  include: {
                    reportsTo: true,
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
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!school) {
      throw BusinessException.notFound('School', id);
    }

    // Build hierarchy tree
    const hierarchy = {
      schoolId: school.id,
      schoolName: school.name,
      departments: school.departments.map((dept) => ({
        departmentId: dept.id,
        departmentName: dept.name,
        positions: dept.positions.map((pos) => ({
          positionId: pos.id,
          positionName: pos.name,
          hierarchyLevel: pos.hierarchyLevel,
          reportsTo: pos.hierarchies[0]?.reportsTo?.name,
          holders: pos.userPositions.map((up) => ({
            name: up.userProfile.dataKaryawan?.nama || 'Unknown',
            nip: up.userProfile.dataKaryawan?.nip,
            isPlt: up.isPlt,
          })),
        })),
      })),
    };

    // Cache the hierarchy
    await this.cacheService.set(cacheKey, hierarchy, {
      ttl: 10 * 60 * 1000, // 10 minutes
      invalidateOn: [
        `school.${id}.updated`,
        `school.${id}.deleted`,
        `department.*.updated`,
        `position.*.updated`,
      ],
    });

    return hierarchy;
  }

  /**
   * Get school statistics with caching
   */
  async getStatistics(id: string, userId: string): Promise<any> {
    const cacheKey = OrganizationCacheService.generateKey('school', id, 'statistics');
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const context = await this.rlsService.getUserContext(userId);
    const canAccess = await this.rlsService.canAccessRecord(
      context,
      'School',
      id,
      'READ',
    );

    if (!canAccess) {
      throw BusinessException.unauthorized('Access denied to this school');
    }

    const school = await this.prisma.school.findUnique({
      where: { id },
    });

    if (!school) {
      throw BusinessException.notFound('School', id);
    }

    // Use batch queries for efficiency
    const [
      departmentCount,
      positionCount,
      employeeCount,
      vacantPositions,
      pltCount,
    ] = await Promise.all([
      this.prisma.department.count({
        where: { schoolId: id, isActive: true },
      }),
      this.prisma.position.count({
        where: { schoolId: id, isActive: true },
      }),
      this.prisma.userPosition.count({
        where: {
          isActive: true,
          position: { schoolId: id },
        },
      }),
      this.prisma.position.count({
        where: {
          schoolId: id,
          isActive: true,
          userPositions: {
            none: {
              isActive: true,
              isPlt: false,
            },
          },
        },
      }),
      this.prisma.userPosition.count({
        where: {
          isActive: true,
          isPlt: true,
          position: { schoolId: id },
        },
      }),
    ]);

    // Get department breakdown efficiently
    const departmentStats = await this.getDepartmentStatistics(id);

    const statistics = {
      schoolId: school.id,
      schoolName: school.name,
      summary: {
        departmentCount,
        positionCount,
        employeeCount,
        vacantPositions,
        pltCount,
        fillRate:
          positionCount > 0
            ? (
                ((positionCount - vacantPositions) / positionCount) *
                100
              ).toFixed(2) + '%'
            : '0%',
      },
      departmentBreakdown: departmentStats,
      lastUpdated: new Date(),
    };

    // Cache the statistics
    await this.cacheService.set(cacheKey, statistics, {
      ttl: 3 * 60 * 1000, // 3 minutes - shorter TTL for statistics
    });

    return statistics;
  }

  /**
   * Sync school locations with data_karyawan table
   */
  async syncWithDataKaryawan(
    userId: string,
  ): Promise<{ synced: number; created: number; updated: number }> {
    const context = await this.rlsService.getUserContext(userId);

    if (!context.isSuperadmin) {
      throw BusinessException.unauthorized(
        'Only superadmins can sync school locations',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Get unique lokasi from data_karyawan
      const uniqueLokasi = await tx.dataKaryawan.findMany({
        where: {
          lokasi: {
            not: null,
          },
        },
        select: {
          lokasi: true,
        },
        distinct: ['lokasi'],
      });

      let created = 0;
      let updated = 0;

      for (const item of uniqueLokasi) {
        if (!item.lokasi) continue;

        // Check if school exists
        const existingSchool = await tx.school.findFirst({
          where: { lokasi: item.lokasi },
        });

        if (!existingSchool) {
          // Create new school
          const code = `SCH${item.lokasi.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-4)}`;

          await tx.school.create({
            data: {
              id: uuidv7(),
              code,
              name: `School - ${item.lokasi}`,
              lokasi: item.lokasi,
              address: `${item.lokasi} Address`,
              isActive: true,
              createdBy: userId,
              modifiedBy: userId,
            },
          });
          created++;
        } else {
          // Update existing school if needed
          if (!existingSchool.isActive) {
            await tx.school.update({
              where: { id: existingSchool.id },
              data: {
                isActive: true,
                modifiedBy: userId,
              },
            });
            updated++;
          }
        }
      }

      // Audit the sync operation
      await this.auditService.log(
        { actorId: userId, module: 'ORGANIZATION' },
        {
          entityType: 'SCHOOL_SYNC',
          entityId: 'SYSTEM',
          entityDisplay: 'School Location Sync',
          action: 'CREATE' as any,
          metadata: {
            uniqueLocations: uniqueLokasi.length,
            created,
            updated,
            timestamp: new Date(),
          },
        },
      );

      // Clear all school caches after sync
      await this.cacheService.clear();

      return {
        synced: uniqueLokasi.length,
        created,
        updated,
      };
    });
  }

  /**
   * Get available school codes from DataKaryawan
   */
  async getAvailableSchoolCodes(): Promise<{ value: string; label: string }[]> {
    const cacheKey = OrganizationCacheService.generateKey('school', 'available-codes');
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached as any;
    }

    const availableCodes = await this.prisma.dataKaryawan.groupBy({
      by: ['bagianKerja'],
      where: {
        bagianKerja: {
          notIn: ['YAYASAN', 'SATPAM', 'UMUM'],
          not: null,
        },
      },
      orderBy: {
        bagianKerja: 'asc',
      },
    });

    const codes = availableCodes
      .map((item) => ({
        value: item.bagianKerja || '',
        label: item.bagianKerja || '',
      }))
      .filter((item) => item.value !== '');

    // Cache for 1 hour
    await this.cacheService.set(cacheKey, codes, {
      ttl: 60 * 60 * 1000,
    });

    return codes;
  }

  /**
   * Private helper: Enrich schools with employee counts
   */
  private async enrichWithEmployeeCounts(schools: any[]): Promise<any[]> {
    const schoolIds = schools.map((s) => s.id);

    // Get all positions for all schools in one query
    const allPositions = await this.prisma.position.findMany({
      where: { schoolId: { in: schoolIds } },
      select: { id: true, schoolId: true },
    });

    // Create a map of schoolId to positionIds
    const schoolPositionMap = new Map<string, string[]>();
    allPositions.forEach((pos) => {
      if (pos.schoolId) {
        const posIds = schoolPositionMap.get(pos.schoolId) || [];
        posIds.push(pos.id);
        schoolPositionMap.set(pos.schoolId, posIds);
      }
    });

    // Get employee counts grouped by positionId
    const employeeCounts = await this.prisma.userPosition.groupBy({
      by: ['positionId'],
      where: {
        isActive: true,
        positionId: { in: allPositions.map((p) => p.id) },
      },
      _count: {
        id: true,
      },
    });

    // Create a map of positionId to employee count
    const positionEmployeeMap = new Map<string, number>();
    employeeCounts.forEach((ec) => {
      positionEmployeeMap.set(ec.positionId, ec._count.id);
    });

    // Map employee counts to schools
    return schools.map((school) => {
      const positionIds = schoolPositionMap.get(school.id) || [];
      const employeeCount = positionIds.reduce((sum, posId) => {
        return sum + (positionEmployeeMap.get(posId) || 0);
      }, 0);

      return {
        ...school,
        employeeCount,
      };
    });
  }

  /**
   * Private helper: Get department statistics
   */
  private async getDepartmentStatistics(schoolId: string): Promise<any[]> {
    const departmentStats = await this.prisma.department.findMany({
      where: { schoolId, isActive: true },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            positions: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    // Get all positions for these departments
    const departmentIds = departmentStats.map((d) => d.id);
    const positionsWithCounts = await this.prisma.position.findMany({
      where: {
        departmentId: { in: departmentIds },
        isActive: true,
      },
      select: {
        id: true,
        departmentId: true,
        _count: {
          select: {
            userPositions: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    // Create a map of departmentId to employee count
    const departmentEmployeeCountMap = new Map<string, number>();
    positionsWithCounts.forEach((pos) => {
      if (pos.departmentId) {
        const currentCount =
          departmentEmployeeCountMap.get(pos.departmentId) || 0;
        departmentEmployeeCountMap.set(
          pos.departmentId,
          currentCount + pos._count.userPositions,
        );
      }
    });

    // Build the final department breakdown
    return departmentStats.map((dept) => ({
      departmentId: dept.id,
      departmentName: dept.name,
      positionCount: dept._count.positions,
      employeeCount: departmentEmployeeCountMap.get(dept.id) || 0,
    }));
  }
}