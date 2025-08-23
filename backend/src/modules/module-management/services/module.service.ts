import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ModuleManagementError,
  ModuleNotFoundError,
  ModuleCodeAlreadyExistsError,
  CircularDependencyError,
  DatabaseOperationError,
  ValidationError,
} from '../errors/module-errors';
import {
  RetryHandler,
  CircuitBreaker,
  ErrorContextBuilder,
  ErrorRecoveryStrategy,
} from '../utils/error-recovery.util';
import { CircularDependencyChecker } from '../utils/circular-dependency.util';
import { ModuleTreeService } from './module-tree.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateModuleDto,
  UpdateModuleDto,
  ModuleResponseDto,
  ModuleWithRelationsDto,
  ModuleCategory,
} from '../dto/module.dto';
import { Prisma } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import {
  Module,
  ModuleWithRelations,
  ModuleQueryParams,
  ModuleTreeNode,
  UserRole,
  UserOverride,
} from '../interfaces/module-management.interface';
import { Transactional } from '../../../common/decorators/transaction.decorator';
import { TransactionManager } from '../../../common/utils/transaction-manager.util';
import { QueryOptimizer } from '../../../common/utils/query-optimizer.util';
import {
  PaginationQueryDto,
  PaginationResponseDto,
} from '../../../common/dto/pagination.dto';
import { AuditService } from '../../audit/services/audit.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class ModuleService {
  private readonly logger = new Logger(ModuleService.name);
  private readonly transactionManager: TransactionManager;
  private readonly retryHandler: RetryHandler;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly errorRecovery: ErrorRecoveryStrategy;
  private readonly circularDependencyChecker: CircularDependencyChecker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly moduleTreeService: ModuleTreeService,
  ) {
    this.transactionManager = new TransactionManager(prisma);
    this.retryHandler = new RetryHandler();
    this.circuitBreaker = new CircuitBreaker('ModuleService');
    this.errorRecovery = new ErrorRecoveryStrategy();
    this.circularDependencyChecker = new CircularDependencyChecker(prisma);
  }

  /**
   * Create a new module with transaction support
   */
  @Transactional({ isolationLevel: 'ReadCommitted' })
  async create(
    data: CreateModuleDto,
    createdBy?: string,
  ): Promise<ModuleWithRelations> {
    const errorContext = new ErrorContextBuilder()
      .add('operation', 'createModule')
      .add('moduleCode', data.code)
      .addTimestamp();

    try {
      // Check if module code already exists with retry
      const existingModule = await this.retryHandler.execute(
        () => this.prisma.module.findUnique({ where: { code: data.code } }),
        'checkExistingModule',
      );

      if (existingModule) {
        throw new ModuleCodeAlreadyExistsError(data.code, errorContext.build());
      }

      // Validate parent module if provided
      if (data.parentId) {
        const parentModule = await this.retryHandler.execute(
          () => this.prisma.module.findUnique({ where: { id: data.parentId } }),
          'findParentModule',
        );

        if (!parentModule) {
          throw new ModuleNotFoundError(data.parentId, {
            ...errorContext.add('context', 'parentModule').build(),
          });
        }
      }

      // Create module with retry and circuit breaker
      const module = await this.circuitBreaker.execute(() =>
        this.retryHandler.execute(
          () =>
            this.prisma.module.create({
              data: {
                id: uuidv7(),
                code: data.code,
                name: data.name,
                description: data.description,
                category: data.category,
                icon: data.icon,
                path: data.path,
                parentId: data.parentId,
                sortOrder: data.sortOrder ?? 0,
                isActive: data.isActive ?? true,
                isVisible: data.isVisible ?? true,
                requiredPlan: data.requiredPlan || null,
              },
              include: {
                parent: true,
                children: true,
              },
            }),
          'createModule',
        ),
      );

      // Track creation in history
      await this.trackModuleChange(
        module.id,
        'created',
        1, // First version
        undefined,
        module,
        Object.keys(data),
        createdBy,
        undefined,
      );

      // Audit log for module creation
      if (createdBy) {
        await this.auditService.log({
          actorId: createdBy,
          module: 'ModuleManagement',
          entityType: 'Module',
          entityId: module.id,
          entityDisplay: module.name,
          action: AuditAction.CREATE,
          newValues: module,
          metadata: {
            code: module.code,
            category: module.category,
            parentId: module.parentId,
          },
        });
      }

      this.logger.log(`Module created successfully: ${module.code}`);
      return module as ModuleWithRelations;
    } catch (error) {
      errorContext.addError(error);
      this.logger.error(
        `Failed to create module: ${error.message}`,
        errorContext.build(),
      );

      if (error instanceof ModuleManagementError) {
        throw error;
      }

      throw new DatabaseOperationError(
        'createModule',
        error,
        errorContext.build(),
      );
    }
  }

  /**
   * Find all modules with optional filters
   */
  async findAll(params?: {
    isActive?: boolean;
    category?: string;
    parentId?: string;
    isVisible?: boolean;
    includeChildren?: boolean;
    includeDeleted?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Module[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const where: Prisma.ModuleWhereInput = {};

    // Exclude soft-deleted modules by default
    if (!params?.includeDeleted) {
      where.deletedAt = null;
    }

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params?.category) {
      where.category = params.category as ModuleCategory;
    }

    if (params?.parentId !== undefined) {
      where.parentId = params.parentId === 'null' ? null : params.parentId;
    }

    if (params?.isVisible !== undefined) {
      where.isVisible = params.isVisible;
    }

    // Pagination parameters
    const page = params?.page || 1;
    const limit = params?.limit || 50; // Default limit of 50 items
    const skip = (page - 1) * limit;

    // Use optimized select instead of include
    const select = QueryOptimizer.getModuleSelect(params?.includeChildren);

    // Build the query with pagination
    const query: Prisma.ModuleFindManyArgs = {
      where,
      select,
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      skip,
      take: limit,
    };

    // Execute query with count for total pages calculation
    const [modules, total] = await Promise.all([
      this.prisma.module.findMany(query),
      this.prisma.module.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: modules as Module[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Find module by ID with optimized query
   */
  async findOne(id: string): Promise<ModuleWithRelations> {
    const errorContext = new ErrorContextBuilder()
      .add('operation', 'findModule')
      .add('moduleId', id)
      .addTimestamp();

    try {
      const module = await this.retryHandler.execute(
        () =>
          this.prisma.module.findUnique({
            where: { id },
            select: {
              ...QueryOptimizer.getModuleSelect(true),
              _count: {
                select: {
                  roleAccess: true,
                  userAccess: true,
                  children: true,
                },
              },
            },
          }),
        'findModuleById',
      );

      if (!module) {
        throw new ModuleNotFoundError(id, errorContext.build());
      }

      return module as unknown as ModuleWithRelations;
    } catch (error) {
      if (error instanceof ModuleManagementError) {
        throw error;
      }

      errorContext.addError(error);
      throw new DatabaseOperationError(
        'findModule',
        error,
        errorContext.build(),
      );
    }
  }

  /**
   * Find module by code
   */
  async findByCode(code: string): Promise<ModuleWithRelations> {
    const module = await this.prisma.module.findUnique({
      where: { code },
      include: {
        parent: true,
        children: true,
        permissions: true,
      },
    });

    if (!module) {
      throw new NotFoundException(`Module with code ${code} not found`);
    }

    return module as unknown as ModuleWithRelations;
  }

  /**
   * Update module with transaction support and optimistic locking
   */
  @Transactional({ isolationLevel: 'RepeatableRead' })
  async update(
    id: string,
    data: UpdateModuleDto,
    updatedBy?: string,
    expectedVersion?: number,
  ): Promise<ModuleResponseDto> {
    // Check if module exists
    const existingModule = await this.prisma.module.findUnique({
      where: { id },
    });

    if (!existingModule) {
      throw new NotFoundException(`Module with ID ${id} not found`);
    }

    // Check version for optimistic locking
    if (
      expectedVersion !== undefined &&
      existingModule.version !== expectedVersion
    ) {
      throw new ConflictException(
        `Module has been modified by another user. Current version: ${existingModule.version}, expected: ${expectedVersion}`,
      );
    }

    // Validate parent module if changing
    if (
      data.parentId !== undefined &&
      data.parentId !== existingModule.parentId
    ) {
      if (data.parentId) {
        const parentModule = await this.prisma.module.findUnique({
          where: { id: data.parentId },
        });

        if (!parentModule) {
          throw new NotFoundException(
            `Parent module with ID ${data.parentId} not found`,
          );
        }

        // Prevent circular dependencies using dedicated checker
        if (
          await this.circularDependencyChecker.wouldCreateCircularDependency(
            id,
            data.parentId,
          )
        ) {
          throw new BadRequestException(
            'Cannot set parent: would create circular dependency',
          );
        }
      }
    }

    try {
      const module = await this.prisma.module.update({
        where: {
          id,
          version: existingModule.version, // Optimistic locking check
        },
        data: {
          name: data.name,
          description: data.description,
          category: data.category,
          icon: data.icon,
          path: data.path,
          parentId: data.parentId,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
          isVisible: data.isVisible,
          requiredPlan: data.requiredPlan || undefined,
          version: { increment: 1 }, // Increment version for optimistic locking
          updatedBy: updatedBy,
        },
        include: {
          parent: true,
          children: true,
        },
      });

      // Track changed fields
      const changedFields: string[] = [];
      const changes: any = {};
      const oldValues: any = {};

      // Track what changed
      Object.keys(data).forEach((key) => {
        if (data[key] !== undefined && data[key] !== existingModule[key]) {
          changedFields.push(key);
          changes[key] = data[key];
          oldValues[key] = existingModule[key];
        }
      });

      // Track change in history
      if (changedFields.length > 0) {
        await this.trackModuleChange(
          id,
          'updated',
          module.version,
          existingModule,
          module,
          changedFields,
          updatedBy,
          undefined,
        );
      }

      // Audit log for module update
      if (updatedBy && Object.keys(changes).length > 0) {
        await this.auditService.log({
          actorId: updatedBy,
          module: 'ModuleManagement',
          entityType: 'Module',
          entityId: module.id,
          entityDisplay: module.name,
          action: AuditAction.UPDATE,
          oldValues: oldValues,
          newValues: changes,
          metadata: {
            code: module.code,
            version: module.version,
          },
        });
      }

      this.logger.log(`Module updated: ${module.code}`);
      return module as ModuleResponseDto;
    } catch (error) {
      this.logger.error(`Error updating module: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete module with transaction support
   */
  @Transactional({ isolationLevel: 'ReadCommitted' })
  /**
   * Soft delete a module with version tracking
   */
  @Transactional()
  async remove(
    id: string,
    deletedBy?: string,
    deleteReason?: string,
  ): Promise<void> {
    // Check if module exists and not already deleted
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: {
        children: {
          where: { deletedAt: null },
        },
        roleAccess: true,
        userAccess: true,
      },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID ${id} not found`);
    }

    if (module.deletedAt) {
      throw new BadRequestException('Module is already deleted');
    }

    // Check if module has active children
    if (module.children.length > 0) {
      throw new BadRequestException(
        'Cannot delete module with active children. Delete children first.',
      );
    }

    // Check if module has access rules
    if (module.roleAccess.length > 0 || module.userAccess.length > 0) {
      throw new BadRequestException(
        'Cannot delete module with active access rules. Remove access rules first.',
      );
    }

    try {
      // Perform soft delete with optimistic locking
      const updatedModule = await this.prisma.module.update({
        where: {
          id,
          version: module.version, // Optimistic locking check
        },
        data: {
          deletedAt: new Date(),
          deletedBy,
          deleteReason,
          isActive: false,
          isVisible: false,
          version: { increment: 1 },
        },
      });

      // Track change in history
      await this.trackModuleChange(
        id,
        'deleted',
        updatedModule.version,
        module,
        updatedModule,
        ['deletedAt', 'deletedBy', 'deleteReason', 'isActive', 'isVisible'],
        deletedBy,
        deleteReason,
      );

      // Audit log for module deletion
      if (deletedBy) {
        await this.auditService.log({
          actorId: deletedBy,
          module: 'ModuleManagement',
          entityType: 'Module',
          entityId: module.id,
          entityDisplay: module.name,
          action: AuditAction.DELETE,
          oldValues: module,
          newValues: updatedModule,
          metadata: {
            code: module.code,
            category: module.category,
            deleteReason,
            softDelete: true,
          },
        });
      }

      this.logger.log(`Module soft deleted: ${module.code}`);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new ConflictException(
          'Module was modified by another user. Please refresh and try again.',
        );
      }
      this.logger.error(`Error deleting module: ${error.message}`);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted module
   */
  @Transactional()
  async restore(
    id: string,
    restoredBy?: string,
    restoreReason?: string,
  ): Promise<ModuleResponseDto> {
    const module = await this.prisma.module.findUnique({
      where: { id },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID ${id} not found`);
    }

    if (!module.deletedAt) {
      throw new BadRequestException('Module is not deleted');
    }

    try {
      const restoredModule = await this.prisma.module.update({
        where: {
          id,
          version: module.version,
        },
        data: {
          deletedAt: null,
          deletedBy: null,
          deleteReason: null,
          isActive: true,
          isVisible: true,
          version: { increment: 1 },
          updatedBy: restoredBy,
        },
      });

      // Track change in history
      await this.trackModuleChange(
        id,
        'restored',
        restoredModule.version,
        module,
        restoredModule,
        ['deletedAt', 'deletedBy', 'deleteReason', 'isActive', 'isVisible'],
        restoredBy,
        restoreReason,
      );

      // Audit log
      if (restoredBy) {
        await this.auditService.log({
          actorId: restoredBy,
          module: 'ModuleManagement',
          entityType: 'Module',
          entityId: module.id,
          entityDisplay: module.name,
          action: AuditAction.UPDATE,
          oldValues: module,
          newValues: restoredModule,
          metadata: {
            code: module.code,
            restoreReason,
            restored: true,
          },
        });
      }

      this.logger.log(`Module restored: ${module.code}`);
      return restoredModule as ModuleResponseDto;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new ConflictException(
          'Module was modified by another user. Please refresh and try again.',
        );
      }
      this.logger.error(`Error restoring module: ${error.message}`);
      throw error;
    }
  }

  /**
   * Permanently delete a soft-deleted module
   */
  @Transactional()
  async hardDelete(id: string, deletedBy?: string): Promise<void> {
    const module = await this.prisma.module.findUnique({
      where: { id },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID ${id} not found`);
    }

    if (!module.deletedAt) {
      throw new BadRequestException(
        'Module must be soft-deleted first before permanent deletion',
      );
    }

    try {
      // Delete all related records and the module
      await this.prisma.module.delete({
        where: { id },
      });

      // Audit log
      if (deletedBy) {
        await this.auditService.log({
          actorId: deletedBy,
          module: 'ModuleManagement',
          entityType: 'Module',
          entityId: module.id,
          entityDisplay: module.name,
          action: AuditAction.DELETE,
          oldValues: module,
          metadata: {
            code: module.code,
            permanentDelete: true,
          },
        });
      }

      this.logger.log(`Module permanently deleted: ${module.code}`);
    } catch (error) {
      this.logger.error(`Error permanently deleting module: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get module hierarchy tree - delegated to ModuleTreeService
   */
  async getModuleTree(): Promise<ModuleResponseDto[]> {
    const treeNodes = await this.moduleTreeService.getModuleTree({
      isActive: true,
    });
    return treeNodes as ModuleResponseDto[];
  }

  /**
   * Get modules accessible by user with optimized query
   */
  async getUserAccessibleModules(
    userProfileId: string,
  ): Promise<ModuleResponseDto[]> {
    // Parallel fetch user roles and revoked module IDs
    const [userRoles, revokedModuleIds] = await Promise.all([
      // Get user's roles - optimized with select
      this.prisma.userRole.findMany({
        where: {
          userProfileId,
          isActive: true,
        },
        select: { roleId: true },
      }),
      // Get revoked module IDs upfront
      this.prisma.userOverride.findMany({
        where: {
          userProfileId,
          isGranted: false,
          OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        },
        select: { moduleId: true },
      }),
    ]);

    const roleIds = userRoles.map((ur) => ur.roleId);
    const revokedIds = new Set(revokedModuleIds.map((o) => o.moduleId));

    // Use optimized query from QueryOptimizer
    const query = QueryOptimizer.getUserAccessibleModulesQuery(
      userProfileId,
      roleIds,
    );

    // Add override support to the query
    if (query.where && query.where.OR && Array.isArray(query.where.OR)) {
      query.where.OR = [
        ...query.where.OR,
        {
          overrides: {
            some: {
              userProfileId,
              isGranted: true,
              OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
            },
          },
        },
      ];
    }

    const modules = await this.prisma.module.findMany(query);

    // Process modules to merge permissions and filter revoked
    return modules
      .filter((m) => !revokedIds.has(m.id))
      .map((module) => {
        const permissions = new Set<string>();
        const moduleWithRelations = module as ModuleWithRelations;

        // Collect permissions from role access
        if (moduleWithRelations.roleAccess) {
          moduleWithRelations.roleAccess.forEach((access) => {
            if (access.permissions) {
              access.permissions.forEach((p) => permissions.add(p));
            }
          });
        }

        // Collect permissions from user access
        if (moduleWithRelations.userAccess) {
          moduleWithRelations.userAccess.forEach((access) => {
            if (access.permissions) {
              access.permissions.forEach((p) => permissions.add(p));
            }
          });
        }

        // Remove access details from response
        const { roleAccess, userAccess, ...moduleData } = moduleWithRelations;

        return {
          ...moduleData,
          permissions: Array.from(permissions),
        } as ModuleResponseDto;
      });
  }

  /**
   * Track module changes in history table
   */
  private async trackModuleChange(
    moduleId: string,
    changeType: string,
    changeVersion: number,
    previousData: any,
    newData: any,
    changedFields: string[],
    changedBy?: string,
    changeReason?: string,
  ): Promise<void> {
    try {
      await this.prisma.moduleChangeHistory.create({
        data: {
          id: uuidv7(),
          moduleId,
          changeType,
          changeVersion,
          previousData: previousData ? previousData : null,
          newData,
          changedFields,
          changedBy: changedBy || 'system',
          changeReason,
        },
      });
    } catch (error) {
      this.logger.error(`Error tracking module change: ${error.message}`);
      // Don't throw - this is a secondary operation
    }
  }

  /**
   * Get module change history
   */
  async getModuleHistory(moduleId: string, limit = 10): Promise<any[]> {
    return this.prisma.moduleChangeHistory.findMany({
      where: { moduleId },
      orderBy: { changedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Bulk update modules with progress tracking
   */
  @Transactional()
  async bulkUpdateModules(
    updates: Array<{ id: string; data: UpdateModuleDto }>,
    initiatedBy: string,
  ): Promise<string> {
    const operationId = uuidv7();

    // Create bulk operation progress record
    await this.prisma.bulkOperationProgress.create({
      data: {
        id: operationId,
        operationType: 'module_update',
        status: 'in_progress',
        totalItems: updates.length,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        initiatedBy,
        metadata: {
          operation: 'bulk_module_update',
          moduleIds: updates.map((u) => u.id),
        },
      },
    });

    const errors: any[] = [];
    const rollbackData: any[] = [];
    let successCount = 0;
    let processedCount = 0;

    for (const update of updates) {
      processedCount++;

      try {
        // Store original data for potential rollback
        const original = await this.prisma.module.findUnique({
          where: { id: update.id },
        });

        if (!original) {
          errors.push({
            moduleId: update.id,
            error: 'Module not found',
          });
          continue;
        }

        rollbackData.push({
          id: original.id,
          data: original,
        });

        // Perform update with optimistic locking
        const updated = await this.prisma.module.update({
          where: {
            id: update.id,
            version: original.version,
          },
          data: {
            ...update.data,
            version: { increment: 1 },
            updatedBy: initiatedBy,
          },
        });

        // Track change
        const changedFields = Object.keys(update.data);
        await this.trackModuleChange(
          update.id,
          'updated',
          updated.version,
          original,
          updated,
          changedFields,
          initiatedBy,
          'Bulk update operation',
        );

        successCount++;

        // Update progress
        await this.prisma.bulkOperationProgress.update({
          where: { id: operationId },
          data: {
            processedItems: processedCount,
            successfulItems: successCount,
            failedItems: errors.length,
          },
        });
      } catch (error) {
        errors.push({
          moduleId: update.id,
          error: error.message,
        });

        // Update progress with error
        await this.prisma.bulkOperationProgress.update({
          where: { id: operationId },
          data: {
            processedItems: processedCount,
            failedItems: errors.length,
            errorDetails: errors,
          },
        });
      }
    }

    // Finalize operation
    const finalStatus =
      errors.length === 0
        ? 'completed'
        : errors.length === updates.length
          ? 'failed'
          : 'completed_with_errors';

    await this.prisma.bulkOperationProgress.update({
      where: { id: operationId },
      data: {
        status: finalStatus,
        completedAt: new Date(),
        errorDetails: errors.length > 0 ? errors : undefined,
        rollbackData: rollbackData.length > 0 ? rollbackData : undefined,
      },
    });

    this.logger.log(
      `Bulk update completed: ${successCount}/${updates.length} successful`,
    );

    return operationId;
  }

  /**
   * Rollback bulk operation
   */
  @Transactional()
  async rollbackBulkOperation(
    operationId: string,
    initiatedBy: string,
  ): Promise<void> {
    const operation = await this.prisma.bulkOperationProgress.findUnique({
      where: { id: operationId },
    });

    if (!operation) {
      throw new NotFoundException('Operation not found');
    }

    if (!operation.rollbackData) {
      throw new BadRequestException('No rollback data available');
    }

    const rollbackData = operation.rollbackData as any[];

    for (const item of rollbackData) {
      try {
        await this.prisma.module.update({
          where: { id: item.id },
          data: item.data,
        });

        await this.trackModuleChange(
          item.id,
          'rolled_back',
          item.data.version + 1,
          null,
          item.data,
          Object.keys(item.data),
          initiatedBy,
          `Rollback of operation ${operationId}`,
        );
      } catch (error) {
        this.logger.error(
          `Error rolling back module ${item.id}: ${error.message}`,
        );
      }
    }

    // Update operation status
    await this.prisma.bulkOperationProgress.update({
      where: { id: operationId },
      data: {
        status: 'rolled_back',
        metadata: {
          ...(operation.metadata as any),
          rolledBackBy: initiatedBy,
          rolledBackAt: new Date(),
        },
      },
    });

    this.logger.log(`Bulk operation ${operationId} rolled back`);
  }

  /**
   * Get bulk operation progress
   */
  async getBulkOperationProgress(operationId: string): Promise<any> {
    const operation = await this.prisma.bulkOperationProgress.findUnique({
      where: { id: operationId },
    });

    if (!operation) {
      throw new NotFoundException('Operation not found');
    }

    return {
      id: operation.id,
      operationType: operation.operationType,
      status: operation.status,
      progress: {
        total: operation.totalItems,
        processed: operation.processedItems,
        successful: operation.successfulItems,
        failed: operation.failedItems,
        percentage: Math.round(
          (operation.processedItems / operation.totalItems) * 100,
        ),
      },
      errors: operation.errorDetails,
      startedAt: operation.startedAt,
      completedAt: operation.completedAt,
      canRollback:
        operation.status === 'completed' && operation.rollbackData !== null,
    };
  }

  /**
   * Reorder modules with transaction support
   */
  @Transactional({ isolationLevel: 'ReadCommitted' })
  async reorderModules(
    modules: Array<{ id: string; sortOrder: number }>,
  ): Promise<void> {
    try {
      // Update all modules in the transaction
      await Promise.all(
        modules.map((module) =>
          this.prisma.module.update({
            where: { id: module.id },
            data: { sortOrder: module.sortOrder },
          }),
        ),
      );

      this.logger.log('Modules reordered successfully');
    } catch (error) {
      this.logger.error(`Error reordering modules: ${error.message}`);
      throw error;
    }
  }
}
