import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ApprovalDelegation, Prisma } from '@prisma/client';
import {
  CreateDelegationDto,
  UpdateDelegationDto,
  DelegationFilterDto,
} from '../dto/delegation.dto';
import { v7 as uuidv7 } from 'uuid';
import { DelegationRepository } from '../repositories/delegation.repository';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DelegationService {
  constructor(
    private readonly delegationRepository: DelegationRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    dto: CreateDelegationDto,
    delegatorProfileId: string,
    createdBy: string,
  ): Promise<ApprovalDelegation> {
    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Check for overlapping delegations
    const hasConflict =
      await this.delegationRepository.hasConflictingDelegation(
        delegatorProfileId,
        startDate,
        endDate,
        dto.module || undefined,
      );

    if (hasConflict) {
      throw new ConflictException(
        'Overlapping delegation already exists for this period',
      );
    }

    // Prevent self-delegation
    if (delegatorProfileId === dto.delegateProfileId) {
      throw new BadRequestException('Cannot delegate to yourself');
    }

    return this.delegationRepository.create({
      id: this.generateId(),
      module: dto.module || null,
      startDate,
      endDate,
      reason: dto.reason,
      isActive: true,
      createdBy,
      delegator: {
        connect: { id: delegatorProfileId },
      },
      delegate: {
        connect: { id: dto.delegateProfileId },
      },
    });
  }

  async findAll(filter?: DelegationFilterDto): Promise<ApprovalDelegation[]> {
    const result = await this.delegationRepository.findAll(filter);
    return result.data;
  }

  async findOne(id: string): Promise<ApprovalDelegation> {
    const delegation = await this.delegationRepository.findById(id);

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

    const asDelegatorResult =
      await this.delegationRepository.getDelegatesHistory(profileId);
    const asDelegator = asDelegatorResult.data.filter((d) => d.isActive);

    const asDelegate = await this.delegationRepository.findActiveByDelegate(
      profileId,
      now,
    );

    return { asDelegator, asDelegate };
  }

  async getActiveDelegation(
    delegatorProfileId: string,
    delegateProfileId: string,
    module?: string,
  ): Promise<ApprovalDelegation | null> {
    const isActive = await this.delegationRepository.isDelegationActive(
      delegatorProfileId,
      delegateProfileId,
      module,
    );

    if (!isActive) {
      return null;
    }

    return this.delegationRepository.findActiveDelegation(
      delegatorProfileId,
      module,
    );
  }

  async update(
    id: string,
    dto: UpdateDelegationDto,
    updaterProfileId: string,
  ): Promise<ApprovalDelegation> {
    const delegation = await this.findOne(id);

    // Only delegator can update their delegation
    if (delegation.delegatorProfileId !== updaterProfileId) {
      throw new BadRequestException('You can only update your own delegations');
    }

    // Validate dates if changed
    if (dto.startDate || dto.endDate) {
      const startDate = dto.startDate
        ? new Date(dto.startDate)
        : delegation.startDate;
      const endDate = dto.endDate ? new Date(dto.endDate) : delegation.endDate;

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
      }

      // Check for overlapping delegations (excluding current)
      const hasConflict =
        await this.delegationRepository.hasConflictingDelegation(
          delegation.delegatorProfileId,
          startDate,
          endDate,
          dto.module !== undefined
            ? dto.module
            : delegation.module || undefined,
          id,
        );

      if (hasConflict) {
        throw new ConflictException(
          'Overlapping delegation already exists for this period',
        );
      }
    }

    // Prevent self-delegation
    if (
      dto.delegateProfileId &&
      dto.delegateProfileId === delegation.delegatorProfileId
    ) {
      throw new BadRequestException('Cannot delegate to yourself');
    }

    return this.delegationRepository.update(id, {
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }

  async revoke(
    id: string,
    revokerProfileId: string,
  ): Promise<ApprovalDelegation> {
    const delegation = await this.findOne(id);

    // Only delegator can revoke their delegation
    if (delegation.delegatorProfileId !== revokerProfileId) {
      throw new BadRequestException('You can only revoke your own delegations');
    }

    return this.delegationRepository.update(id, {
      isActive: false,
      endDate: new Date(), // End immediately
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

  // This method is now replaced by repository method hasConflictingDelegation
  // Keeping for compatibility with transaction-based methods
  private async findOverlappingDelegations(
    delegatorProfileId: string,
    module: string | null,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ): Promise<ApprovalDelegation[]> {
    const hasConflict =
      await this.delegationRepository.hasConflictingDelegation(
        delegatorProfileId,
        startDate,
        endDate,
        module || undefined,
        excludeId,
      );
    return hasConflict ? ([{}] as ApprovalDelegation[]) : [];
  }

  async getActiveDelegationWithTx(
    tx: Prisma.TransactionClient,
    delegatorProfileId: string,
    delegateProfileId: string,
    module?: string,
  ): Promise<ApprovalDelegation | null> {
    const now = new Date();

    const delegation = await tx.approvalDelegation.findFirst({
      where: {
        delegatorProfileId,
        delegateProfileId,
        startDate: { lte: now },
        endDate: { gte: now },
        isActive: true,
        AND: [
          {
            OR: [
              { module: null }, // General delegation
              { module }, // Specific module delegation
            ],
          },
        ],
      },
      include: {
        delegator: true,
        delegate: true,
      },
    });

    return delegation;
  }

  private generateId(): string {
    return uuidv7();
  }
}
