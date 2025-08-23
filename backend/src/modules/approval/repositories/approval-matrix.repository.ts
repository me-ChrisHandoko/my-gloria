import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ApprovalMatrix, ApproverType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CacheService } from '../../../cache/cache.service';
import {
  BaseRepository,
  PaginationOptions,
  PaginatedResult,
} from './base.repository';
import { ApprovalMatrixFilterDto } from '../dto/approval-matrix.dto';

@Injectable()
export class ApprovalMatrixRepository extends BaseRepository<ApprovalMatrix> {
  private readonly logger = new Logger(ApprovalMatrixRepository.name);
  private readonly CACHE_TTL = 600; // 10 minutes - longer TTL as matrices change less frequently
  private readonly CACHE_PREFIX = 'approval-matrix:';

  constructor(
    protected readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {
    super(prisma);
  }

  /**
   * Find approval matrix by ID with caching
   */
  async findById(
    id: string,
    skipCache = false,
  ): Promise<ApprovalMatrix | null> {
    const cacheKey = `${this.CACHE_PREFIX}${id}`;

    if (!skipCache) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for approval matrix ${id}`);
        return JSON.parse(cached);
      }
    }

    const matrix = await this.prisma.approvalMatrix.findUnique({
      where: { id },
    });

    if (matrix) {
      await this.cacheService.set(
        cacheKey,
        JSON.stringify(matrix),
        this.CACHE_TTL,
      );
    }

    return matrix;
  }

  /**
   * Find all approval matrices with pagination and filtering
   */
  async findAll(
    filter?: ApprovalMatrixFilterDto,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<ApprovalMatrix>> {
    const { skip, take, page, limit } = this.buildPagination(pagination);
    const where = this.buildWhereClause(filter);

    const [data, total] = await Promise.all([
      this.prisma.approvalMatrix.findMany({
        where,
        skip,
        take,
        orderBy: [{ module: 'asc' }, { approvalSequence: 'asc' }],
      }),
      this.prisma.approvalMatrix.count({ where }),
    ]);

    return this.createPaginatedResult(data, total, page, limit);
  }

  /**
   * Find approval matrices by module with caching
   */
  async findByModule(module: string): Promise<ApprovalMatrix[]> {
    const cacheKey = `${this.CACHE_PREFIX}module:${module}`;

    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for approval matrices of module ${module}`);
      return JSON.parse(cached);
    }

    const matrices = await this.prisma.approvalMatrix.findMany({
      where: {
        module,
        isActive: true,
      },
      orderBy: { approvalSequence: 'asc' },
    });

    if (matrices.length > 0) {
      await this.cacheService.set(
        cacheKey,
        JSON.stringify(matrices),
        this.CACHE_TTL,
      );
    }

    return matrices;
  }

  /**
   * Find applicable matrices for a request
   */
  async findApplicableMatrices(
    module: string,
    requesterRole?: string,
    requesterPosition?: string,
    conditions?: any,
  ): Promise<ApprovalMatrix[]> {
    // Build cache key based on parameters
    const cacheKey = `${this.CACHE_PREFIX}applicable:${module}:${requesterRole || 'any'}:${requesterPosition || 'any'}`;

    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for applicable matrices`);
      const matrices = JSON.parse(cached);
      // Apply condition filtering if needed
      return this.filterByConditions(matrices, conditions);
    }

    // Query for applicable matrices
    const whereConditions: Prisma.ApprovalMatrixWhereInput[] = [
      {
        module,
        isActive: true,
        requesterRole: null,
        requesterPosition: null,
      },
    ];

    if (requesterRole) {
      whereConditions.push({
        module,
        isActive: true,
        requesterRole,
        requesterPosition: null,
      });
    }

    if (requesterPosition) {
      whereConditions.push({
        module,
        isActive: true,
        requesterRole: null,
        requesterPosition,
      });
    }

    if (requesterRole && requesterPosition) {
      whereConditions.push({
        module,
        isActive: true,
        requesterRole,
        requesterPosition,
      });
    }

    const matrices = await this.prisma.approvalMatrix.findMany({
      where: {
        OR: whereConditions,
      },
      orderBy: [
        { requesterRole: 'desc' }, // Prioritize specific role
        { requesterPosition: 'desc' }, // Then specific position
        { approvalSequence: 'asc' },
      ],
    });

    // Cache the result
    if (matrices.length > 0) {
      await this.cacheService.set(
        cacheKey,
        JSON.stringify(matrices),
        this.CACHE_TTL,
      );
    }

    // Apply condition filtering
    return this.filterByConditions(matrices, conditions);
  }

  /**
   * Create a new approval matrix
   */
  async create(
    data: Prisma.ApprovalMatrixCreateInput,
  ): Promise<ApprovalMatrix> {
    const matrix = await this.prisma.approvalMatrix.create({
      data,
    });

    // Invalidate module cache
    await this.invalidateModuleCache(matrix.module);

    return matrix;
  }

  /**
   * Update an approval matrix
   */
  async update(
    id: string,
    data: Prisma.ApprovalMatrixUpdateInput,
  ): Promise<ApprovalMatrix> {
    const matrix = await this.prisma.approvalMatrix.update({
      where: { id },
      data,
    });

    // Invalidate caches
    await this.invalidateCache(id);
    await this.invalidateModuleCache(matrix.module);

    return matrix;
  }

  /**
   * Delete an approval matrix
   */
  async delete(id: string): Promise<ApprovalMatrix> {
    const matrix = await this.prisma.approvalMatrix.delete({
      where: { id },
    });

    // Invalidate caches
    await this.invalidateCache(id);
    await this.invalidateModuleCache(matrix.module);

    return matrix;
  }

  /**
   * Bulk create approval matrices
   */
  async createMany(
    data: Prisma.ApprovalMatrixCreateManyInput[],
  ): Promise<{ count: number }> {
    const result = await this.prisma.approvalMatrix.createMany({
      data,
    });

    // Invalidate module caches
    const modules = [...new Set(data.map((d) => d.module))];
    await Promise.all(
      modules.map((module) => this.invalidateModuleCache(module)),
    );

    return result;
  }

  /**
   * Check if approval matrix exists
   */
  async exists(
    module: string,
    sequence: number,
    approverType: ApproverType,
    approverValue: string,
  ): Promise<boolean> {
    const count = await this.prisma.approvalMatrix.count({
      where: {
        module,
        approvalSequence: sequence,
        approverType,
        approverValue,
        isActive: true,
      },
    });
    return count > 0;
  }

  /**
   * Get distinct modules
   */
  async getDistinctModules(): Promise<string[]> {
    const cacheKey = `${this.CACHE_PREFIX}modules`;

    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await this.prisma.approvalMatrix.findMany({
      where: { isActive: true },
      select: { module: true },
      distinct: ['module'],
    });

    const modules = result.map((r) => r.module);

    if (modules.length > 0) {
      await this.cacheService.set(
        cacheKey,
        JSON.stringify(modules),
        this.CACHE_TTL,
      );
    }

    return modules;
  }

  /**
   * Get maximum sequence for a module
   */
  async getMaxSequence(module: string): Promise<number> {
    const result = await this.prisma.approvalMatrix.aggregate({
      where: {
        module,
        isActive: true,
      },
      _max: {
        approvalSequence: true,
      },
    });

    return result._max.approvalSequence || 0;
  }

  /**
   * Activate/Deactivate approval matrix
   */
  async setActive(id: string, isActive: boolean): Promise<ApprovalMatrix> {
    const matrix = await this.prisma.approvalMatrix.update({
      where: { id },
      data: { isActive },
    });

    // Invalidate caches
    await this.invalidateCache(id);
    await this.invalidateModuleCache(matrix.module);

    return matrix;
  }

  /**
   * Filter matrices by conditions
   */
  private filterByConditions(
    matrices: ApprovalMatrix[],
    conditions?: any,
  ): ApprovalMatrix[] {
    if (!conditions || Object.keys(conditions).length === 0) {
      return matrices;
    }

    return matrices.filter((matrix) => {
      if (!matrix.conditions) return true;

      const matrixConditions = matrix.conditions as any;

      // Check if all conditions match
      if (matrixConditions.all) {
        for (const condition of matrixConditions.all) {
          if (!this.evaluateCondition(condition, conditions)) {
            return false;
          }
        }
      }

      // Check if any condition matches
      if (matrixConditions.any) {
        let anyMatch = false;
        for (const condition of matrixConditions.any) {
          if (this.evaluateCondition(condition, conditions)) {
            anyMatch = true;
            break;
          }
        }
        if (!anyMatch && matrixConditions.any.length > 0) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: any, data: any): boolean {
    const { field, operator, value } = condition;
    const fieldValue = this.getNestedValue(data, field);

    switch (operator) {
      case 'eq':
        return fieldValue === value;
      case 'ne':
        return fieldValue !== value;
      case 'gt':
        return fieldValue > value;
      case 'gte':
        return fieldValue >= value;
      case 'lt':
        return fieldValue < value;
      case 'lte':
        return fieldValue <= value;
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'nin':
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Invalidate cache for an approval matrix
   */
  private async invalidateCache(id: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${id}`;
    await this.cacheService.del(cacheKey);
    this.logger.debug(`Cache invalidated for approval matrix ${id}`);
  }

  /**
   * Invalidate module-related caches
   */
  private async invalidateModuleCache(module: string): Promise<void> {
    // Invalidate module cache
    await this.cacheService.del(`${this.CACHE_PREFIX}module:${module}`);

    // Invalidate modules list cache
    await this.cacheService.del(`${this.CACHE_PREFIX}modules`);

    // Pattern to invalidate applicable matrices caches
    // Note: In production, you might want to implement pattern-based cache invalidation
    this.logger.debug(`Module cache invalidated for ${module}`);
  }

  /**
   * Build where clause from filter
   */
  private buildWhereClause(
    filter?: ApprovalMatrixFilterDto,
  ): Prisma.ApprovalMatrixWhereInput {
    if (!filter) return {};

    const where: Prisma.ApprovalMatrixWhereInput = {};

    if (filter.module) {
      where.module = filter.module;
    }

    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    if (filter.approverType) {
      where.approverType = filter.approverType;
    }

    if (filter.requesterRole) {
      where.requesterRole = filter.requesterRole;
    }

    if (filter.requesterPosition) {
      where.requesterPosition = filter.requesterPosition;
    }

    return where;
  }
}
