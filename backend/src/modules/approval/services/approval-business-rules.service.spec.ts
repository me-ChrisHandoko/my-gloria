import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalBusinessRulesService } from './approval-business-rules.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApprovalDelegationRepository } from '../repositories/delegation.repository';
import { CacheService } from '../../../cache/cache.service';
import {
  RequestStatus,
  ApprovalStatus,
  ApprovalAction,
  ApproverType,
} from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('ApprovalBusinessRulesService', () => {
  let service: ApprovalBusinessRulesService;
  let prismaService: jest.Mocked<PrismaService>;
  let delegationRepository: jest.Mocked<ApprovalDelegationRepository>;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalBusinessRulesService,
        {
          provide: PrismaService,
          useValue: {
            request: {
              findUnique: jest.fn(),
              count: jest.fn(),
            },
            approvalStep: {
              findMany: jest.fn(),
            },
            approvalDelegation: {
              findFirst: jest.fn(),
            },
            userProfile: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: ApprovalDelegationRepository,
          useValue: {
            findActiveDelegation: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ApprovalBusinessRulesService>(
      ApprovalBusinessRulesService,
    );
    prismaService = module.get(PrismaService);
    delegationRepository = module.get(ApprovalDelegationRepository);
    cacheService = module.get(CacheService);
  });

  describe('validateStateTransition', () => {
    it('should allow valid transition from PENDING to IN_PROGRESS', async () => {
      const result = await service.validateStateTransition(
        RequestStatus.PENDING,
        RequestStatus.IN_PROGRESS,
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should reject invalid transition from APPROVED to PENDING', async () => {
      const result = await service.validateStateTransition(
        RequestStatus.APPROVED,
        RequestStatus.PENDING,
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].rule).toBe('state_transition');
    });

    it('should allow CANCELLED from IN_PROGRESS with warning', async () => {
      const result = await service.validateStateTransition(
        RequestStatus.IN_PROGRESS,
        RequestStatus.CANCELLED,
      );

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Cancelling an in-progress request will notify all pending approvers',
      );
    });

    it('should validate conditional transition for RETURNED status', async () => {
      const request = {
        id: 'req-1',
        currentStep: 1,
        status: RequestStatus.RETURNED,
      } as any;

      const result = await service.validateStateTransition(
        RequestStatus.RETURNED,
        RequestStatus.PENDING,
        request,
      );

      expect(result.valid).toBe(true);
    });

    it('should reject RETURNED to PENDING if not at first step', async () => {
      const request = {
        id: 'req-1',
        currentStep: 3,
        status: RequestStatus.RETURNED,
      } as any;

      const result = await service.validateStateTransition(
        RequestStatus.RETURNED,
        RequestStatus.PENDING,
        request,
      );

      expect(result.valid).toBe(false);
      expect(result.violations[0].rule).toBe('state_transition_condition');
    });
  });

  describe('validateApprovalAuthority', () => {
    const mockStep = {
      id: 'step-1',
      approverProfileId: 'approver-1',
      status: ApprovalStatus.PENDING,
      request: {
        id: 'req-1',
        requesterProfileId: 'requester-1',
        module: 'LEAVE_REQUEST',
      },
    } as any;

    const mockApprover = {
      id: 'approver-1',
      clerkId: 'clerk-1',
    } as any;

    it('should allow direct approver to approve', async () => {
      const result = await service.validateApprovalAuthority(
        mockStep,
        mockApprover,
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow delegated approver with warning', async () => {
      const differentApprover = { ...mockApprover, id: 'approver-2' };
      
      cacheService.get.mockResolvedValue(null);
      delegationRepository.findActiveDelegation.mockResolvedValue({
        id: 'delegation-1',
        delegatorProfileId: 'approver-1',
        delegateProfileId: 'approver-2',
      } as any);

      const result = await service.validateApprovalAuthority(
        mockStep,
        differentApprover,
      );

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'Approving on behalf of approver-1 through delegation',
      );
    });

    it('should reject unauthorized approver', async () => {
      const differentApprover = { ...mockApprover, id: 'approver-2' };
      
      cacheService.get.mockResolvedValue(null);
      delegationRepository.findActiveDelegation.mockResolvedValue(null);

      const result = await service.validateApprovalAuthority(
        mockStep,
        differentApprover,
      );

      expect(result.valid).toBe(false);
      expect(result.violations[0].rule).toBe('approval_authority');
    });

    it('should reject self-approval when not allowed', async () => {
      const selfApprovalStep = {
        ...mockStep,
        request: {
          ...mockStep.request,
          requesterProfileId: 'approver-1',
        },
      };

      const result = await service.validateApprovalAuthority(
        selfApprovalStep,
        mockApprover,
      );

      expect(result.valid).toBe(false);
      expect(result.violations[0].rule).toBe('self_approval');
    });

    it('should reject if step is not pending', async () => {
      const approvedStep = {
        ...mockStep,
        status: ApprovalStatus.APPROVED,
      };

      const result = await service.validateApprovalAuthority(
        approvedStep,
        mockApprover,
      );

      expect(result.valid).toBe(false);
      expect(result.violations[0].rule).toBe('step_status');
    });
  });

  describe('validateApprovalAction', () => {
    const mockStep = {
      id: 'step-1',
      requestId: 'req-1',
      sequence: 2,
    } as any;

    beforeEach(() => {
      prismaService.request.findUnique.mockResolvedValue({
        id: 'req-1',
        currentStep: 2,
      } as any);
    });

    it('should allow APPROVE action without notes', async () => {
      const result = await service.validateApprovalAction(
        ApprovalAction.APPROVE,
        null,
        mockStep,
      );

      expect(result.valid).toBe(true);
    });

    it('should require notes for REJECT action', async () => {
      const result = await service.validateApprovalAction(
        ApprovalAction.REJECT,
        null,
        mockStep,
      );

      expect(result.valid).toBe(false);
      expect(result.violations[0].rule).toBe('rejection_notes');
    });

    it('should allow REJECT with notes', async () => {
      const result = await service.validateApprovalAction(
        ApprovalAction.REJECT,
        'Not meeting requirements',
        mockStep,
      );

      expect(result.valid).toBe(true);
    });

    it('should require notes for RETURN action', async () => {
      const result = await service.validateApprovalAction(
        ApprovalAction.RETURN,
        null,
        mockStep,
      );

      expect(result.valid).toBe(false);
      expect(result.violations[0].rule).toBe('return_notes');
    });

    it('should not allow RETURN for first step', async () => {
      const firstStep = { ...mockStep, sequence: 1 };
      
      const result = await service.validateApprovalAction(
        ApprovalAction.RETURN,
        'Please revise',
        firstStep,
      );

      expect(result.valid).toBe(false);
      expect(result.violations[0].rule).toBe('invalid_action');
    });
  });

  describe('validateApprovalSequence', () => {
    it('should allow approval of current sequence', async () => {
      prismaService.approvalStep.findMany.mockResolvedValue([
        { id: 'step-1', sequence: 1, status: ApprovalStatus.APPROVED },
        { id: 'step-2', sequence: 2, status: ApprovalStatus.PENDING },
      ] as any);

      const result = await service.validateApprovalSequence('req-1', 2);

      expect(result.valid).toBe(true);
    });

    it('should reject skipping approval levels', async () => {
      prismaService.approvalStep.findMany.mockResolvedValue([
        { id: 'step-1', sequence: 1, status: ApprovalStatus.APPROVED },
        { id: 'step-2', sequence: 2, status: ApprovalStatus.PENDING },
        { id: 'step-3', sequence: 3, status: ApprovalStatus.PENDING },
      ] as any);

      const result = await service.validateApprovalSequence('req-1', 3);

      expect(result.valid).toBe(false);
      expect(result.violations[0].rule).toBe('sequence_order');
    });

    it('should warn about parallel approvals', async () => {
      prismaService.approvalStep.findMany.mockResolvedValue([
        { id: 'step-1', sequence: 1, status: ApprovalStatus.APPROVED },
        { id: 'step-2a', sequence: 2, status: ApprovalStatus.PENDING },
        { id: 'step-2b', sequence: 2, status: ApprovalStatus.PENDING },
      ] as any);

      const result = await service.validateApprovalSequence('req-1', 2);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        '2 parallel approval(s) pending at this level',
      );
    });
  });

  describe('validateRequestCreation', () => {
    it('should validate required fields', async () => {
      const result = await service.validateRequestCreation(
        'LEAVE_REQUEST',
        { startDate: '2024-01-01', endDate: '2024-01-05' },
        'requester-1',
      );

      expect(result.valid).toBe(false);
      expect(result.violations[0].rule).toBe('required_fields');
      expect(result.violations[0].context.missingFields).toContain('leaveType');
      expect(result.violations[0].context.missingFields).toContain('reason');
    });

    it('should pass with all required fields', async () => {
      prismaService.request.count.mockResolvedValue(0);

      const result = await service.validateRequestCreation(
        'LEAVE_REQUEST',
        {
          startDate: '2024-01-01',
          endDate: '2024-01-05',
          leaveType: 'annual',
          reason: 'Family vacation',
        },
        'requester-1',
      );

      expect(result.valid).toBe(true);
    });

    it('should warn about pending requests', async () => {
      prismaService.request.count.mockResolvedValue(2);

      const result = await service.validateRequestCreation(
        'LEAVE_REQUEST',
        {
          startDate: '2024-01-01',
          endDate: '2024-01-05',
          leaveType: 'annual',
          reason: 'Family vacation',
        },
        'requester-1',
      );

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain(
        'You have 2 pending request(s) in this module',
      );
    });

    it('should warn about requests outside business hours', async () => {
      // Mock current time to be outside business hours (e.g., 6 AM)
      const originalDate = global.Date;
      const mockDate = new Date('2024-01-01T06:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      prismaService.request.count.mockResolvedValue(0);

      const result = await service.validateRequestCreation(
        'GENERIC_REQUEST',
        {},
        'requester-1',
      );

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Request created outside business hours');

      global.Date = originalDate;
    });
  });

  describe('validateDelegation', () => {
    it('should reject self-delegation', async () => {
      const result = await service.validateDelegation(
        'user-1',
        'user-1',
        null,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(result.valid).toBe(false);
      expect(result.violations[0].rule).toBe('self_delegation');
    });

    it('should reject invalid date range', async () => {
      const result = await service.validateDelegation(
        'user-1',
        'user-2',
        null,
        new Date('2024-01-31'),
        new Date('2024-01-01'),
      );

      expect(result.valid).toBe(false);
      expect(result.violations[0].rule).toBe('delegation_dates');
    });

    it('should check delegation depth', async () => {
      // Mock delegation chain
      prismaService.approvalDelegation.findFirst
        .mockResolvedValueOnce({
          delegatorProfileId: 'user-1',
          delegateProfileId: 'user-2',
        } as any)
        .mockResolvedValueOnce({
          delegatorProfileId: 'user-2',
          delegateProfileId: 'user-3',
        } as any)
        .mockResolvedValueOnce({
          delegatorProfileId: 'user-3',
          delegateProfileId: 'user-4',
        } as any)
        .mockResolvedValueOnce(null);

      const result = await service.validateDelegation(
        'user-1',
        'user-5',
        null,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(result.valid).toBe(false);
      expect(result.violations[0].rule).toBe('delegation_depth');
    });

    it('should detect circular delegation', async () => {
      prismaService.approvalDelegation.findFirst.mockResolvedValue({
        delegatorProfileId: 'user-2',
        delegateProfileId: 'user-1',
      } as any);

      const result = await service.validateDelegation(
        'user-1',
        'user-2',
        null,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );

      expect(result.valid).toBe(false);
      expect(result.violations[0].rule).toBe('circular_delegation');
    });

    it('should warn about overlapping delegations', async () => {
      prismaService.approvalDelegation.findFirst
        .mockResolvedValueOnce(null) // For depth check
        .mockResolvedValueOnce(null) // For circular check
        .mockResolvedValueOnce({
          id: 'existing-delegation',
          delegatorProfileId: 'user-1',
        } as any); // For overlap check

      const result = await service.validateDelegation(
        'user-1',
        'user-2',
        null,
        new Date('2024-01-15'),
        new Date('2024-02-15'),
      );

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Overlapping delegation period detected');
    });
  });

  describe('validateApprovalProcess', () => {
    it('should validate complete approval process', async () => {
      const mockStep = {
        id: 'step-1',
        requestId: 'req-1',
        approverProfileId: 'approver-1',
        status: ApprovalStatus.PENDING,
        sequence: 1,
        createdAt: new Date(),
        request: {
          id: 'req-1',
          status: RequestStatus.IN_PROGRESS,
          requesterProfileId: 'requester-1',
        },
      } as any;

      const mockApprover = {
        id: 'approver-1',
        clerkId: 'clerk-1',
      } as any;

      prismaService.approvalStep.findUnique.mockResolvedValue(mockStep);
      prismaService.userProfile.findUnique.mockResolvedValue(mockApprover);
      prismaService.approvalStep.findMany.mockResolvedValue([mockStep]);
      prismaService.request.findUnique.mockResolvedValue(mockStep.request);

      const result = await service.validateApprovalProcess(
        'step-1',
        'approver-1',
        ApprovalAction.APPROVE,
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should return error when step not found', async () => {
      prismaService.approvalStep.findUnique.mockResolvedValue(null);

      const result = await service.validateApprovalProcess(
        'invalid-step',
        'approver-1',
        ApprovalAction.APPROVE,
      );

      expect(result.valid).toBe(false);
      expect(result.violations[0].rule).toBe('step_not_found');
    });

    it('should return error when approver not found', async () => {
      prismaService.approvalStep.findUnique.mockResolvedValue({
        id: 'step-1',
      } as any);
      prismaService.userProfile.findUnique.mockResolvedValue(null);

      const result = await service.validateApprovalProcess(
        'step-1',
        'invalid-approver',
        ApprovalAction.APPROVE,
      );

      expect(result.valid).toBe(false);
      expect(result.violations[0].rule).toBe('approver_not_found');
    });
  });

  describe('checkApprovalTimeout', () => {
    it('should detect timeout', async () => {
      const oldStep = {
        createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
      } as any;

      const result = await service.checkApprovalTimeout(oldStep);
      expect(result).toBe(true);
    });

    it('should not detect timeout for recent step', async () => {
      const recentStep = {
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      } as any;

      const result = await service.checkApprovalTimeout(recentStep);
      expect(result).toBe(false);
    });
  });

  describe('getBusinessRules and updateBusinessRule', () => {
    it('should get business rules configuration', () => {
      const rules = service.getBusinessRules();
      
      expect(rules).toHaveProperty('maxApprovalSteps');
      expect(rules).toHaveProperty('maxDelegationDepth');
      expect(rules).toHaveProperty('approvalTimeoutDays');
      expect(rules.maxApprovalSteps).toBe(10);
    });

    it('should update business rule configuration', () => {
      service.updateBusinessRule('maxApprovalSteps', 15);
      
      const rules = service.getBusinessRules();
      expect(rules.maxApprovalSteps).toBe(15);
    });
  });
});