import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BackupQueueProcessor } from './processors/backup-queue.processor';
import { QueueService } from './services/queue.service';
import { QueueMonitoringService } from './services/queue-monitoring.service';
import { QueueMonitoringController } from './controllers/queue-monitoring.controller';
import { QueueManagementController } from './controllers/queue-management.controller';
import { QUEUE_NAMES } from './constants/queue.constants';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuditModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.BACKUP,
      defaultJobOptions: {
        removeOnComplete: {
          age: 7 * 24 * 3600, // keep backup job logs for 7 days
          count: 50,
        },
        removeOnFail: {
          age: 30 * 24 * 3600, // keep failed backup jobs for 30 days
          count: 100,
        },
        attempts: 2, // less retries for backup jobs
        backoff: {
          type: 'fixed',
          delay: 60000, // 1 minute between retries
        },
      },
    }),
  ],
  controllers: [QueueMonitoringController, QueueManagementController],
  providers: [BackupQueueProcessor, QueueService, QueueMonitoringService],
  exports: [BullModule, QueueService, QueueMonitoringService],
})
export class QueueModule {}
