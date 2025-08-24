import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateSchoolDto,
  UpdateSchoolDto,
  SchoolFilterDto,
} from '../dto/school.dto';
import { RowLevelSecurityService } from '../../../security/row-level-security.service';
import { AuditService } from '../../audit/services/audit.service';
import { Prisma } from '@prisma/client';
import { BaseService } from '../../../common/base/base.service';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { PaginationResponseDto } from '../../../common/dto/pagination.dto';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class SchoolService extends BaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rlsService: RowLevelSecurityService,
    private readonly auditService: AuditService,
  ) {
    super();
  }

  /**
   * Create a new school with transaction
   */
  async create(dto: CreateSchoolDto, userId: string): Promise<any> {
    // Check for duplicate code
    const existing = await this.prisma.school.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw BusinessException.duplicate('School', 'code', dto.code);
    }

    return this.prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: this.prepareCreateData(dto, {
          createdBy: userId,
          modifiedBy: userId,
        }),
      });

      await this.auditService.logCreate(
        { actorId: userId, module: 'ORGANIZATION' },
        'School',
        school.id,
        school,
        school.name,
      );

      return school;
    });
  }

  /**
   * Find all schools with RLS and filters and pagination
   */
  async findAll(
    filters: SchoolFilterDto,
    userId: string,
  ): Promise<PaginationResponseDto<any>> {
    const context = await this.rlsService.getUserContext(userId);

    const where: Prisma.SchoolWhereInput = {};

    // Apply filters
    if (filters.lokasi) {
      where.lokasi = filters.lokasi;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Sanitize search input
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

    // Get pagination values
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await this.prisma.school.count({ where });

    const schools = await this.prisma.school.findMany({
      where,
      include: {
        _count: {
          select: {
            departments: true,
            positions: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: filters.sortBy
        ? { [filters.sortBy]: filters.sortOrder || 'asc' }
        : [{ lokasi: 'asc' }, { name: 'asc' }],
    });

    // Get employee counts in batch using proper aggregation
    const schoolIds = schools.map((s) => s.id);

    // First, get all positions for all schools in one query
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
    const schoolEmployeeMap = new Map<string, number>();
    schoolIds.forEach((schoolId) => {
      const positionIds = schoolPositionMap.get(schoolId) || [];
      const employeeCount = positionIds.reduce((sum, posId) => {
        return sum + (positionEmployeeMap.get(posId) || 0);
      }, 0);
      schoolEmployeeMap.set(schoolId, employeeCount);
    });

    const data = schools.map((school) => ({
      ...school,
      employeeCount: schoolEmployeeMap.get(school.id) || 0,
    }));

    return new PaginationResponseDto(data, total, page, limit);
  }

  /**
   * Find one school by ID
   */
  async findOne(id: string, userId: string): Promise<any> {
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

    return {
      ...school,
      employeeCount,
      departmentCount: school.departments.length,
      positionCount: school.positions.length,
    };
  }

  /**
   * Update school with transaction
   */
  async update(id: string, dto: UpdateSchoolDto, userId: string): Promise<any> {
    const context = await this.rlsService.getUserContext(userId);
    const canAccess = await this.rlsService.canAccessRecord(
      context,
      'School',
      id,
      'UPDATE',
    );

    if (!canAccess) {
      throw BusinessException.unauthorized(
        'Access denied to update this school',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const oldSchool = await tx.school.findUnique({
        where: { id },
      });

      if (!oldSchool) {
        throw BusinessException.notFound('School', id);
      }

      // Check for code uniqueness if changed
      if (dto.code && dto.code !== oldSchool.code) {
        const existing = await tx.school.findUnique({
          where: { code: dto.code },
        });
        if (existing) {
          throw BusinessException.duplicate('School', 'code', dto.code);
        }
      }

      const updated = await tx.school.update({
        where: { id },
        data: {
          ...dto,
          modifiedBy: userId,
        },
      });

      await this.auditService.logUpdate(
        { actorId: userId, module: 'ORGANIZATION' },
        'School',
        id,
        oldSchool,
        updated,
        updated.name,
      );

      return updated;
    });
  }

  /**
   * Delete school with validation
   */
  async remove(id: string, userId: string): Promise<void> {
    const context = await this.rlsService.getUserContext(userId);
    const canAccess = await this.rlsService.canAccessRecord(
      context,
      'School',
      id,
      'DELETE',
    );

    if (!canAccess) {
      throw BusinessException.unauthorized(
        'Access denied to delete this school',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // First check if school exists
      const school = await tx.school.findUnique({
        where: { id },
      });

      if (!school) {
        throw BusinessException.notFound('School', id);
      }

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

      await tx.school.delete({
        where: { id },
      });

      await this.auditService.logDelete(
        { actorId: userId, module: 'ORGANIZATION' },
        'School',
        id,
        school,
        school.name,
      );
    });
  }

  /**
   * Get school organizational hierarchy
   */
  async getHierarchy(id: string, userId: string): Promise<any> {
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

    return hierarchy;
  }

  /**
   * Get school statistics
   */
  async getStatistics(id: string, userId: string): Promise<any> {
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

    // Get comprehensive statistics
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

    // Get department breakdown with employee counts in a single query
    const departmentStats = await this.prisma.department.findMany({
      where: { schoolId: id, isActive: true },
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
    const departmentEmployeeCounts = departmentStats.map((dept) => ({
      departmentId: dept.id,
      departmentName: dept.name,
      positionCount: dept._count.positions,
      employeeCount: departmentEmployeeCountMap.get(dept.id) || 0,
    }));

    return {
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
      departmentBreakdown: departmentEmployeeCounts,
      lastUpdated: new Date(),
    };
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

      return {
        synced: uniqueLokasi.length,
        created,
        updated,
      };
    });
  }

  /**
   * Get available school codes from DataKaryawan
   * Uses Prisma best practices instead of raw SQL
   */
  async getAvailableSchoolCodes(): Promise<{ value: string; label: string }[]> {
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

    return availableCodes
      .map((item) => ({
        value: item.bagianKerja || '',
        label: item.bagianKerja || '',
      }))
      .filter((item) => item.value !== '');
  }

  /**
   * Sanitize search input to prevent SQL injection
   */
  private sanitizeSearchInput(input: string): string {
    return input
      .replace(/[%_\\'";]/g, '')
      .trim()
      .substring(0, 100);
  }
}
