import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  RequestCreatedEvent,
  RequestApprovedEvent,
  RequestRejectedEvent,
  RequestCompletedEvent,
  StepApprovedEvent,
  StepRejectedEvent,
  WorkflowStartedEvent,
  WorkflowCompletedEvent,
  DelegationCreatedEvent,
  DelegationActivatedEvent,
  ApprovalEventType,
} from './approval.events';
import { NotificationService } from '../../notification/notification.service';
import { AuditService } from '../../audit/services/audit.service';
import { CacheService } from '../../../cache/cache.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ApprovalEventHandlers {
  private readonly logger = new Logger(ApprovalEventHandlers.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
    private readonly prismaService: PrismaService,
  ) {}

  @OnEvent(ApprovalEventType.REQUEST_CREATED)
  async handleRequestCreated(event: RequestCreatedEvent) {
    this.logger.log(`Request created: ${event.requestId}`);

    try {
      // Find next approvers
      const nextApprovers = await this.findNextApprovers(event.requestId);

      // Send notifications
      await Promise.all(
        nextApprovers.map((approver) =>
          this.notificationService.send({
            type: 'APPROVAL_PENDING',
            recipientId: approver.approverProfileId,
            title: 'New Approval Request',
            message: `You have a new approval request for ${event.module}`,
            data: {
              requestId: event.requestId,
              module: event.module,
            },
          }),
        ),
      );

      // Audit log
      await this.auditService.logAction({
        entityType: 'REQUEST',
        entityId: event.requestId,
        action: 'CREATED',
        actorId: event.requesterProfileId,
        details: {
          module: event.module,
          correlationId: event.correlationId,
        },
      });

      // Invalidate cache
      await this.cacheService.del(`requests:*`);
    } catch (error) {
      this.logger.error(
        `Failed to handle request created event: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent(ApprovalEventType.REQUEST_APPROVED)
  async handleRequestApproved(event: RequestApprovedEvent) {
    this.logger.log(
      `Request approved: ${event.requestId} by ${event.approverProfileId}`,
    );

    try {
      // Check if all steps are approved
      const allApproved = await this.checkAllStepsApproved(event.requestId);

      if (allApproved) {
        // Notify requester of completion
        const request = await this.prismaService.request.findUnique({
          where: { id: event.requestId },
          select: { requesterProfileId: true, module: true },
        });

        if (request) {
          await this.notificationService.send({
            type: 'REQUEST_APPROVED',
            recipientId: request.requesterProfileId,
            title: 'Request Approved',
            message: `Your ${request.module} request has been fully approved`,
            data: { requestId: event.requestId },
          });
        }
      } else {
        // Find and notify next approvers
        const nextApprovers = await this.findNextApprovers(event.requestId);

        await Promise.all(
          nextApprovers.map((approver) =>
            this.notificationService.send({
              type: 'APPROVAL_PENDING',
              recipientId: approver.approverProfileId,
              title: 'Approval Required',
              message: `Please review approval request`,
              data: {
                requestId: event.requestId,
                sequence: approver.sequence,
              },
            }),
          ),
        );
      }

      // Audit log
      await this.auditService.logAction({
        entityType: 'REQUEST',
        entityId: event.requestId,
        action: 'APPROVED',
        actorId: event.approverProfileId,
        details: {
          stepId: event.stepId,
          notes: event.notes,
          correlationId: event.correlationId,
        },
      });

      // Invalidate cache
      await this.cacheService.del(`request:${event.requestId}`);
      await this.cacheService.del(`requests:*`);
    } catch (error) {
      this.logger.error(
        `Failed to handle request approved event: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent(ApprovalEventType.REQUEST_REJECTED)
  async handleRequestRejected(event: RequestRejectedEvent) {
    this.logger.log(
      `Request rejected: ${event.requestId} by ${event.rejectedBy}`,
    );

    try {
      // Notify requester
      const request = await this.prismaService.request.findUnique({
        where: { id: event.requestId },
        select: { requesterProfileId: true, module: true },
      });

      if (request) {
        await this.notificationService.send({
          type: 'REQUEST_REJECTED',
          recipientId: request.requesterProfileId,
          title: 'Request Rejected',
          message: `Your ${request.module} request has been rejected`,
          data: {
            requestId: event.requestId,
            reason: event.reason,
          },
        });
      }

      // Notify all pending approvers that request is no longer active
      const pendingApprovers = await this.findPendingApprovers(event.requestId);

      await Promise.all(
        pendingApprovers.map((approver) =>
          this.notificationService.send({
            type: 'REQUEST_CANCELLED',
            recipientId: approver.approverProfileId,
            title: 'Approval Cancelled',
            message: `The approval request has been rejected by another approver`,
            data: { requestId: event.requestId },
          }),
        ),
      );

      // Audit log
      await this.auditService.logAction({
        entityType: 'REQUEST',
        entityId: event.requestId,
        action: 'REJECTED',
        actorId: event.rejectedBy,
        details: {
          stepId: event.stepId,
          reason: event.reason,
          correlationId: event.correlationId,
        },
      });

      // Invalidate cache
      await this.cacheService.del(`request:${event.requestId}`);
      await this.cacheService.del(`requests:*`);
    } catch (error) {
      this.logger.error(
        `Failed to handle request rejected event: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent(ApprovalEventType.STEP_APPROVED)
  async handleStepApproved(event: StepApprovedEvent) {
    this.logger.log(
      `Step approved: ${event.stepId} for request ${event.requestId}`,
    );

    try {
      // Check if this completes the current sequence
      const sequenceComplete = await this.checkSequenceComplete(
        event.requestId,
        event.sequence,
      );

      if (sequenceComplete) {
        // Notify next sequence approvers
        const nextSequence = event.sequence + 1;
        const nextApprovers = await this.findApproversBySequence(
          event.requestId,
          nextSequence,
        );

        await Promise.all(
          nextApprovers.map((approver) =>
            this.notificationService.send({
              type: 'APPROVAL_PENDING',
              recipientId: approver.approverProfileId,
              title: 'Approval Required',
              message: `Previous approval level completed. Your approval is now required.`,
              data: {
                requestId: event.requestId,
                sequence: nextSequence,
              },
            }),
          ),
        );
      }

      // Audit log
      await this.auditService.logAction({
        entityType: 'APPROVAL_STEP',
        entityId: event.stepId,
        action: 'APPROVED',
        actorId: event.approverProfileId,
        details: {
          requestId: event.requestId,
          sequence: event.sequence,
          notes: event.notes,
          correlationId: event.correlationId,
        },
      });

      // Invalidate cache
      await this.cacheService.del(`step:${event.stepId}`);
      await this.cacheService.del(`request:${event.requestId}:steps`);
    } catch (error) {
      this.logger.error(
        `Failed to handle step approved event: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent(ApprovalEventType.WORKFLOW_STARTED)
  async handleWorkflowStarted(event: WorkflowStartedEvent) {
    this.logger.log(`Workflow started for request: ${event.requestId}`);

    try {
      // Set workflow metrics
      await this.cacheService.set(
        `workflow:${event.requestId}:started`,
        event.timestamp.toISOString(),
        3600,
      );

      // Track active workflows (use set as workaround since sadd not available)
      await this.cacheService.set(
        `active_workflow:${event.requestId}`,
        'true',
        3600,
      );

      // Audit log
      await this.auditService.logAction({
        entityType: 'WORKFLOW',
        entityId: event.requestId,
        action: 'STARTED',
        actorId: 'system',
        details: {
          module: event.module,
          totalSteps: event.totalSteps,
          correlationId: event.correlationId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle workflow started event: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent(ApprovalEventType.WORKFLOW_COMPLETED)
  async handleWorkflowCompleted(event: WorkflowCompletedEvent) {
    this.logger.log(
      `Workflow completed for request: ${event.requestId} with result: ${event.result}`,
    );

    try {
      // Calculate workflow duration
      const startedAt = await this.cacheService.get(
        `workflow:${event.requestId}:started`,
      );
      const duration = startedAt
        ? event.completedAt.getTime() - new Date(startedAt).getTime()
        : null;

      // Remove from active workflows
      await this.cacheService.del(`active_workflow:${event.requestId}`);

      // Clean up workflow cache
      await this.cacheService.del(`workflow:${event.requestId}:*`);

      // Notify stakeholders
      const request = await this.prismaService.request.findUnique({
        where: { id: event.requestId },
        select: {
          requesterProfileId: true,
          module: true,
          approvalSteps: {
            select: { approverProfileId: true },
            where: { status: 'APPROVED' },
          },
        },
      });

      // Notify requester
      if (request) {
        await this.notificationService.send({
          type: 'WORKFLOW_COMPLETED',
          recipientId: request.requesterProfileId,
          title: 'Workflow Completed',
          message: `Your ${request.module} workflow has been ${event.result}`,
          data: {
            requestId: event.requestId,
            result: event.result,
            duration,
          },
        });
      }

      // Audit log
      await this.auditService.logAction({
        entityType: 'WORKFLOW',
        entityId: event.requestId,
        action: 'COMPLETED',
        actorId: 'system',
        details: {
          result: event.result,
          duration,
          correlationId: event.correlationId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle workflow completed event: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent(ApprovalEventType.DELEGATION_CREATED)
  async handleDelegationCreated(event: DelegationCreatedEvent) {
    this.logger.log(`Delegation created: ${event.delegationId}`);

    try {
      // Notify delegate
      await this.notificationService.send({
        type: 'DELEGATION_ASSIGNED',
        recipientId: event.toProfileId,
        title: 'Delegation Assigned',
        message: `You have been assigned as a delegate`,
        data: {
          delegationId: event.delegationId,
          fromProfileId: event.fromProfileId,
          startDate: event.startDate,
          endDate: event.endDate,
        },
      });

      // Audit log
      await this.auditService.logAction({
        entityType: 'DELEGATION',
        entityId: event.delegationId,
        action: 'CREATED',
        actorId: event.fromProfileId,
        details: {
          toProfileId: event.toProfileId,
          startDate: event.startDate,
          endDate: event.endDate,
          correlationId: event.correlationId,
        },
      });

      // Invalidate cache
      await this.cacheService.del(`delegations:${event.fromProfileId}`);
      await this.cacheService.del(`delegations:${event.toProfileId}`);
    } catch (error) {
      this.logger.error(
        `Failed to handle delegation created event: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent(ApprovalEventType.DELEGATION_ACTIVATED)
  async handleDelegationActivated(event: DelegationActivatedEvent) {
    this.logger.log(
      `Delegation activated: ${event.delegationId} for ${event.activatedFor.length} requests`,
    );

    try {
      // Get delegation details
      const delegation = await this.prismaService.approvalDelegation.findUnique(
        {
          where: { id: event.delegationId },
          select: {
            delegatorProfileId: true,
            delegateProfileId: true,
          },
        },
      );

      // Notify delegate about activated requests
      if (delegation && event.activatedFor.length > 0) {
        await this.notificationService.send({
          type: 'DELEGATION_ACTIVATED',
          recipientId: delegation.delegateProfileId,
          title: 'Delegation Activated',
          message: `You have ${event.activatedFor.length} delegated approval(s) to review`,
          data: {
            delegationId: event.delegationId,
            requestIds: event.activatedFor,
          },
        });
      }

      // Audit log
      await this.auditService.logAction({
        entityType: 'DELEGATION',
        entityId: event.delegationId,
        action: 'ACTIVATED',
        actorId: 'system',
        details: {
          activatedFor: event.activatedFor,
          correlationId: event.correlationId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle delegation activated event: ${error.message}`,
        error.stack,
      );
    }
  }

  // Helper methods
  private async findNextApprovers(requestId: string) {
    return this.prismaService.approvalStep.findMany({
      where: {
        requestId,
        status: 'PENDING',
      },
      orderBy: {
        sequence: 'asc',
      },
      take: 5,
    });
  }

  private async findPendingApprovers(requestId: string) {
    return this.prismaService.approvalStep.findMany({
      where: {
        requestId,
        status: 'PENDING',
      },
    });
  }

  private async findApproversBySequence(requestId: string, sequence: number) {
    return this.prismaService.approvalStep.findMany({
      where: {
        requestId,
        sequence,
        status: 'PENDING',
      },
    });
  }

  private async checkAllStepsApproved(requestId: string): Promise<boolean> {
    const pendingCount = await this.prismaService.approvalStep.count({
      where: {
        requestId,
        status: 'PENDING',
      },
    });

    return pendingCount === 0;
  }

  private async checkSequenceComplete(
    requestId: string,
    sequence: number,
  ): Promise<boolean> {
    const pendingInSequence = await this.prismaService.approvalStep.count({
      where: {
        requestId,
        sequence,
        status: 'PENDING',
      },
    });

    return pendingInSequence === 0;
  }
}
