import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateSchoolDto,
  UpdateSchoolDto,
  SchoolFilterDto,
} from '../dto/school.dto';
import { RowLevelSecurityService } from '../../../security/row-level-security.service';
import { AuditService } from '../../../audit/audit.service';
import { Prisma } from '@prisma/client';
import { BaseService } from '../../../common/base/base.service';
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
      throw new ConflictException(
        `School with code ${dto.code} already exists`,
      );
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
   * Find all schools with RLS and filters
   */
  async findAll(filters: SchoolFilterDto, userId: string): Promise<any[]> {
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
      orderBy: [{ lokasi: 'asc' }, { name: 'asc' }],
    });

    // Get employee counts in batch
    const schoolIds = schools.map((s) => s.id);
    const employeeCounts = await this.prisma.userPosition.groupBy({
      by: ['positionId'],
      where: {
        isActive: true,
        position: {
          schoolId: { in: schoolIds },
        },
      },
      _count: {
        id: true,
      },
    });

    // Map employee counts to schools
    const schoolEmployeeMap = new Map<string, number>();
    for (const school of schools) {
      const positions = await this.prisma.position.findMany({
        where: { schoolId: school.id },
        select: { id: true },
      });

      const positionIds = positions.map((p) => p.id);
      const employeeCount = employeeCounts
        .filter((ec) => positionIds.includes(ec.positionId))
        .reduce((sum, ec) => sum + ec._count.id, 0);

      schoolEmployeeMap.set(school.id, employeeCount);
    }

    return schools.map((school) => ({
      ...school,
      employeeCount: schoolEmployeeMap.get(school.id) || 0,
    }));
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
      throw new ForbiddenException('Access denied to this school');
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
      throw new NotFoundException('School not found');
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
      throw new ForbiddenException('Access denied to update this school');
    }

    return this.prisma.$transaction(async (tx) => {
      const oldSchool = await tx.school.findUnique({
        where: { id },
      });

      if (!oldSchool) {
        throw new NotFoundException('School not found');
      }

      // Check for code uniqueness if changed
      if (dto.code && dto.code !== oldSchool.code) {
        const existing = await tx.school.findUnique({
          where: { code: dto.code },
        });
        if (existing) {
          throw new ConflictException(
            `School with code ${dto.code} already exists`,
          );
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
      throw new ForbiddenException('Access denied to delete this school');
    }

    await this.prisma.$transaction(async (tx) => {
      // First check if school exists
      const school = await tx.school.findUnique({
        where: { id },
      });

      if (!school) {
        throw new NotFoundException('School not found');
      }

      // Check for dependent departments
      const departmentCount = await tx.department.count({
        where: { schoolId: id },
      });

      if (departmentCount > 0) {
        throw new ConflictException(
          `Cannot delete school with ${departmentCount} department(s)`,
        );
      }

      // Check for direct positions
      const positionCount = await tx.position.count({
        where: { schoolId: id },
      });

      if (positionCount > 0) {
        throw new ConflictException(
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
      throw new ForbiddenException('Access denied to this school');
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
      throw new NotFoundException('School not found');
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
      throw new ForbiddenException('Access denied to this school');
    }

    const school = await this.prisma.school.findUnique({
      where: { id },
    });

    if (!school) {
      throw new NotFoundException('School not found');
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

    // Get department breakdown
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

    // Get employee counts per department
    const departmentEmployeeCounts = await Promise.all(
      departmentStats.map(async (dept) => {
        const count = await this.prisma.userPosition.count({
          where: {
            isActive: true,
            position: {
              departmentId: dept.id,
            },
          },
        });
        return {
          departmentId: dept.id,
          departmentName: dept.name,
          positionCount: dept._count.positions,
          employeeCount: count,
        };
      }),
    );

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
      throw new ForbiddenException(
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
