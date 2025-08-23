import {
  ApprovalAction,
  ApprovalStatus,
  RequestStatus,
  ApproverType,
} from '@prisma/client';

export interface IApprovalMatrix {
  id: string;
  module: string;
  requesterRole?: string;
  requesterPosition?: string;
  approvalSequence: number;
  approverType: ApproverType;
  approverValue: string;
  conditions?: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface IRequest {
  id: string;
  requestNumber: string;
  module: string;
  requesterProfileId: string;
  requestType: string;
  details: any;
  status: RequestStatus;
  currentStep: number;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IApprovalStep {
  id: string;
  requestId: string;
  sequence: number;
  approverProfileId: string;
  approverType: string;
  status: ApprovalStatus;
  action?: ApprovalAction;
  notes?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IApprovalDelegation {
  id: string;
  delegatorProfileId: string;
  delegateProfileId: string;
  module?: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface IRequestAttachment {
  id: string;
  requestId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: Date;
}

export interface IWorkflowContext {
  request: IRequest;
  currentUser: {
    profileId: string;
    clerkId: string;
    role?: string;
    position?: string;
  };
  approvalSteps?: IApprovalStep[];
  attachments?: IRequestAttachment[];
}

export interface IApprovalCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin';
  value: any;
}

export interface IApprovalMatrixConditions {
  all?: IApprovalCondition[];
  any?: IApprovalCondition[];
}
