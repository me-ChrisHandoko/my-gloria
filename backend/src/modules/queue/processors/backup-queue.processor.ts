import {
  Processor,
  Process,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QUEUE_NAMES, JOB_NAMES } from '../constants/queue.constants';
import { BackupJobData, RestoreJobData } from '../services/queue.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { SecureDatabaseConnection, SecureConnectionConfig } from '../../system-config/utils/secure-db-connection';
import { SecureBackupUtility, BackupOptions, BackupResult } from '../../system-config/utils/secure-backup';
import * as fs from 'fs/promises';
import * as path from 'path';

@Processor(QUEUE_NAMES.BACKUP)
export class BackupQueueProcessor {
  private readonly logger = new Logger(BackupQueueProcessor.name);
  private readonly backupDir: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.backupDir = this.configService.get('BACKUP_DIR', './backups');
  }

  @Process(JOB_NAMES.BACKUP.CREATE_BACKUP)
  async handleCreateBackup(job: Job<BackupJobData>) {
    this.logger.log(`Processing backup job ${job.id} for backup ${job.data.backupId}`);
    
    try {
      // Update job progress
      await job.progress({ progress: 0, stage: 'initializing', message: 'Starting backup process' });

      // Ensure backup directory exists
      await this.ensureBackupDirectory();
      
      // Get database connection info
      const dbConfig = this.getDatabaseConfig(job.data.databaseUrl);
      
      // Update job progress
      await job.progress({ progress: 10, stage: 'connecting', message: 'Connecting to database' });

      // Create secure connection and backup utility
      const secureConnection = new SecureDatabaseConnection();
      const backupUtility = new SecureBackupUtility(secureConnection);
      
      // Update job progress
      await job.progress({ progress: 20, stage: 'preparing', message: 'Preparing backup' });

      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-${job.data.backupId}-${timestamp}.sql`;
      const filePath = path.join(this.backupDir, filename);

      // Update job progress
      await job.progress({ progress: 30, stage: 'backing-up', message: 'Creating database backup' });

      // Prepare backup options
      const backupOptions: BackupOptions = {
        includeTables: job.data.tables,
        excludeTables: job.data.excludeTables,
        compress: job.data.compression !== false,
        schema: job.data.includeSchemas?.[0] || 'gloria_ops',
      };

      // Perform backup
      const backupResult = await backupUtility.createBackup(
        dbConfig,
        filePath,
        backupOptions,
      );

      if (!backupResult.success) {
        throw new Error(backupResult.error || 'Backup failed');
      }

      // Update progress during backup (simulated since the utility doesn't support callbacks)
      for (let i = 40; i <= 90; i += 10) {
        await job.progress({
          progress: i,
          stage: 'backing-up',
          message: `Backup in progress...`,
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update job progress
      await job.progress({ progress: 90, stage: 'finalizing', message: 'Finalizing backup' });

      // Save backup metadata
      const backupRecord = await this.prisma.systemBackup.create({
        data: {
          id: job.data.backupId,
          fileName: filename,
          filePath: backupResult.filePath,
          fileSize: backupResult.sizeBytes,
          status: 'completed',
          metadata: {
            ...job.data.metadata,
            jobId: job.id,
            format: job.data.format || 'custom',
            compression: job.data.compression !== false,
            tables: job.data.tables,
            excludeTables: job.data.excludeTables,
            includeSchemas: job.data.includeSchemas,
            duration: backupResult.duration,
          },
          createdBy: job.data.userId,
          organizationId: job.data.organizationId,
        },
      });

      // Create audit log
      await this.auditService.log({
        actorId: job.data.userId,
        module: 'system-config',
        action: 'CREATE' as any,
        entityType: 'SystemBackup',
        entityId: job.data.backupId,
        metadata: {
          jobId: job.id,
          fileName: filename,
          fileSize: backupResult.sizeBytes,
          duration: backupResult.duration,
        },
      });

      // Update job progress
      await job.progress({ progress: 100, stage: 'completed', message: 'Backup completed successfully' });

      // Emit completion event
      this.eventEmitter.emit('backup.completed', {
        backupId: job.data.backupId,
        jobId: job.id,
        fileName: filename,
        fileSize: backupResult.sizeBytes,
      });

      return {
        success: true,
        backupId: job.data.backupId,
        fileName: filename,
        filePath: backupResult.filePath,
        fileSize: backupResult.sizeBytes,
        duration: backupResult.duration,
      };
    } catch (error) {
      this.logger.error(`Backup job ${job.id} failed: ${error.message}`, error.stack);
      
      // Update backup record as failed
      await this.prisma.systemBackup.update({
        where: { id: job.data.backupId },
        data: {
          status: 'failed',
          metadata: {
            error: error.message,
            jobId: job.id,
          },
        },
      }).catch(() => {
        // Ignore error if backup record doesn't exist
      });

      // Create audit log for failure
      await this.auditService.log({
        actorId: job.data.userId,
        module: 'system-config',
        action: 'CREATE' as any,
        entityType: 'SystemBackup',
        entityId: job.data.backupId,
        metadata: {
          jobId: job.id,
          error: error.message,
          status: 'failed',
        },
      });

      throw error;
    }
  }

  @Process(JOB_NAMES.BACKUP.RESTORE_BACKUP)
  async handleRestoreBackup(job: Job<RestoreJobData>) {
    this.logger.log(`Processing restore job ${job.id} for backup ${job.data.backupId}`);
    
    try {
      // Update job progress
      await job.progress({ progress: 0, stage: 'initializing', message: 'Starting restore process' });

      // Verify backup file exists
      const fileExists = await this.fileExists(job.data.filePath);
      if (!fileExists) {
        throw new Error(`Backup file not found: ${job.data.filePath}`);
      }

      // Get database connection info
      const dbConfig = this.getDatabaseConfig(job.data.databaseUrl);
      
      // Update job progress
      await job.progress({ progress: 10, stage: 'connecting', message: 'Connecting to database' });

      // Create secure connection and backup utility
      const secureConnection = new SecureDatabaseConnection();
      const backupUtility = new SecureBackupUtility(secureConnection);

      // Update job progress
      await job.progress({ progress: 20, stage: 'restoring', message: 'Restoring database' });

      // Perform restore
      const restoreResult = await backupUtility.restoreBackup(
        dbConfig,
        job.data.filePath,
        false, // verify = false to actually restore
      );

      if (!restoreResult.success) {
        throw new Error(restoreResult.error || 'Restore failed');
      }

      // Update progress during restore (simulated)
      for (let i = 30; i <= 90; i += 10) {
        await job.progress({
          progress: i,
          stage: 'restoring',
          message: `Restore in progress...`,
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update job progress
      await job.progress({ progress: 90, stage: 'finalizing', message: 'Finalizing restore' });

      // Create audit log
      await this.auditService.log({
        actorId: job.data.userId,
        module: 'system-config',
        action: 'UPDATE' as any,
        entityType: 'SystemBackup',
        entityId: job.data.backupId,
        metadata: {
          jobId: job.id,
          filePath: job.data.filePath,
          duration: restoreResult.duration,
          options: {
            clean: job.data.clean,
            ifExists: job.data.ifExists,
            noOwner: job.data.noOwner,
          },
        },
      });

      // Update job progress
      await job.progress({ progress: 100, stage: 'completed', message: 'Restore completed successfully' });

      // Emit completion event
      this.eventEmitter.emit('backup.restored', {
        backupId: job.data.backupId,
        jobId: job.id,
        duration: restoreResult.duration,
      });

      return {
        success: true,
        backupId: job.data.backupId,
        duration: restoreResult.duration,
      };
    } catch (error) {
      this.logger.error(`Restore job ${job.id} failed: ${error.message}`, error.stack);
      
      // Create audit log for failure
      await this.auditService.log({
        actorId: job.data.userId,
        module: 'system-config',
        action: 'UPDATE' as any,
        entityType: 'SystemBackup',
        entityId: job.data.backupId,
        metadata: {
          jobId: job.id,
          error: error.message,
          status: 'restore_failed',
        },
      });

      throw error;
    }
  }

  @Process(JOB_NAMES.BACKUP.CLEANUP_OLD_BACKUPS)
  async handleCleanupOldBackups(job: Job<{ retentionDays: number; userId: string }>) {
    this.logger.log(`Processing cleanup job ${job.id}`);
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - job.data.retentionDays);

      // Find old backups
      const oldBackups = await this.prisma.systemBackup.findMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          status: 'completed',
        },
      });

      let deletedCount = 0;
      let deletedSize = 0;

      for (const backup of oldBackups) {
        try {
          // Delete file
          if (backup.filePath && await this.fileExists(backup.filePath)) {
            const stats = await fs.stat(backup.filePath);
            await fs.unlink(backup.filePath);
            deletedSize += stats.size;
          }

          // Delete database record
          await this.prisma.systemBackup.delete({
            where: { id: backup.id },
          });

          deletedCount++;
        } catch (error) {
          this.logger.error(`Failed to delete backup ${backup.id}: ${error.message}`);
        }
      }

      // Create audit log
      await this.auditService.log({
        actorId: job.data.userId,
        module: 'system-config',
        action: 'DELETE' as any,
        entityType: 'SystemBackup',
        entityId: 'cleanup',
        metadata: {
          jobId: job.id,
          retentionDays: job.data.retentionDays,
          deletedCount,
          deletedSize,
        },
      });

      return {
        success: true,
        deletedCount,
        deletedSize,
      };
    } catch (error) {
      this.logger.error(`Cleanup job ${job.id} failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(`Job ${job.id} of type ${job.name} started`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.debug(`Job ${job.id} of type ${job.name} completed`, result);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} of type ${job.name} failed: ${error.message}`, error.stack);
  }

  private getDatabaseConfig(databaseUrl?: string): SecureConnectionConfig {
    const url = databaseUrl || this.configService.get('DATABASE_URL');
    if (!url) {
      throw new Error('Database URL not configured');
    }

    // Parse database URL
    const urlObj = new URL(url);
    return {
      host: urlObj.hostname,
      port: parseInt(urlObj.port || '5432'),
      database: urlObj.pathname.slice(1),
      username: urlObj.username,
      password: urlObj.password,
      ssl: process.env.NODE_ENV === 'production',
    };
  }

  private async ensureBackupDirectory() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}