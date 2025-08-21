import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { 
  Request, 
  ApprovalStep, 
  ApprovalStatus, 
  ApprovalAction, 
  RequestStatus,
  ApproverType,
  Prisma
} from '@prisma/client';
import { ApprovalMatrixService } from './approval-matrix.service';
import { RequestService } from './request.service';
import { DelegationService } from './delegation.service';
import { ApprovalValidatorService } from './approval-validator.service';
import { ProcessApprovalDto } from '../dto/approval-step.dto';
import { CreateRequestDto } from '../dto/request.dto';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalMatrixService: ApprovalMatrixService,
    private readonly requestService: RequestService,
    private readonly delegationService: DelegationService,
    private readonly validatorService: ApprovalValidatorService,
  ) {}

  async initiateWorkflow(dto: CreateRequestDto, requesterProfileId: string): Promise<Request> {
    // Get requester's profile with position and role
    const requesterProfile = await this.prisma.userProfile.findUnique({
      where: { id: requesterProfileId },
      include: {
        positions: {
          where: {
            isActive: true,
            startDate: { lte: new Date() },
            OR: [
              { endDate: null },
              { endDate: { gte: new Date() } },
            ],
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
    const matrices = await this.approvalMatrixService.findByModule(
      dto.module,
      undefined, // role - implement if needed
      position?.code,
    );

    if (matrices.length === 0) {
      throw new NotFoundException(`No approval matrix found for module ${dto.module}`);
    }

    // Filter matrices based on conditions
    const applicableMatrices = await this.validatorService.filterMatricesByConditions(
      matrices,
      dto.details,
    );

    if (applicableMatrices.length === 0) {
      throw new BadRequestException('No approval matrix matches the request conditions');
    }

    // Create the request
    const request = await this.requestService.create(dto, requesterProfileId);

    // Create approval steps based on matrices
    const approvalSteps = await this.createApprovalSteps(request.id, applicableMatrices);

    // Return request with steps
    return this.prisma.request.findUnique({
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
    }) as Promise<Request>;
  }

  async processApproval(
    requestId: string,
    stepId: string,
    dto: ProcessApprovalDto,
    approverProfileId: string,
  ): Promise<Request> {
    // Get the approval step
    const step = await this.prisma.approvalStep.findUnique({
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

    // Check if user can approve (either direct approver or delegate)
    const canApprove = await this.canUserApprove(step, approverProfileId);
    if (!canApprove) {
      throw new BadRequestException('You are not authorized to approve this step');
    }

    // Check if step is waiting
    if (step.status !== ApprovalStatus.WAITING) {
      throw new BadRequestException('This step has already been processed');
    }

    // Check if this is the current step
    if (step.sequence !== step.request.currentStep) {
      throw new BadRequestException('This is not the current approval step');
    }

    // Update the step
    await this.prisma.approvalStep.update({
      where: { id: stepId },
      data: {
        status: dto.action === ApprovalAction.APPROVE ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        action: dto.action,
        notes: dto.notes,
        approvedAt: new Date(),
      },
    });

    // Handle the workflow based on action
    if (dto.action === ApprovalAction.APPROVE) {
      await this.handleApproval(requestId, step.sequence);
    } else if (dto.action === ApprovalAction.REJECT) {
      await this.handleRejection(requestId);
    } else if (dto.action === ApprovalAction.RETURN) {
      await this.handleReturn(requestId, step.sequence);
    }

    // Return updated request
    return this.requestService.findOne(requestId);
  }

  private async createApprovalSteps(requestId: string, matrices: any[]): Promise<ApprovalStep[]> {
    const steps: ApprovalStep[] = [];

    for (const matrix of matrices) {
      // Get approvers based on type
      const approvers = await this.getApprovers(matrix.approverType, matrix.approverValue);

      for (const approver of approvers) {
        const step = await this.prisma.approvalStep.create({
          data: {
            id: this.generateId('aps'),
            requestId,
            sequence: matrix.approvalSequence,
            approverProfileId: approver.id,
            approverType: matrix.approverType,
            status: matrix.approvalSequence === 1 ? ApprovalStatus.WAITING : ApprovalStatus.PENDING,
          },
        });
        steps.push(step);
      }
    }

    return steps;
  }

  private async getApprovers(approverType: ApproverType, approverValue: string): Promise<any[]> {
    switch (approverType) {
      case ApproverType.SPECIFIC_USER:
        const userProfile = await this.prisma.userProfile.findFirst({
          where: {
            OR: [
              { id: approverValue },
              { clerkUserId: approverValue },
            ],
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
            OR: [
              { endDate: null },
              { endDate: { gte: new Date() } },
            ],
          },
          include: {
            userProfile: true,
          },
        });
        return userPositions.map(up => up.userProfile);

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
            OR: [
              { endDate: null },
              { endDate: { gte: new Date() } },
            ],
          },
          include: {
            userProfile: true,
          },
        });
        return departments.map(up => up.userProfile);

      default:
        return [];
    }
  }

  private async canUserApprove(step: ApprovalStep, approverProfileId: string): Promise<boolean> {
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

  private async handleApproval(requestId: string, currentSequence: number): Promise<void> {
    // Check if all steps in current sequence are approved
    const currentSteps = await this.prisma.approvalStep.findMany({
      where: {
        requestId,
        sequence: currentSequence,
      },
    });

    const allApproved = currentSteps.every(s => s.status === ApprovalStatus.APPROVED);

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
        await this.requestService.updateCurrentStep(requestId, currentSequence + 1);
      } else {
        // All steps completed - approve request
        await this.requestService.updateStatus(requestId, RequestStatus.APPROVED);
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

  private async handleReturn(requestId: string, currentSequence: number): Promise<void> {
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

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}