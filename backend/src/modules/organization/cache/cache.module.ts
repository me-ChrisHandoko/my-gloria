import { Module } from '@nestjs/common';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { OrganizationCacheService } from './organization-cache.service';
import { PositionCacheService } from './position-cache.service';

@Module({
  imports: [],
  providers: [
    OrganizationCacheService,
    PositionCacheService,
    {
      provide: 'SchoolCacheService',
      useFactory: (eventEmitter: EventEmitter2) => new OrganizationCacheService(eventEmitter),
      inject: [EventEmitter2],
    },
    {
      provide: 'DepartmentCacheService',
      useFactory: (eventEmitter: EventEmitter2) => new OrganizationCacheService(eventEmitter),
      inject: [EventEmitter2],
    },
  ],
  exports: [
    OrganizationCacheService,
    PositionCacheService,
    'SchoolCacheService',
    'DepartmentCacheService',
  ],
})
export class CacheModule {}