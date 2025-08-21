import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserPositionService } from '../../services/user-position.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { RowLevelSecurityService } from '../../../../security/row-level-security.service';
import { AuditService } from '../../../../audit/audit.service';
import { PositionValidator } from '../../../../validators/position.validator';
import {
  createTestModule,
  createMockPosition,
  createMockUserPosition,
  createMockUserProfile,
  expectAuditLog,
  expectTransaction,
  expectRLSCheck
} from '../setup/test.setup';

describe('UserPositionService', () => {
  let service: UserPositionService;
  let prismaService: jest.Mocked<PrismaService>;
  let rlsService: jest.Mocked<RowLevelSecurityService>;
  let auditService: jest.Mocked<AuditService>;
  let positionValidator: jest.Mocked<PositionValidator>;

  beforeEach(async () => {
    const module: TestingModule = await createTestModule([UserPositionService]);

    service = module.get<UserPositionService>(UserPositionService);
    prismaService = module.get(PrismaService);
    rlsService = module.get(RowLevelSecurityService);
    auditService = module.get(AuditService);
    positionValidator = module.get(PositionValidator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assignPosition', () => {
    const assignDto = {
      userProfileId: 'user-1',
      positionId: 'pos-1',
      startDate: new Date('2024-01-01'),
      isPlt: false,
      skNumber: 'SK/001/2024'
    };

    it('should assign position successfully', async () => {
      const mockPosition = createMockPosition({ hierarchyLevel: 5 });
      const mockUserProfile = createMockUserProfile();
      const mockAssignment = createMockUserPosition(assignDto);
      
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      positionValidator.validateAssignment = jest.fn().mockResolvedValue(undefined);
      prismaService.position.findUnique = jest.fn().mockResolvedValue(mockPosition);
      prismaService.userProfile.findUnique = jest.fn().mockResolvedValue(mockUserProfile);
      prismaService.userPosition.create = jest.fn().mockResolvedValue(mockAssignment);

      const result = await service.assignPosition(assignDto, 'test-user');

      expect(positionValidator.validateAssignment).toHaveBeenCalledWith(assignDto);
      expect(prismaService.userPosition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userProfileId: assignDto.userProfileId,
          positionId: assignDto.positionId,
          startDate: assignDto.startDate,
          isPlt: false,
          isActive: true
        }),
        include: expect.any(Object)
      });
      expectTransaction(prismaService);
      expect(result).toEqual(mockAssignment);
    });

    it('should validate appointer authority if provided', async () => {
      const dtoWithAppointer = { ...assignDto, appointedBy: 'appointer-1' };
      
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      positionValidator.validateAssignment = jest.fn().mockResolvedValue(undefined);
      positionValidator.validateAppointer = jest.fn().mockResolvedValue(undefined);
      prismaService.position.findUnique = jest.fn().mockResolvedValue(createMockPosition());
      prismaService.userProfile.findUnique = jest.fn().mockResolvedValue(createMockUserProfile());
      prismaService.userPosition.create = jest.fn().mockResolvedValue(createMockUserPosition());

      await service.assignPosition(dtoWithAppointer, 'test-user');

      expect(positionValidator.validateAppointer).toHaveBeenCalledWith(
        'appointer-1',
        'pos-1'
      );
    });

    it('should throw NotFoundException if position not found', async () => {
      positionValidator.validateAssignment = jest.fn().mockResolvedValue(undefined);
      prismaService.position.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.assignPosition(assignDto, 'test-user')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException if user profile not found', async () => {
      positionValidator.validateAssignment = jest.fn().mockResolvedValue(undefined);
      prismaService.position.findUnique = jest.fn().mockResolvedValue(createMockPosition());
      prismaService.userProfile.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.assignPosition(assignDto, 'test-user')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should check RLS permissions', async () => {
      positionValidator.validateAssignment = jest.fn().mockResolvedValue(undefined);
      rlsService.canAccessRecord = jest.fn().mockResolvedValue(false);
      
      const mockContext = { isSuperadmin: false };
      rlsService.getUserContext = jest.fn().mockResolvedValue(mockContext);

      await expect(service.assignPosition(assignDto, 'test-user')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should log position assignment audit', async () => {
      const mockPosition = createMockPosition();
      const mockUserProfile = createMockUserProfile();
      const mockAssignment = createMockUserPosition(assignDto);
      
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      positionValidator.validateAssignment = jest.fn().mockResolvedValue(undefined);
      prismaService.position.findUnique = jest.fn().mockResolvedValue(mockPosition);
      prismaService.userProfile.findUnique = jest.fn().mockResolvedValue(mockUserProfile);
      prismaService.userPosition.create = jest.fn().mockResolvedValue(mockAssignment);

      await service.assignPosition(assignDto, 'test-user');

      expect(auditService.auditPositionAssignment).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'test-user' }),
        expect.objectContaining({
          userProfileId: assignDto.userProfileId,
          positionId: assignDto.positionId,
          positionName: mockPosition.name,
          userName: mockUserProfile.dataKaryawan.nama,
          isPlt: false,
          startDate: assignDto.startDate
        })
      );
    });
  });

  describe('terminatePosition', () => {
    const terminateDto = {
      userPositionId: 'user-pos-1',
      endDate: new Date('2024-12-31'),
      reason: 'End of contract'
    };

    it('should terminate position successfully', async () => {
      const mockUserPosition = createMockUserPosition({
        position: createMockPosition(),
        userProfile: createMockUserProfile()
      });
      
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      positionValidator.validateTermination = jest.fn().mockResolvedValue(undefined);
      prismaService.userPosition.findUnique = jest.fn().mockResolvedValue(mockUserPosition);
      prismaService.userPosition.update = jest.fn().mockResolvedValue({
        ...mockUserPosition,
        endDate: terminateDto.endDate,
        isActive: false
      });

      const result = await service.terminatePosition(terminateDto, 'test-user');

      expect(positionValidator.validateTermination).toHaveBeenCalledWith(
        terminateDto.userPositionId,
        terminateDto.endDate
      );
      expect(prismaService.userPosition.update).toHaveBeenCalledWith({
        where: { id: terminateDto.userPositionId },
        data: expect.objectContaining({
          endDate: terminateDto.endDate,
          isActive: false,
          notes: `Terminated: ${terminateDto.reason}`
        })
      });
      expectTransaction(prismaService);
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException if assignment not found', async () => {
      positionValidator.validateTermination = jest.fn().mockResolvedValue(undefined);
      prismaService.userPosition.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.terminatePosition(terminateDto, 'test-user')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should check RLS permissions unless own position', async () => {
      const mockUserPosition = createMockUserPosition({
        userProfileId: 'other-user',
        position: createMockPosition(),
        userProfile: createMockUserProfile()
      });
      
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      positionValidator.validateTermination = jest.fn().mockResolvedValue(undefined);
      prismaService.userPosition.findUnique = jest.fn().mockResolvedValue(mockUserPosition);
      rlsService.canAccessRecord = jest.fn().mockResolvedValue(false);
      
      const mockContext = { userProfileId: 'current-user' };
      rlsService.getUserContext = jest.fn().mockResolvedValue(mockContext);

      await expect(service.terminatePosition(terminateDto, 'test-user')).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('transferPosition', () => {
    const transferDto = {
      userProfileId: 'user-1',
      fromPositionId: 'pos-1',
      toPositionId: 'pos-2',
      transferDate: new Date('2024-06-01'),
      skNumber: 'SK/002/2024',
      reason: 'Promotion'
    };

    it('should transfer position successfully', async () => {
      const currentAssignment = createMockUserPosition({
        position: createMockPosition({ name: 'Old Position' }),
        userProfile: createMockUserProfile()
      });
      const newPosition = createMockPosition({
        id: 'pos-2',
        name: 'New Position',
        hierarchyLevel: 3
      });
      const newAssignment = createMockUserPosition({
        positionId: 'pos-2',
        position: newPosition
      });
      
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      positionValidator.validateAssignment = jest.fn().mockResolvedValue(undefined);
      prismaService.userPosition.findFirst = jest.fn().mockResolvedValue(currentAssignment);
      prismaService.position.findUnique = jest.fn().mockResolvedValue(newPosition);
      prismaService.userPosition.update = jest.fn().mockResolvedValue(currentAssignment);
      prismaService.userPosition.create = jest.fn().mockResolvedValue(newAssignment);

      const result = await service.transferPosition(transferDto, 'test-user');

      // Should terminate old position
      expect(prismaService.userPosition.update).toHaveBeenCalledWith({
        where: { id: currentAssignment.id },
        data: expect.objectContaining({
          endDate: new Date(transferDto.transferDate.getTime() - 1),
          isActive: false,
          notes: `Transferred to ${newPosition.name}`
        })
      });
      
      // Should create new assignment
      expect(prismaService.userPosition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userProfileId: transferDto.userProfileId,
          positionId: transferDto.toPositionId,
          startDate: transferDto.transferDate,
          isActive: true
        }),
        include: expect.any(Object)
      });
      
      expectTransaction(prismaService);
      expect(result).toEqual(newAssignment);
    });

    it('should validate new position assignment', async () => {
      positionValidator.validateAssignment = jest.fn().mockRejectedValue(
        new ConflictException('Position not available')
      );

      await expect(service.transferPosition(transferDto, 'test-user')).rejects.toThrow(
        ConflictException
      );
    });

    it('should throw NotFoundException if current assignment not found', async () => {
      positionValidator.validateAssignment = jest.fn().mockResolvedValue(undefined);
      prismaService.userPosition.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.transferPosition(transferDto, 'test-user')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should log organizational change audit', async () => {
      const currentAssignment = createMockUserPosition({
        position: createMockPosition({ name: 'Old Position' }),
        userProfile: createMockUserProfile()
      });
      const newPosition = createMockPosition({ id: 'pos-2', name: 'New Position' });
      
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      positionValidator.validateAssignment = jest.fn().mockResolvedValue(undefined);
      prismaService.userPosition.findFirst = jest.fn().mockResolvedValue(currentAssignment);
      prismaService.position.findUnique = jest.fn().mockResolvedValue(newPosition);
      prismaService.userPosition.update = jest.fn().mockResolvedValue(currentAssignment);
      prismaService.userPosition.create = jest.fn().mockResolvedValue(createMockUserPosition());

      await service.transferPosition(transferDto, 'test-user');

      expect(auditService.logOrganizationalChange).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'test-user' }),
        expect.objectContaining({
          type: 'POSITION_ASSIGNMENT',
          entityId: transferDto.userProfileId,
          details: expect.objectContaining({
            action: 'TRANSFER',
            fromPosition: 'Old Position',
            toPosition: 'New Position',
            transferDate: transferDto.transferDate,
            reason: transferDto.reason
          })
        })
      );
    });
  });

  describe('getUserHistory', () => {
    it('should return user position history', async () => {
      const mockPositions = [
        createMockUserPosition({
          position: createMockPosition(),
          startDate: new Date('2024-01-01'),
          endDate: null,
          isActive: true
        }),
        createMockUserPosition({
          id: 'user-pos-2',
          position: createMockPosition({ name: 'Previous Position' }),
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-12-31'),
          isActive: false
        })
      ];
      
      // Mock RLS context to be superadmin to skip userProfile check
      const mockContext = {
        isSuperadmin: true,
        userProfileId: 'user-1',
        schoolIds: ['school-1'],
        departmentIds: ['dept-1']
      };
      rlsService.getUserContext = jest.fn().mockResolvedValue(mockContext);
      
      prismaService.userPosition.findMany = jest.fn().mockResolvedValue(mockPositions);

      const result = await service.getUserHistory('user-1', 'test-user');

      expect(prismaService.userPosition.findMany).toHaveBeenCalledWith({
        where: { userProfileId: 'user-1' },
        include: expect.any(Object),
        orderBy: { startDate: 'desc' }
      });
      
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        positionName: 'Test Position',
        isActive: true,
        duration: expect.any(String)
      });
    });

    it('should check access for non-own profile', async () => {
      const mockContext = {
        isSuperadmin: false,
        userProfileId: 'current-user',
        schoolIds: [],
        departmentIds: []
      };
      rlsService.getUserContext = jest.fn().mockResolvedValue(mockContext);
      
      const mockUserProfile = createMockUserProfile({
        positions: [{
          position: {
            departmentId: 'dept-other',
            schoolId: 'school-other'
          }
        }]
      });
      prismaService.userProfile.findUnique = jest.fn().mockResolvedValue(mockUserProfile);

      await expect(service.getUserHistory('other-user', 'test-user')).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('getActivePositions', () => {
    it('should return only active positions', async () => {
      const now = new Date();
      const future = new Date('2025-12-31');
      const past = new Date('2023-01-01');
      
      const mockPositions = [
        createMockUserPosition({
          isActive: true,
          endDate: null
        }),
        createMockUserPosition({
          id: 'user-pos-2',
          isActive: true,
          endDate: future
        })
      ];
      
      // Set context to match the userProfileId being tested or make user a superadmin
      const mockContext = {
        isSuperadmin: true,
        userProfileId: 'user-1',
        schoolIds: ['school-1'],
        departmentIds: ['dept-1'],
        positionIds: ['pos-1']
      };
      rlsService.getUserContext = jest.fn().mockResolvedValue(mockContext);
      
      prismaService.userPosition.findMany = jest.fn().mockResolvedValue(mockPositions);

      const result = await service.getActivePositions('user-1', 'test-user');

      expect(prismaService.userPosition.findMany).toHaveBeenCalledWith({
        where: {
          userProfileId: 'user-1',
          isActive: true,
          OR: [
            { endDate: null },
            { endDate: { gte: expect.any(Date) } }
          ]
        },
        include: expect.any(Object)
      });
      
      expect(result).toHaveLength(2);
    });

    it('should allow users to view own active positions', async () => {
      const mockContext = {
        isSuperadmin: false,
        userProfileId: 'user-1'
      };
      rlsService.getUserContext = jest.fn().mockResolvedValue(mockContext);
      prismaService.userPosition.findMany = jest.fn().mockResolvedValue([]);

      await service.getActivePositions('user-1', 'test-user');

      expect(prismaService.userPosition.findMany).toHaveBeenCalled();
    });

    it('should deny access to other users positions for non-superadmin', async () => {
      const mockContext = {
        isSuperadmin: false,
        userProfileId: 'current-user'
      };
      rlsService.getUserContext = jest.fn().mockResolvedValue(mockContext);

      await expect(service.getActivePositions('other-user', 'test-user')).rejects.toThrow(
        ForbiddenException
      );
    });
  });
});