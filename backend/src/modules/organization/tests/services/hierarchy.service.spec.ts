import { TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { HierarchyService } from '../../services/hierarchy.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { RowLevelSecurityService } from '../../../../security/row-level-security.service';
import { AuditService } from '../../../../audit/audit.service';
import { HierarchyValidator } from '../../../../validators/hierarchy.validator';
import {
  createTestModule,
  createMockPosition,
  createMockPositionHierarchy,
  createMockUserPosition,
  createMockUserProfile,
  expectTransaction
} from '../setup/test.setup';

describe('HierarchyService', () => {
  let service: HierarchyService;
  let prismaService: jest.Mocked<PrismaService>;
  let rlsService: jest.Mocked<RowLevelSecurityService>;
  let auditService: jest.Mocked<AuditService>;
  let hierarchyValidator: jest.Mocked<HierarchyValidator>;

  beforeEach(async () => {
    const module: TestingModule = await createTestModule([HierarchyService]);

    service = module.get<HierarchyService>(HierarchyService);
    prismaService = module.get(PrismaService);
    rlsService = module.get(RowLevelSecurityService);
    auditService = module.get(AuditService);
    hierarchyValidator = module.get(HierarchyValidator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setHierarchy', () => {
    const setHierarchyDto = {
      positionId: 'pos-1',
      reportsToId: 'pos-2',
      coordinatorId: 'pos-3'
    };

    it('should set hierarchy successfully', async () => {
      const mockPosition = createMockPosition();
      const mockHierarchy = createMockPositionHierarchy(setHierarchyDto);
      
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      hierarchyValidator.validateHierarchy = jest.fn().mockResolvedValue(undefined);
      prismaService.position.findUnique = jest.fn().mockResolvedValue(mockPosition);
      prismaService.positionHierarchy.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.positionHierarchy.upsert = jest.fn().mockResolvedValue(mockHierarchy);

      const result = await service.setHierarchy(setHierarchyDto, 'test-user');

      expect(hierarchyValidator.validateHierarchy).toHaveBeenCalledWith(setHierarchyDto);
      expect(prismaService.positionHierarchy.upsert).toHaveBeenCalledWith({
        where: { positionId: setHierarchyDto.positionId },
        create: expect.objectContaining(setHierarchyDto),
        update: expect.objectContaining({
          reportsToId: setHierarchyDto.reportsToId,
          coordinatorId: setHierarchyDto.coordinatorId
        }),
        include: expect.any(Object)
      });
      expectTransaction(prismaService);
      expect(result).toEqual(mockHierarchy);
    });

    it('should validate hierarchy to prevent circular references', async () => {
      hierarchyValidator.validateHierarchy = jest.fn().mockRejectedValue(
        new ConflictException('Circular reference detected')
      );

      await expect(service.setHierarchy(setHierarchyDto, 'test-user')).rejects.toThrow(
        ConflictException
      );
    });

    it('should check RLS permissions', async () => {
      hierarchyValidator.validateHierarchy = jest.fn().mockResolvedValue(undefined);
      rlsService.canAccessRecord = jest.fn().mockResolvedValue(false);

      await expect(service.setHierarchy(setHierarchyDto, 'test-user')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should audit hierarchy changes', async () => {
      const mockPosition = createMockPosition();
      const currentHierarchy = createMockPositionHierarchy({
        reportsToId: 'old-pos',
        coordinatorId: null
      });
      const newHierarchy = createMockPositionHierarchy(setHierarchyDto);
      
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      hierarchyValidator.validateHierarchy = jest.fn().mockResolvedValue(undefined);
      prismaService.position.findUnique = jest.fn().mockResolvedValue(mockPosition);
      prismaService.positionHierarchy.findUnique = jest.fn().mockResolvedValue(currentHierarchy);
      prismaService.positionHierarchy.upsert = jest.fn().mockResolvedValue(newHierarchy);

      await service.setHierarchy(setHierarchyDto, 'test-user');

      expect(auditService.auditHierarchyChange).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'test-user' }),
        expect.objectContaining({
          positionId: setHierarchyDto.positionId,
          positionName: mockPosition.name,
          oldReportsTo: 'old-pos',
          newReportsTo: setHierarchyDto.reportsToId,
          oldCoordinator: undefined,
          newCoordinator: setHierarchyDto.coordinatorId
        })
      );
    });
  });

  describe('getOrgChart', () => {
    it('should build organizational chart', async () => {
      const mockPositions = [
        createMockPosition({ id: 'pos-1', hierarchyLevel: 1 }),
        createMockPosition({ id: 'pos-2', hierarchyLevel: 2 }),
        createMockPosition({ id: 'pos-3', hierarchyLevel: 3 })
      ];
      const mockHierarchies = [
        createMockPositionHierarchy({ positionId: 'pos-1', reportsToId: null }),
        createMockPositionHierarchy({ positionId: 'pos-2', reportsToId: 'pos-1' }),
        createMockPositionHierarchy({ positionId: 'pos-3', reportsToId: 'pos-2' })
      ];
      const mockUserPositions = [
        createMockUserPosition({
          positionId: 'pos-1',
          userProfile: createMockUserProfile()
        })
      ];
      
      prismaService.position.findMany = jest.fn().mockResolvedValue(mockPositions);
      prismaService.positionHierarchy.findMany = jest.fn().mockResolvedValue(mockHierarchies);
      prismaService.userPosition.findMany = jest.fn().mockResolvedValue(mockUserPositions);

      const result = await service.getOrgChart(null, 'test-user');

      expect(result).toMatchObject({
        root: expect.objectContaining({
          positionId: 'pos-1',
          hierarchyLevel: 1,
          directReports: expect.arrayContaining([
            expect.objectContaining({
              positionId: 'pos-2',
              directReports: expect.arrayContaining([
                expect.objectContaining({ positionId: 'pos-3' })
              ])
            })
          ])
        }),
        metadata: expect.objectContaining({
          totalPositions: 3,
          totalEmployees: 1,
          hierarchyLevels: 3
        })
      });
    });

    it('should apply RLS filters for non-superadmin', async () => {
      const mockContext = {
        isSuperadmin: false,
        schoolIds: ['school-1'],
        departmentIds: ['dept-1'],
        positionIds: []
      };
      rlsService.getUserContext = jest.fn().mockResolvedValue(mockContext);
      prismaService.position.findMany = jest.fn().mockResolvedValue([]);
      prismaService.positionHierarchy.findMany = jest.fn().mockResolvedValue([]);
      prismaService.userPosition.findMany = jest.fn().mockResolvedValue([]);

      await service.getOrgChart(null, 'test-user');

      expect(prismaService.position.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isActive: true,
          schoolId: { in: ['school-1'] }
        }),
        include: expect.any(Object)
      });
    });

    it('should handle empty hierarchy gracefully', async () => {
      prismaService.position.findMany = jest.fn().mockResolvedValue([]);
      prismaService.positionHierarchy.findMany = jest.fn().mockResolvedValue([]);
      prismaService.userPosition.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getOrgChart(null, 'test-user');

      expect(result).toMatchObject({
        root: {},
        metadata: expect.objectContaining({
          totalPositions: 0,
          totalEmployees: 0
        })
      });
    });
  });

  describe('getReportingChain', () => {
    it('should return reporting chain for position', async () => {
      const mockPosition = createMockPosition();
      const reportingChain = ['pos-2', 'pos-3', 'pos-4'];
      
      // Create positions with userPositions array for proper data structure
      const createPositionWithUser = (overrides: any, userName?: string) => ({
        ...createMockPosition(overrides),
        department: { name: 'Test Dept' },
        userPositions: userName ? [{
          userProfile: {
            dataKaryawan: { nama: userName }
          }
        }] : []
      });
      
      prismaService.position.findUnique = jest.fn()
        .mockResolvedValueOnce(mockPosition)
        .mockResolvedValueOnce(createPositionWithUser({ id: 'pos-2', name: 'Manager' }, 'John Doe'))
        .mockResolvedValueOnce(createPositionWithUser({ id: 'pos-3', name: 'Director' }, 'Jane Smith'))
        .mockResolvedValueOnce(createPositionWithUser({ id: 'pos-4', name: 'CEO' }, 'Bob Johnson'));
      
      hierarchyValidator.getReportingChain = jest.fn().mockResolvedValue(reportingChain);

      const result = await service.getReportingChain('pos-1', 'test-user');

      expect(result).toMatchObject({
        positionId: 'pos-1',
        positionName: 'Test Position',
        reportingChain: expect.arrayContaining([
          expect.objectContaining({ level: 1, positionName: 'Manager' }),
          expect.objectContaining({ level: 2, positionName: 'Director' }),
          expect.objectContaining({ level: 3, positionName: 'CEO' })
        ]),
        chainLength: 3
      });
    });

    it('should check RLS permissions', async () => {
      rlsService.canAccessRecord = jest.fn().mockResolvedValue(false);

      await expect(service.getReportingChain('pos-1', 'test-user')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should handle position with no reporting chain', async () => {
      const mockPosition = createMockPosition();
      prismaService.position.findUnique = jest.fn().mockResolvedValue(mockPosition);
      hierarchyValidator.getReportingChain = jest.fn().mockResolvedValue([]);

      const result = await service.getReportingChain('pos-1', 'test-user');

      expect(result).toMatchObject({
        positionId: 'pos-1',
        reportingChain: [],
        chainLength: 0
      });
    });
  });

  describe('getSubordinates', () => {
    it('should return all subordinate positions', async () => {
      const subordinateIds = ['pos-2', 'pos-3', 'pos-4'];
      const mockSubordinates = subordinateIds.map(id => 
        createMockPosition({
          id,
          userPositions: [createMockUserPosition({ positionId: id })]
        })
      );
      
      hierarchyValidator.getSubordinates = jest.fn().mockResolvedValue(subordinateIds);
      prismaService.position.findMany = jest.fn().mockResolvedValue(mockSubordinates);

      const result = await service.getSubordinates('pos-1', 'test-user');

      expect(hierarchyValidator.getSubordinates).toHaveBeenCalledWith('pos-1');
      expect(prismaService.position.findMany).toHaveBeenCalledWith({
        where: { id: { in: subordinateIds } },
        include: expect.any(Object),
        orderBy: expect.any(Array)
      });
      expect(result).toHaveLength(3);
    });

    it('should return empty array if no subordinates', async () => {
      hierarchyValidator.getSubordinates = jest.fn().mockResolvedValue([]);

      const result = await service.getSubordinates('pos-1', 'test-user');

      expect(result).toEqual([]);
      expect(prismaService.position.findMany).not.toHaveBeenCalled();
    });
  });

  describe('validateHierarchy', () => {
    it('should validate hierarchy for superadmin', async () => {
      const mockContext = { isSuperadmin: true };
      rlsService.getUserContext = jest.fn().mockResolvedValue(mockContext);
      
      const validationResult = {
        valid: false,
        issues: ['Circular reference detected']
      };
      hierarchyValidator.validateHierarchyConsistency = jest.fn()
        .mockResolvedValue(validationResult);
      
      const mockHierarchies = [
        createMockPositionHierarchy({
          positionId: 'pos-1',
          reportsToId: 'pos-2',
          position: createMockPosition({ id: 'pos-1', name: 'Position 1' })
        }),
        createMockPositionHierarchy({
          positionId: 'pos-2',
          reportsToId: 'pos-1',
          position: createMockPosition({ id: 'pos-2', name: 'Position 2' })
        })
      ];
      
      prismaService.positionHierarchy.findMany = jest.fn().mockResolvedValue(mockHierarchies);
      hierarchyValidator.detectCircularReference = jest.fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      
      prismaService.position.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.validateHierarchy('superadmin');

      expect(result).toMatchObject({
        valid: false,
        issues: ['Circular reference detected'],
        circularReferences: expect.arrayContaining([
          expect.objectContaining({
            positionId: 'pos-1',
            positionName: 'Position 1',
            conflictWith: 'pos-2'
          })
        ])
      });
    });

    it('should find orphaned positions', async () => {
      const mockContext = { isSuperadmin: true };
      rlsService.getUserContext = jest.fn().mockResolvedValue(mockContext);
      
      const validationResult = { valid: true, issues: [] };
      hierarchyValidator.validateHierarchyConsistency = jest.fn()
        .mockResolvedValue(validationResult);
      
      const orphanedPositions = [
        createMockPosition({ id: 'orphan-1', name: 'Orphaned Position', hierarchyLevel: 3 })
      ];
      
      prismaService.positionHierarchy.findMany = jest.fn().mockResolvedValue([]);
      prismaService.position.findMany = jest.fn().mockResolvedValue(orphanedPositions);

      const result = await service.validateHierarchy('superadmin');

      expect(result.orphanedPositions).toHaveLength(1);
      expect(result.orphanedPositions![0]).toMatchObject({
        positionId: 'orphan-1',
        positionName: 'Orphaned Position',
        reason: 'No hierarchy definition'
      });
    });

    it('should throw ForbiddenException for non-superadmin', async () => {
      const mockContext = { isSuperadmin: false };
      rlsService.getUserContext = jest.fn().mockResolvedValue(mockContext);

      await expect(service.validateHierarchy('regular-user')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should audit validation operation', async () => {
      const mockContext = { isSuperadmin: true };
      rlsService.getUserContext = jest.fn().mockResolvedValue(mockContext);
      
      const validationResult = { valid: true, issues: [] };
      hierarchyValidator.validateHierarchyConsistency = jest.fn()
        .mockResolvedValue(validationResult);
      
      prismaService.positionHierarchy.findMany = jest.fn().mockResolvedValue([]);
      prismaService.position.findMany = jest.fn().mockResolvedValue([]);

      await service.validateHierarchy('superadmin');

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'superadmin' }),
        expect.objectContaining({
          entityType: 'HIERARCHY_VALIDATION',
          entityId: 'SYSTEM',
          action: 'READ',
          metadata: expect.objectContaining({
            valid: true,
            issueCount: 0
          })
        })
      );
    });
  });
});