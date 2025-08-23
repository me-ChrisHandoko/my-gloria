import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApprovalLoggerService } from '../logging/approval-logger.service';
import { ApprovalMetricsService } from '../metrics/approval-metrics.service';
import { AuditService } from '../../audit/services/audit.service';
import {
  Request,
  ApprovalStep,
  ApprovalStatus,
  ApprovalAction,
  RequestStatus,
  ApproverType,
  Prisma,
} from '@prisma/client';
import { ApprovalMatrixService } from './approval-matrix.service';
import { RequestService } from './request.service';
import { DelegationService } from './delegation.service';
import { ApprovalValidatorService } from './approval-validator.service';
import { ApprovalBusinessRulesService } from './approval-business-rules.service';
import { ApprovalNotificationService } from './approval-notification.service';
import { ProcessApprovalDto } from '../dto/approval-step.dto';
import { CreateRequestDto } from '../dto/request.dto';
import {
  RequestCreatedEvent,
  RequestApprovedEvent,
  RequestRejectedEvent,
  RequestCompletedEvent,
  StepApprovedEvent,
  StepRejectedEvent,
  WorkflowStartedEvent,
  WorkflowCompletedEvent,
} from '../events/approval.events';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly approvalMatrixService: ApprovalMatrixService,
    private readonly requestService: RequestService,
    private readonly delegationService: DelegationService,
    private readonly validatorService: ApprovalValidatorService,
    private readonly businessRulesService: ApprovalBusinessRulesService,
    private readonly notificationService: ApprovalNotificationService,
    private readonly logger: ApprovalLoggerService,
    private readonly metrics: ApprovalMetricsService,
    private readonly auditService: AuditService,
  ) {}

  async initiateWorkflow(
    dto: CreateRequestDto,
    requesterProfileId: string,
  ): Promise<Request> {
    // Create logging context
    const context = this.logger.createContext(`workflow-${Date.now()}`);
    context.userId = requesterProfileId;
    context.module = dto.module;

    // Start performance timer
    const timerId = this.metrics.startTimer('workflow.initiate', context, {
      module: dto.module,
      requestType: dto.requestType,
    });

    this.logger.logAction('WORKFLOW_INITIATE_START', context, {
      module: dto.module,
      requestType: dto.requestType,
      requesterProfileId,
    });

    try {
      // Validate business rules before creating request
      const validationResult =
        await this.businessRulesService.validateRequestCreation(
          dto.module,
          dto.details,
          requesterProfileId,
        );

      if (!validationResult.valid) {
        const errorMessage = validationResult.violations
          .map((v) => v.message)
          .join(', ');
        throw new BadRequestException(`Validation failed: ${errorMessage}`);
      }

      // Log warnings if any
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        this.logger.logAction('WORKFLOW_VALIDATION_WARNINGS', context, {
          warnings: validationResult.warnings,
        });
      }

      // Execute all operations within a transaction for atomicity
      return await this.prisma.$transaction(async (tx) => {
        // Get requester's profile with position and role
        const requesterProfile = await tx.userProfile.findUnique({
          where: { id: requesterProfileId },
          include: {
            positions: {
              where: {
                isActive: true,
                startDate: { lte: new Date() },
                OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
              },
              include: {
                position: true,
              },
            },
          },
        });

        if (!requesterProfile) {
          throw new NotFoundException('Requester profile not found');
        }

        // Get applicable approval matrices
        const position = requesterProfile.positions[0]?.position;
        const matrices = await this.approvalMatrixService.findByModuleWithTx(
          tx,
          dto.module,
          undefined, // role - implement if needed
          position?.code,
        );

        if (matrices.length === 0) {
          throw new NotFoundException(
            `No approval matrix found for module ${dto.module}`,
          );
        }

        // Filter matrices based on conditions
        const applicableMatrices =
          await this.validatorService.filterMatricesByConditionsWithTx(
            tx,
            matrices,
            dto.details,
          );

        if (applicableMatrices.length === 0) {
          throw new BadRequestException(
            'No approval matrix matches the request conditions',
          );
        }

        // Create the request within transaction
        const request = await this.createRequestWithTx(
          tx,
          dto,
          requesterProfileId,
        );

        // Create approval steps based on matrices within transaction
        const approvalSteps = await this.createApprovalStepsWithTx(
          tx,
          request.id,
          applicableMatrices,
        );

        // Return request with steps
        const fullRequest = (await tx.request.findUnique({
          where: { id: request.id },
          include: {
            requester: true,
            approvalSteps: {
              include: {
                approver: true,
              },
              orderBy: {
                sequence: 'asc',
              },
            },
            attachments: true,
          },
        })) as Request;

        // Emit events after transaction completes
        const correlationId = `req_${request.id}_${Date.now()}`;

        // Emit workflow started event
        this.eventEmitter.emit(
          'approval.workflow.started',
          new WorkflowStartedEvent(
            request.id,
            dto.module,
            approvalSteps.length,
            correlationId,
          ),
        );

        // Emit request created event
        this.eventEmitter.emit(
          'approval.request.created',
          new RequestCreatedEvent(
            request.id,
            dto.module,
            requesterProfileId,
            dto.details,
            correlationId,
          ),
        );

        // Send notifications to first approvers
        if (approvalSteps.length > 0) {
          await this.notificationService.notifyNextApprovers(request.id, 1);
        }

        return fullRequest;
      });
    } catch (error) {
      this.metrics.endTimer(timerId, false);
      this.logger.logError(error as Error, context, {
        operation: 'workflow.initiate',
        module: dto.module,
        requestType: dto.requestType,
      });

      // Audit the error
      await this.auditService.auditError(
        dto.module, // requestId
        error as Error,
        'workflow.initiate', // operation
        requesterProfileId, // actor
        context,
      );

      throw error;
    }
  }

  async processApproval(
    requestId: string,
    stepId: string,
    dto: ProcessApprovalDto,
    approverProfileId: string,
  ): Promise<Request> {
    // Execute all approval operations within a transaction
    return await this.prisma.$transaction(async (tx) => {
      // Get the approval step
      const step = await tx.approvalStep.findUnique({
        where: { id: stepId },
        include: {
          request: true,
        },
      });

      if (!step) {
        throw new NotFoundException('Approval step not found');
      }

      if (step.requestId !== requestId) {
        throw new BadRequestException('Step does not belong to this request');
      }

      // Validate business rules for approval process
      const validationResult =
        await this.businessRulesService.validateApprovalProcess(
          stepId,
          approverProfileId,
          dto.action,
          dto.notes,
        );

      if (!validationResult.valid) {
        const errorMessage = validationResult.violations
          .map((v) => v.message)
          .join(', ');
        throw new BadRequestException(
          `Business rule validation failed: ${errorMessage}`,
        );
      }

      // Log warnings if any
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        this.logger.logAction(
          'APPROVAL_VALIDATION_WARNINGS',
          this.logger.createContext(`approval-${stepId}`),
          {
            warnings: validationResult.warnings,
            stepId,
            approverProfileId,
          },
        );
      }

      // Check if user can approve (either direct approver or delegate)
      const canApprove = await this.canUserApproveWithTx(
        tx,
        step,
        approverProfileId,
      );
      if (!canApprove) {
        throw new BadRequestException(
          'You are not authorized to approve this step',
        );
      }

      // Check if step is waiting
      if (step.status !== ApprovalStatus.WAITING) {
        throw new BadRequestException('This step has already been processed');
      }

      // Check if this is the current step
      if (step.sequence !== step.request.currentStep) {
        throw new BadRequestException('This is not the current approval step');
      }

      // Update the step with optimistic locking
      const updateResult = await tx.approvalStep.updateMany({
        where: {
          id: stepId,
          version: dto.version, // Check version matches
        },
        data: {
          status:
            dto.action === ApprovalAction.APPROVE
              ? ApprovalStatus.APPROVED
              : ApprovalStatus.REJECTED,
          action: dto.action,
          notes: dto.notes,
          approvedAt: new Date(),
          version: { increment: 1 }, // Increment version
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          'This approval step has been modified by another user. Please refresh and try again.',
        );
      }

      // Handle the workflow based on action within transaction
      if (dto.action === ApprovalAction.APPROVE) {
        await this.handleApprovalWithTx(tx, requestId, step.sequence);
      } else if (dto.action === ApprovalAction.REJECT) {
        await this.handleRejectionWithTx(tx, requestId);
      } else if (dto.action === ApprovalAction.RETURN) {
        await this.handleReturnWithTx(tx, requestId, step.sequence);
      }

      // Return updated request
      const updatedRequest = (await tx.request.findUnique({
        where: { id: requestId },
        include: {
          requester: true,
          approvalSteps: {
            include: {
              approver: true,
            },
            orderBy: {
              sequence: 'asc',
            },
          },
          attachments: true,
        },
      })) as Request;

      // Get approver profile for notifications
      const approverProfile = await this.prisma.userProfile.findUnique({
        where: { id: approverProfileId },
      });

      // Emit events after transaction completes
      const correlationId = `approval_${stepId}_${Date.now()}`;

      if (dto.action === ApprovalAction.APPROVE) {
        // Emit step approved event
        this.eventEmitter.emit(
          'approval.step.approved',
          new StepApprovedEvent(
            stepId,
            requestId,
            approverProfileId,
            step.sequence,
            dto.notes,
            correlationId,
          ),
        );

        // Check if request is fully approved
        if (updatedRequest.status === RequestStatus.APPROVED) {
          this.eventEmitter.emit(
            'approval.request.completed',
            new RequestCompletedEvent(
              requestId,
              new Date(),
              'APPROVED',
              correlationId,
            ),
          );

          this.eventEmitter.emit(
            'approval.workflow.completed',
            new WorkflowCompletedEvent(
              requestId,
              new Date(),
              'approved',
              correlationId,
            ),
          );

          // Notify requester of final approval
          await this.notificationService.notifyRequester(
            requestId,
            'COMPLETED',
            approverProfile || undefined,
          );
        } else {
          // Just a step approval
          this.eventEmitter.emit(
            'approval.request.approved',
            new RequestApprovedEvent(
              requestId,
              approverProfileId,
              stepId,
              dto.notes,
              correlationId,
            ),
          );

          // Notify requester of step approval
          await this.notificationService.notifyRequester(
            requestId,
            'APPROVED',
            approverProfile || undefined,
          );

          // Check if we need to notify next approvers
          const nextStep = step.sequence + 1;
          const hasNextStep = (updatedRequest as any).approvalSteps?.some(
            (s: any) => s.sequence === nextStep,
          );
          if (hasNextStep) {
            await this.notificationService.notifyNextApprovers(
              requestId,
              nextStep,
            );
          }
        }
      } else if (dto.action === ApprovalAction.REJECT) {
        // Emit rejection events
        this.eventEmitter.emit(
          'approval.step.rejected',
          new StepRejectedEvent(
            stepId,
            requestId,
            approverProfileId,
            step.sequence,
            dto.notes || 'No reason provided',
            correlationId,
          ),
        );

        this.eventEmitter.emit(
          'approval.request.rejected',
          new RequestRejectedEvent(
            requestId,
            approverProfileId,
            stepId,
            dto.notes || 'No reason provided',
            correlationId,
          ),
        );

        this.eventEmitter.emit(
          'approval.workflow.completed',
          new WorkflowCompletedEvent(
            requestId,
            new Date(),
            'rejected',
            correlationId,
          ),
        );

        // Notify requester of rejection
        await this.notificationService.notifyRequester(
          requestId,
          'REJECTED',
          approverProfile || undefined,
        );
      }

      return updatedRequest;
    });
  }

  private async createApprovalSteps(
    requestId: string,
    matrices: any[],
  ): Promise<ApprovalStep[]> {
    const steps: ApprovalStep[] = [];

    for (const matrix of matrices) {
      // Get approvers based on type
      const approvers = await this.getApprovers(
        matrix.approverType,
        matrix.approverValue,
      );

      for (const approver of approvers) {
        const step = await this.prisma.approvalStep.create({
          data: {
            id: this.generateId('aps'),
            requestId,
            sequence: matrix.approvalSequence,
            approverProfileId: approver.id,
            approverType: matrix.approverType,
            status:
              matrix.approvalSequence === 1
                ? ApprovalStatus.WAITING
                : ApprovalStatus.PENDING,
          },
        });
        steps.push(step);
      }
    }

    return steps;
  }

  private async createApprovalStepsWithTx(
    tx: Prisma.TransactionClient,
    requestId: string,
    matrices: any[],
  ): Promise<ApprovalStep[]> {
    const steps: ApprovalStep[] = [];

    for (const matrix of matrices) {
      // Get approvers based on type
      const approvers = await this.getApproversWithTx(
        tx,
        matrix.approverType,
        matrix.approverValue,
      );

      for (const approver of approvers) {
        const step = await tx.approvalStep.create({
          data: {
            id: this.generateId('aps'),
            requestId,
            sequence: matrix.approvalSequence,
            approverProfileId: approver.id,
            approverType: matrix.approverType,
            status:
              matrix.approvalSequence === 1
                ? ApprovalStatus.WAITING
                : ApprovalStatus.PENDING,
          },
        });
        steps.push(step);
      }
    }

    return steps;
  }

  private async getApprovers(
    approverType: ApproverType,
    approverValue: string,
  ): Promise<any[]> {
    switch (approverType) {
      case ApproverType.SPECIFIC_USER:
        const userProfile = await this.prisma.userProfile.findFirst({
          where: {
            OR: [{ id: approverValue }, { clerkUserId: approverValue }],
          },
        });
        return userProfile ? [userProfile] : [];

      case ApproverType.POSITION:
        const userPositions = await this.prisma.userPosition.findMany({
          where: {
            position: {
              code: approverValue,
            },
            isActive: true,
            startDate: { lte: new Date() },
            OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
          },
          include: {
            userProfile: true,
          },
        });
        return userPositions.map((up) => up.userProfile);

      case ApproverType.DEPARTMENT:
        const departments = await this.prisma.userPosition.findMany({
          where: {
            position: {
              department: {
                code: approverValue,
              },
            },
            isActive: true,
            startDate: { lte: new Date() },
            OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
          },
          include: {
            userProfile: true,
          },
        });
        return departments.map((up) => up.userProfile);

      default:
        return [];
    }
  }

  private async getApproversWithTx(
    tx: Prisma.TransactionClient,
    approverType: ApproverType,
    approverValue: string,
  ): Promise<any[]> {
    switch (approverType) {
      case ApproverType.SPECIFIC_USER:
        const userProfile = await tx.userProfile.findFirst({
          where: {
            OR: [{ id: approverValue }, { clerkUserId: approverValue }],
          },
        });
        return userProfile ? [userProfile] : [];

      case ApproverType.POSITION:
        const userPositions = await tx.userPosition.findMany({
          where: {
            position: {
              code: approverValue,
            },
            isActive: true,
            startDate: { lte: new Date() },
            OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
          },
          include: {
            userProfile: true,
          },
        });
        return userPositions.map((up) => up.userProfile);

      case ApproverType.DEPARTMENT:
        const departments = await tx.userPosition.findMany({
          where: {
            position: {
              department: {
                code: approverValue,
              },
            },
            isActive: true,
            startDate: { lte: new Date() },
            OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
          },
          include: {
            userProfile: true,
          },
        });
        return departments.map((up) => up.userProfile);

      default:
        return [];
    }
  }

  private async canUserApprove(
    step: ApprovalStep,
    approverProfileId: string,
  ): Promise<boolean> {
    // Direct approver
    if (step.approverProfileId === approverProfileId) {
      return true;
    }

    // Check for active delegation
    const delegation = await this.delegationService.getActiveDelegation(
      step.approverProfileId,
      approverProfileId,
      (step as any).request.module,
    );

    return !!delegation;
  }

  private async canUserApproveWithTx(
    tx: Prisma.TransactionClient,
    step: ApprovalStep,
    approverProfileId: string,
  ): Promise<boolean> {
    // Direct approver
    if (step.approverProfileId === approverProfileId) {
      return true;
    }

    // Check for active delegation
    const delegation = await this.delegationService.getActiveDelegationWithTx(
      tx,
      step.approverProfileId,
      approverProfileId,
      (step as any).request.module,
    );

    return !!delegation;
  }

  private async handleApproval(
    requestId: string,
    currentSequence: number,
  ): Promise<void> {
    // Check if all steps in current sequence are approved
    const currentSteps = await this.prisma.approvalStep.findMany({
      where: {
        requestId,
        sequence: currentSequence,
      },
    });

    const allApproved = currentSteps.every(
      (s) => s.status === ApprovalStatus.APPROVED,
    );

    if (allApproved) {
      // Check if there are more steps
      const nextSteps = await this.prisma.approvalStep.findMany({
        where: {
          requestId,
          sequence: currentSequence + 1,
        },
      });

      if (nextSteps.length > 0) {
        // Activate next steps
        await this.prisma.approvalStep.updateMany({
          where: {
            requestId,
            sequence: currentSequence + 1,
          },
          data: {
            status: ApprovalStatus.WAITING,
          },
        });

        // Update request
        await this.requestService.updateCurrentStep(
          requestId,
          currentSequence + 1,
        );
      } else {
        // All steps completed - approve request
        await this.requestService.updateStatus(
          requestId,
          RequestStatus.APPROVED,
        );
      }
    }
  }

  private async handleApprovalWithTx(
    tx: Prisma.TransactionClient,
    requestId: string,
    currentSequence: number,
  ): Promise<void> {
    // Get current request
    const request = await tx.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Check if all steps in current sequence are approved
    const currentSteps = await tx.approvalStep.findMany({
      where: {
        requestId,
        sequence: currentSequence,
      },
    });

    const allApproved = currentSteps.every(
      (s) => s.status === ApprovalStatus.APPROVED,
    );

    if (allApproved) {
      // Check if there are more steps
      const nextSteps = await tx.approvalStep.findMany({
        where: {
          requestId,
          sequence: currentSequence + 1,
        },
      });

      if (nextSteps.length > 0) {
        // Validate state transition to IN_PROGRESS if not already
        if (request.status !== RequestStatus.IN_PROGRESS) {
          const transitionValidation =
            await this.businessRulesService.validateStateTransition(
              request.status,
              RequestStatus.IN_PROGRESS,
              request,
            );

          if (!transitionValidation.valid) {
            throw new BadRequestException(
              `Cannot progress request: ${transitionValidation.violations[0]?.message}`,
            );
          }
        }

        // Activate next steps
        await tx.approvalStep.updateMany({
          where: {
            requestId,
            sequence: currentSequence + 1,
          },
          data: {
            status: ApprovalStatus.WAITING,
          },
        });

        // Update request
        await tx.request.update({
          where: { id: requestId },
          data: {
            currentStep: currentSequence + 1,
            status: RequestStatus.IN_PROGRESS,
          },
        });

        // Notify next approvers (will be called after transaction completes)
        process.nextTick(() => {
          this.notificationService
            .notifyNextApprovers(requestId, currentSequence + 1)
            .catch((error) => {
              this.logger.logError(
                error,
                this.logger.createContext(`notify-${requestId}`),
                {
                  operation: 'notifyNextApprovers',
                  requestId,
                  sequence: currentSequence + 1,
                },
              );
            });
        });
      } else {
        // All steps completed - validate transition to APPROVED
        const transitionValidation =
          await this.businessRulesService.validateStateTransition(
            request.status,
            RequestStatus.APPROVED,
            request,
          );

        if (!transitionValidation.valid) {
          throw new BadRequestException(
            `Cannot approve request: ${transitionValidation.violations[0]?.message}`,
          );
        }

        // All steps completed - approve request
        await tx.request.update({
          where: { id: requestId },
          data: {
            status: RequestStatus.APPROVED,
            completedAt: new Date(),
          },
        });
      }
    }
  }

  private async handleRejection(requestId: string): Promise<void> {
    // Reject all pending steps
    await this.prisma.approvalStep.updateMany({
      where: {
        requestId,
        status: {
          in: [ApprovalStatus.PENDING, ApprovalStatus.WAITING],
        },
      },
      data: {
        status: ApprovalStatus.SKIPPED,
      },
    });

    // Update request status
    await this.requestService.updateStatus(requestId, RequestStatus.REJECTED);
  }

  private async handleRejectionWithTx(
    tx: Prisma.TransactionClient,
    requestId: string,
  ): Promise<void> {
    // Get current request status
    const request = await tx.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Validate state transition
    const transitionValidation =
      await this.businessRulesService.validateStateTransition(
        request.status,
        RequestStatus.REJECTED,
        request,
      );

    if (!transitionValidation.valid) {
      throw new BadRequestException(
        `Cannot reject request: ${transitionValidation.violations[0]?.message}`,
      );
    }

    // Reject all pending steps
    await tx.approvalStep.updateMany({
      where: {
        requestId,
        status: {
          in: [ApprovalStatus.PENDING, ApprovalStatus.WAITING],
        },
      },
      data: {
        status: ApprovalStatus.SKIPPED,
      },
    });

    // Update request status
    await tx.request.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.REJECTED,
      },
    });
  }

  private async handleReturn(
    requestId: string,
    currentSequence: number,
  ): Promise<void> {
    // Reset to first step
    await this.prisma.approvalStep.updateMany({
      where: {
        requestId,
      },
      data: {
        status: ApprovalStatus.PENDING,
        action: null,
        notes: null,
        approvedAt: null,
      },
    });

    // Activate first step
    await this.prisma.approvalStep.updateMany({
      where: {
        requestId,
        sequence: 1,
      },
      data: {
        status: ApprovalStatus.WAITING,
      },
    });

    // Update request
    await this.requestService.updateCurrentStep(requestId, 1);
  }

  private async handleReturnWithTx(
    tx: Prisma.TransactionClient,
    requestId: string,
    currentSequence: number,
  ): Promise<void> {
    // Get current request status
    const request = await tx.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Validate state transition
    const transitionValidation =
      await this.businessRulesService.validateStateTransition(
        request.status,
        RequestStatus.REJECTED,
        request,
      );

    if (!transitionValidation.valid) {
      throw new BadRequestException(
        `Cannot return request: ${transitionValidation.violations[0]?.message}`,
      );
    }

    // Reset to first step
    await tx.approvalStep.updateMany({
      where: {
        requestId,
      },
      data: {
        status: ApprovalStatus.PENDING,
        action: null,
        notes: null,
        approvedAt: null,
      },
    });

    // Activate first step
    await tx.approvalStep.updateMany({
      where: {
        requestId,
        sequence: 1,
      },
      data: {
        status: ApprovalStatus.WAITING,
      },
    });

    // Update request
    await tx.request.update({
      where: { id: requestId },
      data: {
        currentStep: 1,
        status: RequestStatus.PENDING,
      },
    });
  }

  private async createRequestWithTx(
    tx: Prisma.TransactionClient,
    dto: CreateRequestDto,
    requesterProfileId: string,
  ): Promise<Request> {
    const requestNumber = await this.generateRequestNumberWithTx(
      tx,
      dto.module,
    );

    return tx.request.create({
      data: {
        id: this.generateId('req'),
        requestNumber,
        module: dto.module,
        requesterProfileId,
        requestType: dto.requestType,
        details: dto.details,
        status: RequestStatus.PENDING,
        currentStep: 1,
      },
      include: {
        requester: true,
        approvalSteps: true,
        attachments: true,
      },
    });
  }

  private async generateRequestNumberWithTx(
    tx: Prisma.TransactionClient,
    module: string,
  ): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Get the last request number for this month
    const lastRequest = await tx.request.findFirst({
      where: {
        requestNumber: {
          startsWith: `REQ-${module.toUpperCase()}-${year}${month}`,
        },
      },
      orderBy: {
        requestNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastRequest) {
      const lastSequence = parseInt(
        lastRequest.requestNumber.split('-').pop() || '0',
      );
      sequence = lastSequence + 1;
    }

    return `REQ-${module.toUpperCase()}-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
