import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateDepartmentDto {
  code: string;
  name: string;
  bagianKerja?: string;
  schoolId?: string;
  parentId?: string;
  description?: string;
}

interface MoveDepartmentDto {
  departmentId: string;
  newParentId?: string;
  newSchoolId?: string;
}

@Injectable()
export class DepartmentValidator {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates department creation
   */
  async validateCreate(dto: CreateDepartmentDto): Promise<void> {
    // 1. Check code uniqueness
    const existingCode = await this.prisma.department.findUnique({
      where: { code: dto.code },
    });

    if (existingCode) {
      throw new ConflictException(
        `Department code '${dto.code}' already exists`,
      );
    }

    // 2. Validate school exists if provided
    if (dto.schoolId) {
      const school = await this.prisma.school.findUnique({
        where: { id: dto.schoolId },
      });

      if (!school) {
        throw new BadRequestException('School does not exist');
      }

      if (!school.isActive) {
        throw new BadRequestException(
          'Cannot create department in inactive school',
        );
      }
    }

    // 3. Validate parent department if provided
    if (dto.parentId) {
      await this.validateParentDepartment(dto.parentId, dto.schoolId);
    }

    // 4. Validate bagianKerja mapping if provided
    if (dto.bagianKerja) {
      await this.validateBagianKerja(dto.bagianKerja);
    }
  }

  /**
   * Validates parent department
   */
  private async validateParentDepartment(
    parentId: string,
    schoolId?: string,
  ): Promise<void> {
    const parent = await this.prisma.department.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      throw new BadRequestException('Parent department does not exist');
    }

    if (!parent.isActive) {
      throw new BadRequestException('Cannot set inactive department as parent');
    }

    // Check school alignment
    if (schoolId && parent.schoolId && parent.schoolId !== schoolId) {
      throw new ConflictException(
        'Child department must be in the same school as parent department',
      );
    }

    // Check maximum depth
    const depth = await this.getDepartmentDepth(parentId);
    const maxDepth = 5; // Maximum hierarchy depth

    if (depth >= maxDepth) {
      throw new ConflictException(
        `Department hierarchy cannot exceed ${maxDepth} levels`,
      );
    }
  }

  /**
   * Validates bagianKerja exists in DataKaryawan
   */
  private async validateBagianKerja(bagianKerja: string): Promise<void> {
    const exists = await this.prisma.dataKaryawan.findFirst({
      where: { bagianKerja },
    });

    if (!exists) {
      console.warn(`BagianKerja '${bagianKerja}' not found in DataKaryawan`);
      // This is a warning, not an error, as bagianKerja might be new
    }
  }

  /**
   * Validates department move operation
   */
  async validateMove(dto: MoveDepartmentDto): Promise<void> {
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
      include: {
        children: true,
        positions: true,
      },
    });

    if (!department) {
      throw new BadRequestException('Department does not exist');
    }

    // 1. Validate new parent if provided
    if (dto.newParentId) {
      // Cannot move to itself
      if (dto.newParentId === dto.departmentId) {
        throw new ConflictException('Department cannot be its own parent');
      }

      // Cannot move to its own child
      const isOwnChild = await this.isDescendant(
        dto.newParentId,
        dto.departmentId,
      );
      if (isOwnChild) {
        throw new ConflictException(
          'Cannot move department to its own descendant',
        );
      }

      // Validate parent exists and is active
      await this.validateParentDepartment(
        dto.newParentId,
        dto.newSchoolId || department.schoolId || undefined,
      );
    }

    // 2. Validate new school if provided
    if (dto.newSchoolId) {
      const newSchool = await this.prisma.school.findUnique({
        where: { id: dto.newSchoolId },
      });

      if (!newSchool) {
        throw new BadRequestException('Target school does not exist');
      }

      if (!newSchool.isActive) {
        throw new BadRequestException(
          'Cannot move department to inactive school',
        );
      }

      // Check if department has positions
      if (department.positions.length > 0) {
        throw new ConflictException(
          'Cannot move department with active positions to different school. ' +
            'Please reassign or remove positions first.',
        );
      }

      // Check if children are compatible
      if (department.children.length > 0) {
        throw new ConflictException(
          'Cannot move department with child departments to different school. ' +
            'Please move or reassign child departments first.',
        );
      }
    }
  }

  /**
   * Validates department deletion
   */
  async validateDelete(departmentId: string): Promise<void> {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        children: true,
        positions: {
          include: {
            userPositions: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!department) {
      throw new BadRequestException('Department does not exist');
    }

    // 1. Check for child departments
    if (department.children.length > 0) {
      throw new ConflictException(
        `Cannot delete department with ${department.children.length} child department(s). ` +
          'Please reassign or delete child departments first.',
      );
    }

    // 2. Check for active positions
    const activePositions = department.positions.filter((p) => p.isActive);
    if (activePositions.length > 0) {
      throw new ConflictException(
        `Cannot delete department with ${activePositions.length} active position(s). ` +
          'Please deactivate or reassign positions first.',
      );
    }

    // 3. Check for active assignments
    const hasActiveAssignments = department.positions.some(
      (p) => p.userPositions.length > 0,
    );

    if (hasActiveAssignments) {
      throw new ConflictException(
        'Cannot delete department with active user assignments. ' +
          'Please terminate all position assignments first.',
      );
    }
  }

  /**
   * Gets department depth in hierarchy
   */
  private async getDepartmentDepth(departmentId: string): Promise<number> {
    let depth = 0;
    let currentId: string | null = departmentId;

    while (currentId && depth < 10) {
      // Safety limit
      const department = await this.prisma.department.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      if (!department || !department.parentId) {
        break;
      }

      currentId = department.parentId;
      depth++;
    }

    return depth;
  }

  /**
   * Checks if a department is descendant of another
   */
  private async isDescendant(
    potentialDescendantId: string,
    ancestorId: string,
  ): Promise<boolean> {
    const visited = new Set<string>();
    const queue = [ancestorId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (currentId === potentialDescendantId) {
        return true;
      }

      if (visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);

      // Get children
      const children = await this.prisma.department.findMany({
        where: { parentId: currentId },
        select: { id: true },
      });

      queue.push(...children.map((c) => c.id));
    }

    return false;
  }

  /**
   * Validates department hierarchy consistency
   */
  async validateHierarchyConsistency(): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // 1. Check for circular references
    const allDepartments = await this.prisma.department.findMany({
      where: { isActive: true },
    });

    for (const dept of allDepartments) {
      if (dept.parentId) {
        const isCircular = await this.isDescendant(dept.parentId, dept.id);
        if (isCircular) {
          issues.push(
            `Circular reference detected for department ${dept.code}`,
          );
        }
      }
    }

    // 2. Check for orphaned departments (parent doesn't exist)
    const orphaned = await this.prisma.department.findMany({
      where: {
        parentId: { not: null },
        parent: null,
      },
    });

    if (orphaned.length > 0) {
      issues.push(`Found ${orphaned.length} orphaned department(s)`);
    }

    // 3. Check for school-parent misalignment
    const misaligned = await this.prisma.department.findMany({
      where: {
        AND: [{ parentId: { not: null } }, { schoolId: { not: null } }],
      },
      include: {
        parent: true,
      },
    });

    for (const dept of misaligned) {
      if (
        dept.parent &&
        dept.parent.schoolId &&
        dept.schoolId !== dept.parent.schoolId
      ) {
        issues.push(
          `Department ${dept.code} is in different school than parent ${dept.parent.code}`,
        );
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Gets complete department tree
   */
  async getDepartmentTree(rootId?: string): Promise<any> {
    const where = rootId ? { id: rootId } : { parentId: null, isActive: true };

    const departments = await this.prisma.department.findMany({
      where,
      include: {
        positions: {
          where: { isActive: true },
        },
      },
    });

    const buildTree = async (parentId: string | null): Promise<any[]> => {
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
          children: await buildTree(child.id),
        })),
      );
    };

    return Promise.all(
      departments.map(async (dept) => ({
        ...dept,
        children: await buildTree(dept.id),
      })),
    );
  }
}
