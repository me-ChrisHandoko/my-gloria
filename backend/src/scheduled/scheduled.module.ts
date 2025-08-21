import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PermissionCleanupTask } from './permission-cleanup.task';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { AuditService } from '../modules/audit/services/audit.service';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, CacheModule],
  providers: [PermissionCleanupTask, AuditService],
  exports: [],
})
export class ScheduledTaskModule {}
