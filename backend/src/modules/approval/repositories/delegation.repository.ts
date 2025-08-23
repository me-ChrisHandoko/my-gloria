import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ApprovalDelegation } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CacheService } from '../../../cache/cache.service';
import {
  BaseRepository,
  PaginationOptions,
  PaginatedResult,
} from './base.repository';
import { DelegationFilterDto } from '../dto/delegation.dto';

@Injectable()
export class DelegationRepository extends BaseRepository<ApprovalDelegation> {
  private readonly logger = new Logger(DelegationRepository.name);
  private readonly CACHE_TTL = 600; // 10 minutes
  private readonly CACHE_PREFIX = 'delegation:';

  constructor(
    protected readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {
    super(prisma);
  }

  /**
   * Default includes for delegation queries
   */
  private defaultIncludes(): Prisma.ApprovalDelegationInclude {
    return {
      delegator: true,
      delegate: true,
    };
  }

  /**
   * Find delegation by ID with caching
   */
  async findById(
    id: string,
    skipCache = false,
  ): Promise<ApprovalDelegation | null> {
    const cacheKey = `${this.CACHE_PREFIX}${id}`;

    if (!skipCache) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for delegation ${id}`);
        return JSON.parse(cached);
      }
    }

    const delegation = await this.prisma.approvalDelegation.findUnique({
      where: { id },
      include: this.defaultIncludes(),
    });

    if (delegation) {
      await this.cacheService.set(
        cacheKey,
        JSON.stringify(delegation),
        this.CACHE_TTL,
      );
    }

    return delegation;
  }

  /**
   * Find all delegations with pagination and filtering
   */
  async findAll(
    filter?: DelegationFilterDto,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<ApprovalDelegation>> {
    const { skip, take, page, limit } = this.buildPagination(pagination);
    const where = this.buildWhereClause(filter);

    const [data, total] = await Promise.all([
      this.prisma.approvalDelegation.findMany({
        where,
        skip,
        take,
        include: this.defaultIncludes(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.approvalDelegation.count({ where }),
    ]);

    return this.createPaginatedResult(data, total, page, limit);
  }

  /**
   * Find active delegations for a delegator
   */
  async findActiveByDelegator(
    delegatorProfileId: string,
    currentDate?: Date,
  ): Promise<ApprovalDelegation[]> {
    const date = currentDate || new Date();
    const cacheKey = `${this.CACHE_PREFIX}active:delegator:${delegatorProfileId}`;

    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug(
        `Cache hit for active delegations of delegator ${delegatorProfileId}`,
      );
      const delegations = JSON.parse(cached);
      // Re-validate dates in case cached data is stale
      return this.filterActiveDelegations(delegations, date);
    }

    const delegations = await this.prisma.approvalDelegation.findMany({
      where: {
        delegatorProfileId,
        isActive: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      include: this.defaultIncludes(),
    });

    if (delegations.length > 0) {
      await this.cacheService.set(
        cacheKey,
        JSON.stringify(delegations),
        300, // Shorter TTL for active delegations (5 minutes)
      );
    }

    return delegations;
  }

  /**
   * Find active delegations for a delegate
   */
  async findActiveByDelegate(
    delegateProfileId: string,
    currentDate?: Date,
  ): Promise<ApprovalDelegation[]> {
    const date = currentDate || new Date();
    const cacheKey = `${this.CACHE_PREFIX}active:delegate:${delegateProfileId}`;

    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug(
        `Cache hit for active delegations of delegate ${delegateProfileId}`,
      );
      const delegations = JSON.parse(cached);
      return this.filterActiveDelegations(delegations, date);
    }

    const delegations = await this.prisma.approvalDelegation.findMany({
      where: {
        delegateProfileId,
        isActive: true,
        startDate: { lte: date },
        endDate: { gte: date },
      },
      include: this.defaultIncludes(),
    });

    if (delegations.length > 0) {
      await this.cacheService.set(
        cacheKey,
        JSON.stringify(delegations),
        300, // Shorter TTL for active delegations
      );
    }

    return delegations;
  }

  /**
   * Find active delegation for a specific module
   */
  async findActiveDelegation(
    delegatorProfileId: string,
    module?: string,
    currentDate?: Date,
  ): Promise<ApprovalDelegation | null> {
    const date = currentDate || new Date();

    const where: Prisma.ApprovalDelegationWhereInput = {
      delegatorProfileId,
      isActive: true,
      startDate: { lte: date },
      endDate: { gte: date },
    };

    // Add module filter if specified
    if (module) {
      where.OR = [
        { module: null }, // General delegation
        { module }, // Module-specific delegation
      ];
    } else {
      where.module = null; // Only general delegations
    }

    const delegation = await this.prisma.approvalDelegation.findFirst({
      where,
      include: this.defaultIncludes(),
      orderBy: [
        { module: 'desc' }, // Prioritize module-specific delegations
        { createdAt: 'desc' },
      ],
    });

    return delegation;
  }

  /**
   * Check if delegation exists and is active
   */
  async isDelegationActive(
    delegatorProfileId: string,
    delegateProfileId: string,
    module?: string,
    currentDate?: Date,
  ): Promise<boolean> {
    const date = currentDate || new Date();

    const where: Prisma.ApprovalDelegationWhereInput = {
      delegatorProfileId,
      delegateProfileId,
      isActive: true,
      startDate: { lte: date },
      endDate: { gte: date },
    };

    if (module) {
      where.OR = [{ module: null }, { module }];
    }

    const count = await this.prisma.approvalDelegation.count({ where });
    return count > 0;
  }

  /**
   * Create a new delegation
   */
  async create(
    data: Prisma.ApprovalDelegationCreateInput,
  ): Promise<ApprovalDelegation> {
    const delegation = await this.prisma.approvalDelegation.create({
      data,
      include: this.defaultIncludes(),
    });

    // Invalidate related caches
    await this.invalidateDelegatorCache(delegation.delegatorProfileId);
    await this.invalidateDelegateCache(delegation.delegateProfileId);

    return delegation;
  }

  /**
   * Update a delegation
   */
  async update(
    id: string,
    data: Prisma.ApprovalDelegationUpdateInput,
  ): Promise<ApprovalDelegation> {
    const delegation = await this.prisma.approvalDelegation.update({
      where: { id },
      data,
      include: this.defaultIncludes(),
    });

    // Invalidate caches
    await this.invalidateCache(id);
    await this.invalidateDelegatorCache(delegation.delegatorProfileId);
    await this.invalidateDelegateCache(delegation.delegateProfileId);

    return delegation;
  }

  /**
   * Activate/Deactivate delegation
   */
  async setActive(id: string, isActive: boolean): Promise<ApprovalDelegation> {
    const delegation = await this.prisma.approvalDelegation.update({
      where: { id },
      data: { isActive },
      include: this.defaultIncludes(),
    });

    // Invalidate caches
    await this.invalidateCache(id);
    await this.invalidateDelegatorCache(delegation.delegatorProfileId);
    await this.invalidateDelegateCache(delegation.delegateProfileId);

    return delegation;
  }

  /**
   * Delete a delegation
   */
  async delete(id: string): Promise<ApprovalDelegation> {
    const delegation = await this.prisma.approvalDelegation.delete({
      where: { id },
      include: this.defaultIncludes(),
    });

    // Invalidate caches
    await this.invalidateCache(id);
    await this.invalidateDelegatorCache(delegation.delegatorProfileId);
    await this.invalidateDelegateCache(delegation.delegateProfileId);

    return delegation;
  }

  /**
   * Check for conflicting delegations
   */
  async hasConflictingDelegation(
    delegatorProfileId: string,
    startDate: Date,
    endDate: Date,
    module?: string,
    excludeId?: string,
  ): Promise<boolean> {
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
          AND: [{ startDate: { lte: endDate } }, { endDate: { gte: endDate } }],
        },
        {
          AND: [
            { startDate: { gte: startDate } },
            { endDate: { lte: endDate } },
          ],
        },
      ],
    };

    if (module) {
      where.OR = [{ module: null }, { module }];
    }

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.prisma.approvalDelegation.count({ where });
    return count > 0;
  }

  /**
   * Get all delegates for a delegator (including expired)
   */
  async getDelegatesHistory(
    delegatorProfileId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<ApprovalDelegation>> {
    const { skip, take, page, limit } = this.buildPagination(pagination);
    const where = { delegatorProfileId };

    const [data, total] = await Promise.all([
      this.prisma.approvalDelegation.findMany({
        where,
        skip,
        take,
        include: this.defaultIncludes(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.approvalDelegation.count({ where }),
    ]);

    return this.createPaginatedResult(data, total, page, limit);
  }

  /**
   * Expire delegations that have passed their end date
   */
  async expireOldDelegations(): Promise<number> {
    const result = await this.prisma.approvalDelegation.updateMany({
      where: {
        isActive: true,
        endDate: { lt: new Date() },
      },
      data: {
        isActive: false,
      },
    });

    if (result.count > 0) {
      // Clear all delegation caches as multiple delegations may have been affected
      this.logger.log(`Expired ${result.count} delegations`);
    }

    return result.count;
  }

  /**
   * Filter active delegations by date
   */
  private filterActiveDelegations(
    delegations: ApprovalDelegation[],
    date: Date,
  ): ApprovalDelegation[] {
    return delegations.filter(
      (d) =>
        d.isActive &&
        new Date(d.startDate) <= date &&
        new Date(d.endDate) >= date,
    );
  }

  /**
   * Invalidate cache for a delegation
   */
  private async invalidateCache(id: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${id}`;
    await this.cacheService.del(cacheKey);
    this.logger.debug(`Cache invalidated for delegation ${id}`);
  }

  /**
   * Invalidate delegator-related caches
   */
  private async invalidateDelegatorCache(
    delegatorProfileId: string,
  ): Promise<void> {
    await this.cacheService.del(
      `${this.CACHE_PREFIX}active:delegator:${delegatorProfileId}`,
    );
    this.logger.debug(`Delegator cache invalidated for ${delegatorProfileId}`);
  }

  /**
   * Invalidate delegate-related caches
   */
  private async invalidateDelegateCache(
    delegateProfileId: string,
  ): Promise<void> {
    await this.cacheService.del(
      `${this.CACHE_PREFIX}active:delegate:${delegateProfileId}`,
    );
    this.logger.debug(`Delegate cache invalidated for ${delegateProfileId}`);
  }

  /**
   * Build where clause from filter
   */
  private buildWhereClause(
    filter?: DelegationFilterDto,
  ): Prisma.ApprovalDelegationWhereInput {
    if (!filter) return {};

    const where: Prisma.ApprovalDelegationWhereInput = {};

    if (filter.delegatorProfileId) {
      where.delegatorProfileId = filter.delegatorProfileId;
    }

    if (filter.delegateProfileId) {
      where.delegateProfileId = filter.delegateProfileId;
    }

    if (filter.module) {
      where.module = filter.module;
    }

    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    if (filter.activeOn) {
      const date = new Date(filter.activeOn);
      where.AND = [{ startDate: { lte: date } }, { endDate: { gte: date } }];
    }

    return where;
  }
}
