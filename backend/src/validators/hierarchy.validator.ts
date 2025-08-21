import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface SetHierarchyDto {
  positionId: string;
  reportsToId?: string;
  coordinatorId?: string;
}

@Injectable()
export class HierarchyValidator {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates hierarchy changes to prevent circular references and conflicts
   */
  async validateHierarchy(dto: SetHierarchyDto): Promise<void> {
    // 1. Validate position exists
    const position = await this.prisma.position.findUnique({
      where: { id: dto.positionId },
    });

    if (!position) {
      throw new BadRequestException('Position does not exist');
    }

    // 2. Validate reportsTo if provided
    if (dto.reportsToId) {
      await this.validateReportsTo(dto.positionId, dto.reportsToId, position);
    }

    // 3. Validate coordinator if provided
    if (dto.coordinatorId) {
      await this.validateCoordinator(
        dto.positionId,
        dto.coordinatorId,
        position,
      );
    }

    // 4. Validate no self-reference
    if (
      dto.reportsToId === dto.positionId ||
      dto.coordinatorId === dto.positionId
    ) {
      throw new ConflictException(
        'A position cannot report to or be coordinated by itself',
      );
    }

    // 5. Validate coordinator is not the same as reportsTo
    if (
      dto.coordinatorId &&
      dto.reportsToId &&
      dto.coordinatorId === dto.reportsToId
    ) {
      throw new ConflictException(
        'Coordinator and reporting manager cannot be the same position',
      );
    }
  }

  /**
   * Validates reporting relationship
   */
  private async validateReportsTo(
    positionId: string,
    reportsToId: string,
    position: any,
  ): Promise<void> {
    // Check if reportsTo position exists
    const reportsToPosition = await this.prisma.position.findUnique({
      where: { id: reportsToId },
    });

    if (!reportsToPosition) {
      throw new BadRequestException('ReportsTo position does not exist');
    }

    if (!reportsToPosition.isActive) {
      throw new BadRequestException('Cannot report to an inactive position');
    }

    // Check hierarchy level logic
    if (reportsToPosition.hierarchyLevel >= position.hierarchyLevel) {
      throw new ConflictException(
        'A position can only report to a higher hierarchy level',
      );
    }

    // Check for circular reference
    const hasCircularReference = await this.detectCircularReference(
      positionId,
      reportsToId,
      'reportsTo',
    );

    if (hasCircularReference) {
      throw new ConflictException(
        'This change would create a circular reporting structure',
      );
    }

    // Check department alignment (optional - positions should generally report within same department)
    if (position.departmentId && reportsToPosition.departmentId) {
      const isDifferentDepartment =
        position.departmentId !== reportsToPosition.departmentId;

      if (isDifferentDepartment) {
        // Check if cross-department reporting is allowed
        const isCrossDepartmentAllowed =
          await this.checkCrossDepartmentReporting(
            position.departmentId,
            reportsToPosition.departmentId,
          );

        if (!isCrossDepartmentAllowed) {
          throw new ConflictException(
            'Cross-department reporting is not allowed between these departments',
          );
        }
      }
    }
  }

  /**
   * Validates coordinator relationship
   */
  private async validateCoordinator(
    positionId: string,
    coordinatorId: string,
    position: any,
  ): Promise<void> {
    // Check if coordinator position exists
    const coordinatorPosition = await this.prisma.position.findUnique({
      where: { id: coordinatorId },
    });

    if (!coordinatorPosition) {
      throw new BadRequestException('Coordinator position does not exist');
    }

    if (!coordinatorPosition.isActive) {
      throw new BadRequestException(
        'Cannot be coordinated by an inactive position',
      );
    }

    // Coordinator should be at same or higher level
    if (coordinatorPosition.hierarchyLevel > position.hierarchyLevel) {
      throw new ConflictException(
        'A position can only be coordinated by same or higher hierarchy level',
      );
    }

    // Check for circular reference
    const hasCircularReference = await this.detectCircularReference(
      positionId,
      coordinatorId,
      'coordinator',
    );

    if (hasCircularReference) {
      throw new ConflictException(
        'This change would create a circular coordination structure',
      );
    }
  }

  /**
   * Detects circular references in hierarchy
   */
  async detectCircularReference(
    positionId: string,
    targetId: string,
    type: 'reportsTo' | 'coordinator',
  ): Promise<boolean> {
    const visited = new Set<string>();
    const queue = [targetId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (currentId === positionId) {
        return true; // Circular reference detected
      }

      if (visited.has(currentId)) {
        continue; // Already checked this position
      }

      visited.add(currentId);

      // Get the hierarchy for current position
      const hierarchy = await this.prisma.positionHierarchy.findUnique({
        where: { positionId: currentId },
      });

      if (hierarchy) {
        if (type === 'reportsTo' && hierarchy.reportsToId) {
          queue.push(hierarchy.reportsToId);
        }
        if (type === 'coordinator' && hierarchy.coordinatorId) {
          queue.push(hierarchy.coordinatorId);
        }
      }
    }

    return false; // No circular reference
  }

  /**
   * Gets the complete reporting chain for a position
   */
  async getReportingChain(positionId: string): Promise<string[]> {
    const chain: string[] = [];
    const visited = new Set<string>();
    let currentId = positionId;

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);

      const hierarchy = await this.prisma.positionHierarchy.findUnique({
        where: { positionId: currentId },
      });

      if (hierarchy?.reportsToId) {
        chain.push(hierarchy.reportsToId);
        currentId = hierarchy.reportsToId;
      } else {
        break;
      }

      // Safety check for maximum chain length
      if (chain.length > 20) {
        throw new ConflictException(
          'Reporting chain exceeds maximum depth of 20 levels',
        );
      }
    }

    return chain;
  }

  /**
   * Gets all positions that report to a given position
   */
  async getSubordinates(positionId: string): Promise<string[]> {
    const subordinates: string[] = [];
    const queue = [positionId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);

      // Find all positions that report to current position
      const directReports = await this.prisma.positionHierarchy.findMany({
        where: { reportsToId: currentId },
      });

      for (const report of directReports) {
        subordinates.push(report.positionId);
        queue.push(report.positionId);
      }

      // Safety check for maximum subordinates
      if (subordinates.length > 100) {
        console.warn(`Position ${positionId} has more than 100 subordinates`);
        break;
      }
    }

    return subordinates;
  }

  /**
   * Validates hierarchy consistency
   */
  async validateHierarchyConsistency(): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // 1. Check for orphaned hierarchies
    const orphanedHierarchies = await this.prisma.positionHierarchy.findMany({
      where: {
        position: {
          isActive: false,
        },
      },
    });

    if (orphanedHierarchies.length > 0) {
      issues.push(
        `Found ${orphanedHierarchies.length} hierarchies with inactive positions`,
      );
    }

    // 2. Check for positions without hierarchy
    const positionsWithoutHierarchy = await this.prisma.position.findMany({
      where: {
        isActive: true,
        hierarchies: {
          none: {},
        },
      },
    });

    if (positionsWithoutHierarchy.length > 0) {
      const topLevelPositions = positionsWithoutHierarchy.filter(
        (p) => p.hierarchyLevel === 1,
      );
      const nonTopLevel =
        positionsWithoutHierarchy.length - topLevelPositions.length;

      if (nonTopLevel > 0) {
        issues.push(
          `Found ${nonTopLevel} non-top-level positions without hierarchy definition`,
        );
      }
    }

    // 3. Check for circular references
    const allHierarchies = await this.prisma.positionHierarchy.findMany();

    for (const hierarchy of allHierarchies) {
      if (hierarchy.reportsToId) {
        const hasCircular = await this.detectCircularReference(
          hierarchy.positionId,
          hierarchy.reportsToId,
          'reportsTo',
        );

        if (hasCircular) {
          issues.push(
            `Circular reference detected for position ${hierarchy.positionId}`,
          );
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Checks if cross-department reporting is allowed
   */
  private async checkCrossDepartmentReporting(
    departmentId: string,
    targetDepartmentId: string,
  ): Promise<boolean> {
    // Check if departments are in the same hierarchy branch
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
    });

    const targetDepartment = await this.prisma.department.findUnique({
      where: { id: targetDepartmentId },
    });

    if (!department || !targetDepartment) {
      return false;
    }

    // Allow if they're in the same school
    if (department.schoolId === targetDepartment.schoolId) {
      return true;
    }

    // Check if one is parent of the other
    if (
      department.parentId === targetDepartmentId ||
      targetDepartment.parentId === departmentId
    ) {
      return true;
    }

    return false;
  }

  /**
   * Validates maximum hierarchy depth
   */
  async validateMaxDepth(positionId: string): Promise<void> {
    const chain = await this.getReportingChain(positionId);
    const maxDepth = 10; // Maximum allowed hierarchy depth

    if (chain.length >= maxDepth) {
      throw new ConflictException(
        `Hierarchy depth cannot exceed ${maxDepth} levels`,
      );
    }
  }
}
