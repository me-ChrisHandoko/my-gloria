import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  ApprovalStep,
  ApprovalStatus,
  ApprovalAction,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CacheService } from '../../../cache/cache.service';
import {
  BaseRepository,
  PaginationOptions,
  PaginatedResult,
} from './base.repository';

// DTO for filtering approval steps
export interface ApprovalStepFilterDto {
  status?: ApprovalStatus;
  requestId?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class ApprovalStepRepository extends BaseRepository<ApprovalStep> {
  private readonly logger = new Logger(ApprovalStepRepository.name);
  private readonly CACHE_TTL = 300; // 5 minutes in seconds
  private readonly CACHE_PREFIX = 'approval-step:';

  constructor(
    protected readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {
    super(prisma);
  }

  /**
   * Default includes for approval step queries
   */
  private defaultIncludes(): Prisma.ApprovalStepInclude {
    return {
      request: true,
      approver: true,
    };
  }

  /**
   * Find approval step by ID with caching
   */
  async findById(id: string, skipCache = false): Promise<ApprovalStep | null> {
    const cacheKey = `${this.CACHE_PREFIX}${id}`;

    if (!skipCache) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for approval step ${id}`);
        return JSON.parse(cached);
      }
    }

    const step = await this.prisma.approvalStep.findUnique({
      where: { id },
      include: this.defaultIncludes(),
    });

    if (step) {
      await this.cacheService.set(
        cacheKey,
        JSON.stringify(step),
        this.CACHE_TTL,
      );
    }

    return step;
  }

  /**
   * Find approval steps by request ID
   */
  async findByRequestId(requestId: string): Promise<ApprovalStep[]> {
    const cacheKey = `${this.CACHE_PREFIX}request:${requestId}`;

    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for approval steps of request ${requestId}`);
      return JSON.parse(cached);
    }

    const steps = await this.prisma.approvalStep.findMany({
      where: { requestId },
      include: this.defaultIncludes(),
      orderBy: { sequence: 'asc' },
    });

    if (steps.length > 0) {
      await this.cacheService.set(
        cacheKey,
        JSON.stringify(steps),
        this.CACHE_TTL,
      );
    }

    return steps;
  }

  /**
   * Find approval steps by approver
   */
  async findByApprover(
    approverProfileId: string,
    filter?: ApprovalStepFilterDto,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<ApprovalStep>> {
    const { skip, take, page, limit } = this.buildPagination(pagination);
    const where = {
      approverProfileId,
      ...this.buildWhereClause(filter),
    };

    const [data, total] = await Promise.all([
      this.prisma.approvalStep.findMany({
        where,
        skip,
        take,
        include: this.defaultIncludes(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.approvalStep.count({ where }),
    ]);

    return this.createPaginatedResult(data, total, page, limit);
  }

  /**
   * Find pending approval steps for an approver
   */
  async findPendingByApprover(
    approverProfileId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<ApprovalStep>> {
    const { skip, take, page, limit } = this.buildPagination(pagination);
    const where: Prisma.ApprovalStepWhereInput = {
      approverProfileId,
      status: ApprovalStatus.PENDING,
      request: {
        status: 'IN_PROGRESS' as any,
      },
    };

    const [data, total] = await Promise.all([
      this.prisma.approvalStep.findMany({
        where,
        skip,
        take,
        include: this.defaultIncludes(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.approvalStep.count({ where }),
    ]);

    return this.createPaginatedResult(data, total, page, limit);
  }

  /**
   * Find approval steps by sequence
   */
  async findBySequence(
    requestId: string,
    sequence: number,
  ): Promise<ApprovalStep[]> {
    return await this.prisma.approvalStep.findMany({
      where: {
        requestId,
        sequence,
      },
      include: this.defaultIncludes(),
    });
  }

  /**
   * Create approval steps in bulk
   */
  async createMany(
    data: Prisma.ApprovalStepCreateManyInput[],
  ): Promise<{ count: number }> {
    const result = await this.prisma.approvalStep.createMany({
      data,
    });

    // Invalidate request cache for all affected requests
    const requestIds = [...new Set(data.map((d) => d.requestId))];
    await Promise.all(
      requestIds.map((requestId) =>
        this.cacheService.del(`${this.CACHE_PREFIX}request:${requestId}`),
      ),
    );

    return result;
  }

  /**
   * Create a single approval step
   */
  async create(data: Prisma.ApprovalStepCreateInput): Promise<ApprovalStep> {
    const step = await this.prisma.approvalStep.create({
      data,
      include: this.defaultIncludes(),
    });

    // Invalidate request cache
    await this.cacheService.del(
      `${this.CACHE_PREFIX}request:${step.requestId}`,
    );

    return step;
  }

  /**
   * Update approval step with action
   */
  async updateWithAction(
    id: string,
    action: ApprovalAction,
    notes?: string,
    expectedVersion?: number,
  ): Promise<ApprovalStep> {
    const updateData: Prisma.ApprovalStepUpdateInput = {
      action,
      notes,
      status: this.mapActionToStatus(action),
      approvedAt: new Date(),
    };

    // If version is provided, use optimistic locking
    if (expectedVersion !== undefined) {
      const result = await this.prisma.approvalStep.updateMany({
        where: { id, version: expectedVersion },
        data: {
          ...updateData,
          version: { increment: 1 },
        },
      });

      if (result.count === 0) {
        throw new Error(
          'Concurrent update detected. Please refresh and try again.',
        );
      }
    }

    const step = await this.prisma.approvalStep.update({
      where: { id },
      data: {
        ...updateData,
        ...(expectedVersion === undefined && { version: { increment: 1 } }),
      },
      include: this.defaultIncludes(),
    });

    // Invalidate caches
    await this.invalidateCache(step.id);
    await this.cacheService.del(
      `${this.CACHE_PREFIX}request:${step.requestId}`,
    );

    return step;
  }

  /**
   * Update approval step status
   */
  async updateStatus(
    id: string,
    status: ApprovalStatus,
  ): Promise<ApprovalStep> {
    const step = await this.prisma.approvalStep.update({
      where: { id },
      data: { status },
      include: this.defaultIncludes(),
    });

    // Invalidate caches
    await this.invalidateCache(step.id);
    await this.cacheService.del(
      `${this.CACHE_PREFIX}request:${step.requestId}`,
    );

    return step;
  }

  /**
   * Delete approval step
   */
  async delete(id: string): Promise<ApprovalStep> {
    const step = await this.prisma.approvalStep.delete({
      where: { id },
      include: this.defaultIncludes(),
    });

    // Invalidate caches
    await this.invalidateCache(step.id);
    await this.cacheService.del(
      `${this.CACHE_PREFIX}request:${step.requestId}`,
    );

    return step;
  }

  /**
   * Check if all steps at a sequence are approved
   */
  async areAllStepsApprovedAtSequence(
    requestId: string,
    sequence: number,
  ): Promise<boolean> {
    const steps = await this.findBySequence(requestId, sequence);
    return steps.every((step) => step.status === ApprovalStatus.APPROVED);
  }

  /**
   * Check if any step at a sequence is rejected
   */
  async isAnyStepRejectedAtSequence(
    requestId: string,
    sequence: number,
  ): Promise<boolean> {
    const steps = await this.findBySequence(requestId, sequence);
    return steps.some((step) => step.status === ApprovalStatus.REJECTED);
  }

  /**
   * Get next pending sequence for a request
   */
  async getNextPendingSequence(requestId: string): Promise<number | null> {
    const step = await this.prisma.approvalStep.findFirst({
      where: {
        requestId,
        status: ApprovalStatus.PENDING,
      },
      orderBy: { sequence: 'asc' },
    });

    return step?.sequence || null;
  }

  /**
   * Count pending steps for approver
   */
  async countPendingForApprover(approverProfileId: string): Promise<number> {
    return await this.prisma.approvalStep.count({
      where: {
        approverProfileId,
        status: ApprovalStatus.PENDING,
        request: {
          status: 'IN_PROGRESS' as any,
        },
      },
    });
  }

  /**
   * Invalidate cache for an approval step
   */
  private async invalidateCache(id: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${id}`;
    await this.cacheService.del(cacheKey);
    this.logger.debug(`Cache invalidated for approval step ${id}`);
  }

  /**
   * Map action to status
   */
  private mapActionToStatus(action: ApprovalAction): ApprovalStatus {
    switch (action) {
      case ApprovalAction.APPROVE:
        return ApprovalStatus.APPROVED;
      case ApprovalAction.REJECT:
        return ApprovalStatus.REJECTED;
      case ApprovalAction.RETURN:
        return ApprovalStatus.RETURNED;
      default:
        return ApprovalStatus.PENDING;
    }
  }

  /**
   * Build where clause from filter
   */
  private buildWhereClause(
    filter?: ApprovalStepFilterDto,
  ): Prisma.ApprovalStepWhereInput {
    if (!filter) return {};

    const where: Prisma.ApprovalStepWhereInput = {};

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.requestId) {
      where.requestId = filter.requestId;
    }

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        where.createdAt.lte = new Date(filter.endDate);
      }
    }

    return where;
  }
}
