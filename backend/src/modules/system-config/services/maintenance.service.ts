import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MaintenanceModeDto } from '../dto/system-config.dto';
import { AuditService } from '../../../modules/audit/services/audit.service';

export interface MaintenanceConfig {
  enabled: boolean;
  message?: string;
  estimatedEndTime?: Date;
  allowedIps?: string[];
  allowedRoles?: string[];
  startedAt?: Date;
  startedBy?: string;
}

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);
  private maintenanceConfig: MaintenanceConfig = { enabled: false };
  private readonly STORAGE_KEY = 'system:maintenance_mode';

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {
    this.loadMaintenanceConfig();
  }

  private async loadMaintenanceConfig(): Promise<void> {
    try {
      const stored = await this.prisma.$queryRaw<any[]>`
        SELECT value 
        FROM gloria_ops.system_configs 
        WHERE key = ${this.STORAGE_KEY}
        LIMIT 1
      `.catch(() => null);

      if (stored && stored[0]?.value) {
        this.maintenanceConfig = JSON.parse(stored[0].value);
        this.logger.log(
          `Loaded maintenance config: ${this.maintenanceConfig.enabled ? 'ENABLED' : 'DISABLED'}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to load maintenance config', error);
    }
  }

  private async saveMaintenanceConfig(): Promise<void> {
    try {
      const value = JSON.stringify(this.maintenanceConfig);

      await this.prisma.$executeRaw`
        INSERT INTO gloria_ops.system_configs (key, value, category, updated_at)
        VALUES (${this.STORAGE_KEY}, ${value}, 'maintenance', NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value,
            updated_at = NOW()
      `;
    } catch (error) {
      this.logger.error('Failed to save maintenance config', error);
      throw error;
    }
  }

  async enableMaintenanceMode(
    dto: MaintenanceModeDto,
    userId: string,
  ): Promise<MaintenanceConfig> {
    if (!dto.enabled) {
      return this.disableMaintenanceMode(userId);
    }

    const previousState = { ...this.maintenanceConfig };

    this.maintenanceConfig = {
      enabled: true,
      message:
        dto.message || 'System is under maintenance. Please try again later.',
      estimatedEndTime: dto.estimatedEndTime,
      allowedIps: dto.allowedIps || [],
      allowedRoles: dto.allowedRoles || ['admin', 'super_admin'],
      startedAt: new Date(),
      startedBy: userId,
    };

    await this.saveMaintenanceConfig();

    // Audit the change
    await this.auditService.log({
      actorId: userId,
      module: 'system-config',
      action: 'UPDATE' as any, // maintenance.enable
      entityType: 'system',
      entityId: 'maintenance_mode',
      oldValues: previousState,
      newValues: this.maintenanceConfig,
      metadata: {
        message: dto.message,
        estimatedEndTime: dto.estimatedEndTime,
      },
    });

    this.logger.warn(`Maintenance mode ENABLED by user ${userId}`);
    return this.maintenanceConfig;
  }

  async disableMaintenanceMode(userId: string): Promise<MaintenanceConfig> {
    const previousState = { ...this.maintenanceConfig };

    this.maintenanceConfig = {
      enabled: false,
    };

    await this.saveMaintenanceConfig();

    // Audit the change
    await this.auditService.log({
      actorId: userId,
      module: 'system-config',
      action: 'UPDATE' as any, // maintenance.disable
      entityType: 'system',
      entityId: 'maintenance_mode',
      oldValues: previousState,
      newValues: this.maintenanceConfig,
    });

    this.logger.warn(`Maintenance mode DISABLED by user ${userId}`);
    return this.maintenanceConfig;
  }

  async getMaintenanceStatus(): Promise<MaintenanceConfig> {
    return { ...this.maintenanceConfig };
  }

  async isMaintenanceMode(): Promise<boolean> {
    return this.maintenanceConfig.enabled;
  }

  async checkMaintenanceAccess(
    userIp?: string,
    userRoles?: string[],
  ): Promise<{ allowed: boolean; message?: string }> {
    if (!this.maintenanceConfig.enabled) {
      return { allowed: true };
    }

    // Check IP allowlist
    if (userIp && this.maintenanceConfig.allowedIps?.includes(userIp)) {
      return { allowed: true };
    }

    // Check role allowlist
    if (userRoles && this.maintenanceConfig.allowedRoles) {
      const hasAllowedRole = userRoles.some((role) =>
        this.maintenanceConfig.allowedRoles?.includes(role),
      );
      if (hasAllowedRole) {
        return { allowed: true };
      }
    }

    return {
      allowed: false,
      message: this.maintenanceConfig.message || 'System is under maintenance',
    };
  }

  async enforceMaintenanceMode(
    userIp?: string,
    userRoles?: string[],
  ): Promise<void> {
    const access = await this.checkMaintenanceAccess(userIp, userRoles);

    if (!access.allowed) {
      throw new ForbiddenException({
        statusCode: 503,
        message: access.message,
        estimatedEndTime: this.maintenanceConfig.estimatedEndTime,
      });
    }
  }

  async updateMaintenanceMessage(
    message: string,
    userId: string,
  ): Promise<MaintenanceConfig> {
    if (!this.maintenanceConfig.enabled) {
      throw new Error('Maintenance mode is not enabled');
    }

    const previousMessage = this.maintenanceConfig.message;
    this.maintenanceConfig.message = message;

    await this.saveMaintenanceConfig();

    // Audit the change
    await this.auditService.log({
      actorId: userId,
      module: 'system-config',
      action: 'UPDATE' as any, // maintenance.update_message
      entityType: 'system',
      entityId: 'maintenance_mode',
      oldValues: { message: previousMessage },
      newValues: { message },
    });

    this.logger.log(`Maintenance message updated by user ${userId}`);
    return this.maintenanceConfig;
  }

  async extendMaintenanceTime(
    newEndTime: Date,
    userId: string,
  ): Promise<MaintenanceConfig> {
    if (!this.maintenanceConfig.enabled) {
      throw new Error('Maintenance mode is not enabled');
    }

    const previousEndTime = this.maintenanceConfig.estimatedEndTime;
    this.maintenanceConfig.estimatedEndTime = newEndTime;

    await this.saveMaintenanceConfig();

    // Audit the change
    await this.auditService.log({
      actorId: userId,
      module: 'system-config',
      action: 'UPDATE' as any, // maintenance.extend_time
      entityType: 'system',
      entityId: 'maintenance_mode',
      oldValues: { estimatedEndTime: previousEndTime },
      newValues: { estimatedEndTime: newEndTime },
    });

    this.logger.log(`Maintenance time extended by user ${userId}`);
    return this.maintenanceConfig;
  }

  async getMaintenanceHistory(limit: number = 10): Promise<any[]> {
    try {
      const history = await this.prisma.auditLog.findMany({
        where: {
          entityType: 'system',
          entityId: 'maintenance_mode',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });

      return history.filter((log) => log.action.startsWith('maintenance.'));
    } catch (error) {
      this.logger.error('Failed to get maintenance history', error);
      return [];
    }
  }
}
