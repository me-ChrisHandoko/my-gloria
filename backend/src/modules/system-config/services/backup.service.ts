import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../../modules/audit/services/audit.service';
import {
  BackupConfigDto,
  BackupStatusDto,
  RestoreBackupDto,
  BackupType,
  BackupStatus,
} from '../dto/system-config.dto';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';

const execAsync = promisify(exec);

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

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {
    this.initializeBackupDirectory();
    this.loadBackupHistory();
  }

  private async initializeBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.BACKUP_DIR, { recursive: true });
      this.logger.log(`Backup directory initialized: ${this.BACKUP_DIR}`);
    } catch (error) {
      this.logger.error('Failed to create backup directory', error);
    }
  }

  private async loadBackupHistory(): Promise<void> {
    try {
      const stored = await this.prisma.$queryRaw<any[]>`
        SELECT value 
        FROM gloria_ops.system_configs 
        WHERE key = ${this.STORAGE_KEY}
        LIMIT 1
      `.catch(() => null);

      if (stored && stored[0]?.value) {
        const backups = JSON.parse(stored[0].value);
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
      const value = JSON.stringify(backups);

      await this.prisma.$executeRaw`
        INSERT INTO gloria_ops.system_configs (key, value, category, updated_at)
        VALUES (${this.STORAGE_KEY}, ${value}, 'backup', NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value,
            updated_at = NOW()
      `;
    } catch (error) {
      this.logger.error('Failed to save backup history', error);
      throw error;
    }
  }

  async createBackup(
    config: BackupConfigDto,
    userId: string,
  ): Promise<BackupStatusDto> {
    if (this.isBackupInProgress) {
      throw new BadRequestException('A backup is already in progress');
    }

    this.isBackupInProgress = true;
    const backupId = crypto.randomUUID();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${config.type}-${timestamp}.sql`;
    const filePath = path.join(this.BACKUP_DIR, fileName);

    const backupRecord: BackupRecord = {
      id: backupId,
      type: config.type,
      status: BackupStatus.IN_PROGRESS,
      startedAt: new Date(),
      description: config.description,
      metadata: {
        includeTables: config.includeTables,
        excludeTables: config.excludeTables,
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

    // Execute backup asynchronously
    this.executeBackup(backupId, filePath, config)
      .then(async () => {
        this.logger.log(`Backup ${backupId} completed successfully`);
      })
      .catch(async (error) => {
        this.logger.error(`Backup ${backupId} failed`, error);
      })
      .finally(() => {
        this.isBackupInProgress = false;
      });

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

      // Parse connection string
      const urlParts = new URL(dbUrl);
      const host = urlParts.hostname;
      const port = urlParts.port || '5432';
      const database = urlParts.pathname.substring(1);
      const username = urlParts.username;
      const password = urlParts.password;

      // Build pg_dump command
      let command = `PGPASSWORD=${password} pg_dump`;
      command += ` -h ${host} -p ${port} -U ${username} -d ${database}`;
      command += ` -f ${filePath}`;
      command += ' --schema=gloria_ops'; // Only backup gloria_ops schema

      // Add type-specific options
      if (config.type === BackupType.INCREMENTAL) {
        command += ' --data-only';
      } else if (config.type === BackupType.DIFFERENTIAL) {
        command += ' --schema-only';
      }

      // Add table filters
      if (config.includeTables && config.includeTables.length > 0) {
        config.includeTables.forEach((table) => {
          command += ` -t gloria_ops.${table}`;
        });
      }

      if (config.excludeTables && config.excludeTables.length > 0) {
        config.excludeTables.forEach((table) => {
          command += ` -T gloria_ops.${table}`;
        });
      }

      // Execute backup
      this.logger.log(`Executing backup command for ${backupId}`);
      await execAsync(command);

      // Get file stats
      const stats = await fs.stat(filePath);
      let finalPath = filePath;
      let finalSize = stats.size;

      // Compress if requested
      if (config.compress) {
        const compressedPath = `${filePath}.gz`;
        await pipeline(
          createReadStream(filePath),
          zlib.createGzip(),
          createWriteStream(compressedPath),
        );

        // Remove uncompressed file
        await fs.unlink(filePath);
        finalPath = compressedPath;

        const compressedStats = await fs.stat(compressedPath);
        finalSize = compressedStats.size;

        this.logger.log(
          `Backup ${backupId} compressed from ${stats.size} to ${finalSize} bytes`,
        );
      }

      // Update backup record
      backup.status = BackupStatus.COMPLETED;
      backup.completedAt = new Date();
      backup.filePath = finalPath;
      backup.sizeBytes = finalSize;

      this.backups.set(backupId, backup);
      await this.saveBackupHistory();

      // Audit successful backup
      await this.auditService.log({
        actorId: backup.createdBy,
        module: 'system-config',
        action: 'CREATE' as any, // backup.complete
        entityType: 'system',
        entityId: backupId,
        metadata: {
          filePath: finalPath,
          sizeBytes: finalSize,
          duration: backup.completedAt.getTime() - backup.startedAt.getTime(),
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
        action: 'CREATE' as any, // backup.fail
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

    // Check if file exists
    try {
      await fs.access(backup.filePath);
    } catch {
      throw new NotFoundException(`Backup file not found: ${backup.filePath}`);
    }

    // Audit restore attempt
    await this.auditService.log({
      actorId: userId,
      module: 'system-config',
      action: 'UPDATE' as any, // backup.restore_start
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

      const urlParts = new URL(dbUrl);
      const host = urlParts.hostname;
      const port = urlParts.port || '5432';
      const database = urlParts.pathname.substring(1);
      const username = urlParts.username;
      const password = urlParts.password;

      let restoreFile = backup.filePath;

      // Decompress if needed
      if (backup.filePath.endsWith('.gz')) {
        const tempFile = backup.filePath.replace('.gz', '.temp.sql');
        await pipeline(
          createReadStream(backup.filePath),
          zlib.createGunzip(),
          createWriteStream(tempFile),
        );
        restoreFile = tempFile;
      }

      // Verify backup if requested
      if (dto.verify) {
        const verifyCommand = `PGPASSWORD=${password} psql -h ${host} -p ${port} -U ${username} -d ${database} -f ${restoreFile} --dry-run`;
        await execAsync(verifyCommand).catch((error) => {
          throw new BadRequestException(
            `Backup verification failed: ${error.message}`,
          );
        });
      }

      // Execute restore
      const restoreCommand = `PGPASSWORD=${password} psql -h ${host} -p ${port} -U ${username} -d ${database} -f ${restoreFile}`;
      await execAsync(restoreCommand);

      // Clean up temp file if created
      if (restoreFile !== backup.filePath) {
        await fs.unlink(restoreFile);
      }

      // Audit successful restore
      await this.auditService.log({
        actorId: userId,
        module: 'system-config',
        action: 'UPDATE' as any, // backup.restore_complete
        entityType: 'system',
        entityId: dto.backupId,
      });

      this.logger.log(
        `Backup ${dto.backupId} restored successfully by user ${userId}`,
      );
    } catch (error) {
      // Audit failed restore
      await this.auditService.log({
        actorId: userId,
        module: 'system-config',
        action: 'UPDATE' as any, // backup.restore_fail
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
}
