import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditService } from './services/audit.service';
import { AuditController } from './controllers/audit.controller';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { AuditQueueService } from './services/audit-queue.service';
import { AuditLogProcessor } from './processors/audit-log.processor';
import { AuditIntegrityService } from './services/audit-integrity.service';
import { AuditEventService } from './services/audit-event.service';
import * as redisStore from 'cache-manager-ioredis';

@Global()
@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
    BullModule.registerQueue({
      name: 'audit-logs',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    CacheModule.register({
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      ttl: 300, // 5 minutes default TTL
      max: 1000, // Maximum number of items in cache
    }),
  ],
  controllers: [AuditController],
  providers: [
    AuditService,
    AuditInterceptor,
    AuditQueueService,
    AuditLogProcessor,
    AuditIntegrityService,
    AuditEventService,
  ],
  exports: [
    AuditService,
    AuditInterceptor,
    AuditQueueService,
    AuditIntegrityService,
    AuditEventService,
  ],
})
export class AuditModule {}
