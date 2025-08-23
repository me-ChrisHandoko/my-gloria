import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { createWriteStream } from 'fs';

const pipelineAsync = promisify(pipeline);
const gzip = promisify(zlib.gzip);

@Injectable()
export class PermissionLogRetentionService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PermissionLogRetentionService.name);
  private retentionDays: number;
  private archivePath: string;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Default retention period is 30 days
    this.retentionDays =
      this.configService.get<number>('PERMISSION_LOG_RETENTION_DAYS') || 30;
    
    // Default archive path
    this.archivePath =
      this.configService.get<string>('PERMISSION_LOG_ARCHIVE_PATH') ||
      path.join(process.cwd(), 'archives', 'permission-logs');
  }

  async onModuleInit() {
    // Ensure archive directory exists
    await this.ensureArchiveDirectory();
    
    this.logger.log(
      `Permission log retention service initialized with ${this.retentionDays} days retention`,
    );
  }

  onModuleDestroy() {
    this.logger.log('Permission log retention service destroyed');
  }

  /**
   * Run daily at 2 AM to clean up old logs
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleLogRetention() {
    if (this.isRunning) {
      this.logger.warn('Log retention job already running, skipping...');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting permission log retention job');

    try {
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - this.retentionDays);

      // First, archive logs before deletion
      await this.archiveOldLogs(retentionDate);

      // Then delete archived logs
      await this.deleteArchivedLogs(retentionDate);

      this.logger.log('Permission log retention job completed successfully');
    } catch (error) {
      this.logger.error('Error during log retention job', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Archive old logs to compressed files
   */
  private async archiveOldLogs(retentionDate: Date) {
    const batchSize = 10000;
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const logs = await this.prisma.permissionCheckLog.findMany({
        where: {
          createdAt: {
            lt: retentionDate,
          },
        },
        take: batchSize,
        skip,
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (logs.length === 0) {
        hasMore = false;
        break;
      }

      // Group logs by date
      const logsByDate = this.groupLogsByDate(logs);

      // Archive each date's logs
      for (const [date, dateLogs] of Object.entries(logsByDate)) {
        await this.archiveLogsForDate(date, dateLogs);
      }

      skip += batchSize;

      if (logs.length < batchSize) {
        hasMore = false;
      }
    }
  }

  /**
   * Group logs by date for organized archiving
   */
  private groupLogsByDate(logs: any[]): Record<string, any[]> {
    return logs.reduce((acc, log) => {
      const dateKey = log.createdAt.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(log);
      return acc;
    }, {});
  }

  /**
   * Archive logs for a specific date
   */
  private async archiveLogsForDate(date: string, logs: any[]) {
    const year = date.substring(0, 4);
    const month = date.substring(5, 7);
    const archiveDir = path.join(this.archivePath, year, month);
    
    // Ensure directory exists
    await fs.mkdir(archiveDir, { recursive: true });

    const filename = `permission-logs-${date}.json.gz`;
    const filepath = path.join(archiveDir, filename);

    // Check if archive already exists
    try {
      await fs.access(filepath);
      this.logger.log(`Archive already exists for ${date}, skipping...`);
      return;
    } catch {
      // File doesn't exist, continue with archiving
    }

    // Prepare log data
    const logData = JSON.stringify(logs, null, 2);
    
    // Compress and write to file
    const compressed = await gzip(Buffer.from(logData));
    await fs.writeFile(filepath, compressed);

    this.logger.log(
      `Archived ${logs.length} permission logs for ${date} to ${filename}`,
    );
  }

  /**
   * Delete logs that have been archived
   */
  private async deleteArchivedLogs(retentionDate: Date) {
    const result = await this.prisma.permissionCheckLog.deleteMany({
      where: {
        createdAt: {
          lt: retentionDate,
        },
      },
    });

    this.logger.log(
      `Deleted ${result.count} permission logs older than ${retentionDate.toISOString()}`,
    );
  }

  /**
   * Ensure archive directory exists
   */
  private async ensureArchiveDirectory() {
    try {
      await fs.mkdir(this.archivePath, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create archive directory', error);
    }
  }

  /**
   * Manually trigger log retention (for testing or emergency cleanup)
   */
  async runRetentionNow(retentionDays?: number) {
    const originalRetentionDays = this.retentionDays;
    
    if (retentionDays) {
      this.retentionDays = retentionDays;
    }

    try {
      await this.handleLogRetention();
    } finally {
      this.retentionDays = originalRetentionDays;
    }
  }

  /**
   * Get retention statistics
   */
  async getRetentionStats() {
    const totalLogs = await this.prisma.permissionCheckLog.count();
    
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - this.retentionDays);
    
    const logsToArchive = await this.prisma.permissionCheckLog.count({
      where: {
        createdAt: {
          lt: retentionDate,
        },
      },
    });

    const oldestLog = await this.prisma.permissionCheckLog.findFirst({
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        createdAt: true,
      },
    });

    const newestLog = await this.prisma.permissionCheckLog.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        createdAt: true,
      },
    });

    // Calculate storage size (approximate)
    const avgLogSize = 200; // bytes
    const estimatedSize = totalLogs * avgLogSize;

    return {
      totalLogs,
      logsToArchive,
      retentionDays: this.retentionDays,
      oldestLog: oldestLog?.createdAt,
      newestLog: newestLog?.createdAt,
      estimatedSizeBytes: estimatedSize,
      estimatedSizeMB: (estimatedSize / 1024 / 1024).toFixed(2),
    };
  }

  /**
   * Restore archived logs for a specific date
   */
  async restoreLogsForDate(date: string): Promise<number> {
    const year = date.substring(0, 4);
    const month = date.substring(5, 7);
    const filename = `permission-logs-${date}.json.gz`;
    const filepath = path.join(this.archivePath, year, month, filename);

    try {
      // Read and decompress the file
      const compressed = await fs.readFile(filepath);
      const decompressed = await promisify(zlib.gunzip)(compressed);
      const logs = JSON.parse(decompressed.toString());

      // Restore logs to database
      await this.prisma.permissionCheckLog.createMany({
        data: logs.map((log: any) => ({
          ...log,
          createdAt: new Date(log.createdAt),
        })),
        skipDuplicates: true,
      });

      this.logger.log(`Restored ${logs.length} logs from ${date}`);
      return logs.length;
    } catch (error) {
      this.logger.error(`Failed to restore logs for ${date}`, error);
      throw error;
    }
  }

  /**
   * List available archives
   */
  async listArchives(): Promise<string[]> {
    const archives: string[] = [];

    try {
      const years = await fs.readdir(this.archivePath);
      
      for (const year of years) {
        const yearPath = path.join(this.archivePath, year);
        const stat = await fs.stat(yearPath);
        
        if (stat.isDirectory()) {
          const months = await fs.readdir(yearPath);
          
          for (const month of months) {
            const monthPath = path.join(yearPath, month);
            const monthStat = await fs.stat(monthPath);
            
            if (monthStat.isDirectory()) {
              const files = await fs.readdir(monthPath);
              archives.push(...files.map(f => path.join(year, month, f)));
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to list archives', error);
    }

    return archives;
  }
}