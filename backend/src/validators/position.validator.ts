import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

interface AssignPositionDto {
  userProfileId: string;
  positionId: string;
  startDate: Date;
  endDate?: Date;
  isPlt?: boolean;
  appointedBy?: string;
  skNumber?: string;
  notes?: string;
}

@Injectable()
export class PositionValidator {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates position assignment for conflicts and business rules
   */
  async validateAssignment(dto: AssignPositionDto): Promise<void> {
    // 1. Validate dates
    this.validateDates(dto.startDate, dto.endDate);

    // 2. Check position exists and is active
    const position = await this.prisma.position.findUnique({
      where: { id: dto.positionId },
      include: {
        userPositions: {
          where: {
            isActive: true,
            OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
          },
        },
      },
    });

    if (!position) {
      throw new BadRequestException('Position does not exist');
    }

    if (!position.isActive) {
      throw new BadRequestException('Position is not active');
    }

    // 3. Check position capacity
    await this.validatePositionCapacity(position, dto.isPlt);

    // 4. Check for overlapping assignments
    await this.validateNoOverlap(dto);

    // 5. Check for conflicting positions at same level
    if (!dto.isPlt) {
      await this.validateNoConflictingPositions(dto, position);
    }

    // 6. Validate PLT duration if applicable
    if (dto.isPlt) {
      this.validatePltDuration(dto.startDate, dto.endDate);
    }
  }

  /**
   * Validates date logic
   */
  private validateDates(startDate: Date, endDate?: Date): void {
    const start = new Date(startDate);
    const now = new Date();

    // Start date cannot be too far in the past (e.g., more than 1 year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    if (start < oneYearAgo) {
      throw new BadRequestException(
        'Start date cannot be more than 1 year in the past',
      );
    }

    if (endDate) {
      const end = new Date(endDate);

      if (end <= start) {
        throw new BadRequestException('End date must be after start date');
      }

      // Maximum assignment duration check (e.g., 5 years)
      const maxDuration = 5 * 365 * 24 * 60 * 60 * 1000; // 5 years in milliseconds
      if (end.getTime() - start.getTime() > maxDuration) {
        throw new BadRequestException(
          'Assignment duration cannot exceed 5 years',
        );
      }
    }
  }

  /**
   * Validates position capacity constraints
   */
  private async validatePositionCapacity(
    position: any,
    isPlt?: boolean,
  ): Promise<void> {
    const activeHolders = position.userPositions.filter((up: any) => !up.isPlt);
    const pltHolders = position.userPositions.filter((up: any) => up.isPlt);

    // Check unique position constraint
    if (position.isUnique && activeHolders.length > 0 && !isPlt) {
      throw new ConflictException(
        'This is a unique position that is already occupied',
      );
    }

    // Check max holders limit (PLT positions don't count against limit)
    if (!isPlt && activeHolders.length >= position.maxHolders) {
      throw new ConflictException(
        `Position has reached maximum holders limit of ${position.maxHolders}`,
      );
    }

    // Limit PLT holders (e.g., max 2 PLT at once)
    if (isPlt && pltHolders.length >= 2) {
      throw new ConflictException(
        'Maximum number of PLT holders (2) has been reached',
      );
    }
  }

  /**
   * Validates no overlapping assignments for the same user
   */
  private async validateNoOverlap(dto: AssignPositionDto): Promise<void> {
    const overlapping = await this.prisma.userPosition.findFirst({
      where: {
        userProfileId: dto.userProfileId,
        positionId: dto.positionId,
        isActive: true,
        OR: [
          {
            // No end date (permanent position)
            endDate: null,
            startDate: { lte: dto.endDate || new Date('2099-12-31') },
          },
          {
            // Has end date
            AND: [
              { startDate: { lte: dto.endDate || new Date('2099-12-31') } },
              { endDate: { gte: dto.startDate } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      throw new ConflictException(
        'User already has an overlapping assignment for this position',
      );
    }
  }

  /**
   * Validates no conflicting positions at the same hierarchy level
   */
  private async validateNoConflictingPositions(
    dto: AssignPositionDto,
    position: any,
  ): Promise<void> {
    const existingPositions = await this.prisma.userPosition.findMany({
      where: {
        userProfileId: dto.userProfileId,
        isActive: true,
        isPlt: false,
        OR: [{ endDate: null }, { endDate: { gte: dto.startDate } }],
        position: {
          hierarchyLevel: position.hierarchyLevel,
          departmentId: position.departmentId,
          NOT: { id: position.id },
        },
      },
      include: {
        position: true,
      },
    });

    if (existingPositions.length > 0) {
      const conflictingPosition = existingPositions[0].position;
      throw new ConflictException(
        `User already holds position "${conflictingPosition.name}" at the same hierarchy level in this department`,
      );
    }
  }

  /**
   * Validates PLT duration constraints
   */
  private validatePltDuration(startDate: Date, endDate?: Date): void {
    if (!endDate) {
      throw new BadRequestException(
        'PLT (acting) positions must have an end date',
      );
    }

    const duration = endDate.getTime() - startDate.getTime();
    const maxPltDuration = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months in milliseconds

    if (duration > maxPltDuration) {
      throw new BadRequestException(
        'PLT assignment cannot exceed 6 months. For longer assignments, please use regular position assignment.',
      );
    }
  }

  /**
   * Validates position termination
   */
  async validateTermination(
    userPositionId: string,
    endDate: Date,
  ): Promise<void> {
    const position = await this.prisma.userPosition.findUnique({
      where: { id: userPositionId },
    });

    if (!position) {
      throw new BadRequestException('Position assignment not found');
    }

    if (!position.isActive) {
      throw new BadRequestException('Position assignment is already inactive');
    }

    if (position.endDate && position.endDate < new Date()) {
      throw new BadRequestException('Position assignment has already ended');
    }

    const end = new Date(endDate);
    if (end <= position.startDate) {
      throw new BadRequestException(
        'Termination date must be after the position start date',
      );
    }

    // Check if there are dependent positions
    await this.checkDependentPositions(position.positionId);
  }

  /**
   * Checks for positions that depend on this one
   */
  private async checkDependentPositions(positionId: string): Promise<void> {
    const dependentPositions = await this.prisma.positionHierarchy.count({
      where: {
        OR: [{ reportsToId: positionId }, { coordinatorId: positionId }],
      },
    });

    if (dependentPositions > 0) {
      throw new ConflictException(
        'Cannot terminate position that has dependent positions in the hierarchy',
      );
    }
  }

  /**
   * Validates that user can be appointed by the given appointer
   */
  async validateAppointer(
    appointerId: string,
    positionId: string,
  ): Promise<void> {
    // Check if appointer has authority to make appointments
    const appointerProfile = await this.prisma.userProfile.findUnique({
      where: { clerkUserId: appointerId },
      include: {
        positions: {
          where: { isActive: true },
          include: {
            position: {
              include: {
                hierarchies: true,
              },
            },
          },
        },
      },
    });

    if (!appointerProfile) {
      throw new BadRequestException('Appointer profile not found');
    }

    // Check if appointer is superadmin
    if (appointerProfile.isSuperadmin) {
      return; // Superadmins can appoint anyone
    }

    // Check if appointer has a position with authority
    const targetPosition = await this.prisma.position.findUnique({
      where: { id: positionId },
    });

    if (!targetPosition) {
      throw new BadRequestException('Target position not found');
    }

    // Check if appointer's position is higher in hierarchy
    const hasAuthority = appointerProfile.positions.some((up) => {
      return (
        up.position.hierarchyLevel < targetPosition.hierarchyLevel &&
        up.position.departmentId === targetPosition.departmentId
      );
    });

    if (!hasAuthority) {
      throw new ConflictException(
        'Appointer does not have authority to make this appointment',
      );
    }
  }
}
