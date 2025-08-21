import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

// Controllers
import { SchoolController } from './controllers/school.controller';
import { DepartmentController } from './controllers/department.controller';
import { PositionController } from './controllers/position.controller';
import { UserPositionController } from './controllers/user-position.controller';
import { HierarchyController } from './controllers/hierarchy.controller';

// Services
import { SchoolService } from './services/school.service';
import { DepartmentService } from './services/department.service';
import { PositionService } from './services/position.service';
import { UserPositionService } from './services/user-position.service';
import { HierarchyService } from './services/hierarchy.service';

// Validators
import { PositionValidator } from '../../validators/position.validator';
import { HierarchyValidator } from '../../validators/hierarchy.validator';
import { DepartmentValidator } from '../../validators/department.validator';

// Security & Audit
import { RowLevelSecurityService } from '../../security/row-level-security.service';
import { AuditService } from '../audit/services/audit.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    SchoolController,
    DepartmentController,
    PositionController,
    UserPositionController,
    HierarchyController,
  ],
  providers: [
    // Services
    SchoolService,
    DepartmentService,
    PositionService,
    UserPositionService,
    HierarchyService,

    // Validators
    PositionValidator,
    HierarchyValidator,
    DepartmentValidator,

    // Security & Audit
    RowLevelSecurityService,
    AuditService,
  ],
  exports: [
    SchoolService,
    DepartmentService,
    PositionService,
    UserPositionService,
    HierarchyService,
  ],
})
export class OrganizationModule {}
