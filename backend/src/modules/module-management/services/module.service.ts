import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateModuleDto,
  UpdateModuleDto,
  ModuleResponseDto,
  ModuleCategory,
} from '../dto/module.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ModuleService {
  private readonly logger = new Logger(ModuleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new module
   */
  async create(data: CreateModuleDto): Promise<ModuleResponseDto> {
    // Check if module code already exists
    const existingModule = await this.prisma.module.findUnique({
      where: { code: data.code },
    });

    if (existingModule) {
      throw new ConflictException(`Module with code ${data.code} already exists`);
    }

    // Validate parent module if provided
    if (data.parentId) {
      const parentModule = await this.prisma.module.findUnique({
        where: { id: data.parentId },
      });

      if (!parentModule) {
        throw new NotFoundException(`Parent module with ID ${data.parentId} not found`);
      }
    }

    try {
      const module = await this.prisma.module.create({
        data: {
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
        } as any,
        include: {
          parent: true,
          children: true,
        },
      });

      this.logger.log(`Module created: ${module.code}`);
      return module;
    } catch (error) {
      this.logger.error(`Error creating module: ${error.message}`);
      throw error;
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
  }): Promise<ModuleResponseDto[]> {
    const where: Prisma.ModuleWhereInput = {};

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params?.category) {
      where.category = params.category as any;
    }

    if (params?.parentId !== undefined) {
      where.parentId = params.parentId === 'null' ? null : params.parentId;
    }

    if (params?.isVisible !== undefined) {
      where.isVisible = params.isVisible;
    }

    const modules = await this.prisma.module.findMany({
      where,
      include: {
        parent: true,
        children: params?.includeChildren ? {
          include: {
            children: true,
          },
        } : false,
        permissions: true,
      },
      orderBy: [
        { parentId: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return modules;
  }

  /**
   * Find module by ID
   */
  async findOne(id: string): Promise<ModuleResponseDto> {
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          include: {
            children: true,
          },
        },
        permissions: true,
        roleAccess: true,
        userAccess: true,
      },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID ${id} not found`);
    }

    return module;
  }

  /**
   * Find module by code
   */
  async findByCode(code: string): Promise<ModuleResponseDto> {
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

    return module;
  }

  /**
   * Update module
   */
  async update(id: string, data: UpdateModuleDto): Promise<ModuleResponseDto> {
    // Check if module exists
    const existingModule = await this.prisma.module.findUnique({
      where: { id },
    });

    if (!existingModule) {
      throw new NotFoundException(`Module with ID ${id} not found`);
    }

    // Validate parent module if changing
    if (data.parentId !== undefined && data.parentId !== existingModule.parentId) {
      if (data.parentId) {
        const parentModule = await this.prisma.module.findUnique({
          where: { id: data.parentId },
        });

        if (!parentModule) {
          throw new NotFoundException(`Parent module with ID ${data.parentId} not found`);
        }

        // Prevent circular dependencies
        if (await this.wouldCreateCircularDependency(id, data.parentId)) {
          throw new BadRequestException('Cannot set parent: would create circular dependency');
        }
      }
    }

    try {
      const module = await this.prisma.module.update({
        where: { id },
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
        },
        include: {
          parent: true,
          children: true,
        },
      });

      this.logger.log(`Module updated: ${module.code}`);
      return module;
    } catch (error) {
      this.logger.error(`Error updating module: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete module
   */
  async remove(id: string): Promise<void> {
    // Check if module exists
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: {
        children: true,
        roleAccess: true,
        userAccess: true,
      },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID ${id} not found`);
    }

    // Check if module has children
    if (module.children.length > 0) {
      throw new BadRequestException('Cannot delete module with children. Delete children first.');
    }

    // Check if module has access rules
    if (module.roleAccess.length > 0 || module.userAccess.length > 0) {
      throw new BadRequestException('Cannot delete module with active access rules. Remove access rules first.');
    }

    try {
      await this.prisma.module.delete({
        where: { id },
      });

      this.logger.log(`Module deleted: ${module.code}`);
    } catch (error) {
      this.logger.error(`Error deleting module: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get module hierarchy tree
   */
  async getModuleTree(): Promise<ModuleResponseDto[]> {
    const modules = await this.prisma.module.findMany({
      where: {
        parentId: null,
        isActive: true,
      },
      include: {
        children: {
          where: {
            isActive: true,
          },
          include: {
            children: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return modules;
  }

  /**
   * Get modules accessible by user
   */
  async getUserAccessibleModules(userProfileId: string): Promise<ModuleResponseDto[]> {
    // Get user's roles
    const userRoles = await this.prisma.userRole.findMany({
      where: { userProfileId },
      select: { roleId: true },
    });

    const roleIds = userRoles.map(ur => ur.roleId);

    // Get modules accessible through roles and direct user access
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
                OR: [
                  { validUntil: null },
                  { validUntil: { gte: new Date() } },
                ],
              },
            },
          },
          {
            overrides: {
              some: {
                userProfileId,
                isGranted: true,
                OR: [
                  { validUntil: null },
                  { validUntil: { gte: new Date() } },
                ],
              },
            },
          },
        ],
      },
      include: {
        parent: true,
        children: true,
      },
      orderBy: [
        { parentId: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    // Filter out modules with active REVOKE overrides
    const revokedModuleIds = await this.prisma.userOverride.findMany({
      where: {
        userProfileId,
        isGranted: false,
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } },
        ],
      },
      select: { moduleId: true },
    });

    const revokedIds = new Set(revokedModuleIds.map(o => o.moduleId));
    
    return modules.filter(m => !revokedIds.has(m.id));
  }

  /**
   * Check if setting a parent would create circular dependency
   */
  private async wouldCreateCircularDependency(
    moduleId: string,
    parentId: string,
  ): Promise<boolean> {
    if (moduleId === parentId) {
      return true;
    }

    const parent = await this.prisma.module.findUnique({
      where: { id: parentId },
      select: { parentId: true },
    });

    if (!parent || !parent.parentId) {
      return false;
    }

    return this.wouldCreateCircularDependency(moduleId, parent.parentId);
  }

  /**
   * Reorder modules
   */
  async reorderModules(
    modules: Array<{ id: string; sortOrder: number }>,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(
        modules.map(module =>
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