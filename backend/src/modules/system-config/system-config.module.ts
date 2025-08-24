import { Module } from '@nestjs/common';
import { SystemConfigController } from './system-config.controller';
import { FeatureFlagService } from './services/feature-flag.service';
import { MaintenanceService } from './services/maintenance.service';
import { BackupService } from './services/backup.service';
import { SecureDatabaseConnection } from './utils/secure-db-connection';
import { SecureBackupUtility } from './utils/secure-backup';
import { SecureConnectionPool } from './utils/secure-connection-pool';
import { RateLimiterUtil } from './utils/rate-limiter.util';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, AuditModule, QueueModule],
  controllers: [SystemConfigController],
  providers: [
    FeatureFlagService,
    MaintenanceService,
    BackupService,
    SecureDatabaseConnection,
    SecureBackupUtility,
    SecureConnectionPool,
    RateLimiterUtil,
  ],
  exports: [
    FeatureFlagService,
    MaintenanceService,
    BackupService,
    SecureDatabaseConnection,
    SecureBackupUtility,
    SecureConnectionPool,
    RateLimiterUtil,
  ],
})
export class SystemConfigModule {}
