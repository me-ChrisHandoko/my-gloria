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
  SchoolResponseDto,
} from '../dto/school.dto';
import { RowLevelSecurityService } from '../../../security/row-level-security.service';
import { AuditService } from '../../../audit/audit.service';
import { Prisma } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class SchoolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rlsService: RowLevelSecurityService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a new school
   */
  async create(
    dto: CreateSchoolDto,
    userId: string,
  ): Promise<SchoolResponseDto> {
    // Check for duplicate code
    const existing = await this.prisma.school.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(
        `School with code ${dto.code} already exists`,
      );
    }

    // Create school with audit fields
    const school = await this.prisma.school.create({
      data: {
        id: uuidv7(),
        ...dto,
        createdBy: userId,
        modifiedBy: userId,
      },
    });

    // Audit the creation
    await this.auditService.logCreate(
      { actorId: userId, module: 'ORGANIZATION' },
      'School',
      school.id,
      school,
      school.name,
    );

    return this.mapToResponse(school);
  }

  /**
   * Find all schools with RLS
   */
  async findAll(
    filters: SchoolFilterDto,
    userId: string,
  ): Promise<SchoolResponseDto[]> {
    // Get user context for RLS
    const context = await this.rlsService.getUserContext(userId);

    // Build where clause
    const where: Prisma.SchoolWhereInput = {};

    // Apply filters
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.lokasi) {
      where.lokasi = filters.lokasi;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Apply RLS - limit to schools user has access to
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
      orderBy: { name: 'asc' },
    });

    return schools.map((school) => this.mapToResponse(school));
  }

  /**
   * Find one school by ID with RLS check
   */
  async findOne(id: string, userId: string): Promise<SchoolResponseDto> {
    // Check access
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
        },
        positions: {
          where: { isActive: true },
        },
        _count: {
          select: {
            departments: true,
            positions: true,
          },
        },
      },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Get employee count
    const employeeCount = await this.prisma.userPosition.count({
      where: {
        isActive: true,
        position: {
          schoolId: id,
        },
      },
    });

    const response = this.mapToResponse(school);
    response.stats = {
      totalDepartments: school._count.departments,
      totalPositions: school._count.positions,
      totalEmployees: employeeCount,
    };

    return response;
  }

  /**
   * Update school with audit
   */
  async update(
    id: string,
    dto: UpdateSchoolDto,
    userId: string,
  ): Promise<SchoolResponseDto> {
    // Check access
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

    // Get old values for audit
    const oldSchool = await this.prisma.school.findUnique({
      where: { id },
    });

    if (!oldSchool) {
      throw new NotFoundException('School not found');
    }

    // Update school
    const updated = await this.prisma.school.update({
      where: { id },
      data: {
        ...dto,
        modifiedBy: userId,
      },
    });

    // Audit the update
    await this.auditService.logUpdate(
      { actorId: userId, module: 'ORGANIZATION' },
      'School',
      id,
      oldSchool,
      updated,
      updated.name,
    );

    return this.mapToResponse(updated);
  }

  /**
   * Delete school with validation
   */
  async remove(id: string, userId: string): Promise<void> {
    // Check access
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

    // Check for dependencies
    const departmentCount = await this.prisma.department.count({
      where: { schoolId: id },
    });

    if (departmentCount > 0) {
      throw new ConflictException(
        `Cannot delete school with ${departmentCount} department(s)`,
      );
    }

    const positionCount = await this.prisma.position.count({
      where: { schoolId: id },
    });

    if (positionCount > 0) {
      throw new ConflictException(
        `Cannot delete school with ${positionCount} position(s)`,
      );
    }

    // Get school for audit
    const school = await this.prisma.school.findUnique({
      where: { id },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Delete school
    await this.prisma.school.delete({
      where: { id },
    });

    // Audit the deletion
    await this.auditService.logDelete(
      { actorId: userId, module: 'ORGANIZATION' },
      'School',
      id,
      school,
      school.name,
    );
  }

  /**
   * Get school hierarchy
   */
  async getHierarchy(id: string, userId: string): Promise<any> {
    // Check access
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
          where: { isActive: true, parentId: null },
          include: {
            positions: {
              where: { isActive: true },
            },
          },
        },
        positions: {
          where: { isActive: true, departmentId: null },
        },
      },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Build department tree recursively
    const buildDepartmentTree = async (parentId: string): Promise<any[]> => {
      const children = await this.prisma.department.findMany({
        where: { parentId, isActive: true },
        include: {
          positions: {
            where: { isActive: true },
          },
        },
      });

      return Promise.all(
        children.map(async (child) => ({
          ...child,
          children: await buildDepartmentTree(child.id),
        })),
      );
    };

    // Build complete hierarchy
    const departments = await Promise.all(
      school.departments.map(async (dept) => ({
        ...dept,
        children: await buildDepartmentTree(dept.id),
      })),
    );

    return {
      school: {
        id: school.id,
        code: school.code,
        name: school.name,
      },
      departments,
      directPositions: school.positions,
    };
  }

  /**
   * Get school statistics
   */
  async getStatistics(id: string, userId: string): Promise<any> {
    // Check access
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

    const [
      departmentCount,
      positionCount,
      activeEmployees,
      pltEmployees,
      hierarchyLevels,
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
          isPlt: false,
          position: { schoolId: id },
        },
      }),
      this.prisma.userPosition.count({
        where: {
          isActive: true,
          isPlt: true,
          position: { schoolId: id },
        },
      }),
      this.prisma.position.findMany({
        where: { schoolId: id, isActive: true },
        select: { hierarchyLevel: true },
        distinct: ['hierarchyLevel'],
        orderBy: { hierarchyLevel: 'asc' },
      }),
    ]);

    return {
      departments: departmentCount,
      positions: positionCount,
      employees: {
        active: activeEmployees,
        plt: pltEmployees,
        total: activeEmployees + pltEmployees,
      },
      hierarchyLevels: hierarchyLevels.map((h) => h.hierarchyLevel),
    };
  }

  /**
   * Sync with data_karyawan lokasi
   */
  async syncWithDataKaryawan(userId: string): Promise<any> {
    // Only superadmins can sync
    const context = await this.rlsService.getUserContext(userId);
    if (!context.isSuperadmin) {
      throw new ForbiddenException('Only superadmins can sync data');
    }

    // Get unique lokasi from data_karyawan
    const locations = await this.prisma.dataKaryawan.findMany({
      where: {
        lokasi: { not: null },
        statusAktif: 'AKTIF',
      },
      select: { lokasi: true },
      distinct: ['lokasi'],
    });

    let created = 0;
    let updated = 0;

    for (const loc of locations) {
      if (!loc.lokasi) continue;

      const existing = await this.prisma.school.findFirst({
        where: { lokasi: loc.lokasi },
      });

      if (!existing) {
        // Create new school
        await this.prisma.school.create({
          data: {
            id: uuidv7(),
            code: loc.lokasi,
            name: `School ${loc.lokasi}`,
            lokasi: loc.lokasi,
            createdBy: userId,
            modifiedBy: userId,
          },
        });
        created++;
      } else if (!existing.isActive) {
        // Reactivate inactive school
        await this.prisma.school.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            modifiedBy: userId,
          },
        });
        updated++;
      }
    }

    // Audit the sync operation
    await this.auditService.log(
      { actorId: userId, module: 'ORGANIZATION' },
      {
        entityType: 'SYNC_OPERATION',
        entityId: 'SCHOOL_LOKASI',
        action: 'CREATE' as any,
        metadata: {
          operation: 'syncWithDataKaryawan',
          created,
          updated,
          total: locations.length,
        },
      },
    );

    return {
      synced: locations.length,
      created,
      updated,
    };
  }

  /**
   * Map entity to response DTO
   */
  private mapToResponse(school: any): SchoolResponseDto {
    return {
      id: school.id,
      code: school.code,
      name: school.name,
      lokasi: school.lokasi,
      address: school.address,
      phone: school.phone,
      email: school.email,
      principal: school.principal,
      isActive: school.isActive,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
      createdBy: school.createdBy,
      modifiedBy: school.modifiedBy,
      stats: school._count
        ? {
            totalDepartments: school._count.departments || 0,
            totalPositions: school._count.positions || 0,
            totalEmployees: 0,
          }
        : undefined,
    };
  }
}
