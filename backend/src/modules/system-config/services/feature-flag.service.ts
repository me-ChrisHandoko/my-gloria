import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FeatureFlagDto, UpdateFeatureFlagDto } from '../dto/system-config.dto';
import * as crypto from 'crypto';

export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description?: string;
  allowedGroups?: string[];
  rolloutPercentage?: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private featureFlags: Map<string, FeatureFlag> = new Map();
  private readonly STORAGE_KEY = 'system:feature_flags';

  constructor(private prisma: PrismaService) {
    this.loadFeatureFlags();
  }

  private async loadFeatureFlags(): Promise<void> {
    try {
      // Load from database (using a generic key-value store approach)
      const stored = await this.prisma.$queryRaw<any[]>`
        SELECT value 
        FROM gloria_ops.system_configs 
        WHERE key = ${this.STORAGE_KEY}
        LIMIT 1
      `.catch(() => null);

      if (stored && stored[0]?.value) {
        const flags = JSON.parse(stored[0].value);
        flags.forEach((flag: FeatureFlag) => {
          this.featureFlags.set(flag.name, flag);
        });
        this.logger.log(`Loaded ${this.featureFlags.size} feature flags`);
      }
    } catch (error) {
      this.logger.error('Failed to load feature flags', error);
    }
  }

  private async saveFeatureFlags(): Promise<void> {
    try {
      const flags = Array.from(this.featureFlags.values());
      const value = JSON.stringify(flags);

      await this.prisma.$executeRaw`
        INSERT INTO gloria_ops.system_configs (key, value, category, updated_at)
        VALUES (${this.STORAGE_KEY}, ${value}, 'feature', NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value,
            updated_at = NOW()
      `;
    } catch (error) {
      this.logger.error('Failed to save feature flags', error);
      throw error;
    }
  }

  async createFeatureFlag(dto: FeatureFlagDto): Promise<FeatureFlag> {
    const flag: FeatureFlag = {
      id: crypto.randomUUID(),
      name: dto.name,
      enabled: dto.enabled,
      description: dto.description,
      allowedGroups: dto.allowedGroups,
      rolloutPercentage: dto.rolloutPercentage,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.featureFlags.set(flag.name, flag);
    await this.saveFeatureFlags();

    this.logger.log(`Created feature flag: ${flag.name}`);
    return flag;
  }

  async updateFeatureFlag(
    name: string,
    dto: UpdateFeatureFlagDto,
  ): Promise<FeatureFlag> {
    const flag = this.featureFlags.get(name);
    if (!flag) {
      throw new NotFoundException(`Feature flag '${name}' not found`);
    }

    const updated: FeatureFlag = {
      ...flag,
      ...dto,
      updatedAt: new Date(),
    };

    this.featureFlags.set(name, updated);
    await this.saveFeatureFlags();

    this.logger.log(`Updated feature flag: ${name}`);
    return updated;
  }

  async deleteFeatureFlag(name: string): Promise<void> {
    if (!this.featureFlags.has(name)) {
      throw new NotFoundException(`Feature flag '${name}' not found`);
    }

    this.featureFlags.delete(name);
    await this.saveFeatureFlags();

    this.logger.log(`Deleted feature flag: ${name}`);
  }

  async getFeatureFlag(name: string): Promise<FeatureFlag> {
    const flag = this.featureFlags.get(name);
    if (!flag) {
      throw new NotFoundException(`Feature flag '${name}' not found`);
    }
    return flag;
  }

  async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.featureFlags.values());
  }

  async isFeatureEnabled(
    name: string,
    userId?: string,
    userGroups?: string[],
  ): Promise<boolean> {
    const flag = this.featureFlags.get(name);

    if (!flag) {
      // Default to disabled for unknown features
      return false;
    }

    if (!flag.enabled) {
      return false;
    }

    // Check group restrictions
    if (flag.allowedGroups && flag.allowedGroups.length > 0) {
      if (
        !userGroups ||
        !userGroups.some((group) => flag.allowedGroups?.includes(group))
      ) {
        return false;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
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

  async toggleFeatureFlag(name: string): Promise<FeatureFlag> {
    const flag = this.featureFlags.get(name);
    if (!flag) {
      throw new NotFoundException(`Feature flag '${name}' not found`);
    }

    flag.enabled = !flag.enabled;
    flag.updatedAt = new Date();

    this.featureFlags.set(name, flag);
    await this.saveFeatureFlags();

    this.logger.log(`Toggled feature flag '${name}' to ${flag.enabled}`);
    return flag;
  }

  async getEnabledFeatures(
    userId?: string,
    userGroups?: string[],
  ): Promise<string[]> {
    const enabledFeatures: string[] = [];

    for (const [name, flag] of this.featureFlags.entries()) {
      if (await this.isFeatureEnabled(name, userId, userGroups)) {
        enabledFeatures.push(name);
      }
    }

    return enabledFeatures;
  }
}
