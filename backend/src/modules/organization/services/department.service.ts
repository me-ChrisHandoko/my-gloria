import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentFilterDto,
  MoveDepartmentDto,
  DepartmentTreeDto,
} from '../dto/department.dto';
import { DepartmentValidator } from '../../../validators/department.validator';
import { RowLevelSecurityService } from '../../../security/row-level-security.service';
import { AuditService } from '../../audit/services/audit.service';
import { Prisma } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class DepartmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly departmentValidator: DepartmentValidator,
    private readonly rlsService: RowLevelSecurityService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a new department with transaction
   */
  async create(dto: CreateDepartmentDto, userId: string): Promise<any> {
    // Validate department creation
    await this.departmentValidator.validateCreate(dto);

    // Use transaction for consistency
    return this.prisma.$transaction(async (tx) => {
      const department = await tx.department.create({
        data: {
          id: uuidv7(),
          ...dto,
          createdBy: userId,
          modifiedBy: userId,
        },
        include: {
          school: true,
          parent: true,
        },
      });

      // Audit the creation
      await this.auditService.logCreate(
        { actorId: userId, module: 'ORGANIZATION' },
        'Department',
        department.id,
        department,
        department.name,
      );

      return department;
    });
  }

  /**
   * Find all departments with RLS and sanitized search
   */
  async findAll(filters: DepartmentFilterDto, userId: string): Promise<any[]> {
    const context = await this.rlsService.getUserContext(userId);

    const where: Prisma.DepartmentWhereInput = {};

    // Apply filters
    if (filters.schoolId) {
      where.schoolId = filters.schoolId;
    }

    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.bagianKerja) {
      where.bagianKerja = filters.bagianKerja;
    }

    // Sanitize and apply search filter
    if (filters.search) {
      const sanitizedSearch = this.sanitizeSearchInput(filters.search);
      where.OR = [
        { name: { contains: sanitizedSearch, mode: 'insensitive' } },
        { code: { contains: sanitizedSearch, mode: 'insensitive' } },
      ];
    }

    // Apply RLS
    if (!context.isSuperadmin) {
      if (context.schoolIds.length > 0) {
        where.schoolId = { in: context.schoolIds };
      }
      if (context.departmentIds.length > 0) {
        where.OR = [...(where.OR || []), { id: { in: context.departmentIds } }];
      }
    }

    const departments = await this.prisma.department.findMany({
      where,
      include: {
        school: true,
        parent: true,
        _count: {
          select: {
            children: true,
            positions: true,
          },
        },
      },
      orderBy: [{ schoolId: 'asc' }, { parentId: 'asc' }, { name: 'asc' }],
    });

    // Build tree structure if requested
    if (filters.includeChildren) {
      return this.buildDepartmentTree(departments);
    }

    return departments;
  }

  /**
   * Find one department by ID
   */
  async findOne(id: string, userId: string): Promise<any> {
    const context = await this.rlsService.getUserContext(userId);
    const canAccess = await this.rlsService.canAccessRecord(
      context,
      'Department',
      id,
      'READ',
    );

    if (!canAccess) {
      throw new ForbiddenException('Access denied to this department');
    }

    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        school: true,
        parent: true,
        children: {
          where: { isActive: true },
          include: {
            _count: {
              select: {
                positions: true,
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

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Calculate employee count
    const employeeCount = department.positions.reduce(
      (sum, pos) => sum + pos.userPositions.length,
      0,
    );

    return {
      ...department,
      employeeCount,
      positionCount: department.positions.length,
    };
  }

  /**
   * Update department with transaction
   */
  async update(
    id: string,
    dto: UpdateDepartmentDto,
    userId: string,
  ): Promise<any> {
    const context = await this.rlsService.getUserContext(userId);
    const canAccess = await this.rlsService.canAccessRecord(
      context,
      'Department',
      id,
      'UPDATE',
    );

    if (!canAccess) {
      throw new ForbiddenException('Access denied to update this department');
    }

    return this.prisma.$transaction(async (tx) => {
      const oldDepartment = await tx.department.findUnique({
        where: { id },
      });

      if (!oldDepartment) {
        throw new NotFoundException('Department not found');
      }

      const updated = await tx.department.update({
        where: { id },
        data: {
          ...dto,
          modifiedBy: userId,
        },
        include: {
          school: true,
          parent: true,
        },
      });

      await this.auditService.logUpdate(
        { actorId: userId, module: 'ORGANIZATION' },
        'Department',
        id,
        oldDepartment,
        updated,
        updated.name,
      );

      return updated;
    });
  }

  /**
   * Move department with validation and transaction
   */
  async move(dto: MoveDepartmentDto, userId: string): Promise<any> {
    await this.departmentValidator.validateMove(dto);

    const context = await this.rlsService.getUserContext(userId);
    const canAccess = await this.rlsService.canAccessRecord(
      context,
      'Department',
      dto.departmentId,
      'UPDATE',
    );

    if (!canAccess) {
      throw new ForbiddenException('Access denied to move this department');
    }

    return this.prisma.$transaction(async (tx) => {
      const department = await tx.department.findUnique({
        where: { id: dto.departmentId },
      });

      if (!department) {
        throw new NotFoundException('Department not found');
      }

      const updated = await tx.department.update({
        where: { id: dto.departmentId },
        data: {
          parentId: dto.newParentId,
          schoolId: dto.newSchoolId || department.schoolId,
          modifiedBy: userId,
        },
        include: {
          school: true,
          parent: true,
        },
      });

      await this.auditService.logOrganizationalChange(
        { actorId: userId, module: 'ORGANIZATION' },
        {
          type: 'DEPARTMENT_MOVE',
          entityId: dto.departmentId,
          entityName: department.name,
          details: {
            oldParentId: department.parentId,
            newParentId: dto.newParentId,
            oldSchoolId: department.schoolId,
            newSchoolId: dto.newSchoolId,
          },
        },
      );

      return updated;
    });
  }

  /**
   * Delete department with validation
   */
  async remove(id: string, userId: string): Promise<void> {
    await this.departmentValidator.validateDelete(id);

    const context = await this.rlsService.getUserContext(userId);
    const canAccess = await this.rlsService.canAccessRecord(
      context,
      'Department',
      id,
      'DELETE',
    );

    if (!canAccess) {
      throw new ForbiddenException('Access denied to delete this department');
    }

    await this.prisma.$transaction(async (tx) => {
      const department = await tx.department.findUnique({
        where: { id },
      });

      if (!department) {
        throw new NotFoundException('Department not found');
      }

      await tx.department.delete({
        where: { id },
      });

      await this.auditService.logDelete(
        { actorId: userId, module: 'ORGANIZATION' },
        'Department',
        id,
        department,
        department.name,
      );
    });
  }

  /**
   * Get department tree structure
   */
  async getTree(
    rootId: string | null,
    userId: string,
  ): Promise<DepartmentTreeDto[]> {
    const context = await this.rlsService.getUserContext(userId);

    // Build optimized query to avoid N+1
    const departments = await this.prisma.department.findMany({
      where: {
        isActive: true,
        ...(rootId ? { OR: [{ id: rootId }, { parentId: rootId }] } : {}),
        ...(context.isSuperadmin
          ? {}
          : { schoolId: { in: context.schoolIds } }),
      },
      include: {
        positions: {
          where: { isActive: true },
          select: { id: true },
        },
        _count: {
          select: {
            positions: true,
          },
        },
      },
    });

    // Get employee counts in batch
    const departmentIds = departments.map((d) => d.id);
    const employeeCounts = await this.prisma.userPosition.groupBy({
      by: ['positionId'],
      where: {
        isActive: true,
        position: {
          departmentId: { in: departmentIds },
        },
      },
      _count: {
        id: true,
      },
    });

    const employeeCountMap = new Map(
      employeeCounts.map((ec) => [ec.positionId, ec._count.id]),
    );

    return this.buildDepartmentTreeWithCounts(
      departments,
      employeeCountMap,
      rootId,
    );
  }

  /**
   * Validate department hierarchy consistency
   */
  async validateHierarchy(userId: string): Promise<any> {
    const context = await this.rlsService.getUserContext(userId);

    if (!context.isSuperadmin) {
      throw new ForbiddenException('Only superadmins can validate hierarchy');
    }

    return this.departmentValidator.validateHierarchyConsistency();
  }

  /**
   * Sanitize search input to prevent SQL injection
   */
  private sanitizeSearchInput(input: string): string {
    // Remove special characters that could be used for SQL injection
    return input
      .replace(/[%_\\'";]/g, '') // Remove SQL wildcards and quotes
      .trim()
      .substring(0, 100); // Limit length
  }

  /**
   * Build department tree structure efficiently
   */
  private buildDepartmentTree(departments: any[]): DepartmentTreeDto[] {
    const map = new Map<string, DepartmentTreeDto>();
    const roots: DepartmentTreeDto[] = [];

    // First pass: create all nodes
    departments.forEach((dept) => {
      map.set(dept.id, {
        id: dept.id,
        code: dept.code,
        name: dept.name,
        bagianKerja: dept.bagianKerja,
        description: dept.description,
        level: 0,
        children: [],
        employeeCount: 0,
        positionCount: dept._count?.positions || 0,
      });
    });

    // Second pass: build tree
    departments.forEach((dept) => {
      const node = map.get(dept.id)!;

      if (dept.parentId && map.has(dept.parentId)) {
        const parent = map.get(dept.parentId)!;
        node.level = parent.level + 1;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  /**
   * Build department tree with employee counts
   */
  private buildDepartmentTreeWithCounts(
    departments: any[],
    employeeCountMap: Map<string, number>,
    rootId: string | null,
  ): DepartmentTreeDto[] {
    const tree = this.buildDepartmentTree(departments);

    // Calculate employee counts
    const calculateEmployeeCount = (node: DepartmentTreeDto): number => {
      let count = 0;

      // Count employees in this department's positions
      const dept = departments.find((d) => d.id === node.id);
      if (dept) {
        dept.positions.forEach((pos: any) => {
          count += employeeCountMap.get(pos.id) || 0;
        });
      }

      // Add counts from children
      node.children.forEach((child) => {
        count += calculateEmployeeCount(child);
      });

      node.employeeCount = count;
      return count;
    };

    tree.forEach((root) => calculateEmployeeCount(root));

    return tree;
  }
}
