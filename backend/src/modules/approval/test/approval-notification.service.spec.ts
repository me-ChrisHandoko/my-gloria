import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalNotificationService } from '../services/approval-notification.service';
import { NotificationService } from '../../notification/notification.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CacheService } from '../../../cache/cache.service';
import {
  Request,
  RequestStatus,
  ApprovalStatus,
  UserProfile,
} from '@prisma/client';
import {
  NotificationType,
  Priority,
  NotificationChannel,
} from '../../notification/enums/notification.enum';

describe('ApprovalNotificationService', () => {
  let service: ApprovalNotificationService;
  let notificationService: NotificationService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  const mockRequest = {
    id: 'req_123',
    requestNumber: 'REQ-HR-202401-0001',
    module: 'HR',
    requesterProfileId: 'user_1',
    status: RequestStatus.PENDING,
    details: {
      title: 'Leave Request',
      urgency: 'MEDIUM',
    },
    createdAt: new Date(),
    requester: {
      id: 'user_1',
      employeeName: 'John Doe',
    },
    approvalSteps: [],
  } as any;

  const mockApprover = {
    id: 'user_2',
    employeeName: 'Jane Smith',
    clerkUserId: 'clerk_user_2',
    nip: '123456',
    isSuperadmin: false,
    isActive: true,
    lastActive: new Date(),
    preferences: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
  } as UserProfile;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalNotificationService,
        {
          provide: NotificationService,
          useValue: {
            send: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            request: {
              findUnique: jest.fn(),
            },
            approvalStep: {
              findMany: jest.fn(),
              count: jest.fn(),
            },
            userProfile: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(true),
            del: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<ApprovalNotificationService>(
      ApprovalNotificationService,
    );
    notificationService = module.get<NotificationService>(NotificationService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('notifyNextApprovers', () => {
    it('should send notifications to pending approvers', async () => {
      const pendingSteps = [
        {
          id: 'step_1',
          requestId: 'req_123',
          sequence: 1,
          approverProfileId: 'user_2',
          status: ApprovalStatus.PENDING,
          approver: mockApprover,
          delegations: [],
        },
      ];

      jest
        .spyOn(prismaService.request, 'findUnique')
        .mockResolvedValue(mockRequest as any);
      jest
        .spyOn(prismaService.approvalStep, 'findMany')
        .mockResolvedValue(pendingSteps as any);

      await service.notifyNextApprovers('req_123', 1);

      expect(notificationService.send).toHaveBeenCalledWith({
        type: 'PENDING_APPROVAL',
        recipientId: 'user_2',
        title: 'Approval Required',
        message: 'You have a new approval request for HR: Leave Request',
        data: expect.objectContaining({
          requestId: 'req_123',
          module: 'HR',
          action: 'approval_required',
        }),
        priority: Priority.HIGH,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      });
    });

    it('should notify delegates when active delegation exists', async () => {
      const pendingStepsWithDelegation = [
        {
          id: 'step_1',
          requestId: 'req_123',
          sequence: 1,
          approverProfileId: 'user_2',
          status: ApprovalStatus.PENDING,
          approver: mockApprover,
          delegations: [
            {
              id: 'del_1',
              delegateProfileId: 'user_3',
              isActive: true,
              startDate: new Date('2024-01-01'),
              endDate: new Date('2024-12-31'),
              delegate: {
                id: 'user_3',
                employeeName: 'Bob Wilson',
              },
            },
          ],
        },
      ];

      jest
        .spyOn(prismaService.request, 'findUnique')
        .mockResolvedValue(mockRequest as any);
      jest
        .spyOn(prismaService.approvalStep, 'findMany')
        .mockResolvedValue(pendingStepsWithDelegation as any);

      await service.notifyNextApprovers('req_123', 1);

      // Should notify both approver and delegate
      expect(notificationService.send).toHaveBeenCalledTimes(2);

      // Check delegate notification
      expect(notificationService.send).toHaveBeenCalledWith({
        type: 'DELEGATION_ASSIGNED',
        recipientId: 'user_3',
        title: 'Delegation Assigned',
        message:
          'You have been delegated to approve HR: Leave Request on behalf of Jane Smith',
        data: expect.objectContaining({
          requestId: 'req_123',
          module: 'HR',
          action: 'delegation_assigned',
          delegator: 'Jane Smith',
          delegationId: 'del_1',
        }),
        priority: Priority.HIGH,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      });
    });
  });

  describe('notifyRequester', () => {
    it('should notify requester of approval', async () => {
      jest
        .spyOn(prismaService.request, 'findUnique')
        .mockResolvedValue(mockRequest as any);

      await service.notifyRequester('req_123', 'APPROVED', mockApprover);

      expect(notificationService.send).toHaveBeenCalledWith({
        type: 'APPROVAL_APPROVED',
        recipientId: 'user_1',
        title: 'Request Approved',
        message:
          'Your request for HR: Leave Request has been approved by Jane Smith',
        data: expect.objectContaining({
          requestId: 'req_123',
          module: 'HR',
          action: 'approved',
        }),
        priority: Priority.MEDIUM,
        channels: [NotificationChannel.IN_APP],
      });
    });

    it('should notify requester of rejection', async () => {
      jest
        .spyOn(prismaService.request, 'findUnique')
        .mockResolvedValue(mockRequest as any);

      await service.notifyRequester('req_123', 'REJECTED', mockApprover);

      expect(notificationService.send).toHaveBeenCalledWith({
        type: 'APPROVAL_REJECTED',
        recipientId: 'user_1',
        title: 'Request Rejected',
        message:
          'Your request for HR: Leave Request has been rejected by Jane Smith',
        data: expect.objectContaining({
          requestId: 'req_123',
          module: 'HR',
          action: 'rejected',
        }),
        priority: Priority.HIGH,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      });
    });

    it('should notify requester of completion', async () => {
      jest
        .spyOn(prismaService.request, 'findUnique')
        .mockResolvedValue(mockRequest as any);

      await service.notifyRequester('req_123', 'COMPLETED', mockApprover);

      expect(notificationService.send).toHaveBeenCalledWith({
        type: 'ALL_APPROVED',
        recipientId: 'user_1',
        title: 'Request Fully Approved',
        message:
          'Your request for HR: Leave Request has been fully approved and is now complete',
        data: expect.objectContaining({
          requestId: 'req_123',
          module: 'HR',
          action: 'completed',
        }),
        priority: Priority.HIGH,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      });
    });
  });

  describe('notifyEscalation', () => {
    it('should send escalation notifications', async () => {
      const escalatedTo = ['user_4', 'user_5'];
      const reason = 'Approval timeout - no response for 48 hours';

      jest
        .spyOn(prismaService.request, 'findUnique')
        .mockResolvedValue(mockRequest as any);

      await service.notifyEscalation('req_123', escalatedTo, reason);

      expect(notificationService.send).toHaveBeenCalledTimes(2);

      escalatedTo.forEach((userId) => {
        expect(notificationService.send).toHaveBeenCalledWith({
          type: 'ESCALATION_NOTICE',
          recipientId: userId,
          title: 'Approval Escalated',
          message:
            'The approval request for HR: Leave Request has been escalated due to timeout',
          data: expect.objectContaining({
            requestId: 'req_123',
            module: 'HR',
            action: 'escalated',
            reason,
          }),
          priority: Priority.URGENT,
          channels: [
            NotificationChannel.IN_APP,
            NotificationChannel.EMAIL,
            NotificationChannel.PUSH,
          ],
        });
      });
    });
  });

  describe('calculatePriority', () => {
    it('should return CRITICAL for critical urgency', async () => {
      const criticalRequest = {
        ...mockRequest,
        details: { urgency: 'CRITICAL' },
      };

      jest
        .spyOn(prismaService.request, 'findUnique')
        .mockResolvedValue(criticalRequest as any);

      await service.notifyRequester('req_123', 'APPROVED', mockApprover);

      expect(notificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: Priority.CRITICAL,
        }),
      );
    });

    it('should return URGENT for old requests', async () => {
      const oldRequest = {
        ...mockRequest,
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      };

      jest
        .spyOn(prismaService.request, 'findUnique')
        .mockResolvedValue(oldRequest as any);

      await service.notifyRequester('req_123', 'APPROVED', mockApprover);

      expect(notificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: Priority.URGENT,
        }),
      );
    });
  });

  describe('getUserNotificationStats', () => {
    it('should return notification statistics for a user', async () => {
      jest.spyOn(prismaService.approvalStep, 'count').mockResolvedValue(5);
      jest.spyOn(prismaService, 'delegation' as any).mockReturnValue({
        count: jest.fn().mockResolvedValue(2),
      });

      const stats = await service.getUserNotificationStats('user_2');

      expect(stats).toEqual({
        pendingApprovals: 5,
        delegatedApprovals: 2,
        totalNotifications: 7,
      });
    });

    it('should return zero stats on error', async () => {
      jest
        .spyOn(prismaService.approvalStep, 'count')
        .mockRejectedValue(new Error('Database error'));

      const stats = await service.getUserNotificationStats('user_2');

      expect(stats).toEqual({
        pendingApprovals: 0,
        delegatedApprovals: 0,
        totalNotifications: 0,
      });
    });
  });

  describe('caching', () => {
    it('should cache request details', async () => {
      jest
        .spyOn(prismaService.request, 'findUnique')
        .mockResolvedValue(mockRequest as any);

      await service.notifyRequester('req_123', 'APPROVED', mockApprover);

      expect(cacheService.set).toHaveBeenCalledWith(
        'notification:request:req_123',
        mockRequest,
        300,
      );
    });

    it('should use cached request if available', async () => {
      jest.spyOn(cacheService, 'get').mockResolvedValue(mockRequest);

      await service.notifyRequester('req_123', 'APPROVED', mockApprover);

      expect(prismaService.request.findUnique).not.toHaveBeenCalled();
      expect(notificationService.send).toHaveBeenCalled();
    });

    it('should clear request cache', async () => {
      await service.clearRequestCache('req_123');

      expect(cacheService.del).toHaveBeenCalledWith(
        'notification:request:req_123',
      );
    });
  });
});