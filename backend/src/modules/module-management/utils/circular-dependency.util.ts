import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RetryHandler } from './error-recovery.util';

/**
 * Utility service for detecting and preventing circular dependencies in module hierarchy
 */
@Injectable()
export class CircularDependencyChecker {
  private readonly logger = new Logger(CircularDependencyChecker.name);
  private readonly retryHandler: RetryHandler;
  private readonly visitedCache = new Map<string, Set<string>>();

  constructor(private readonly prisma: PrismaService) {
    this.retryHandler = new RetryHandler();
  }

  /**
   * Check if setting a parent would create a circular dependency
   * @param moduleId The module being updated
   * @param parentId The proposed parent module
   * @returns true if this would create a circular dependency
   */
  async wouldCreateCircularDependency(
    moduleId: string,
    parentId: string,
  ): Promise<boolean> {
    // Clear cache for fresh check
    this.visitedCache.clear();

    // Self-reference check
    if (moduleId === parentId) {
      this.logger.warn(
        `Self-reference detected: module ${moduleId} cannot be its own parent`,
      );
      return true;
    }

    try {
      // Build ancestry chain to detect cycles
      const ancestors = await this.getAncestorChain(parentId);

      // Check if the module appears in its proposed parent's ancestry
      if (ancestors.has(moduleId)) {
        this.logger.warn(
          `Circular dependency detected: module ${moduleId} exists in ancestry of ${parentId}`,
        );
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Error checking circular dependency between ${moduleId} and ${parentId}: ${error.message}`,
      );
      // On error, be conservative and prevent the operation
      return true;
    }
  }

  /**
   * Get all ancestors of a module
   * @param moduleId The module to get ancestors for
   * @returns Set of ancestor module IDs
   */
  private async getAncestorChain(moduleId: string): Promise<Set<string>> {
    // Check cache first
    if (this.visitedCache.has(moduleId)) {
      return this.visitedCache.get(moduleId)!;
    }

    const ancestors = new Set<string>();
    let currentId: string | null = moduleId;
    const visitedInChain = new Set<string>();

    while (currentId) {
      // Detect cycles in the current traversal
      if (visitedInChain.has(currentId)) {
        this.logger.warn(
          `Cycle detected in existing hierarchy at module ${currentId}`,
        );
        break;
      }

      visitedInChain.add(currentId);
      ancestors.add(currentId);

      // Fetch parent with retry for resilience
      const module = await this.retryHandler.execute(
        () =>
          this.prisma.module.findUnique({
            where: { id: currentId! },
            select: { parentId: true },
          }),
        'fetchModuleParent',
      );

      currentId = module?.parentId || null;
    }

    // Cache the result
    this.visitedCache.set(moduleId, ancestors);

    return ancestors;
  }

  /**
   * Validate entire module hierarchy for circular dependencies
   * @returns Array of detected circular dependency chains
   */
  async validateHierarchy(): Promise<
    Array<{ chain: string[]; cycle: boolean }>
  > {
    const issues: Array<{ chain: string[]; cycle: boolean }> = [];

    // Get all modules
    const modules = await this.prisma.module.findMany({
      select: { id: true, parentId: true, code: true },
    });

    // Build adjacency list
    const childrenMap = new Map<string, string[]>();
    const moduleMap = new Map<
      string,
      { id: string; parentId: string | null; code: string }
    >();

    modules.forEach((module) => {
      moduleMap.set(module.id, module);
      if (module.parentId) {
        const siblings = childrenMap.get(module.parentId) || [];
        siblings.push(module.id);
        childrenMap.set(module.parentId, siblings);
      }
    });

    // Check each module for cycles
    const globalVisited = new Set<string>();

    for (const module of modules) {
      if (!globalVisited.has(module.id)) {
        const chain: string[] = [];
        const localVisited = new Set<string>();

        if (
          this.detectCycle(
            module.id,
            moduleMap,
            localVisited,
            chain,
            globalVisited,
          )
        ) {
          issues.push({ chain, cycle: true });
        }
      }
    }

    if (issues.length > 0) {
      this.logger.error(
        `Found ${issues.length} circular dependencies in module hierarchy`,
      );
    }

    return issues;
  }

  /**
   * Detect cycles using DFS
   */
  private detectCycle(
    nodeId: string,
    moduleMap: Map<
      string,
      { id: string; parentId: string | null; code: string }
    >,
    localVisited: Set<string>,
    chain: string[],
    globalVisited: Set<string>,
  ): boolean {
    if (localVisited.has(nodeId)) {
      // Found a cycle
      const cycleStart = chain.indexOf(nodeId);
      if (cycleStart !== -1) {
        // Extract the cycle portion
        chain.push(nodeId);
        chain.splice(0, cycleStart);
      }
      return true;
    }

    if (globalVisited.has(nodeId)) {
      return false;
    }

    localVisited.add(nodeId);
    globalVisited.add(nodeId);

    const module = moduleMap.get(nodeId);
    if (module) {
      chain.push(module.code || nodeId);

      if (module.parentId) {
        if (
          this.detectCycle(
            module.parentId,
            moduleMap,
            localVisited,
            chain,
            globalVisited,
          )
        ) {
          return true;
        }
      }
    }

    localVisited.delete(nodeId);

    if (
      chain.length > 0 &&
      chain[chain.length - 1] === (module?.code || nodeId)
    ) {
      chain.pop();
    }

    return false;
  }

  /**
   * Clear the internal cache
   */
  clearCache(): void {
    this.visitedCache.clear();
  }
}
