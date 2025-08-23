import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Request, RequestStatus, ApprovalStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CacheService } from '../../../cache/cache.service';
import {
  BaseRepository,
  PaginationOptions,
  PaginatedResult,
} from './base.repository';
import { RequestFilterDto } from '../dto/request.dto';

@Injectable()
export class RequestRepository extends BaseRepository<Request> {
  private readonly logger = new Logger(RequestRepository.name);
  private readonly CACHE_TTL = 300; // 5 minutes in seconds
  private readonly CACHE_PREFIX = 'request:';

  constructor(
    protected readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {
    super(prisma);
  }

  /**
   * Default includes for request queries
   */
  private defaultIncludes(): Prisma.RequestInclude {
    return {
      requester: true,
      approvalSteps: {
        include: {
          approver: true,
        },
        orderBy: { sequence: 'asc' },
      },
      attachments: true,
    };
  }

  /**
   * Minimal select for list queries
   */
  private minimalSelect(): Prisma.RequestSelect {
    return {
      id: true,
      requestNumber: true,
      module: true,
      requestType: true,
      status: true,
      currentStep: true,
      createdAt: true,
      updatedAt: true,
      requester: {
        select: {
          id: true,
          clerkUserId: true,
        },
      },
    };
  }

  /**
   * Find request by ID with caching
   */
  async findById(id: string, skipCache = false): Promise<Request | null> {
    const cacheKey = `${this.CACHE_PREFIX}${id}`;

    if (!skipCache) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for request ${id}`);
        return JSON.parse(cached);
      }
    }

    const request = await this.prisma.request.findUnique({
      where: { id },
      include: this.defaultIncludes(),
    });

    if (request) {
      await this.cacheService.set(
        cacheKey,
        JSON.stringify(request),
        this.CACHE_TTL,
      );
    }

    return request;
  }

  /**
   * Find all requests with pagination and filtering
   */
  async findAll(
    filter?: RequestFilterDto,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Request>> {
    const { skip, take, page, limit } = this.buildPagination(pagination);
    const where = this.buildWhereClause(filter);

    const [data, total] = await Promise.all([
      this.prisma.request.findMany({
        where,
        skip,
        take,
        select: this.minimalSelect(),
      }),
      this.prisma.request.count({ where }),
    ]);

    return this.createPaginatedResult(data as Request[], total, page, limit);
  }

  /**
   * Find requests by requester profile ID
   */
  async findByRequester(
    requesterProfileId: string,
    filter?: RequestFilterDto,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Request>> {
    const { skip, take, page, limit } = this.buildPagination(pagination);
    const where = {
      requesterProfileId,
      ...this.buildWhereClause(filter),
    };

    const [data, total] = await Promise.all([
      this.prisma.request.findMany({
        where,
        skip,
        take,
        include: this.defaultIncludes(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.request.count({ where }),
    ]);

    return this.createPaginatedResult(data, total, page, limit);
  }

  /**
   * Find requests by status
   */
  async findByStatus(
    status: RequestStatus,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Request>> {
    const { skip, take, page, limit } = this.buildPagination(pagination);
    const where = { status };

    const [data, total] = await Promise.all([
      this.prisma.request.findMany({
        where,
        skip,
        take,
        select: this.minimalSelect(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.request.count({ where }),
    ]);

    return this.createPaginatedResult(data as Request[], total, page, limit);
  }

  /**
   * Create a new request
   */
  async create(data: Prisma.RequestCreateInput): Promise<Request> {
    const request = await this.prisma.request.create({
      data,
      include: this.defaultIncludes(),
    });

    // Cache the newly created request
    const cacheKey = `${this.CACHE_PREFIX}${request.id}`;
    await this.cacheService.set(
      cacheKey,
      JSON.stringify(request),
      this.CACHE_TTL,
    );

    return request;
  }

  /**
   * Update a request with cache invalidation
   */
  async update(id: string, data: Prisma.RequestUpdateInput): Promise<Request> {
    const request = await this.prisma.request.update({
      where: { id },
      data,
      include: this.defaultIncludes(),
    });

    // Invalidate cache
    await this.invalidateCache(id);

    return request;
  }

  /**
   * Update request status with optimistic locking
   */
  async updateStatus(
    id: string,
    status: RequestStatus,
    expectedVersion?: number,
  ): Promise<Request> {
    const where: Prisma.RequestWhereUniqueInput = { id };

    // If version is provided, use optimistic locking
    if (expectedVersion !== undefined) {
      const result = await this.prisma.request.updateMany({
        where: { id, version: expectedVersion },
        data: {
          status,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new Error(
          'Concurrent update detected. Please refresh and try again.',
        );
      }
    }

    const request = await this.prisma.request.update({
      where,
      data: {
        status,
        ...(expectedVersion === undefined && { version: { increment: 1 } }),
      },
      include: this.defaultIncludes(),
    });

    // Invalidate cache
    await this.invalidateCache(id);

    return request;
  }

  /**
   * Delete a request
   */
  async delete(id: string): Promise<Request> {
    const request = await this.prisma.request.delete({
      where: { id },
      include: this.defaultIncludes(),
    });

    // Invalidate cache
    await this.invalidateCache(id);

    return request;
  }

  /**
   * Find requests pending approval for a specific approver
   */
  async findPendingForApprover(
    approverProfileId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Request>> {
    const { skip, take, page, limit } = this.buildPagination(pagination);

    const where = {
      status: RequestStatus.IN_PROGRESS,
      approvalSteps: {
        some: {
          approverProfileId,
          status: ApprovalStatus.PENDING,
        },
      },
    };

    const [data, total] = await Promise.all([
      this.prisma.request.findMany({
        where,
        skip,
        take,
        include: this.defaultIncludes(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.request.count({ where }),
    ]);

    return this.createPaginatedResult(data, total, page, limit);
  }

  /**
   * Bulk update requests
   */
  async bulkUpdate(
    ids: string[],
    data: Prisma.RequestUpdateInput,
  ): Promise<number> {
    const result = await this.prisma.request.updateMany({
      where: { id: { in: ids } },
      data,
    });

    // Invalidate cache for all updated requests
    await Promise.all(ids.map((id) => this.invalidateCache(id)));

    return result.count;
  }

  /**
   * Check if request exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.request.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Invalidate cache for a request
   */
  private async invalidateCache(id: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${id}`;
    await this.cacheService.del(cacheKey);
    this.logger.debug(`Cache invalidated for request ${id}`);
  }

  /**
   * Build where clause from filter
   */
  private buildWhereClause(
    filter?: RequestFilterDto,
  ): Prisma.RequestWhereInput {
    if (!filter) return {};

    const where: Prisma.RequestWhereInput = {};

    if (filter.module) {
      where.module = filter.module;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.requestType) {
      where.requestType = filter.requestType;
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

    // Search functionality can be added later if needed

    return where;
  }
}
