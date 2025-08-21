import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { 
  CreateUserOverrideDto, 
  UserOverrideResponseDto 
} from '../dto/module-access.dto';
import { CacheService } from '../../../cache/cache.service';
import { PermissionAction } from '@prisma/client';

@Injectable()
export class OverrideService {
  private readonly logger = new Logger(OverrideService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Create a user override
   */
  async createOverride(
    data: CreateUserOverrideDto,
    grantedBy: string,
  ): Promise<UserOverrideResponseDto> {
    // Validate user and module exist
    const [userProfile, module] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { id: data.userProfileId } }),
      this.prisma.module.findUnique({ where: { id: data.moduleId } }),
    ]);

    if (!userProfile) {
      throw new NotFoundException(`User profile with ID ${data.userProfileId} not found`);
    }

    if (!module) {
      throw new NotFoundException(`Module with ID ${data.moduleId} not found`);
    }

    // Check if there's an active override for the same permission
    const existingOverride = await this.prisma.userOverride.findFirst({
      where: {
        userProfileId: data.userProfileId,
        moduleId: data.moduleId,
        permissionType: data.permissionType,
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } },
        ],
      },
    });

    if (existingOverride && existingOverride.isGranted === data.isGranted) {
      throw new ConflictException(
        `Active ${data.isGranted ? 'grant' : 'revoke'} override already exists for this permission`,
      );
    }

    try {
      // If there's an opposite override, we can either update it or create a new one
      const override = await this.prisma.userOverride.create({
        data: {
          id: this.generateId(),
          userProfileId: data.userProfileId,
          moduleId: data.moduleId,
          permissionType: data.permissionType,
          isGranted: data.isGranted,
          validFrom: new Date(),
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          reason: data.reason,
          grantedBy,
        },
        include: {
          module: true,
          userProfile: true,
        },
      });

      // Invalidate cache for this user
      await this.invalidateUserCache(data.userProfileId);

      this.logger.log(
        `${data.isGranted ? 'Grant' : 'Revoke'} override created for user ${data.userProfileId} and module ${module.name}`,
      );

      return this.mapToResponseDto(override);
    } catch (error) {
      this.logger.error(`Error creating override: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user overrides
   */
  async getUserOverrides(
    userProfileId: string,
    activeOnly: boolean = true,
  ): Promise<UserOverrideResponseDto[]> {
    const where: any = { userProfileId };

    if (activeOnly) {
      where.OR = [
        { validUntil: null },
        { validUntil: { gte: new Date() } },
      ];
    }

    const overrides = await this.prisma.userOverride.findMany({
      where,
      include: {
        module: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return overrides.map(this.mapToResponseDto);
  }

  /**
   * Get module overrides
   */
  async getModuleOverrides(
    moduleId: string,
    activeOnly: boolean = true,
  ): Promise<UserOverrideResponseDto[]> {
    const where: any = { moduleId };

    if (activeOnly) {
      where.OR = [
        { validUntil: null },
        { validUntil: { gte: new Date() } },
      ];
    }

    const overrides = await this.prisma.userOverride.findMany({
      where,
      include: {
        userProfile: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return overrides.map(this.mapToResponseDto);
  }

  /**
   * Deactivate an override by setting validUntil to now
   */
  async deactivateOverride(overrideId: string): Promise<void> {
    const override = await this.prisma.userOverride.findUnique({
      where: { id: overrideId },
    });

    if (!override) {
      throw new NotFoundException(`Override with ID ${overrideId} not found`);
    }

    // Check if already inactive
    if (override.validUntil && override.validUntil <= new Date()) {
      return; // Already inactive
    }

    try {
      await this.prisma.userOverride.update({
        where: { id: overrideId },
        data: {
          validUntil: new Date(),
        },
      });

      // Invalidate cache for this user
      await this.invalidateUserCache(override.userProfileId);

      this.logger.log(`Override ${overrideId} deactivated`);
    } catch (error) {
      this.logger.error(`Error deactivating override: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extend override expiration
   */
  async extendOverride(
    overrideId: string,
    newValidUntil: Date,
  ): Promise<UserOverrideResponseDto> {
    const override = await this.prisma.userOverride.findUnique({
      where: { id: overrideId },
    });

    if (!override) {
      throw new NotFoundException(`Override with ID ${overrideId} not found`);
    }

    // Check if already expired
    if (override.validUntil && override.validUntil <= new Date()) {
      throw new ConflictException('Cannot extend expired override');
    }

    try {
      const updated = await this.prisma.userOverride.update({
        where: { id: overrideId },
        data: {
          validUntil: newValidUntil,
        },
        include: {
          module: true,
          userProfile: true,
        },
      });

      // Invalidate cache for this user
      await this.invalidateUserCache(override.userProfileId);

      this.logger.log(`Override ${overrideId} extended to ${newValidUntil}`);
      return this.mapToResponseDto(updated);
    } catch (error) {
      this.logger.error(`Error extending override: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get override statistics
   */
  async getOverrideStatistics(): Promise<{
    total: number;
    active: number;
    expired: number;
    grants: number;
    revokes: number;
    byModule: Array<{ moduleId: string; moduleName: string; count: number }>;
    byPermission: Array<{ permission: PermissionAction; count: number }>;
  }> {
    const now = new Date();

    const [total, active, expired, grants, revokes, byModule, byPermission] = await Promise.all([
      // Total overrides
      this.prisma.userOverride.count(),

      // Active overrides
      this.prisma.userOverride.count({
        where: {
          OR: [
            { validUntil: null },
            { validUntil: { gte: now } },
          ],
        },
      }),

      // Expired overrides
      this.prisma.userOverride.count({
        where: {
          validUntil: {
            lt: now,
          },
        },
      }),

      // Grant overrides
      this.prisma.userOverride.count({
        where: {
          isGranted: true,
          OR: [
            { validUntil: null },
            { validUntil: { gte: now } },
          ],
        },
      }),

      // Revoke overrides
      this.prisma.userOverride.count({
        where: {
          isGranted: false,
          OR: [
            { validUntil: null },
            { validUntil: { gte: now } },
          ],
        },
      }),

      // By module
      this.prisma.userOverride.groupBy({
        by: ['moduleId'],
        where: {
          OR: [
            { validUntil: null },
            { validUntil: { gte: now } },
          ],
        },
        _count: {
          _all: true,
        },
      }),

      // By permission type
      this.prisma.userOverride.groupBy({
        by: ['permissionType'],
        where: {
          OR: [
            { validUntil: null },
            { validUntil: { gte: now } },
          ],
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    // Get module names
    const moduleIds = byModule.map(m => m.moduleId);
    const modules = await this.prisma.module.findMany({
      where: {
        id: { in: moduleIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const moduleMap = new Map(modules.map(m => [m.id, m.name]));

    return {
      total,
      active,
      expired,
      grants,
      revokes,
      byModule: byModule.map(m => ({
        moduleId: m.moduleId,
        moduleName: moduleMap.get(m.moduleId) || 'Unknown',
        count: m._count._all,
      })),
      byPermission: byPermission.map(p => ({
        permission: p.permissionType,
        count: p._count._all,
      })),
    };
  }

  /**
   * Invalidate user cache
   */
  private async invalidateUserCache(userProfileId: string): Promise<void> {
    await this.cacheService.del(`module_access:${userProfileId}`);
    
    // Also invalidate specific module permission caches
    const modules = await this.prisma.module.findMany({
      select: { id: true },
    });

    await Promise.all(
      modules.map(module =>
        this.cacheService.del(`module_perm:${userProfileId}:${module.id}`),
      ),
    );
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Map database entity to response DTO
   */
  private mapToResponseDto(entity: any): UserOverrideResponseDto {
    return {
      id: entity.id,
      userProfileId: entity.userProfileId,
      moduleId: entity.moduleId,
      permissionType: entity.permissionType,
      isGranted: entity.isGranted,
      validFrom: entity.validFrom,
      validUntil: entity.validUntil || undefined,
      reason: entity.reason,
      grantedBy: entity.grantedBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      module: entity.module || undefined,
      userProfile: entity.userProfile || undefined,
    };
  }
}