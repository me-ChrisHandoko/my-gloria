import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ModuleController } from './controllers/module.controller';
import { ModuleAccessController } from './controllers/module-access.controller';
import { ModuleService } from './services/module.service';
import { ModuleAccessService } from './services/module-access.service';
import { ModulePermissionService } from './services/module-permission.service';
import { OverrideService } from './services/override.service';
import { PermissionModule } from '../permission/permission.module';
import { CacheModule } from '../../cache/cache.module';

@Module({
  imports: [PrismaModule, PermissionModule, CacheModule],
  controllers: [ModuleController, ModuleAccessController],
  providers: [
    ModuleService,
    ModuleAccessService,
    ModulePermissionService,
    OverrideService,
  ],
  exports: [ModuleService, ModuleAccessService, ModulePermissionService],
})
export class ModuleManagementModule {}
