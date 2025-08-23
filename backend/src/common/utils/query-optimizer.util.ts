import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Query Optimizer Utility
 * Provides methods for optimizing database queries with projection, pagination, and batch loading
 */
@Injectable()
export class QueryOptimizer {
  /**
   * Create optimized select object for Module queries
   * Reduces data transfer by only selecting required fields
   */
  static getModuleSelect(includeRelations = false): Prisma.ModuleSelect {
    const baseSelect = {
      id: true,
      code: true,
      name: true,
      description: true,
      category: true,
      icon: true,
      path: true,
      parentId: true,
      sortOrder: true,
      isActive: true,
      isVisible: true,
      requiredPlan: true,
      createdAt: true,
      updatedAt: true,
    };

    if (includeRelations) {
      return {
        ...baseSelect,
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
            icon: true,
            path: true,
          },
        },
        children: {
          select: {
            id: true,
            code: true,
            name: true,
            icon: true,
            path: true,
            sortOrder: true,
            isActive: true,
            isVisible: true,
          },
          where: {
            isActive: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        _count: {
          select: {
            children: true,
            roleAccess: true,
            userAccess: true,
          },
        },
      };
    }

    return baseSelect;
  }

  /**
   * Create optimized select for RoleModuleAccess queries
   */
  static getRoleModuleAccessSelect(
    includeRelations = false,
  ): Prisma.RoleModuleAccessSelect {
    const baseSelect = {
      id: true,
      roleId: true,
      moduleId: true,
      positionId: true,
      permissions: true,
      isActive: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
    };

    if (includeRelations) {
      return {
        ...baseSelect,
        role: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        module: {
          select: QueryOptimizer.getModuleSelect(false),
        },
        position: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      };
    }

    return baseSelect;
  }

  /**
   * Create optimized select for UserModuleAccess queries
   */
  static getUserModuleAccessSelect(
    includeRelations = false,
  ): Prisma.UserModuleAccessSelect {
    const baseSelect = {
      id: true,
      userProfileId: true,
      moduleId: true,
      permissions: true,
      validFrom: true,
      validUntil: true,
      isActive: true,
      grantedBy: true,
      createdAt: true,
      updatedAt: true,
    };

    if (includeRelations) {
      return {
        ...baseSelect,
        userProfile: {
          select: {
            id: true,
            clerkUserId: true,
          },
        },
        module: {
          select: QueryOptimizer.getModuleSelect(false),
        },
      };
    }

    return baseSelect;
  }

  /**
   * Create pagination options for queries
   */
  static getPaginationOptions(
    page = 1,
    limit = 20,
    maxLimit = 100,
  ): { skip: number; take: number } {
    const validatedLimit = Math.min(limit, maxLimit);
    const validatedPage = Math.max(1, page);

    return {
      skip: (validatedPage - 1) * validatedLimit,
      take: validatedLimit,
    };
  }

  /**
   * Create cursor-based pagination for large datasets
   */
  static getCursorPaginationOptions(
    cursor?: string,
    limit = 20,
  ): {
    take: number;
    skip?: number;
    cursor?: { id: string };
  } {
    const options: any = {
      take: limit,
    };

    if (cursor) {
      options.skip = 1; // Skip the cursor item
      options.cursor = { id: cursor };
    }

    return options;
  }

  /**
   * Batch load related data to avoid N+1 queries
   * Uses dataloader pattern for efficient batch loading
   */
  static async batchLoadRelations<T>(
    items: T[],
    relationKey: keyof T,
    loadFunction: (ids: string[]) => Promise<any[]>,
    idKey = 'id',
  ): Promise<T[]> {
    const ids = items
      .map((item) => item[relationKey] as any)
      .filter((id) => id != null);

    if (ids.length === 0) {
      return items;
    }

    const uniqueIds = [...new Set(ids)];
    const relatedData = await loadFunction(uniqueIds);
    const dataMap = new Map(relatedData.map((data) => [data[idKey], data]));

    return items.map((item) => {
      const relationId = item[relationKey] as any;
      if (relationId && dataMap.has(relationId)) {
        (item as any)[`${String(relationKey)}Data`] = dataMap.get(relationId);
      }
      return item;
    });
  }

  /**
   * Create optimized query for getUserAccessibleModules
   * Avoids N+1 queries by using proper joins and selections
   */
  static getUserAccessibleModulesQuery(
    userProfileId: string,
    roleIds: string[],
  ): Prisma.ModuleFindManyArgs {
    return {
      where: {
        isActive: true,
        OR: [
          // Modules accessible through roles
          {
            roleAccess: {
              some: {
                roleId: { in: roleIds },
                isActive: true,
              },
            },
          },
          // Modules accessible through direct user access
          {
            userAccess: {
              some: {
                userProfileId,
                isActive: true,
                OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
              },
            },
          },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        category: true,
        icon: true,
        path: true,
        parentId: true,
        sortOrder: true,
        isActive: true,
        isVisible: true,
        requiredPlan: true,
        // Include aggregated permission data
        roleAccess: {
          where: {
            roleId: { in: roleIds },
            isActive: true,
          },
          select: {
            permissions: true,
          },
        },
        userAccess: {
          where: {
            userProfileId,
            isActive: true,
            OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
          },
          select: {
            permissions: true,
          },
        },
        // Include parent info for hierarchy
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        // Count children for UI indicators
        _count: {
          select: {
            children: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    };
  }

  /**
   * Create query with proper joins to avoid N+1
   */
  static createOptimizedQuery<T>(
    baseQuery: any,
    options: {
      includeCount?: boolean;
      includeRelations?: string[];
      selectFields?: string[];
      pagination?: { page: number; limit: number };
    } = {},
  ): any {
    const query = { ...baseQuery };

    // Add field selection if specified
    if (options.selectFields && options.selectFields.length > 0) {
      query.select = options.selectFields.reduce((acc, field) => {
        acc[field] = true;
        return acc;
      }, {} as any);
    }

    // Add relation includes with minimal fields
    if (options.includeRelations && options.includeRelations.length > 0) {
      if (!query.select) {
        query.include = {};
      }

      options.includeRelations.forEach((relation) => {
        if (query.select) {
          query.select[relation] = {
            select: {
              id: true,
              name: true,
              code: true,
            },
          };
        } else {
          query.include[relation] = {
            select: {
              id: true,
              name: true,
              code: true,
            },
          };
        }
      });
    }

    // Add count if requested
    if (options.includeCount) {
      query._count = true;
    }

    // Add pagination
    if (options.pagination) {
      const paginationOptions = QueryOptimizer.getPaginationOptions(
        options.pagination.page,
        options.pagination.limit,
      );
      query.skip = paginationOptions.skip;
      query.take = paginationOptions.take;
    }

    return query;
  }
}
