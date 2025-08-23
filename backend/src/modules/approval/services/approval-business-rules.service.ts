import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  RequestStatus,
  ApprovalStatus,
  ApprovalStep,
  Request,
  UserProfile,
  ApprovalAction,
  ApproverType,
  ApprovalDelegation,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { DelegationRepository } from '../repositories/delegation.repository';
import { CacheService } from '../../../cache/cache.service';

export interface StateTransitionRule {
  from: RequestStatus;
  to: RequestStatus[];
  condition?: (request: Request) => boolean;
}

export interface ApprovalAuthorityRule {
  approverType: ApproverType;
  canApprove: (step: ApprovalStep, approver: UserProfile) => Promise<boolean>;
  canDelegate: boolean;
  maxDelegationDepth?: number;
}

export interface BusinessRuleViolation {
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  context?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  violations: BusinessRuleViolation[];
  warnings?: string[];
}

@Injectable()
export class ApprovalBusinessRulesService {
  private readonly logger = new Logger(ApprovalBusinessRulesService.name);

  // State transition rules configuration
  private readonly stateTransitions: StateTransitionRule[] = [
    {
      from: RequestStatus.DRAFT,
      to: [RequestStatus.PENDING, RequestStatus.CANCELLED],
    },
    {
      from: RequestStatus.PENDING,
      to: [RequestStatus.IN_PROGRESS, RequestStatus.CANCELLED],
    },
    {
      from: RequestStatus.IN_PROGRESS,
      to: [
        RequestStatus.APPROVED,
        RequestStatus.REJECTED,
        RequestStatus.CANCELLED,
      ],
    },
    {
      from: RequestStatus.APPROVED,
      to: [], // Final state - no transitions allowed
    },
    {
      from: RequestStatus.REJECTED,
      to: [], // Final state - no transitions allowed
    },
    {
      from: RequestStatus.CANCELLED,
      to: [], // Final state - no transitions allowed
    },
  ];

  // Business rules configuration
  private readonly businessRules = {
    // Maximum number of approval steps
    maxApprovalSteps: 10,
    // Maximum delegation chain depth
    maxDelegationDepth: 3,
    // Approval timeout in days
    approvalTimeoutDays: 30,
    // Allow self-approval
    allowSelfApproval: false,
    // Allow parallel approvals at same sequence
    allowParallelApprovals: true,
    // Require notes for rejection
    requireRejectionNotes: true,
    // Require notes for return action
    requireReturnNotes: true,
    // Allow skip approval levels
    allowSkipLevels: false,
    // Auto-approve if delegated and delegate approves
    autoApproveOnDelegation: true,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly delegationRepository: DelegationRepository,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Validate state transition
   */
  async validateStateTransition(
    from: RequestStatus,
    to: RequestStatus,
    request?: Request,
  ): Promise<ValidationResult> {
    const violations: BusinessRuleViolation[] = [];
    const warnings: string[] = [];

    // Find applicable transition rule
    const transitionRule = this.stateTransitions.find(
      (rule) => rule.from === from,
    );

    if (!transitionRule) {
      violations.push({
        rule: 'state_transition',
        message: `No transition rules defined for status: ${from}`,
        severity: 'error',
        context: { from, to },
      });
      return { valid: false, violations, warnings };
    }

    // Check if target state is allowed
    if (!transitionRule.to.includes(to)) {
      violations.push({
        rule: 'state_transition',
        message: `Invalid transition from ${from} to ${to}`,
        severity: 'error',
        context: { from, to, allowedTransitions: transitionRule.to },
      });
      return { valid: false, violations, warnings };
    }

    // Check additional conditions if any
    if (transitionRule.condition && request) {
      if (!transitionRule.condition(request)) {
        violations.push({
          rule: 'state_transition_condition',
          message: `Transition condition not met for ${from} to ${to}`,
          severity: 'error',
          context: {
            from,
            to,
            request: { id: request.id, currentStep: request.currentStep },
          },
        });
        return { valid: false, violations, warnings };
      }
    }

    // Add warnings for specific transitions
    if (from === RequestStatus.IN_PROGRESS && to === RequestStatus.CANCELLED) {
      warnings.push(
        'Cancelling an in-progress request will notify all pending approvers',
      );
    }

    return { valid: violations.length === 0, violations, warnings };
  }

  /**
   * Validate approval authority
   */
  async validateApprovalAuthority(
    step: ApprovalStep & { request?: Request },
    approver: UserProfile,
  ): Promise<ValidationResult> {
    const violations: BusinessRuleViolation[] = [];
    const warnings: string[] = [];

    // Check if approver is the designated approver for this step
    if (step.approverProfileId !== approver.id) {
      // Check for active delegation
      const delegation = await this.checkDelegation(
        step.approverProfileId,
        approver.id,
        step.request?.module,
      );

      if (!delegation) {
        violations.push({
          rule: 'approval_authority',
          message: 'User is not authorized to approve this step',
          severity: 'error',
          context: {
            stepApprover: step.approverProfileId,
            actualApprover: approver.id,
          },
        });
      } else {
        warnings.push(
          `Approving on behalf of ${step.approverProfileId} through delegation`,
        );
      }
    }

    // Check self-approval rule
    if (!this.businessRules.allowSelfApproval && step.request) {
      if (step.request.requesterProfileId === approver.id) {
        violations.push({
          rule: 'self_approval',
          message: 'Self-approval is not allowed',
          severity: 'error',
          context: {
            requester: step.request.requesterProfileId,
            approver: approver.id,
          },
        });
      }
    }

    // Check if step is in correct status for approval
    if (step.status !== ApprovalStatus.PENDING) {
      violations.push({
        rule: 'step_status',
        message: `Step is not pending approval (current status: ${step.status})`,
        severity: 'error',
        context: {
          stepId: step.id,
          currentStatus: step.status,
        },
      });
    }

    return { valid: violations.length === 0, violations, warnings };
  }

  /**
   * Validate approval action
   */
  async validateApprovalAction(
    action: ApprovalAction,
    notes: string | null,
    step: ApprovalStep,
  ): Promise<ValidationResult> {
    const violations: BusinessRuleViolation[] = [];
    const warnings: string[] = [];

    // Check if rejection requires notes
    if (
      action === ApprovalAction.REJECT &&
      this.businessRules.requireRejectionNotes
    ) {
      if (!notes || notes.trim().length === 0) {
        violations.push({
          rule: 'rejection_notes',
          message: 'Rejection requires notes',
          severity: 'error',
          context: { action },
        });
      }
    }

    // Check if return action requires notes
    if (
      action === ApprovalAction.RETURN &&
      this.businessRules.requireReturnNotes
    ) {
      if (!notes || notes.trim().length === 0) {
        violations.push({
          rule: 'return_notes',
          message: 'Return action requires notes',
          severity: 'error',
          context: { action },
        });
      }
    }

    // Validate action is allowed for current step
    const allowedActions = await this.getAllowedActionsForStep(step);
    if (!allowedActions.includes(action)) {
      violations.push({
        rule: 'invalid_action',
        message: `Action ${action} is not allowed for this step`,
        severity: 'error',
        context: { action, allowedActions },
      });
    }

    return { valid: violations.length === 0, violations, warnings };
  }

  /**
   * Validate approval sequence
   */
  async validateApprovalSequence(
    requestId: string,
    currentSequence: number,
  ): Promise<ValidationResult> {
    const violations: BusinessRuleViolation[] = [];
    const warnings: string[] = [];

    // Get all steps for the request
    const steps = await this.prisma.approvalStep.findMany({
      where: { requestId },
      orderBy: { sequence: 'asc' },
    });

    // Check if skipping levels is allowed
    if (!this.businessRules.allowSkipLevels) {
      // Find the last approved sequence
      const lastApprovedStep = steps
        .filter((s) => s.status === ApprovalStatus.APPROVED)
        .sort((a, b) => b.sequence - a.sequence)[0];

      if (lastApprovedStep && currentSequence > lastApprovedStep.sequence + 1) {
        violations.push({
          rule: 'skip_level',
          message: 'Skipping approval levels is not allowed',
          severity: 'error',
          context: {
            lastApprovedSequence: lastApprovedStep.sequence,
            attemptedSequence: currentSequence,
          },
        });
      }
    }

    // Check parallel approvals
    if (this.businessRules.allowParallelApprovals) {
      const sameSequenceSteps = steps.filter(
        (s) => s.sequence === currentSequence,
      );

      if (sameSequenceSteps.length > 1) {
        const pendingCount = sameSequenceSteps.filter(
          (s) => s.status === ApprovalStatus.PENDING,
        ).length;

        if (pendingCount > 0) {
          warnings.push(
            `${pendingCount} parallel approval(s) pending at this level`,
          );
        }
      }
    }

    // Check if all previous sequences are completed
    const previousSteps = steps.filter((s) => s.sequence < currentSequence);
    const incompletePrevious = previousSteps.filter(
      (s) =>
        s.status === ApprovalStatus.PENDING ||
        s.status === ApprovalStatus.WAITING,
    );

    if (incompletePrevious.length > 0) {
      violations.push({
        rule: 'sequence_order',
        message: 'Previous approval steps must be completed first',
        severity: 'error',
        context: {
          incompleteSteps: incompletePrevious.map((s) => ({
            sequence: s.sequence,
            status: s.status,
          })),
        },
      });
    }

    return { valid: violations.length === 0, violations, warnings };
  }

  /**
   * Validate business rules for request creation
   */
  async validateRequestCreation(
    module: string,
    requestDetails: Record<string, any>,
    requesterProfileId: string,
  ): Promise<ValidationResult> {
    const violations: BusinessRuleViolation[] = [];
    const warnings: string[] = [];

    // Check if requester has any pending requests in same module
    const pendingRequests = await this.prisma.request.count({
      where: {
        module,
        requesterProfileId,
        status: {
          in: [RequestStatus.PENDING, RequestStatus.IN_PROGRESS],
        },
      },
    });

    if (pendingRequests > 0) {
      warnings.push(
        `You have ${pendingRequests} pending request(s) in this module`,
      );
    }

    // Validate required fields based on module
    const requiredFields = await this.getRequiredFieldsForModule(module);
    const missingFields = requiredFields.filter(
      (field) => !requestDetails[field] || requestDetails[field] === '',
    );

    if (missingFields.length > 0) {
      violations.push({
        rule: 'required_fields',
        message: 'Missing required fields',
        severity: 'error',
        context: { missingFields },
      });
    }

    // Check business hours restriction (example)
    const now = new Date();
    const hour = now.getHours();
    if (hour < 8 || hour > 17) {
      warnings.push('Request created outside business hours');
    }

    return { valid: violations.length === 0, violations, warnings };
  }

  /**
   * Validate delegation rules
   */
  async validateDelegation(
    delegatorId: string,
    delegateId: string,
    module: string | null,
    startDate: Date,
    endDate: Date,
  ): Promise<ValidationResult> {
    const violations: BusinessRuleViolation[] = [];
    const warnings: string[] = [];

    // Check if delegator and delegate are different
    if (delegatorId === delegateId) {
      violations.push({
        rule: 'self_delegation',
        message: 'Cannot delegate to yourself',
        severity: 'error',
        context: { delegatorId, delegateId },
      });
    }

    // Check date validity
    if (startDate >= endDate) {
      violations.push({
        rule: 'delegation_dates',
        message: 'End date must be after start date',
        severity: 'error',
        context: { startDate, endDate },
      });
    }

    // Check for delegation chains
    const delegationDepth = await this.checkDelegationDepth(
      delegatorId,
      delegateId,
    );
    if (delegationDepth >= this.businessRules.maxDelegationDepth) {
      violations.push({
        rule: 'delegation_depth',
        message: `Maximum delegation depth (${this.businessRules.maxDelegationDepth}) exceeded`,
        severity: 'error',
        context: { currentDepth: delegationDepth },
      });
    }

    // Check for circular delegation
    const hasCircular = await this.checkCircularDelegation(
      delegatorId,
      delegateId,
    );
    if (hasCircular) {
      violations.push({
        rule: 'circular_delegation',
        message: 'Circular delegation detected',
        severity: 'error',
        context: { delegatorId, delegateId },
      });
    }

    // Check for overlapping delegations
    const overlapping = await this.checkOverlappingDelegations(
      delegatorId,
      module,
      startDate,
      endDate,
    );
    if (overlapping) {
      warnings.push('Overlapping delegation period detected');
    }

    return { valid: violations.length === 0, violations, warnings };
  }

  /**
   * Check if approval timeout is exceeded
   */
  async checkApprovalTimeout(step: ApprovalStep): Promise<boolean> {
    const now = new Date();
    const stepAge = Math.floor(
      (now.getTime() - step.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    return stepAge > this.businessRules.approvalTimeoutDays;
  }

  /**
   * Get business rule configuration
   */
  getBusinessRules(): typeof this.businessRules {
    return { ...this.businessRules };
  }

  /**
   * Update business rule configuration
   */
  updateBusinessRule(key: keyof typeof this.businessRules, value: any): void {
    if (key in this.businessRules) {
      (this.businessRules as any)[key] = value;
      this.logger.log(`Business rule updated: ${key} = ${value}`);
    }
  }

  // Private helper methods

  private async checkDelegation(
    originalApproverId: string,
    actualApproverId: string,
    module?: string,
  ): Promise<ApprovalDelegation | null> {
    const cacheKey = `delegation:${originalApproverId}:${actualApproverId}:${module || 'all'}`;

    // Check cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as ApprovalDelegation;
    }

    const delegation = await this.delegationRepository.findActiveDelegation(
      originalApproverId,
      module,
    );

    if (delegation) {
      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, JSON.stringify(delegation), 300);
    }

    return delegation;
  }

  private async getAllowedActionsForStep(
    step: ApprovalStep,
  ): Promise<ApprovalAction[]> {
    // Get request to check if it's the first step
    const request = await this.prisma.request.findUnique({
      where: { id: step.requestId },
    });

    const allowedActions: ApprovalAction[] = [
      ApprovalAction.APPROVE,
      ApprovalAction.REJECT,
    ];

    // Allow RETURN action only if not the first step
    if (request && step.sequence > 1) {
      allowedActions.push(ApprovalAction.RETURN);
    }

    return allowedActions;
  }

  private async getRequiredFieldsForModule(module: string): Promise<string[]> {
    // This would typically come from a configuration table or service
    const moduleRequirements: Record<string, string[]> = {
      PURCHASE_REQUEST: ['amount', 'description', 'vendor'],
      LEAVE_REQUEST: ['startDate', 'endDate', 'leaveType', 'reason'],
      EXPENSE_CLAIM: ['amount', 'category', 'description', 'date'],
      // Add more modules as needed
    };

    return moduleRequirements[module] || [];
  }

  private async checkDelegationDepth(
    delegatorId: string,
    delegateId: string,
  ): Promise<number> {
    let depth = 0;
    let currentDelegatorId = delegatorId;

    // Follow the delegation chain
    while (depth < this.businessRules.maxDelegationDepth + 1) {
      const delegation = await this.prisma.approvalDelegation.findFirst({
        where: {
          delegatorProfileId: currentDelegatorId,
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      });

      if (!delegation) {
        break;
      }

      depth++;
      currentDelegatorId = delegation.delegateProfileId;

      // Avoid infinite loops
      if (currentDelegatorId === delegateId) {
        break;
      }
    }

    return depth;
  }

  private async checkCircularDelegation(
    delegatorId: string,
    delegateId: string,
  ): Promise<boolean> {
    // Check if delegate has already delegated back to delegator
    const reverseDelegation = await this.prisma.approvalDelegation.findFirst({
      where: {
        delegatorProfileId: delegateId,
        delegateProfileId: delegatorId,
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    return !!reverseDelegation;
  }

  private async checkOverlappingDelegations(
    delegatorId: string,
    module: string | null,
    startDate: Date,
    endDate: Date,
  ): Promise<boolean> {
    const overlapping = await this.prisma.approvalDelegation.findFirst({
      where: {
        delegatorProfileId: delegatorId,
        module: module,
        isActive: true,
        OR: [
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: startDate } },
            ],
          },
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: endDate } },
            ],
          },
          {
            AND: [
              { startDate: { gte: startDate } },
              { endDate: { lte: endDate } },
            ],
          },
        ],
      },
    });

    return !!overlapping;
  }

  /**
   * Validate all business rules for an approval action
   */
  async validateApprovalProcess(
    stepId: string,
    approverId: string,
    action: ApprovalAction,
    notes?: string,
  ): Promise<ValidationResult> {
    const allViolations: BusinessRuleViolation[] = [];
    const allWarnings: string[] = [];

    try {
      // Get step with request details
      const step = await this.prisma.approvalStep.findUnique({
        where: { id: stepId },
        include: { request: true },
      });

      if (!step) {
        allViolations.push({
          rule: 'step_not_found',
          message: 'Approval step not found',
          severity: 'error',
          context: { stepId },
        });
        return {
          valid: false,
          violations: allViolations,
          warnings: allWarnings,
        };
      }

      // Get approver profile
      const approver = await this.prisma.userProfile.findUnique({
        where: { id: approverId },
      });

      if (!approver) {
        allViolations.push({
          rule: 'approver_not_found',
          message: 'Approver profile not found',
          severity: 'error',
          context: { approverId },
        });
        return {
          valid: false,
          violations: allViolations,
          warnings: allWarnings,
        };
      }

      // Validate authority
      const authorityResult = await this.validateApprovalAuthority(
        step,
        approver,
      );
      allViolations.push(...authorityResult.violations);
      if (authorityResult.warnings) {
        allWarnings.push(...authorityResult.warnings);
      }

      // Validate action
      const actionResult = await this.validateApprovalAction(
        action,
        notes || null,
        step,
      );
      allViolations.push(...actionResult.violations);
      if (actionResult.warnings) {
        allWarnings.push(...actionResult.warnings);
      }

      // Validate sequence
      const sequenceResult = await this.validateApprovalSequence(
        step.requestId,
        step.sequence,
      );
      allViolations.push(...sequenceResult.violations);
      if (sequenceResult.warnings) {
        allWarnings.push(...sequenceResult.warnings);
      }

      // Check timeout
      if (await this.checkApprovalTimeout(step)) {
        allWarnings.push(
          'This approval request has exceeded the timeout period',
        );
      }

      return {
        valid: allViolations.length === 0,
        violations: allViolations,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
      };
    } catch (error) {
      this.logger.error('Error validating approval process:', error);
      allViolations.push({
        rule: 'validation_error',
        message: 'An error occurred during validation',
        severity: 'error',
        context: { error: error.message },
      });
      return { valid: false, violations: allViolations, warnings: allWarnings };
    }
  }
}
