import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { NotificationService } from '../../notification/notification.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CacheService } from '../../../cache/cache.service';
import {
  Request,
  ApprovalStep,
  UserProfile,
  RequestStatus,
  ApprovalStatus,
} from '@prisma/client';
import {
  NotificationType,
  Priority,
  NotificationChannel,
} from '../../notification/enums/notification.enum';

interface NotificationContext {
  request: Request & {
    requester?: any;
    approvalSteps?: (ApprovalStep & {
      approver?: any;
    })[];
  };
  action: string;
  actor?: any;
  additionalData?: Record<string, any>;
}

interface ApprovalNotificationTemplate {
  type: NotificationType;
  title: string;
  message: string;
  priority: Priority;
  channels: NotificationChannel[];
}

@Injectable()
export class ApprovalNotificationService {
  private readonly logger = new Logger(ApprovalNotificationService.name);

  private readonly templates: Record<string, ApprovalNotificationTemplate> = {
    PENDING_APPROVAL: {
      type: NotificationType.APPROVAL_REQUEST,
      title: 'Approval Required',
      message: 'You have a new approval request for {module}: {title}',
      priority: Priority.HIGH,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    },
    APPROVAL_APPROVED: {
      type: NotificationType.APPROVAL_RESULT,
      title: 'Request Approved',
      message:
        'Your request for {module}: {title} has been approved by {approver}',
      priority: Priority.MEDIUM,
      channels: [NotificationChannel.IN_APP],
    },
    APPROVAL_REJECTED: {
      type: NotificationType.APPROVAL_RESULT,
      title: 'Request Rejected',
      message:
        'Your request for {module}: {title} has been rejected by {approver}',
      priority: Priority.HIGH,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    },
    APPROVAL_RECALLED: {
      type: NotificationType.APPROVAL_RESULT,
      title: 'Approval Recalled',
      message:
        'The approval for {module}: {title} has been recalled by {approver}',
      priority: Priority.HIGH,
      channels: [NotificationChannel.IN_APP],
    },
    REQUEST_CANCELLED: {
      type: NotificationType.APPROVAL_RESULT,
      title: 'Request Cancelled',
      message: 'The request for {module}: {title} has been cancelled',
      priority: Priority.MEDIUM,
      channels: [NotificationChannel.IN_APP],
    },
    DELEGATION_ASSIGNED: {
      type: NotificationType.DELEGATION,
      title: 'Delegation Assigned',
      message:
        'You have been delegated to approve {module}: {title} on behalf of {delegator}',
      priority: Priority.HIGH,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    },
    DELEGATION_REVOKED: {
      type: NotificationType.DELEGATION,
      title: 'Delegation Revoked',
      message: 'Your delegation for {module}: {title} has been revoked',
      priority: Priority.MEDIUM,
      channels: [NotificationChannel.IN_APP],
    },
    ALL_APPROVED: {
      type: NotificationType.APPROVAL_RESULT,
      title: 'Request Fully Approved',
      message:
        'Your request for {module}: {title} has been fully approved and is now complete',
      priority: Priority.HIGH,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    },
    ESCALATION_NOTICE: {
      type: NotificationType.APPROVAL_REQUEST,
      title: 'Approval Escalated',
      message:
        'The approval request for {module}: {title} has been escalated due to timeout',
      priority: Priority.URGENT,
      channels: [
        NotificationChannel.IN_APP,
        NotificationChannel.EMAIL,
        NotificationChannel.PUSH,
      ],
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Notify next approvers in sequence
   */
  async notifyNextApprovers(
    requestId: string,
    sequence: number,
  ): Promise<void> {
    try {
      const request = await this.getRequestWithDetails(requestId);
      if (!request) {
        throw new Error(`Request ${requestId} not found`);
      }

      // Get pending approval steps for the current sequence
      const pendingSteps = await this.prisma.approvalStep.findMany({
        where: {
          requestId,
          sequence,
          status: ApprovalStatus.PENDING,
        },
        include: {
          approver: true,
        },
      });

      // Send notifications to each approver
      const notifications: Promise<void>[] = [];
      for (const step of pendingSteps) {
        // Notify primary approver
        if (step.approver) {
          notifications.push(
            this.sendApprovalNotification(
              'PENDING_APPROVAL',
              step.approverProfileId,
              { request: request as any, action: 'approval_required' },
            ),
          );
        }

        // TODO: Check for active delegation via delegation service when available
        // Currently disabled as delegationService is not injected
      }

      await Promise.all(notifications);
      this.logger.log(
        `Notified ${notifications.length} approvers for request ${requestId} sequence ${sequence}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify approvers for request ${requestId}`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to send approval notifications',
      );
    }
  }

  /**
   * Notify requester of approval result
   */
  async notifyRequester(
    requestId: string,
    action: 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED',
    actor?: any,
  ): Promise<void> {
    try {
      const request = await this.getRequestWithDetails(requestId);
      if (!request) {
        throw new Error(`Request ${requestId} not found`);
      }

      let templateKey: string;
      switch (action) {
        case 'APPROVED':
          templateKey = 'APPROVAL_APPROVED';
          break;
        case 'REJECTED':
          templateKey = 'APPROVAL_REJECTED';
          break;
        case 'CANCELLED':
          templateKey = 'REQUEST_CANCELLED';
          break;
        case 'COMPLETED':
          templateKey = 'ALL_APPROVED';
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      await this.sendApprovalNotification(
        templateKey,
        (request as any).requesterProfileId,
        {
          request: request as any,
          action: action.toLowerCase(),
          actor,
        },
      );

      this.logger.log(
        `Notified requester ${(request as any).requesterProfileId} of ${action} for request ${requestId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify requester for request ${requestId}`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to send requester notification',
      );
    }
  }

  /**
   * Notify on delegation changes
   */
  async notifyDelegation(
    delegation: any,
    action: 'ASSIGNED' | 'REVOKED',
  ): Promise<void> {
    try {
      const request = delegation.approvalStep
        ? await this.getRequestWithDetails(delegation.approvalStep.requestId)
        : null;

      if (!request) {
        this.logger.warn(`Request not found for delegation ${delegation.id}`);
        return;
      }

      const templateKey =
        action === 'ASSIGNED' ? 'DELEGATION_ASSIGNED' : 'DELEGATION_REVOKED';

      await this.sendApprovalNotification(
        templateKey,
        delegation.delegateProfileId,
        {
          request: request as any,
          action: `delegation_${action.toLowerCase()}`,
          additionalData: {
            delegator:
              delegation.delegator?.employeeName || 'Unknown Delegator',
            delegationId: delegation.id,
            startDate: delegation.startDate,
            endDate: delegation.endDate,
          },
        },
      );

      this.logger.log(
        `Notified delegate ${delegation.delegateProfileId} of delegation ${action}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify delegation for ${delegation.id}`,
        error,
      );
      // Don't throw - delegation notification is not critical
    }
  }

  /**
   * Notify on approval recall
   */
  async notifyApprovalRecall(
    step: ApprovalStep & { approver?: any },
    request: Request,
    actor: any,
  ): Promise<void> {
    try {
      // Notify the requester
      await this.sendApprovalNotification(
        'APPROVAL_RECALLED',
        (request as any).requesterProfileId,
        {
          request: request as any,
          action: 'approval_recalled',
          actor,
          additionalData: {
            stepId: step.id,
            sequence: step.sequence,
          },
        },
      );

      // Notify subsequent approvers that might be affected
      const subsequentSteps = await this.prisma.approvalStep.findMany({
        where: {
          requestId: request.id,
          sequence: { gt: step.sequence },
          status: ApprovalStatus.APPROVED,
        },
        include: {
          approver: true,
        },
      });

      const notifications = subsequentSteps.map((subsequentStep) =>
        this.sendApprovalNotification(
          'APPROVAL_RECALLED',
          subsequentStep.approverProfileId,
          {
            request: request as any,
            action: 'approval_recalled_cascaded',
            actor,
            additionalData: {
              originalStepId: step.id,
              affectedStepId: subsequentStep.id,
            },
          },
        ),
      );

      await Promise.all(notifications);
      this.logger.log(
        `Notified recall for step ${step.id} affecting ${subsequentSteps.length} subsequent steps`,
      );
    } catch (error) {
      this.logger.error(`Failed to notify approval recall`, error);
      // Don't throw - recall notification is not critical
    }
  }

  /**
   * Notify on escalation
   */
  async notifyEscalation(
    requestId: string,
    escalatedTo: string[],
    reason: string,
  ): Promise<void> {
    try {
      const request = await this.getRequestWithDetails(requestId);
      if (!request) {
        throw new Error(`Request ${requestId} not found`);
      }

      const notifications = escalatedTo.map((profileId) =>
        this.sendApprovalNotification('ESCALATION_NOTICE', profileId, {
          request: request as any,
          action: 'escalated',
          additionalData: {
            reason,
            escalatedAt: new Date(),
          },
        }),
      );

      await Promise.all(notifications);
      this.logger.log(
        `Sent escalation notifications for request ${requestId} to ${escalatedTo.length} users`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send escalation notifications for request ${requestId}`,
        error,
      );
      // Don't throw - escalation notification is not critical
    }
  }

  /**
   * Send batch notifications for bulk operations
   */
  async sendBulkNotifications(
    notifications: Array<{
      templateKey: string;
      recipientId: string;
      context: NotificationContext;
    }>,
  ): Promise<void> {
    try {
      const promises = notifications.map(
        ({ templateKey, recipientId, context }) =>
          this.sendApprovalNotification(templateKey, recipientId, context),
      );

      await Promise.allSettled(promises);
      this.logger.log(`Sent ${notifications.length} bulk notifications`);
    } catch (error) {
      this.logger.error('Failed to send bulk notifications', error);
      // Don't throw - continue with partial success
    }
  }

  /**
   * Calculate notification priority based on request
   */
  private calculatePriority(
    request: Request,
    defaultPriority: Priority,
  ): Priority {
    // Check if request has urgency metadata
    const urgency = (request.details as any)?.urgency;
    if (urgency === 'CRITICAL') return Priority.CRITICAL;
    if (urgency === 'URGENT') return Priority.URGENT;

    // Check if request is overdue
    const createdAt = new Date(request.createdAt);
    const daysSinceCreation = Math.floor(
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceCreation > 7) return Priority.URGENT;
    if (daysSinceCreation > 3) return Priority.HIGH;

    return defaultPriority;
  }

  /**
   * Send approval notification using template
   */
  private async sendApprovalNotification(
    templateKey: string,
    recipientId: string,
    context: NotificationContext,
  ): Promise<void> {
    try {
      const template = this.templates[templateKey];
      if (!template) {
        throw new Error(`Template ${templateKey} not found`);
      }

      // Format the message with context
      const formattedMessage = this.formatMessage(template.message, context);
      const formattedTitle = this.formatMessage(template.title, context);

      // Calculate dynamic priority
      const priority = this.calculatePriority(
        context.request,
        template.priority,
      );

      // Prepare notification data
      const notificationData = {
        requestId: context.request.id,
        module: context.request.module,
        action: context.action,
        requestNumber: context.request.requestNumber,
        createdAt: context.request.createdAt,
        ...context.additionalData,
      };

      // Send notification through notification service
      await this.notificationService.send({
        type: templateKey,
        recipientId,
        title: formattedTitle,
        message: formattedMessage,
        data: notificationData,
        priority,
        channels: template.channels,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send notification ${templateKey} to ${recipientId}`,
        error,
      );
      // Don't throw to prevent cascading failures
    }
  }

  /**
   * Format message with context variables
   */
  private formatMessage(
    template: string,
    context: NotificationContext,
  ): string {
    let message = template;

    // Replace template variables
    message = message.replace(
      '{module}',
      context.request.module || 'Unknown Module',
    );
    message = message.replace(
      '{title}',
      (context.request.details as any)?.title ||
        context.request.requestNumber ||
        'Request',
    );
    message = message.replace(
      '{approver}',
      context.actor?.employeeName || 'System',
    );
    message = message.replace(
      '{requester}',
      context.request.requester?.employeeName || 'Unknown',
    );

    // Replace additional context variables
    if (context.additionalData) {
      Object.entries(context.additionalData).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        if (message.includes(placeholder)) {
          message = message.replace(placeholder, String(value));
        }
      });
    }

    return message;
  }

  /**
   * Get request with all details for notification context
   */
  private async getRequestWithDetails(requestId: string) {
    // Check cache first
    const cacheKey = `notification:request:${requestId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: {
        requester: true,
        approvalSteps: {
          include: {
            approver: true,
          },
        },
      },
    });

    if (request) {
      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, request as any, 300);
    }

    return request;
  }

  /**
   * Clear notification cache for a request
   */
  async clearRequestCache(requestId: string): Promise<void> {
    const cacheKey = `notification:request:${requestId}`;
    await this.cacheService.del(cacheKey);
  }

  /**
   * Get notification statistics for a user
   */
  async getUserNotificationStats(userProfileId: string): Promise<{
    pendingApprovals: number;
    delegatedApprovals: number;
    totalNotifications: number;
  }> {
    try {
      // For now, we'll only count pending approvals
      // Delegation counting would need to be implemented separately
      const pendingApprovals = await this.prisma.approvalStep.count({
        where: {
          approverProfileId: userProfileId,
          status: ApprovalStatus.PENDING,
        },
      });

      // Placeholder for delegation count - would need delegation service implementation
      const delegatedApprovals = 0;

      const totalNotifications = pendingApprovals + delegatedApprovals;

      return {
        pendingApprovals,
        delegatedApprovals,
        totalNotifications,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get notification stats for user ${userProfileId}`,
        error,
      );
      return {
        pendingApprovals: 0,
        delegatedApprovals: 0,
        totalNotifications: 0,
      };
    }
  }
}
