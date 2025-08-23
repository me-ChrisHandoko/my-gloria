import { Injectable } from '@nestjs/common';
import { ModuleService } from './module.service';
import { ModuleTreeService } from './module-tree.service';
import {
  StructuredLogger,
  StructuredLoggerFactory,
} from '../utils/structured-logger.util';
import {
  PerformanceMetricsService,
  TrackPerformance,
} from '../utils/performance-metrics.util';
import {
  ModuleOperationResult,
  BulkOperationResult,
  ResponseBuilder,
  ApiResponse,
  SuccessResponse,
} from '../types/response.types';
import { CreateModuleDto, UpdateModuleDto } from '../dto/module.dto';
import {
  ModuleWithRelations,
  Module,
} from '../interfaces/module-management.interface';

/**
 * Enhanced module operations service with performance tracking and structured logging
 */
@Injectable()
export class ModuleOperationsService {
  private readonly logger: StructuredLogger;

  constructor(
    private readonly moduleService: ModuleService,
    private readonly moduleTreeService: ModuleTreeService,
    private readonly loggerFactory: StructuredLoggerFactory,
    private readonly performanceMetrics: PerformanceMetricsService,
  ) {
    this.logger = loggerFactory.getLogger('ModuleOperationsService');
  }

  /**
   * Create a module with full tracking
   */
  @TrackPerformance('module.create')
  async createModule(
    data: CreateModuleDto,
    userId: string,
    correlationId?: string,
  ): Promise<ApiResponse<ModuleWithRelations>> {
    if (correlationId) {
      this.logger.setCorrelationId(correlationId);
    }
    this.logger.setUserId(userId);

    const operationId = this.logger.startOperation('createModule', {
      moduleCode: data.code,
      moduleName: data.name,
    });

    try {
      this.logger.info(`Creating module: ${data.code}`, {
        category: data.category,
        parentId: data.parentId,
      });

      const module = await this.moduleService.create(data, userId);

      this.logger.endOperation(operationId, true, {
        moduleId: module.id,
      });

      this.logger.info(`Module created successfully: ${module.code}`, {
        moduleId: module.id,
        duration: Date.now(),
      });

      return ResponseBuilder.success(module);
    } catch (error) {
      this.logger.endOperation(operationId, false, {
        error: error.message,
      });

      this.logger.error(
        `Failed to create module: ${data.code}`,
        error as Error,
        {
          moduleCode: data.code,
        },
      );

      return ResponseBuilder.error('MODULE_CREATE_FAILED', error.message, {
        moduleCode: data.code,
      });
    }
  }

  /**
   * Update a module with version tracking
   */
  @TrackPerformance('module.update')
  async updateModule(
    id: string,
    data: UpdateModuleDto,
    userId: string,
    expectedVersion?: number,
    correlationId?: string,
  ): Promise<ApiResponse<ModuleOperationResult>> {
    if (correlationId) {
      this.logger.setCorrelationId(correlationId);
    }
    this.logger.setUserId(userId);

    const operationId = this.logger.startOperation('updateModule', {
      moduleId: id,
      expectedVersion,
    });

    try {
      this.logger.info(`Updating module: ${id}`, {
        changes: Object.keys(data),
        expectedVersion,
      });

      const module = await this.moduleService.update(
        id,
        data,
        userId,
        expectedVersion,
      );

      const result: ModuleOperationResult = {
        type: 'UPDATE_SUCCESS',
        module: module as ModuleWithRelations,
        previousVersion: expectedVersion || 0,
        timestamp: new Date(),
      };

      this.logger.endOperation(operationId, true, {
        newVersion: module.version,
      });

      this.logger.info(`Module updated successfully: ${module.code}`, {
        moduleId: module.id,
        version: module.version,
      });

      return ResponseBuilder.success(result);
    } catch (error) {
      this.logger.endOperation(operationId, false, {
        error: error.message,
      });

      this.logger.error(`Failed to update module: ${id}`, error as Error, {
        moduleId: id,
      });

      const result: ModuleOperationResult = {
        type: 'OPERATION_FAILED',
        operation: 'update',
        error: error as Error,
        timestamp: new Date(),
      };

      return ResponseBuilder.success(result);
    }
  }

  /**
   * Get module tree with performance tracking
   */
  @TrackPerformance('module.tree')
  async getModuleTree(
    userId?: string,
    correlationId?: string,
  ): Promise<ApiResponse<Module[]>> {
    if (correlationId) {
      this.logger.setCorrelationId(correlationId);
    }
    if (userId) {
      this.logger.setUserId(userId);
    }

    const operationId =
      this.performanceMetrics.startOperation('module.tree.fetch');

    try {
      this.logger.debug('Fetching module tree');

      const startTime = Date.now();
      const tree = await this.moduleTreeService.getModuleTree({
        isActive: true,
        isVisible: true,
      });

      this.performanceMetrics.endOperation(operationId, true);

      this.logger.logPerformance('module.tree.fetch', startTime, {
        nodeCount: tree.length,
        totalNodes: this.countTreeNodes(tree),
      });

      return ResponseBuilder.success(tree as Module[]);
    } catch (error) {
      this.performanceMetrics.endOperation(operationId, false, error.message);

      this.logger.error('Failed to fetch module tree', error as Error);

      return ResponseBuilder.error('MODULE_TREE_FETCH_FAILED', error.message);
    }
  }

  /**
   * Bulk update modules with detailed tracking
   */
  @TrackPerformance('module.bulk.update')
  async bulkUpdateModules(
    updates: Array<{ id: string; data: UpdateModuleDto }>,
    userId: string,
    correlationId?: string,
  ): Promise<ApiResponse<BulkOperationResult>> {
    if (correlationId) {
      this.logger.setCorrelationId(correlationId);
    }
    this.logger.setUserId(userId);

    const operationId = this.logger.startOperation('bulkUpdateModules', {
      totalCount: updates.length,
    });

    const successful: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const { id, data } of updates) {
      const itemOperationId = this.performanceMetrics.startOperation(
        'module.update.single',
      );

      try {
        await this.moduleService.update(id, data, userId);
        successful.push(id);

        this.performanceMetrics.endOperation(itemOperationId, true);
      } catch (error) {
        failed.push({ id, error: error.message });

        this.performanceMetrics.endOperation(
          itemOperationId,
          false,
          error.message,
        );

        this.logger.warn(`Failed to update module ${id} in bulk operation`, {
          moduleId: id,
          error: error.message,
        });
      }
    }

    this.logger.endOperation(operationId, failed.length === 0, {
      successful: successful.length,
      failed: failed.length,
    });

    let result: BulkOperationResult;

    if (failed.length === 0) {
      result = {
        type: 'BULK_SUCCESS',
        processed: updates.length,
        successful,
        failed: [],
        timestamp: new Date(),
      };
    } else if (successful.length > 0) {
      result = {
        type: 'BULK_PARTIAL',
        processed: updates.length,
        successful,
        failed,
        timestamp: new Date(),
      };
    } else {
      result = {
        type: 'BULK_FAILED',
        processed: updates.length,
        successful: [],
        failed,
        error: 'All operations failed',
        timestamp: new Date(),
      };
    }

    this.logger.info('Bulk update completed', {
      total: updates.length,
      successful: successful.length,
      failed: failed.length,
    });

    return ResponseBuilder.success(result);
  }

  /**
   * Get performance metrics for module operations
   */
  async getPerformanceMetrics(
    operation?: string,
    timeWindowMs?: number,
  ): Promise<SuccessResponse<any>> {
    this.logger.debug('Fetching performance metrics', {
      operation,
      timeWindow: timeWindowMs,
    });

    if (operation) {
      const stats = this.performanceMetrics.getOperationStats(
        operation,
        timeWindowMs,
      );
      return ResponseBuilder.success(stats);
    } else {
      const allStats = this.performanceMetrics.getAllStats(timeWindowMs);
      const statsObject = Object.fromEntries(allStats);
      return ResponseBuilder.success(statsObject);
    }
  }

  /**
   * Export metrics in Prometheus format
   */
  async exportMetrics(): Promise<string> {
    this.logger.debug('Exporting metrics in Prometheus format');
    return this.performanceMetrics.exportPrometheusMetrics();
  }

  /**
   * Helper to count total nodes in tree
   */
  private countTreeNodes(nodes: any[]): number {
    let count = nodes.length;
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        count += this.countTreeNodes(node.children);
      }
    }
    return count;
  }
}
