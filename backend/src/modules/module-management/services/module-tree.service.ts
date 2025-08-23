import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ModuleCategory, Prisma } from '@prisma/client';
import { QueryOptimizer } from '../../../common/utils/query-optimizer.util';
import {
  Module,
  ModuleWithRelations,
  ModuleTreeNode,
} from '../interfaces/module-management.interface';

/**
 * Service for handling module tree and hierarchy operations
 */
@Injectable()
export class ModuleTreeService {
  private readonly logger = new Logger(ModuleTreeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get complete module hierarchy tree
   * @param options Filter options for the tree
   * @returns Array of root modules with nested children
   */
  async getModuleTree(options?: {
    isActive?: boolean;
    isVisible?: boolean;
    category?: ModuleCategory;
    includePermissions?: boolean;
  }): Promise<ModuleTreeNode[]> {
    const where: Prisma.ModuleWhereInput = {
      parentId: null,
    };

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    if (options?.isVisible !== undefined) {
      where.isVisible = options.isVisible;
    }

    if (options?.category) {
      where.category = options.category;
    }

    // Build recursive include for tree structure
    const include = this.buildTreeInclude(3, options); // Max depth of 3 levels

    const rootModules = await this.prisma.module.findMany({
      where,
      include,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return this.transformToTreeNodes(rootModules, 0);
  }

  /**
   * Get module tree for a specific user with access information
   * @param userProfileId User profile ID
   * @param options Filter options
   * @returns Module tree with access indicators
   */
  async getUserModuleTree(
    userProfileId: string,
    options?: {
      isActive?: boolean;
      isVisible?: boolean;
      includePermissions?: boolean;
    },
  ): Promise<ModuleTreeNode[]> {
    // Get user's accessible modules
    const accessibleModuleIds =
      await this.getUserAccessibleModuleIds(userProfileId);

    // Get the tree structure
    const tree = await this.getModuleTree(options);

    // Mark accessible modules in the tree
    return this.markAccessibleNodes(tree, accessibleModuleIds);
  }

  /**
   * Get flattened list of modules in tree order
   * @param options Filter options
   * @returns Flattened array of modules with level indicators
   */
  async getFlattenedModuleTree(options?: {
    isActive?: boolean;
    isVisible?: boolean;
    category?: ModuleCategory;
  }): Promise<Array<Module & { level: number; hasChildren: boolean }>> {
    const tree = await this.getModuleTree(options);
    return this.flattenTree(tree);
  }

  /**
   * Get ancestors of a module
   * @param moduleId Module ID
   * @returns Array of ancestor modules from root to parent
   */
  async getModuleAncestors(moduleId: string): Promise<Module[]> {
    const ancestors: Module[] = [];
    let currentId: string | null = moduleId;

    while (currentId) {
      const module = await this.prisma.module.findUnique({
        where: { id: currentId },
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
          version: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!module || module.id === moduleId) {
        currentId = module?.parentId || null;
        if (module && module.id !== moduleId) {
          ancestors.unshift(module);
        }
      } else {
        break;
      }
    }

    return ancestors;
  }

  /**
   * Get descendants of a module
   * @param moduleId Module ID
   * @param maxDepth Maximum depth to traverse
   * @returns Array of descendant modules
   */
  async getModuleDescendants(
    moduleId: string,
    maxDepth: number = 10,
  ): Promise<Module[]> {
    const descendants: Module[] = [];
    const queue: Array<{ id: string; depth: number }> = [
      { id: moduleId, depth: 0 },
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;

      if (visited.has(id) || depth >= maxDepth) {
        continue;
      }

      visited.add(id);

      const children = await this.prisma.module.findMany({
        where: { parentId: id },
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
          version: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      descendants.push(...children);

      children.forEach((child) => {
        queue.push({ id: child.id, depth: depth + 1 });
      });
    }

    return descendants;
  }

  /**
   * Get module path (breadcrumb)
   * @param moduleId Module ID
   * @returns Array of module names from root to current
   */
  async getModulePath(moduleId: string): Promise<string[]> {
    const ancestors = await this.getModuleAncestors(moduleId);

    const currentModule = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { name: true },
    });

    const path = ancestors.map((m) => m.name);

    if (currentModule) {
      path.push(currentModule.name);
    }

    return path;
  }

  /**
   * Reorder modules within the same parent
   * @param parentId Parent module ID (null for root)
   * @param orderedIds Array of module IDs in desired order
   */
  async reorderSiblings(
    parentId: string | null,
    orderedIds: string[],
  ): Promise<void> {
    const updates = orderedIds.map((id, index) =>
      this.prisma.module.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );

    await this.prisma.$transaction(updates);

    this.logger.log(
      `Reordered ${orderedIds.length} modules under parent ${parentId || 'root'}`,
    );
  }

  /**
   * Build recursive include for tree queries
   */
  private buildTreeInclude(
    depth: number,
    options?: { includePermissions?: boolean },
  ): any {
    if (depth <= 0) {
      return false;
    }

    const childInclude: any = {
      where: {
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    };

    if (depth > 1) {
      childInclude.include = {
        children: this.buildTreeInclude(depth - 1, options),
      };
    }

    const include: any = {
      children: childInclude,
    };

    if (options?.includePermissions) {
      include.permissions = true;
    }

    return include;
  }

  /**
   * Transform modules to tree nodes
   */
  private transformToTreeNodes(
    modules: any[],
    level: number,
  ): ModuleTreeNode[] {
    return modules.map((module) => ({
      ...module,
      level,
      children: module.children
        ? this.transformToTreeNodes(module.children, level + 1)
        : [],
    }));
  }

  /**
   * Get user's accessible module IDs
   */
  private async getUserAccessibleModuleIds(
    userProfileId: string,
  ): Promise<Set<string>> {
    // Get user roles
    const userRoles = await this.prisma.userRole.findMany({
      where: { userProfileId, isActive: true },
      select: { roleId: true },
    });

    const roleIds = userRoles.map((ur) => ur.roleId);

    // Get accessible modules through roles and direct access
    const modules = await this.prisma.module.findMany({
      where: {
        isActive: true,
        OR: [
          {
            roleAccess: {
              some: {
                roleId: { in: roleIds },
                isActive: true,
              },
            },
          },
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
      select: { id: true },
    });

    return new Set(modules.map((m) => m.id));
  }

  /**
   * Mark accessible nodes in tree
   */
  private markAccessibleNodes(
    nodes: ModuleTreeNode[],
    accessibleIds: Set<string>,
  ): ModuleTreeNode[] {
    return nodes.map((node) => ({
      ...node,
      hasAccess: accessibleIds.has(node.id),
      children: this.markAccessibleNodes(node.children, accessibleIds),
    }));
  }

  /**
   * Flatten a tree structure
   */
  private flattenTree(
    nodes: ModuleTreeNode[],
    result: Array<Module & { level: number; hasChildren: boolean }> = [],
  ): Array<Module & { level: number; hasChildren: boolean }> {
    for (const node of nodes) {
      const { children, level, hasAccess, permissions, ...moduleData } = node;

      result.push({
        ...moduleData,
        level,
        hasChildren: children.length > 0,
      });

      if (children.length > 0) {
        this.flattenTree(children, result);
      }
    }

    return result;
  }
}
