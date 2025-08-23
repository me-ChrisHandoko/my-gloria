export enum ApprovalEventType {
  REQUEST_CREATED = 'approval.request.created',
  REQUEST_UPDATED = 'approval.request.updated',
  REQUEST_APPROVED = 'approval.request.approved',
  REQUEST_REJECTED = 'approval.request.rejected',
  REQUEST_CANCELLED = 'approval.request.cancelled',
  REQUEST_COMPLETED = 'approval.request.completed',

  STEP_APPROVED = 'approval.step.approved',
  STEP_REJECTED = 'approval.step.rejected',
  STEP_SKIPPED = 'approval.step.skipped',
  STEP_DELEGATED = 'approval.step.delegated',

  DELEGATION_CREATED = 'approval.delegation.created',
  DELEGATION_ACTIVATED = 'approval.delegation.activated',
  DELEGATION_EXPIRED = 'approval.delegation.expired',

  WORKFLOW_STARTED = 'approval.workflow.started',
  WORKFLOW_COMPLETED = 'approval.workflow.completed',
  WORKFLOW_FAILED = 'approval.workflow.failed',
}

export class ApprovalEvent {
  constructor(
    public readonly type: ApprovalEventType,
    public readonly timestamp: Date = new Date(),
    public readonly correlationId?: string,
  ) {}
}

export class RequestCreatedEvent extends ApprovalEvent {
  constructor(
    public readonly requestId: string,
    public readonly module: string,
    public readonly requesterProfileId: string,
    public readonly details: Record<string, any>,
    correlationId?: string,
  ) {
    super(ApprovalEventType.REQUEST_CREATED, new Date(), correlationId);
  }
}

export class RequestUpdatedEvent extends ApprovalEvent {
  constructor(
    public readonly requestId: string,
    public readonly updatedBy: string,
    public readonly changes: Record<string, any>,
    correlationId?: string,
  ) {
    super(ApprovalEventType.REQUEST_UPDATED, new Date(), correlationId);
  }
}

export class RequestApprovedEvent extends ApprovalEvent {
  constructor(
    public readonly requestId: string,
    public readonly approverProfileId: string,
    public readonly stepId: string,
    public readonly notes?: string,
    correlationId?: string,
  ) {
    super(ApprovalEventType.REQUEST_APPROVED, new Date(), correlationId);
  }
}

export class RequestRejectedEvent extends ApprovalEvent {
  constructor(
    public readonly requestId: string,
    public readonly rejectedBy: string,
    public readonly stepId: string,
    public readonly reason: string,
    correlationId?: string,
  ) {
    super(ApprovalEventType.REQUEST_REJECTED, new Date(), correlationId);
  }
}

export class RequestCancelledEvent extends ApprovalEvent {
  constructor(
    public readonly requestId: string,
    public readonly cancelledBy: string,
    public readonly reason: string,
    correlationId?: string,
  ) {
    super(ApprovalEventType.REQUEST_CANCELLED, new Date(), correlationId);
  }
}

export class RequestCompletedEvent extends ApprovalEvent {
  constructor(
    public readonly requestId: string,
    public readonly completedAt: Date,
    public readonly finalStatus: string,
    correlationId?: string,
  ) {
    super(ApprovalEventType.REQUEST_COMPLETED, new Date(), correlationId);
  }
}

export class StepApprovedEvent extends ApprovalEvent {
  constructor(
    public readonly stepId: string,
    public readonly requestId: string,
    public readonly approverProfileId: string,
    public readonly sequence: number,
    public readonly notes?: string,
    correlationId?: string,
  ) {
    super(ApprovalEventType.STEP_APPROVED, new Date(), correlationId);
  }
}

export class StepRejectedEvent extends ApprovalEvent {
  constructor(
    public readonly stepId: string,
    public readonly requestId: string,
    public readonly rejectedBy: string,
    public readonly sequence: number,
    public readonly reason: string,
    correlationId?: string,
  ) {
    super(ApprovalEventType.STEP_REJECTED, new Date(), correlationId);
  }
}

export class StepSkippedEvent extends ApprovalEvent {
  constructor(
    public readonly stepId: string,
    public readonly requestId: string,
    public readonly sequence: number,
    public readonly reason: string,
    correlationId?: string,
  ) {
    super(ApprovalEventType.STEP_SKIPPED, new Date(), correlationId);
  }
}

export class StepDelegatedEvent extends ApprovalEvent {
  constructor(
    public readonly stepId: string,
    public readonly requestId: string,
    public readonly fromProfileId: string,
    public readonly toProfileId: string,
    public readonly delegationId: string,
    correlationId?: string,
  ) {
    super(ApprovalEventType.STEP_DELEGATED, new Date(), correlationId);
  }
}

export class DelegationCreatedEvent extends ApprovalEvent {
  constructor(
    public readonly delegationId: string,
    public readonly fromProfileId: string,
    public readonly toProfileId: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
    correlationId?: string,
  ) {
    super(ApprovalEventType.DELEGATION_CREATED, new Date(), correlationId);
  }
}

export class DelegationActivatedEvent extends ApprovalEvent {
  constructor(
    public readonly delegationId: string,
    public readonly activatedFor: string[],
    correlationId?: string,
  ) {
    super(ApprovalEventType.DELEGATION_ACTIVATED, new Date(), correlationId);
  }
}

export class DelegationExpiredEvent extends ApprovalEvent {
  constructor(
    public readonly delegationId: string,
    public readonly expiredAt: Date,
    correlationId?: string,
  ) {
    super(ApprovalEventType.DELEGATION_EXPIRED, new Date(), correlationId);
  }
}

export class WorkflowStartedEvent extends ApprovalEvent {
  constructor(
    public readonly requestId: string,
    public readonly module: string,
    public readonly totalSteps: number,
    correlationId?: string,
  ) {
    super(ApprovalEventType.WORKFLOW_STARTED, new Date(), correlationId);
  }
}

export class WorkflowCompletedEvent extends ApprovalEvent {
  constructor(
    public readonly requestId: string,
    public readonly completedAt: Date,
    public readonly result: 'approved' | 'rejected' | 'cancelled',
    correlationId?: string,
  ) {
    super(ApprovalEventType.WORKFLOW_COMPLETED, new Date(), correlationId);
  }
}

export class WorkflowFailedEvent extends ApprovalEvent {
  constructor(
    public readonly requestId: string,
    public readonly error: string,
    public readonly failedAt: Date,
    correlationId?: string,
  ) {
    super(ApprovalEventType.WORKFLOW_FAILED, new Date(), correlationId);
  }
}
