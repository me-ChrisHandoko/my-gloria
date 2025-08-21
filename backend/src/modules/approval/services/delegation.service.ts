import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApprovalDelegation, Prisma } from '@prisma/client';
import { CreateDelegationDto, UpdateDelegationDto, DelegationFilterDto } from '../dto/delegation.dto';

@Injectable()
export class DelegationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDelegationDto, delegatorProfileId: string, createdBy: string): Promise<ApprovalDelegation> {
    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Check for overlapping delegations
    const overlapping = await this.findOverlappingDelegations(
      delegatorProfileId,
      dto.module || null,
      startDate,
      endDate,
    );

    if (overlapping.length > 0) {
      throw new ConflictException('Overlapping delegation already exists for this period');
    }

    // Prevent self-delegation
    if (delegatorProfileId === dto.delegateProfileId) {
      throw new BadRequestException('Cannot delegate to yourself');
    }

    return this.prisma.approvalDelegation.create({
      data: {
        id: this.generateId(),
        delegatorProfileId,
        delegateProfileId: dto.delegateProfileId,
        module: dto.module || null,
        startDate,
        endDate,
        reason: dto.reason,
        isActive: true,
        createdBy,
      },
      include: {
        delegator: true,
        delegate: true,
      },
    });
  }

  async findAll(filter?: DelegationFilterDto): Promise<ApprovalDelegation[]> {
    const where: Prisma.ApprovalDelegationWhereInput = {};

    if (filter) {
      if (filter.delegatorProfileId) where.delegatorProfileId = filter.delegatorProfileId;
      if (filter.delegateProfileId) where.delegateProfileId = filter.delegateProfileId;
      if (filter.module !== undefined) where.module = filter.module;
      if (filter.isActive !== undefined) where.isActive = filter.isActive;
      
      if (filter.activeOn) {
        const checkDate = new Date(filter.activeOn);
        where.AND = [
          { startDate: { lte: checkDate } },
          { endDate: { gte: checkDate } },
          { isActive: true },
        ];
      }
    }

    return this.prisma.approvalDelegation.findMany({
      where,
      include: {
        delegator: true,
        delegate: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string): Promise<ApprovalDelegation> {
    const delegation = await this.prisma.approvalDelegation.findUnique({
      where: { id },
      include: {
        delegator: true,
        delegate: true,
      },
    });

    if (!delegation) {
      throw new NotFoundException(`Delegation with ID ${id} not found`);
    }

    return delegation;
  }

  async findMyDelegations(profileId: string): Promise<{
    asDelegator: ApprovalDelegation[];
    asDelegate: ApprovalDelegation[];
  }> {
    const now = new Date();

    const asDelegator = await this.prisma.approvalDelegation.findMany({
      where: {
        delegatorProfileId: profileId,
        isActive: true,
      },
      include: {
        delegator: true,
        delegate: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    const asDelegate = await this.prisma.approvalDelegation.findMany({
      where: {
        delegateProfileId: profileId,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        delegator: true,
        delegate: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return { asDelegator, asDelegate };
  }

  async getActiveDelegation(
    delegatorProfileId: string,
    delegateProfileId: string,
    module?: string,
  ): Promise<ApprovalDelegation | null> {
    const now = new Date();

    const delegation = await this.prisma.approvalDelegation.findFirst({
      where: {
        delegatorProfileId,
        delegateProfileId,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        OR: [
          { module: null }, // Delegation for all modules
          { module }, // Specific module delegation
        ],
      },
      include: {
        delegator: true,
        delegate: true,
      },
    });

    return delegation;
  }

  async update(id: string, dto: UpdateDelegationDto, updaterProfileId: string): Promise<ApprovalDelegation> {
    const delegation = await this.findOne(id);

    // Only delegator can update their delegation
    if (delegation.delegatorProfileId !== updaterProfileId) {
      throw new BadRequestException('You can only update your own delegations');
    }

    // Validate dates if changed
    if (dto.startDate || dto.endDate) {
      const startDate = dto.startDate ? new Date(dto.startDate) : delegation.startDate;
      const endDate = dto.endDate ? new Date(dto.endDate) : delegation.endDate;

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
      }

      // Check for overlapping delegations (excluding current)
      const overlapping = await this.findOverlappingDelegations(
        delegation.delegatorProfileId,
        dto.module !== undefined ? dto.module : delegation.module,
        startDate,
        endDate,
        id,
      );

      if (overlapping.length > 0) {
        throw new ConflictException('Overlapping delegation already exists for this period');
      }
    }

    // Prevent self-delegation
    if (dto.delegateProfileId && dto.delegateProfileId === delegation.delegatorProfileId) {
      throw new BadRequestException('Cannot delegate to yourself');
    }

    return this.prisma.approvalDelegation.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: {
        delegator: true,
        delegate: true,
      },
    });
  }

  async revoke(id: string, revokerProfileId: string): Promise<ApprovalDelegation> {
    const delegation = await this.findOne(id);

    // Only delegator can revoke their delegation
    if (delegation.delegatorProfileId !== revokerProfileId) {
      throw new BadRequestException('You can only revoke your own delegations');
    }

    return this.prisma.approvalDelegation.update({
      where: { id },
      data: {
        isActive: false,
        endDate: new Date(), // End immediately
      },
      include: {
        delegator: true,
        delegate: true,
      },
    });
  }

  async cleanupExpiredDelegations(): Promise<number> {
    const now = new Date();

    const result = await this.prisma.approvalDelegation.updateMany({
      where: {
        endDate: { lt: now },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return result.count;
  }

  private async findOverlappingDelegations(
    delegatorProfileId: string,
    module: string | null,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ): Promise<ApprovalDelegation[]> {
    const where: Prisma.ApprovalDelegationWhereInput = {
      delegatorProfileId,
      isActive: true,
      OR: [
        {
          AND: [
            { startDate: { lte: startDate } },
            { endDate: { gte: startDate } },
          ],
        },
        {
          AND: [
            { startDate: { lte: endDate } },
            { endDate: { gte: endDate } },
          ],
        },
        {
          AND: [
            { startDate: { gte: startDate } },
            { endDate: { lte: endDate } },
          ],
        },
      ],
    };

    if (module !== undefined) {
      where.AND = [
        {
          OR: [
            { module: null }, // General delegation overlaps with specific
            { module }, // Same module
          ],
        },
      ];
    }

    if (excludeId) {
      where.id = { not: excludeId };
    }

    return this.prisma.approvalDelegation.findMany({ where });
  }

  private generateId(): string {
    return `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}