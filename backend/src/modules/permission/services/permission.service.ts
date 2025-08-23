import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePermissionDto } from '../dto/permission/create-permission.dto';
import { UpdatePermissionDto } from '../dto/permission/update-permission.dto';
import {
  CheckPermissionDto,
  PermissionCheckResultDto,
} from '../dto/permission/check-permission.dto';
import {
  BatchCheckPermissionDto,
  BatchPermissionCheckResultDto,
  PermissionCheckItem,
} from '../dto/permission/batch-check-permission.dto';
import { AuditService } from '../../audit/services/audit.service';
import { RedisPermissionCacheService } from '../../../cache/services/redis-permission-cache.service';
import { PermissionMatrixService } from './permission-matrix.service';
import { JsonSchemaValidatorService } from './json-schema-validator.service';
import { PermissionMetricsService } from './permission-metrics.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { PermissionException } from '../exceptions/permission.exception';
import {
  Prisma,
  Permission,
  PermissionAction,
  PermissionScope,
} from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);
  private readonly checkTimeoutMs = 5000; // 5 second timeout for permission checks
  private activeChecks = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly cacheService: RedisPermissionCacheService,
    private readonly matrixService: PermissionMatrixService,
    private readonly validatorService: JsonSchemaValidatorService,
    private readonly metricsService: PermissionMetricsService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async create(
    createPermissionDto: CreatePermissionDto,
    createdBy: string,
  ): Promise<Permission> {
    // Check if permission code already exists
    const existing = await this.prisma.permission.findUnique({
      where: { code: createPermissionDto.code },
    });

    if (existing) {
      throw PermissionException.alreadyExists(createPermissionDto.code);
    }

    // Check if resource-action-scope combination already exists
    if (createPermissionDto.scope) {
      const existingCombination = await this.prisma.permission.findFirst({
        where: {
          resource: createPermissionDto.resource,
          action: createPermissionDto.action,
          scope: createPermissionDto.scope,
        },
      });

      if (existingCombination) {
        throw PermissionException.combinationExists(
          createPermissionDto.resource,
          createPermissionDto.action,
          createPermissionDto.scope,
        );
      }
    }

    const permission = await this.prisma.$transaction(async (tx) => {
      // Extract dependencies from DTO
      const { dependencies, ...permissionData } = createPermissionDto;

      // Validate and sanitize conditions if provided
      if (permissionData.conditions) {
        permissionData.conditions = this.validatorService.validateAndSanitizeConditions(
          permissionData.conditions,
          'permission',
        );
      }

      // Create the permission
      const newPermission = await tx.permission.create({
        data: {
          id: uuidv7(),
          ...permissionData,
          createdBy,
        },
        include: {
          group: true,
          dependencies: {
            include: {
              dependsOn: true,
            },
          },
        },
      });

      // Handle dependencies if provided
      if (dependencies?.length) {
        await this.createDependencies(tx, newPermission.id, dependencies);
      }

      // Log audit
      await this.auditService.log({
        actorId: createdBy,
        action: 'CREATE',
        module: 'permission',
        entityType: 'Permission',
        entityId: newPermission.id,
        entityDisplay: newPermission.code,
        newValues: newPermission,
        metadata: { permissionCode: newPermission.code },
      });

      return newPermission;
    });

    return permission;
  }

  async findAll(filters?: {
    resource?: string;
    action?: PermissionAction;
    scope?: PermissionScope;
    groupId?: string;
    isActive?: boolean;
  }): Promise<Permission[]> {
    const where: Prisma.PermissionWhereInput = {};

    if (filters?.resource) where.resource = filters.resource;
    if (filters?.action) where.action = filters.action;
    if (filters?.scope) where.scope = filters.scope;
    if (filters?.groupId) where.groupId = filters.groupId;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    return this.prisma.permission.findMany({
      where,
      include: {
        group: true,
        dependencies: {
          include: {
            dependsOn: true,
          },
        },
        dependentOn: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }, { scope: 'asc' }],
    });
  }

  async findOne(id: string): Promise<Permission> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
      include: {
        group: true,
        dependencies: {
          include: {
            dependsOn: true,
          },
        },
        dependentOn: {
          include: {
            permission: true,
          },
        },
        rolePermissions: {
          include: {
            role: true,
          },
        },
        userPermissions: {
          include: {
            userProfile: true,
          },
        },
      },
    });

    if (!permission) {
      throw PermissionException.notFound(id);
    }

    return permission;
  }

  async findByCode(code: string): Promise<Permission> {
    const permission = await this.prisma.permission.findUnique({
      where: { code },
      include: {
        group: true,
        dependencies: {
          include: {
            dependsOn: true,
          },
        },
      },
    });

    if (!permission) {
      throw PermissionException.codeNotFound(code);
    }

    return permission;
  }

  async update(
    id: string,
    updatePermissionDto: UpdatePermissionDto,
    modifiedBy: string,
  ): Promise<Permission> {
    const existing = await this.findOne(id);

    if (existing.isSystemPermission) {
      throw PermissionException.systemPermissionImmutable();
    }

    // Check for code uniqueness if updating code
    if (
      updatePermissionDto.code &&
      updatePermissionDto.code !== existing.code
    ) {
      const codeExists = await this.prisma.permission.findUnique({
        where: { code: updatePermissionDto.code },
      });

      if (codeExists) {
        throw PermissionException.alreadyExists(updatePermissionDto.code);
      }
    }

    const permission = await this.prisma.$transaction(async (tx) => {
      // Extract dependencies and other non-direct fields from DTO
      const { dependencies, ...permissionData } = updatePermissionDto;

      // Validate and sanitize conditions if provided
      if (permissionData.conditions) {
        permissionData.conditions = this.validatorService.validateAndSanitizeConditions(
          permissionData.conditions,
          'permission',
        );
      }

      const updated = await tx.permission.update({
        where: { id },
        data: {
          ...permissionData,
          updatedAt: new Date(), // Explicitly set updatedAt
        },
        include: {
          group: true,
          dependencies: {
            include: {
              dependsOn: true,
            },
          },
        },
      });

      // Handle dependencies update if provided
      if (dependencies) {
        // Remove existing dependencies
        await tx.permissionDependency.deleteMany({
          where: { permissionId: id },
        });

        // Add new dependencies
        if (dependencies.length > 0) {
          await this.createDependencies(tx, id, dependencies);
        }
      }

      // Log audit
      await this.auditService.log({
        actorId: modifiedBy,
        action: 'UPDATE',
        module: 'permission',
        entityType: 'Permission',
        entityId: updated.id,
        entityDisplay: updated.code,
        oldValues: existing,
        newValues: updated,
        metadata: {
          changedFields: Object.keys(permissionData),
        },
      });

      // Invalidate permission cache for affected users
      await this.invalidatePermissionCache(id);

      return updated;
    });

    return permission;
  }

  async remove(id: string, deletedBy: string): Promise<void> {
    const permission = await this.findOne(id);

    if (permission.isSystemPermission) {
      throw PermissionException.systemPermissionDeleteForbidden();
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete the permission (cascades to dependencies)
      await tx.permission.delete({
        where: { id },
      });

      // Log audit
      await this.auditService.log({
        actorId: deletedBy,
        action: 'DELETE',
        module: 'permission',
        entityType: 'Permission',
        entityId: permission.id,
        entityDisplay: permission.code,
        oldValues: permission,
      });

      // Invalidate permission cache for affected users
      await this.invalidatePermissionCache(id);
    });
  }

  /**
   * Checks if a user has a specific permission.
   * 
   * Permission check flow:
   * 1. Check permission matrix cache (fastest - pre-computed results)
   * 2. Check Redis cache (fast - recent checks)
   * 3. Check database (slower but authoritative):
   *    a. Resource-specific permissions (if resourceId provided)
   *    b. Direct user permissions (highest priority)
   *    c. Role-based permissions (if not explicitly denied)
   * 
   * @param checkDto - Contains userId, resource, action, scope, and optional resourceId
   * @returns Result indicating if permission is allowed and how it was granted
   * @throws PermissionException on timeout or check failure
   * 
   * @example
   * const result = await permissionService.checkPermission({
   *   userId: 'user-123',
   *   resource: 'document',
   *   action: PermissionAction.UPDATE,
   *   scope: PermissionScope.OWN,
   *   resourceId: 'doc-456' // Optional: for resource-specific checks
   * });
   */
  async checkPermission(
    checkDto: CheckPermissionDto,
  ): Promise<PermissionCheckResultDto> {
    const startTime = Date.now();
    const result: PermissionCheckResultDto = {
      isAllowed: false,
      grantedBy: [],
    };

    // Update active checks gauge
    this.activeChecks++;
    this.metricsService.updateActiveChecks(this.activeChecks);

    // Record permission check start
    this.metricsService.recordPermissionCheck(
      checkDto.resource,
      checkDto.action,
      checkDto.scope,
    );

    try {
      // Set timeout for the entire check operation
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(PermissionException.timeout(
            checkDto.userId,
            checkDto.resource,
            checkDto.action,
            this.checkTimeoutMs,
          ));
        }, this.checkTimeoutMs);
      });

      const checkPromise = this.performPermissionCheck(checkDto, result, startTime);
      
      return await Promise.race([checkPromise, timeoutPromise]);
    } catch (error) {
      // Record the failure
      this.metricsService.recordPermissionCheck(
        checkDto.resource,
        checkDto.action,
        checkDto.scope,
        false,
      );

      if (error instanceof PermissionException) {
        throw error;
      }

      this.logger.error('Permission check failed', error);
      throw PermissionException.checkFailed(
        checkDto.userId,
        checkDto.resource,
        checkDto.action,
        error.message,
      );
    } finally {
      this.activeChecks--;
      this.metricsService.updateActiveChecks(this.activeChecks);
    }
  }

  private async performPermissionCheck(
    checkDto: CheckPermissionDto,
    result: PermissionCheckResultDto,
    startTime: number,
  ): Promise<PermissionCheckResultDto> {
    try {
      // Track user activity for matrix computation
      await this.circuitBreaker.executeWithBreaker(
        'matrix',
        async () => {
          await this.matrixService.trackUserActivity(checkDto.userId);
        },
        async () => {
          this.logger.warn('Matrix tracking failed, continuing without tracking');
        },
      );

      // Check permission matrix first (fastest)
      const matrixEntry = await this.circuitBreaker.executeWithBreaker(
        'matrix',
        async () => {
          const entry = await this.matrixService.getFromMatrix(
            checkDto.userId,
            checkDto.resource,
            checkDto.action,
            checkDto.scope,
          );
          if (entry) {
            this.metricsService.recordCacheHit('matrix');
          } else {
            this.metricsService.recordCacheMiss('matrix');
          }
          return entry;
        },
        async () => null,
      );
      
      if (matrixEntry && !checkDto.resourceId) {
        result.isAllowed = matrixEntry.isAllowed;
        result.grantedBy = matrixEntry.grantedBy;
        result.checkDuration = Date.now() - startTime;
        
        this.metricsService.recordCheckDuration(
          checkDto.resource,
          checkDto.action,
          result.checkDuration,
          'matrix',
        );
        
        this.metricsService.recordPermissionCheck(
          checkDto.resource,
          checkDto.action,
          checkDto.scope,
          result.isAllowed,
        );
        
        return result;
      }

      // Check cache second
      const cached = await this.circuitBreaker.executeWithBreaker(
        'cache',
        async () => {
          const cacheResult = await this.cacheService.getCachedPermissionCheck(
            checkDto.userId,
            checkDto.resource,
            checkDto.action,
            checkDto.scope,
            checkDto.resourceId,
          );
          if (cacheResult !== null) {
            this.metricsService.recordCacheHit('redis');
          } else {
            this.metricsService.recordCacheMiss('redis');
          }
          return cacheResult;
        },
        async () => null,
      );
      
      if (cached !== null) {
        result.isAllowed = cached.isAllowed;
        result.checkDuration = Date.now() - startTime;
        
        this.metricsService.recordCheckDuration(
          checkDto.resource,
          checkDto.action,
          result.checkDuration,
          'cache',
        );
        
        this.metricsService.recordPermissionCheck(
          checkDto.resource,
          checkDto.action,
          checkDto.scope,
          result.isAllowed,
        );
        
        return result;
      }

      // Perform database checks with circuit breaker
      const dbCheckStartTime = Date.now();
      await this.circuitBreaker.executeWithBreaker(
        'database',
        async () => {
          // Check resource-specific permissions if resourceId provided
          if (checkDto.resourceId) {
            const resourcePermission = await this.checkResourcePermission(
              checkDto.userId,
              checkDto.resource,
              checkDto.action,
              checkDto.resourceId,
            );
            if (resourcePermission.isGranted) {
              result.isAllowed = true;
              result.grantedBy?.push('resource-specific');
            }
          }

          // Check direct user permissions
          const userPermission = await this.checkUserPermission(
            checkDto.userId,
            checkDto.resource,
            checkDto.action,
            checkDto.scope,
          );
          if (userPermission.isGranted) {
            result.isAllowed = true;
            result.grantedBy?.push('direct-user-permission');
          } else if (userPermission.isDenied) {
            result.isAllowed = false;
            result.reason = 'Explicitly denied by user permission';
          }

          // Check role-based permissions only if not explicitly denied
          if (!userPermission.isDenied) {
            const rolePermission = await this.checkRolePermission(
              checkDto.userId,
              checkDto.resource,
              checkDto.action,
              checkDto.scope,
            );
            if (rolePermission.isGranted) {
              result.isAllowed = true;
              result.grantedBy?.push(...rolePermission.roles);
            }
          }
        },
        async () => {
          throw PermissionException.dbError('permission_check', 'Circuit breaker open');
        },
      );
      
      const dbCheckDuration = Date.now() - dbCheckStartTime;
      this.metricsService.recordDbQueryDuration('check_permission', dbCheckDuration);

      // Cache the result
      await this.circuitBreaker.executeWithBreaker(
        'cache',
        async () => {
          await this.cacheService.cachePermissionCheck(
            checkDto.userId,
            checkDto.resource,
            checkDto.action,
            checkDto.scope,
            checkDto.resourceId,
            result.isAllowed,
          );
        },
        async () => {
          this.logger.warn('Failed to cache permission result');
        },
      );

      if (!result.isAllowed && !result.reason) {
        result.reason = 'No permission granted';
      }

      result.checkDuration = Date.now() - startTime;
      
      // Record metrics
      this.metricsService.recordCheckDuration(
        checkDto.resource,
        checkDto.action,
        result.checkDuration,
        'database',
      );
      
      this.metricsService.recordPermissionCheck(
        checkDto.resource,
        checkDto.action,
        checkDto.scope,
        result.isAllowed,
      );
      
      await this.logPermissionCheck(checkDto, result);
      return result;
    } catch (error) {
      result.isAllowed = false;
      result.reason = error.message || 'Permission check failed';
      result.checkDuration = Date.now() - startTime;
      await this.logPermissionCheck(checkDto, result);
      throw error;
    }
  }

  /**
   * Performs batch permission checks for multiple permissions.
   * 
   * Optimization strategies:
   * - Pre-fetches all permissions in a single query to avoid N+1
   * - Utilizes permission matrix and cache for each check
   * - Processes up to 100 permissions per batch
   * 
   * @param batchDto - Contains userId and array of permission checks
   * @returns Aggregated results with statistics and cache hit rate
   * @throws BadRequestException if batch size exceeds 100
   * 
   * @example
   * const results = await permissionService.batchCheckPermissions({
   *   userId: 'user-123',
   *   permissions: [
   *     { resource: 'user', action: 'CREATE', scope: 'OWN' },
   *     { resource: 'role', action: 'UPDATE', scope: 'ALL' }
   *   ]
   * });
   */
  async batchCheckPermissions(
    batchDto: BatchCheckPermissionDto,
  ): Promise<BatchPermissionCheckResultDto> {
    const startTime = Date.now();
    const results: Record<string, {
      isAllowed: boolean;
      reason?: string;
      grantedBy?: string[];
    }> = {};
    let cacheHits = 0;
    
    // Check batch size limit
    if (batchDto.permissions.length > 100) {
      throw new BadRequestException('Batch size exceeds maximum limit of 100');
    }
    
    // Pre-fetch all permissions in a single query to avoid N+1
    const permissionConditions = batchDto.permissions.map(p => ({
      resource: p.resource,
      action: p.action,
      scope: p.scope || null,
    }));
    
    const permissions = await this.prisma.permission.findMany({
      where: {
        OR: permissionConditions,
      },
      include: {
        userPermissions: {
          where: {
            userProfileId: batchDto.userId,
            OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
            validFrom: { lte: new Date() },
          },
        },
        rolePermissions: {
          where: {
            OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
            validFrom: { lte: new Date() },
          },
          include: {
            role: {
              include: {
                userRoles: {
                  where: {
                    userProfileId: batchDto.userId,
                    isActive: true,
                    OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
                    validFrom: { lte: new Date() },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Create a map for quick lookup
    const permissionMap = new Map<string, typeof permissions[0]>();
    permissions.forEach(p => {
      const key = `${p.resource}:${p.action}:${p.scope || 'null'}`;
      permissionMap.set(key, p);
    });

    // Track user activity for matrix computation
    await this.matrixService.trackUserActivity(batchDto.userId);

    // Check each permission
    for (const checkItem of batchDto.permissions) {
      const key = `${checkItem.resource}:${checkItem.action}:${checkItem.scope || 'null'}`;
      
      // Check permission matrix first (fastest)
      if (!checkItem.resourceId) {
        const matrixEntry = await this.matrixService.getFromMatrix(
          batchDto.userId,
          checkItem.resource,
          checkItem.action,
          checkItem.scope,
        );
        
        if (matrixEntry) {
          results[key] = {
            isAllowed: matrixEntry.isAllowed,
            grantedBy: matrixEntry.grantedBy,
          };
          cacheHits++;
          continue;
        }
      }
      
      // Check cache second
      const cached = await this.cacheService.getCachedPermissionCheck(
        batchDto.userId,
        checkItem.resource,
        checkItem.action,
        checkItem.scope,
        checkItem.resourceId,
      );
      
      if (cached !== null) {
        results[key] = {
          isAllowed: cached.isAllowed,
          grantedBy: cached.isAllowed ? ['cache'] : undefined,
        };
        cacheHits++;
        continue;
      }

      // Process permission from pre-fetched data
      const permission = permissionMap.get(key);
      let isAllowed = false;
      const grantedBy: string[] = [];
      let reason: string | undefined;

      if (permission) {
        // Check resource-specific permissions if needed
        if (checkItem.resourceId) {
          const resourcePermission = await this.checkResourcePermission(
            batchDto.userId,
            checkItem.resource,
            checkItem.action,
            checkItem.resourceId,
          );
          if (resourcePermission.isGranted) {
            isAllowed = true;
            grantedBy.push('resource-specific');
          }
        }

        // Check direct user permissions
        const userPermission = permission.userPermissions[0];
        if (userPermission) {
          if (userPermission.isGranted) {
            isAllowed = true;
            grantedBy.push('direct-user-permission');
          } else {
            isAllowed = false;
            reason = 'Explicitly denied by user permission';
          }
        }

        // Check role-based permissions if not explicitly denied
        if (!userPermission || userPermission.isGranted !== false) {
          for (const rolePermission of permission.rolePermissions) {
            if (rolePermission.role.userRoles.length > 0 && rolePermission.isGranted) {
              isAllowed = true;
              grantedBy.push(rolePermission.role.name);
            }
          }
        }
      }

      if (!isAllowed && !reason) {
        reason = 'No permission granted';
      }

      results[key] = {
        isAllowed,
        reason,
        grantedBy: grantedBy.length > 0 ? grantedBy : undefined,
      };

      // Cache the result
      await this.cacheService.cachePermissionCheck(
        batchDto.userId,
        checkItem.resource,
        checkItem.action,
        checkItem.scope,
        checkItem.resourceId,
        isAllowed,
      );
    }

    const totalAllowed = Object.values(results).filter(r => r.isAllowed).length;
    const totalDuration = Date.now() - startTime;
    
    // Record batch metrics
    this.metricsService.recordBatchCheck(
      batchDto.permissions.length,
      totalDuration,
      cacheHits,
    );

    return {
      results,
      totalDuration,
      totalChecked: batchDto.permissions.length,
      totalAllowed,
      cacheHits,
    };
  }

  // Private helper methods
  private async createDependencies(
    tx: Prisma.TransactionClient,
    permissionId: string,
    dependencyIds: string[],
  ): Promise<void> {
    const dependencies = dependencyIds.map((depId) => ({
      id: uuidv7(),
      permissionId,
      dependsOnId: depId,
      isRequired: true,
    }));

    await tx.permissionDependency.createMany({
      data: dependencies,
    });
  }

  /**
   * Checks direct user permissions.
   * 
   * Business rules:
   * - Direct user permissions have highest priority
   * - Explicit denials (isGranted: false) override any role permissions
   * - Checks validity period (validFrom/validUntil)
   * - Orders by priority (highest first)
   * 
   * @private
   */
  private async checkUserPermission(
    userId: string,
    resource: string,
    action: PermissionAction,
    scope?: PermissionScope,
  ): Promise<{ isGranted: boolean; isDenied: boolean }> {
    const permission = await this.prisma.permission.findFirst({
      where: {
        resource,
        action,
        scope: scope || null,
      },
    });

    if (!permission) {
      return { isGranted: false, isDenied: false };
    }

    const userPermission = await this.prisma.userPermission.findFirst({
      where: {
        userProfileId: userId,
        permissionId: permission.id,
        isGranted: true,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        validFrom: { lte: new Date() },
      },
      orderBy: { priority: 'desc' },
    });

    if (!userPermission) {
      return { isGranted: false, isDenied: false };
    }

    return {
      isGranted: userPermission.isGranted,
      isDenied: !userPermission.isGranted,
    };
  }

  /**
   * Checks role-based permissions.
   * 
   * Business rules:
   * - Only checks active user-role assignments
   * - Respects role validity periods
   * - Aggregates permissions from all assigned roles
   * - Returns list of granting roles for audit trail
   * 
   * @private
   */
  private async checkRolePermission(
    userId: string,
    resource: string,
    action: PermissionAction,
    scope?: PermissionScope,
  ): Promise<{ isGranted: boolean; roles: string[] }> {
    const permission = await this.prisma.permission.findFirst({
      where: {
        resource,
        action,
        scope: scope || null,
      },
    });

    if (!permission) {
      return { isGranted: false, roles: [] };
    }

    // Get user's active roles
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userProfileId: userId,
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        validFrom: { lte: new Date() },
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              where: {
                permissionId: permission.id,
                OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
                validFrom: { lte: new Date() },
              },
            },
          },
        },
      },
    });

    const grantingRoles: string[] = [];
    let isGranted = false;

    for (const userRole of userRoles) {
      const rolePermission = userRole.role.rolePermissions[0];
      if (rolePermission?.isGranted) {
        isGranted = true;
        grantingRoles.push(userRole.role.name);
      }
    }

    return { isGranted, roles: grantingRoles };
  }

  /**
   * Checks resource-specific permissions.
   * 
   * Business rules:
   * - Grants permission for specific resource instances
   * - Useful for document-level or record-level access control
   * - Checks validity period
   * - Resource permissions are additive to general permissions
   * 
   * @private
   */
  private async checkResourcePermission(
    userId: string,
    resource: string,
    action: PermissionAction,
    resourceId: string,
  ): Promise<{ isGranted: boolean }> {
    const permission = await this.prisma.permission.findFirst({
      where: {
        resource,
        action,
      },
    });

    if (!permission) {
      return { isGranted: false };
    }

    const resourcePermission = await this.prisma.resourcePermission.findFirst({
      where: {
        userProfileId: userId,
        permissionId: permission.id,
        resourceType: resource,
        resourceId,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        validFrom: { lte: new Date() },
      },
    });

    return { isGranted: resourcePermission?.isGranted || false };
  }

  // Old database cache methods removed - now using Redis-based cache service

  /**
   * Invalidates permission cache for all affected users and roles.
   * 
   * Cache invalidation strategy:
   * - Finds all users with direct permission assignments
   * - Finds all users with role-based permission assignments
   * - Invalidates Redis cache for each affected user
   * - Invalidates permission matrix for each affected user
   * - Tracks metrics for cache invalidation
   * 
   * @private
   */
  private async invalidatePermissionCache(permissionId: string): Promise<void> {
    const invalidationStartTime = Date.now();
    
    try {
      await this.circuitBreaker.executeWithBreaker(
        'database',
        async () => {
          // Find all users affected by this permission change
          const affectedUsers = await this.prisma.$queryRaw<
            { userProfileId: string }[]
          >`
            SELECT DISTINCT user_profile_id as "userProfileId"
            FROM gloria_ops.user_permissions 
            WHERE permission_id = ${permissionId}
            UNION
            SELECT DISTINCT ur.user_profile_id as "userProfileId"
            FROM gloria_ops.user_roles ur
            JOIN gloria_ops.role_permissions rp ON ur.role_id = rp.role_id
            WHERE rp.permission_id = ${permissionId}
          `;

          // Invalidate Redis cache and permission matrix for all affected users
          if (affectedUsers.length > 0) {
            await Promise.all(
              affectedUsers.map(async (u) => {
                await this.cacheService.invalidateUserCache(u.userProfileId);
                await this.matrixService.invalidateUserMatrix(u.userProfileId);
              }),
            );
            
            this.metricsService.recordCacheInvalidation(
              'permission_update',
              affectedUsers.length,
            );
          }

          // Also find affected roles and invalidate their cache
          const affectedRoles = await this.prisma.$queryRaw<{ roleId: string }[]>`
            SELECT DISTINCT role_id as "roleId"
            FROM gloria_ops.role_permissions
            WHERE permission_id = ${permissionId}
          `;

          if (affectedRoles.length > 0) {
            await Promise.all(
              affectedRoles.map((r) =>
                this.cacheService.invalidateRoleCache(r.roleId),
              ),
            );
            
            this.metricsService.recordCacheInvalidation(
              'role_update',
              affectedRoles.length,
            );
          }
        },
        async () => {
          this.logger.error(
            `Failed to invalidate cache for permission ${permissionId}`,
          );
          throw PermissionException.cacheError(
            'invalidation',
            'Circuit breaker open',
          );
        },
      );
      
      const duration = Date.now() - invalidationStartTime;
      this.metricsService.recordDbQueryDuration('invalidate_cache', duration);
    } catch (error) {
      this.metricsService.recordDbError('invalidate_cache', 'query');
      throw error;
    }
  }

  private async logPermissionCheck(
    checkDto: CheckPermissionDto,
    result: PermissionCheckResultDto,
  ): Promise<void> {
    await this.prisma.permissionCheckLog.create({
      data: {
        id: uuidv7(),
        userProfileId: checkDto.userId,
        resource: checkDto.resource,
        action: checkDto.action.toString(),
        scope: checkDto.scope?.toString(),
        resourceId: checkDto.resourceId,
        isAllowed: result.isAllowed,
        deniedReason: result.reason,
        checkDuration: result.checkDuration || 0,
        metadata: {
          grantedBy: result.grantedBy,
        },
      },
    });
  }
}
