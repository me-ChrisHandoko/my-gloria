import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FeatureFlagDto, UpdateFeatureFlagDto } from '../dto/system-config.dto';
import { FeatureFlag as PrismaFeatureFlag, AuditAction } from '@prisma/client';
import { AuditService } from '../../audit/services/audit.service';
import { RateLimiterUtil } from '../utils/rate-limiter.util';
import { ValidationUtil } from '../utils/validation.util';
import * as crypto from 'crypto';

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private rateLimiter: RateLimiterUtil,
  ) {}

  async createFeatureFlag(dto: FeatureFlagDto, createdBy?: string): Promise<PrismaFeatureFlag> {
    // Check rate limit if user is provided
    if (createdBy) {
      await this.rateLimiter.checkRateLimit(createdBy, 'feature-flag.create');
    }
    
    // Validate feature flag name
    const validatedName = ValidationUtil.validateFeatureFlagName(dto.name);
    
    // Validate rollout percentage if provided
    const validatedRolloutPercentage = dto.rolloutPercentage !== undefined
      ? ValidationUtil.validateRolloutPercentage(dto.rolloutPercentage)
      : undefined;
    
    try {
      const flag = await this.prisma.featureFlag.create({
        data: {
          name: validatedName,
          enabled: dto.enabled,
          description: dto.description,
          allowedGroups: dto.allowedGroups,
          rolloutPercentage: validatedRolloutPercentage,
          createdBy,
          updatedBy: createdBy,
        },
      });

      // Audit log
      if (createdBy) {
        await this.auditService.log({
          actorId: createdBy,
          module: 'SystemConfig',
          entityType: 'FeatureFlag',
          entityId: flag.id,
          entityDisplay: flag.name,
          action: AuditAction.CREATE,
          newValues: flag,
          metadata: {
            flagName: flag.name,
            enabled: flag.enabled,
            rolloutPercentage: flag.rolloutPercentage,
          },
        });
      }

      this.logger.log(`Created feature flag: ${flag.name}`);
      return flag;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(`Feature flag '${dto.name}' already exists`);
      }
      throw error;
    }
  }

  async updateFeatureFlag(
    name: string,
    dto: UpdateFeatureFlagDto,
    updatedBy?: string,
  ): Promise<PrismaFeatureFlag> {
    // Check rate limit if user is provided
    if (updatedBy) {
      await this.rateLimiter.checkRateLimit(updatedBy, 'feature-flag.update');
    }
    
    // Validate feature flag name
    ValidationUtil.validateFeatureFlagName(name);
    
    // Validate rollout percentage if provided
    if (dto.rolloutPercentage !== undefined) {
      dto.rolloutPercentage = ValidationUtil.validateRolloutPercentage(dto.rolloutPercentage);
    }
    
    try {
      // Get old values for audit
      const oldFlag = await this.prisma.featureFlag.findUnique({
        where: { name },
      });

      if (!oldFlag) {
        throw new NotFoundException(`Feature flag '${name}' not found`);
      }

      const flag = await this.prisma.featureFlag.update({
        where: { name },
        data: {
          ...dto,
          updatedBy,
        },
      });

      // Audit log
      if (updatedBy) {
        const changedFields: string[] = [];
        if (dto.enabled !== undefined && dto.enabled !== oldFlag.enabled) {
          changedFields.push('enabled');
        }
        if (dto.description !== undefined && dto.description !== oldFlag.description) {
          changedFields.push('description');
        }
        if (dto.allowedGroups !== undefined) {
          changedFields.push('allowedGroups');
        }
        if (dto.rolloutPercentage !== undefined && dto.rolloutPercentage !== oldFlag.rolloutPercentage) {
          changedFields.push('rolloutPercentage');
        }

        await this.auditService.log({
          actorId: updatedBy,
          module: 'SystemConfig',
          entityType: 'FeatureFlag',
          entityId: flag.id,
          entityDisplay: flag.name,
          action: AuditAction.UPDATE,
          oldValues: oldFlag,
          newValues: flag,
          metadata: {
            flagName: flag.name,
            changedFields,
          },
        });
      }

      this.logger.log(`Updated feature flag: ${name}`);
      return flag;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Feature flag '${name}' not found`);
      }
      throw error;
    }
  }

  async deleteFeatureFlag(name: string, deletedBy?: string): Promise<void> {
    // Check rate limit if user is provided
    if (deletedBy) {
      await this.rateLimiter.checkRateLimit(deletedBy, 'feature-flag.delete');
    }
    
    // Validate feature flag name
    ValidationUtil.validateFeatureFlagName(name);
    
    try {
      // Get flag for audit before deletion
      const flag = await this.prisma.featureFlag.findUnique({
        where: { name },
      });
      
      if (!flag) {
        throw new NotFoundException(`Feature flag '${name}' not found`);
      }
      
      await this.prisma.featureFlag.delete({
        where: { name },
      });

      // Audit log
      if (deletedBy) {
        await this.auditService.log({
          actorId: deletedBy,
          module: 'SystemConfig',
          entityType: 'FeatureFlag',
          entityId: flag.id,
          entityDisplay: flag.name,
          action: AuditAction.DELETE,
          oldValues: flag,
          metadata: {
            flagName: flag.name,
          },
        });
      }

      this.logger.log(`Deleted feature flag: ${name}`);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Feature flag '${name}' not found`);
      }
      throw error;
    }
  }

  async getFeatureFlag(name: string): Promise<PrismaFeatureFlag> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { name },
    });

    if (!flag) {
      throw new NotFoundException(`Feature flag '${name}' not found`);
    }

    return flag;
  }

  async getAllFeatureFlags(): Promise<PrismaFeatureFlag[]> {
    return await this.prisma.featureFlag.findMany({
      orderBy: [
        { name: 'asc' },
      ],
    });
  }

  async isFeatureEnabled(
    name: string,
    userId?: string,
    userGroups?: string[],
  ): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { name },
    });

    if (!flag) {
      // Default to disabled for unknown features
      return false;
    }

    if (!flag.enabled) {
      return false;
    }

    // Check group restrictions
    if (flag.allowedGroups && Array.isArray(flag.allowedGroups) && flag.allowedGroups.length > 0) {
      const allowedGroupsArray = flag.allowedGroups as string[];
      if (
        !userGroups ||
        !userGroups.some((group) => allowedGroupsArray.includes(group))
      ) {
        return false;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== null && flag.rolloutPercentage < 100) {
      if (!userId) {
        // No user ID, can't determine rollout
        return false;
      }

      // Use consistent hash to determine if user is in rollout
      const hash = crypto
        .createHash('md5')
        .update(`${name}:${userId}`)
        .digest('hex');
      const hashValue = parseInt(hash.substring(0, 8), 16);
      const userPercentage = (hashValue % 100) + 1;

      return userPercentage <= flag.rolloutPercentage;
    }

    return true;
  }

  async toggleFeatureFlag(name: string, updatedBy?: string): Promise<PrismaFeatureFlag> {
    // Use transaction to ensure atomicity
    return await this.prisma.$transaction(async (tx) => {
      const flag = await tx.featureFlag.findUnique({
        where: { name },
      });

      if (!flag) {
        throw new NotFoundException(`Feature flag '${name}' not found`);
      }

      const updated = await tx.featureFlag.update({
        where: { name },
        data: {
          enabled: !flag.enabled,
          updatedBy,
        },
      });

      this.logger.log(`Toggled feature flag '${name}' to ${updated.enabled}`);
      return updated;
    });
  }

  async getEnabledFeatures(
    userId?: string,
    userGroups?: string[],
  ): Promise<string[]> {
    const allFlags = await this.prisma.featureFlag.findMany({
      where: { enabled: true },
    });

    const enabledFeatures: string[] = [];

    for (const flag of allFlags) {
      if (await this.isFeatureEnabled(flag.name, userId, userGroups)) {
        enabledFeatures.push(flag.name);
      }
    }

    return enabledFeatures;
  }

  // Batch operations with transaction support
  async createFeatureFlagsBatch(dtos: FeatureFlagDto[], createdBy?: string): Promise<PrismaFeatureFlag[]> {
    return await this.prisma.$transaction(async (tx) => {
      const flags = await Promise.all(
        dtos.map((dto) =>
          tx.featureFlag.create({
            data: {
              name: dto.name,
              enabled: dto.enabled,
              description: dto.description,
              allowedGroups: dto.allowedGroups,
              rolloutPercentage: dto.rolloutPercentage,
              createdBy,
              updatedBy: createdBy,
            },
          })
        )
      );

      this.logger.log(`Created ${flags.length} feature flags in batch`);
      return flags;
    });
  }

  // Get feature flags with filtering
  async getFeatureFlagsFiltered(
    enabled?: boolean,
    nameContains?: string,
  ): Promise<PrismaFeatureFlag[]> {
    return await this.prisma.featureFlag.findMany({
      where: {
        ...(enabled !== undefined && { enabled }),
        ...(nameContains && {
          name: {
            contains: nameContains,
            mode: 'insensitive',
          },
        }),
      },
      orderBy: [
        { name: 'asc' },
      ],
    });
  }
}
