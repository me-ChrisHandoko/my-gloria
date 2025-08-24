import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../../modules/audit/services/audit.service';
import {
  BackupConfigDto,
  BackupStatusDto,
  RestoreBackupDto,
  BackupType,
  BackupStatus,
} from '../dto/system-config.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  SecureDatabaseConnection,
  SecureConnectionConfig,
} from '../utils/secure-db-connection';
import { SecureBackupUtility, BackupOptions } from '../utils/secure-backup';
import { SecureConnectionPool } from '../utils/secure-connection-pool';
import { ValidationUtil } from '../utils/validation.util';
import { RateLimiterUtil } from '../utils/rate-limiter.util';
import { QueueService } from '../../queue/services/queue.service';

interface BackupRecord {
  id: string;
  type: BackupType;
  status: BackupStatus;
  startedAt: Date;
  completedAt?: Date;
  filePath?: string;
  sizeBytes?: number;
  error?: string;
  description?: string;
  metadata?: any;
  createdBy: string;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private backups: Map<string, BackupRecord> = new Map();
  private readonly BACKUP_DIR = process.env.BACKUP_DIR || './backups';
  private readonly STORAGE_KEY = 'system:backups';
  private isBackupInProgress = false;
  private secureDbConnection: SecureDatabaseConnection;
  private secureBackupUtil: SecureBackupUtility;
  private connectionPool: SecureConnectionPool;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private rateLimiter: RateLimiterUtil,
    private queueService: QueueService,
  ) {
    this.secureDbConnection = new SecureDatabaseConnection();
    this.secureBackupUtil = new SecureBackupUtility(this.secureDbConnection);
    this.connectionPool = new SecureConnectionPool(this.secureDbConnection);
    this.initializeBackupDirectory();
    this.loadBackupHistory();
    this.initializeConnectionPool();
  }

  private async initializeConnectionPool(): Promise<void> {
    try {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        this.logger.error('DATABASE_URL not configured');
        return;
      }

      const config = this.parseDbUrl(dbUrl);
      await this.connectionPool.createPool(config, {
        maxConnections: 10,
        minConnections: 2,
        connectionTimeout: 30000,
        idleTimeout: 30000,
        statementTimeout: 300000, // 5 minutes for backup operations
        enableQueryLogging: process.env.NODE_ENV !== 'production',
      });

      this.logger.log('Secure connection pool initialized');
    } catch (error) {
      this.logger.error('Failed to initialize connection pool', error);
    }
  }

  private parseDbUrl(dbUrl: string): SecureConnectionConfig {
    const urlParts = new URL(dbUrl);
    return {
      host: urlParts.hostname,
      port: parseInt(urlParts.port || '5432', 10),
      database: urlParts.pathname.substring(1),
      username: urlParts.username,
      password: decodeURIComponent(urlParts.password || ''),
      ssl: process.env.NODE_ENV === 'production',
    };
  }

  private async initializeBackupDirectory(): Promise<void> {
    try {
      // Validate and resolve backup directory path
      const validatedPath = ValidationUtil.validateBackupDirectory(this.BACKUP_DIR);
      
      await fs.mkdir(validatedPath, { recursive: true });

      // Verify the directory is writable
      await fs.access(validatedPath, fs.constants.W_OK);

      this.logger.log(`Backup directory initialized: ${validatedPath}`);
    } catch (error) {
      this.logger.error('Failed to create backup directory', error);
    }
  }

  private async loadBackupHistory(): Promise<void> {
    try {
      const stored = await this.prisma.systemConfig.findUnique({
        where: { key: this.STORAGE_KEY },
      });

      if (stored?.value) {
        const backups = stored.value as unknown as BackupRecord[];
        backups.forEach((backup: BackupRecord) => {
          this.backups.set(backup.id, backup);
        });
        this.logger.log(`Loaded ${this.backups.size} backup records`);
      }
    } catch (error) {
      this.logger.error('Failed to load backup history', error);
    }
  }

  private async saveBackupHistory(): Promise<void> {
    try {
      const backups = Array.from(this.backups.values());

      await this.prisma.systemConfig.upsert({
        where: { key: this.STORAGE_KEY },
        update: {
          value: backups as unknown as Prisma.InputJsonValue,
          category: 'backup',
          updatedAt: new Date(),
        },
        create: {
          key: this.STORAGE_KEY,
          value: backups as unknown as Prisma.InputJsonValue,
          category: 'backup',
          description: 'Backup records',
        },
      });
    } catch (error) {
      this.logger.error('Failed to save backup history', error);
      throw error;
    }
  }

  async createBackup(
    config: BackupConfigDto,
    userId: string,
  ): Promise<BackupStatusDto> {
    // Check rate limit
    await this.rateLimiter.checkRateLimit(userId, 'backup.create');
    const backupId = crypto.randomUUID();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${config.type}-${timestamp}.sql`;
    
    // Validate file path to prevent path traversal
    const filePath = ValidationUtil.validateFilePath(
      path.join(this.BACKUP_DIR, fileName),
      this.BACKUP_DIR,
    );

    // Validate table names if provided
    const validatedIncludeTables = config.includeTables
      ? ValidationUtil.validateTableNames(config.includeTables)
      : undefined;
    const validatedExcludeTables = config.excludeTables
      ? ValidationUtil.validateTableNames(config.excludeTables)
      : undefined;

    const backupRecord: BackupRecord = {
      id: backupId,
      type: config.type,
      status: BackupStatus.IN_PROGRESS,
      startedAt: new Date(),
      description: config.description,
      metadata: {
        includeTables: validatedIncludeTables,
        excludeTables: validatedExcludeTables,
        compress: config.compress,
        encrypt: config.encrypt,
      },
      createdBy: userId,
    };

    this.backups.set(backupId, backupRecord);
    await this.saveBackupHistory();

    // Audit the backup start
    await this.auditService.log({
      actorId: userId,
      module: 'system-config',
      action: 'CREATE' as any, // backup.create
      entityType: 'system',
      entityId: backupId,
      metadata: {
        type: config.type,
        description: config.description,
      },
    });

    // Add backup job to queue
    try {
      const job = await this.queueService.addBackupJob({
        backupId,
        tables: validatedIncludeTables,
        excludeTables: validatedExcludeTables,
        compression: config.compress,
        userId,
        metadata: {
          type: config.type,
          description: config.description,
          encrypt: config.encrypt,
        },
      });

      // Update backup record with job ID
      backupRecord.metadata = {
        ...backupRecord.metadata,
        jobId: job.id,
      };
      this.backups.set(backupId, backupRecord);
      await this.saveBackupHistory();

      this.logger.log(`Backup job ${job.id} queued for backup ${backupId}`);
    } catch (error) {
      // Update backup status to failed
      backupRecord.status = BackupStatus.FAILED;
      backupRecord.error = error.message;
      this.backups.set(backupId, backupRecord);
      await this.saveBackupHistory();
      
      throw new BadRequestException(`Failed to queue backup: ${error.message}`);
    }

    return this.mapToStatusDto(backupRecord);
  }

  private async executeBackup(
    backupId: string,
    filePath: string,
    config: BackupConfigDto,
  ): Promise<void> {
    const backup = this.backups.get(backupId);
    if (!backup) return;

    try {
      // Get database connection details
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL not configured');
      }

      // Parse connection config securely
      const dbConfig = this.parseDbUrl(dbUrl);

      // Additional validation for file path (double-check)
      const validatedFilePath = ValidationUtil.validateFilePath(
        filePath,
        this.BACKUP_DIR,
      );

      // Build backup options with validated table names
      const backupOptions: BackupOptions = {
        schema: 'gloria_ops',
        includeTables: backup.metadata.includeTables,
        excludeTables: backup.metadata.excludeTables,
        dataOnly: config.type === BackupType.INCREMENTAL,
        schemaOnly: config.type === BackupType.DIFFERENTIAL,
        compress: config.compress || false,
      };

      // Execute backup using secure utility
      this.logger.log(`Executing secure backup for ${backupId}`);
      const result = await this.secureBackupUtil.createBackup(
        dbConfig,
        validatedFilePath,
        backupOptions,
      );

      if (!result.success) {
        throw new Error(result.error || 'Backup failed');
      }

      // Update backup record
      backup.status = BackupStatus.COMPLETED;
      backup.completedAt = new Date();
      backup.filePath = result.filePath;
      backup.sizeBytes = result.sizeBytes;

      this.backups.set(backupId, backup);
      await this.saveBackupHistory();

      // Log connection security status
      const connId =
        this.secureDbConnection.createConnectionIdentifier(dbConfig);
      this.logger.log(
        `Backup ${backupId} completed [${connId}] - Size: ${result.sizeBytes} bytes, Duration: ${result.duration}ms`,
      );

      // Audit successful backup
      await this.auditService.log({
        actorId: backup.createdBy,
        module: 'system-config',
        action: 'CREATE' as any,
        entityType: 'system',
        entityId: backupId,
        metadata: {
          filePath: result.filePath,
          sizeBytes: result.sizeBytes,
          duration: result.duration,
          secure: true,
        },
      });
    } catch (error) {
      // Update backup record with error
      backup.status = BackupStatus.FAILED;
      backup.completedAt = new Date();
      backup.error = error.message;

      this.backups.set(backupId, backup);
      await this.saveBackupHistory();

      // Audit failed backup
      await this.auditService.log({
        actorId: backup.createdBy,
        module: 'system-config',
        action: 'CREATE' as any,
        entityType: 'system',
        entityId: backupId,
        metadata: {
          error: error.message,
        },
      });

      throw error;
    }
  }

  async restoreBackup(dto: RestoreBackupDto, userId: string): Promise<void> {
    // Check rate limit
    await this.rateLimiter.checkRateLimit(userId, 'backup.restore');
    
    const backup = this.backups.get(dto.backupId);
    if (!backup) {
      throw new NotFoundException(`Backup ${dto.backupId} not found`);
    }

    if (backup.status !== BackupStatus.COMPLETED) {
      throw new BadRequestException(`Backup ${dto.backupId} is not completed`);
    }

    if (!backup.filePath) {
      throw new BadRequestException(`Backup ${dto.backupId} has no file path`);
    }

    // Validate backup file path to prevent path traversal
    const validatedBackupPath = ValidationUtil.validateFilePath(
      backup.filePath,
      this.BACKUP_DIR,
    );

    // Check if file exists
    try {
      await fs.access(validatedBackupPath);
    } catch {
      throw new NotFoundException(`Backup file not found: ${backup.filePath}`);
    }

    // Audit restore attempt
    await this.auditService.log({
      actorId: userId,
      module: 'system-config',
      action: 'UPDATE' as any,
      entityType: 'system',
      entityId: dto.backupId,
      metadata: {
        verify: dto.verify,
        pointInTime: dto.pointInTime,
      },
    });

    try {
      // Get database connection details
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL not configured');
      }

      // Parse connection config securely
      const dbConfig = this.parseDbUrl(dbUrl);

      // Execute restore using secure utility
      this.logger.log(`Executing secure restore for backup ${dto.backupId}`);
      const result = await this.secureBackupUtil.restoreBackup(
        dbConfig,
        validatedBackupPath,
        dto.verify || false,
      );

      if (!result.success) {
        throw new Error(result.error || 'Restore failed');
      }

      // Log connection security status
      const connId =
        this.secureDbConnection.createConnectionIdentifier(dbConfig);
      this.logger.log(
        `Backup ${dto.backupId} restored successfully [${connId}] - Duration: ${result.duration}ms`,
      );

      // Audit successful restore
      await this.auditService.log({
        actorId: userId,
        module: 'system-config',
        action: 'UPDATE' as any,
        entityType: 'system',
        entityId: dto.backupId,
        metadata: {
          duration: result.duration,
          secure: true,
        },
      });

      this.logger.log(
        `Backup ${dto.backupId} restored successfully by user ${userId}`,
      );
    } catch (error) {
      // Audit failed restore
      await this.auditService.log({
        actorId: userId,
        module: 'system-config',
        action: 'UPDATE' as any,
        entityType: 'system',
        entityId: dto.backupId,
        metadata: {
          error: error.message,
        },
      });

      throw error;
    }
  }

  async getBackupStatus(backupId: string): Promise<BackupStatusDto> {
    const backup = this.backups.get(backupId);
    if (!backup) {
      throw new NotFoundException(`Backup ${backupId} not found`);
    }

    return this.mapToStatusDto(backup);
  }

  async listBackups(
    type?: BackupType,
    status?: BackupStatus,
  ): Promise<BackupStatusDto[]> {
    let backups = Array.from(this.backups.values());

    if (type) {
      backups = backups.filter((b) => b.type === type);
    }

    if (status) {
      backups = backups.filter((b) => b.status === status);
    }

    // Sort by date, newest first
    backups.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    return backups.map((b) => this.mapToStatusDto(b));
  }

  async deleteBackup(backupId: string, userId: string): Promise<void> {
    // Check rate limit
    await this.rateLimiter.checkRateLimit(userId, 'backup.delete');
    
    const backup = this.backups.get(backupId);
    if (!backup) {
      throw new NotFoundException(`Backup ${backupId} not found`);
    }

    // Delete physical file if exists
    if (backup.filePath) {
      try {
        await fs.unlink(backup.filePath);
        this.logger.log(`Deleted backup file: ${backup.filePath}`);
      } catch (error) {
        this.logger.error(
          `Failed to delete backup file: ${backup.filePath}`,
          error,
        );
      }
    }

    // Remove from records
    this.backups.delete(backupId);
    await this.saveBackupHistory();

    // Audit deletion
    await this.auditService.log({
      actorId: userId,
      module: 'system-config',
      action: 'DELETE' as any, // backup.delete
      entityType: 'system',
      entityId: backupId,
      metadata: {
        filePath: backup.filePath,
        type: backup.type,
      },
    });

    this.logger.log(`Backup ${backupId} deleted by user ${userId}`);
  }

  async cleanupOldBackups(
    daysToKeep: number = 30,
    userId: string,
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const backupsToDelete: string[] = [];

    for (const [id, backup] of this.backups.entries()) {
      if (backup.startedAt < cutoffDate) {
        backupsToDelete.push(id);
      }
    }

    for (const id of backupsToDelete) {
      await this.deleteBackup(id, userId);
    }

    this.logger.log(`Cleaned up ${backupsToDelete.length} old backups`);
    return backupsToDelete.length;
  }

  private mapToStatusDto(backup: BackupRecord): BackupStatusDto {
    return {
      id: backup.id,
      type: backup.type,
      status: backup.status,
      startedAt: backup.startedAt,
      completedAt: backup.completedAt,
      filePath: backup.filePath,
      sizeBytes: backup.sizeBytes,
      error: backup.error,
    };
  }

  /**
   * Gets connection pool health status
   */
  async getConnectionPoolHealth(): Promise<{
    healthy: boolean;
    metrics: any;
    warnings: string[];
  }> {
    try {
      return await this.connectionPool.checkHealth();
    } catch (error) {
      this.logger.error('Failed to get connection pool health', error);
      return {
        healthy: false,
        metrics: null,
        warnings: ['Connection pool health check failed'],
      };
    }
  }

  /**
   * Cleanup method called on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.connectionPool.close();
      this.logger.log('Backup service cleanup completed');
    } catch (error) {
      this.logger.error('Error during backup service cleanup', error);
    }
  }
}
