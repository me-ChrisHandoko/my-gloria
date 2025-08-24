import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RowLevelSecurityService, UserContext } from '../../../security/row-level-security.service';
import { AuditService } from '../../audit/services/audit.service';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { BaseService } from '../../../common/base/base.service';
import { Prisma } from '@prisma/client';

export interface BaseCreateDto {
  [key: string]: any;
}

export interface BaseUpdateDto {
  [key: string]: any;
}

export interface BaseFilterDto {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isActive?: boolean;
  [key: string]: any;
}

@Injectable()
export abstract class BaseOrganizationService<
  TModel extends { id: string; [key: string]: any },
  TCreateDto extends BaseCreateDto,
  TUpdateDto extends BaseUpdateDto,
  TFilterDto extends BaseFilterDto,
> extends BaseService {
  protected abstract readonly entityName: string;
  protected abstract readonly entityDisplayField: string;
  protected abstract readonly uniqueFields: string[];

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly rlsService: RowLevelSecurityService,
    protected readonly auditService: AuditService,
  ) {
    super();
  }

  /**
   * Check for duplicate values on unique fields
   */
  protected async checkDuplicate(
    dto: TCreateDto | TUpdateDto,
    excludeId?: string,
  ): Promise<void> {
    for (const field of this.uniqueFields) {
      if (dto[field]) {
        const where: any = { [field]: dto[field] };
        if (excludeId) {
          where.id = { not: excludeId };
        }

        const existing = await this.prisma[this.entityName.toLowerCase()].findFirst({
          where,
        });

        if (existing) {
          throw BusinessException.duplicate(
            this.entityName,
            field,
            dto[field],
          );
        }
      }
    }
  }

  /**
   * Validate user access to a record
   */
  protected async validateAccess(
    userId: string,
    recordId: string,
    operation: 'READ' | 'UPDATE' | 'DELETE',
  ): Promise<UserContext> {
    const context = await this.rlsService.getUserContext(userId);
    const canAccess = await this.rlsService.canAccessRecord(
      context,
      this.entityName,
      recordId,
      operation,
    );

    if (!canAccess) {
      throw BusinessException.unauthorized(
        `Access denied to ${operation.toLowerCase()} this ${this.entityName.toLowerCase()}`,
      );
    }

    return context;
  }

  /**
   * Sanitize search input to prevent SQL injection
   */
  protected sanitizeSearchInput(input: string): string {
    return input
      .replace(/[%_\\'";]/g, '')
      .trim()
      .substring(0, 100);
  }

  /**
   * Build where clause with RLS
   */
  protected abstract buildWhereClause(
    filters: TFilterDto,
    context: UserContext,
  ): Prisma.Enumerable<any>;

  /**
   * Get include options for queries
   */
  protected abstract getIncludeOptions(): any;

  /**
   * Transform entity for response
   */
  protected abstract transformForResponse(entity: TModel): any;

  /**
   * Create entity with transaction
   */
  async create(dto: TCreateDto, userId: string): Promise<any> {
    // Check for duplicates
    await this.checkDuplicate(dto);

    return this.prisma.$transaction(async (tx) => {
      const entity = await tx[this.entityName.toLowerCase()].create({
        data: this.prepareCreateData(dto, {
          createdBy: userId,
          modifiedBy: userId,
        }),
        include: this.getIncludeOptions(),
      });

      await this.auditService.logCreate(
        { actorId: userId, module: 'ORGANIZATION' },
        this.entityName,
        entity.id,
        entity,
        entity[this.entityDisplayField],
      );

      return this.transformForResponse(entity);
    });
  }

  /**
   * Update entity with transaction
   */
  async update(id: string, dto: TUpdateDto, userId: string): Promise<any> {
    await this.validateAccess(userId, id, 'UPDATE');

    return this.prisma.$transaction(async (tx) => {
      const oldEntity = await tx[this.entityName.toLowerCase()].findUnique({
        where: { id },
      });

      if (!oldEntity) {
        throw BusinessException.notFound(this.entityName, id);
      }

      // Check for duplicates, excluding current record
      await this.checkDuplicate(dto, id);

      const updated = await tx[this.entityName.toLowerCase()].update({
        where: { id },
        data: {
          ...dto,
          modifiedBy: userId,
        },
        include: this.getIncludeOptions(),
      });

      await this.auditService.logUpdate(
        { actorId: userId, module: 'ORGANIZATION' },
        this.entityName,
        id,
        oldEntity,
        updated,
        updated[this.entityDisplayField],
      );

      return this.transformForResponse(updated);
    });
  }

  /**
   * Delete entity with validation
   */
  async remove(id: string, userId: string): Promise<void> {
    await this.validateAccess(userId, id, 'DELETE');

    await this.prisma.$transaction(async (tx) => {
      const entity = await tx[this.entityName.toLowerCase()].findUnique({
        where: { id },
      });

      if (!entity) {
        throw BusinessException.notFound(this.entityName, id);
      }

      // Check for dependencies before deletion
      await this.validateDeletion(id, tx);

      await tx[this.entityName.toLowerCase()].delete({
        where: { id },
      });

      await this.auditService.logDelete(
        { actorId: userId, module: 'ORGANIZATION' },
        this.entityName,
        id,
        entity,
        entity[this.entityDisplayField],
      );
    });
  }

  /**
   * Find one entity by ID
   */
  async findOne(id: string, userId: string): Promise<any> {
    await this.validateAccess(userId, id, 'READ');

    const entity = await this.prisma[this.entityName.toLowerCase()].findUnique({
      where: { id },
      include: this.getIncludeOptions(),
    });

    if (!entity) {
      throw BusinessException.notFound(this.entityName, id);
    }

    return this.transformForResponse(entity);
  }

  /**
   * Validate before deletion - to be implemented by subclasses
   */
  protected abstract validateDeletion(id: string, tx: any): Promise<void>;
}