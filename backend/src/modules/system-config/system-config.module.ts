import { Module } from '@nestjs/common';
import { SystemConfigController } from './system-config.controller';
import { FeatureFlagService } from './services/feature-flag.service';
import { MaintenanceService } from './services/maintenance.service';
import { BackupService } from './services/backup.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [SystemConfigController],
  providers: [FeatureFlagService, MaintenanceService, BackupService],
  exports: [FeatureFlagService, MaintenanceService, BackupService],
})
export class SystemConfigModule {}
