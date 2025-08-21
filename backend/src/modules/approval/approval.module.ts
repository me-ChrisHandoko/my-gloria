import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrganizationModule } from '../organization/organization.module';
import { PermissionModule } from '../permission/permission.module';
import { AuditModule } from '../audit/audit.module';

// Controllers
import { ApprovalMatrixController } from './controllers/approval-matrix.controller';
import { RequestController } from './controllers/request.controller';
import { ApprovalStepController } from './controllers/approval-step.controller';
import { DelegationController } from './controllers/delegation.controller';

// Services
import { WorkflowService } from './services/workflow.service';
import { ApprovalMatrixService } from './services/approval-matrix.service';
import { RequestService } from './services/request.service';
import { DelegationService } from './services/delegation.service';
import { ApprovalValidatorService } from './services/approval-validator.service';

@Module({
  imports: [
    PrismaModule,
    OrganizationModule,
    PermissionModule,
    AuditModule,
  ],
  controllers: [
    ApprovalMatrixController,
    RequestController,
    ApprovalStepController,
    DelegationController,
  ],
  providers: [
    WorkflowService,
    ApprovalMatrixService,
    RequestService,
    DelegationService,
    ApprovalValidatorService,
  ],
  exports: [
    WorkflowService,
    ApprovalMatrixService,
    RequestService,
    DelegationService,
  ],
})
export class ApprovalModule {}