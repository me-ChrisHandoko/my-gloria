import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PositionService } from '../../services/position.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { RowLevelSecurityService } from '../../../../security/row-level-security.service';
import { AuditService } from '../../../../audit/audit.service';
import { PositionValidator } from '../../../../validators/position.validator';
import {
  createTestModule,
  createMockPosition,
  createMockUserPosition,
  expectAuditLog,
  expectTransaction,
  expectRLSCheck
} from '../setup/test.setup';

describe('PositionService', () => {
  let service: PositionService;
  let prismaService: jest.Mocked<PrismaService>;
  let rlsService: jest.Mocked<RowLevelSecurityService>;
  let auditService: jest.Mocked<AuditService>;
  let positionValidator: jest.Mocked<PositionValidator>;

  beforeEach(async () => {
    const module: TestingModule = await createTestModule([PositionService]);

    service = module.get<PositionService>(PositionService);
    prismaService = module.get(PrismaService);
    rlsService = module.get(RowLevelSecurityService);
    auditService = module.get(AuditService);
    positionValidator = module.get(PositionValidator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      code: 'POS002',
      name: 'New Position',
      description: 'New Position Description',
      departmentId: 'dept-1',
      schoolId: 'school-1',
      hierarchyLevel: 4,
      maxHolders: 1,
      isUnique: true
    };

    it('should create a new position successfully', async () => {
      const mockPosition = createMockPosition(createDto);
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      prismaService.position.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.position.create = jest.fn().mockResolvedValue(mockPosition);
      prismaService.positionHierarchy.create = jest.fn().mockResolvedValue({});

      const result = await service.create(createDto, 'test-user');

      expect(prismaService.position.findUnique).toHaveBeenCalledWith({
        where: { code: createDto.code }
      });
      expect(prismaService.position.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...createDto,
          createdBy: 'test-user',
          modifiedBy: 'test-user'
        }),
        include: expect.any(Object)
      });
      expect(prismaService.positionHierarchy.create).toHaveBeenCalledWith({
        data: { positionId: mockPosition.id }
      });
      expectTransaction(prismaService);
      expect(result).toEqual(mockPosition);
    });

    it('should throw ConflictException if position code exists', async () => {
      prismaService.position.findUnique = jest.fn().mockResolvedValue(createMockPosition());

      await expect(service.create(createDto, 'test-user')).rejects.toThrow(
        ConflictException
      );
    });

    it('should validate department-school alignment', async () => {
      const invalidDto = { ...createDto, departmentId: 'dept-2', schoolId: 'school-2' };
      prismaService.position.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.department.findUnique = jest.fn().mockResolvedValue({
        id: 'dept-2',
        schoolId: 'school-1' // Different school
      });

      await expect(service.create(invalidDto, 'test-user')).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('findAll', () => {
    it('should return positions with filters and availability', async () => {
      const mockPositions = [
        createMockPosition({
          userPositions: [createMockUserPosition({ isPlt: false })]
        }),
        createMockPosition({
          id: 'pos-2',
          userPositions: []
        })
      ];
      prismaService.position.findMany = jest.fn().mockResolvedValue(mockPositions);

      const filters = { 
        departmentId: 'dept-1',
        hasAvailableSlots: true
      };
      const result = await service.findAll(filters, 'test-user');

      // Should only return position with available slots
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pos-2');
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

      await service.findAll({}, 'test-user');

      expect(prismaService.position.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                schoolId: { in: ['school-1'] }
              })
            ])
          })
        })
      );
    });

    it('should sanitize search input', async () => {
      prismaService.position.findMany = jest.fn().mockResolvedValue([]);

      const filters = { search: "admin'; DROP TABLE positions; --" };
      await service.findAll(filters, 'test-user');

      expect(prismaService.position.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: expect.objectContaining({
                  contains: 'admin DROP TABLE positions --',
                  mode: 'insensitive'
                })
              })
            ])
          })
        })
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Position',
      maxHolders: 2
    };

    it('should update position successfully', async () => {
      const oldPosition = createMockPosition({ userPositions: [] });
      const updatedPosition = { ...oldPosition, ...updateDto };
      
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      prismaService.position.findUnique = jest.fn().mockResolvedValue(oldPosition);
      prismaService.position.update = jest.fn().mockResolvedValue(updatedPosition);

      const result = await service.update('pos-1', updateDto, 'test-user');

      expect(prismaService.position.update).toHaveBeenCalledWith({
        where: { id: 'pos-1' },
        data: expect.objectContaining({
          ...updateDto,
          modifiedBy: 'test-user'
        }),
        include: expect.any(Object)
      });
      expectTransaction(prismaService);
      expect(result).toEqual(updatedPosition);
    });

    it('should prevent reducing maxHolders below current holders', async () => {
      const oldPosition = createMockPosition({
        userPositions: [
          createMockUserPosition(),
          createMockUserPosition({ id: 'user-pos-2' }),
          createMockUserPosition({ id: 'user-pos-3' })
        ]
      });
      
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      prismaService.position.findUnique = jest.fn().mockResolvedValue(oldPosition);

      const invalidUpdate = { maxHolders: 2 }; // Current has 3 holders

      await expect(
        service.update('pos-1', invalidUpdate, 'test-user')
      ).rejects.toThrow(ConflictException);
    });

    it('should check RLS permissions', async () => {
      rlsService.canAccessRecord = jest.fn().mockResolvedValue(false);

      await expect(
        service.update('pos-1', updateDto, 'test-user')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete position successfully', async () => {
      const mockPosition = createMockPosition();
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      prismaService.userPosition.count = jest.fn().mockResolvedValue(0);
      prismaService.positionHierarchy.count = jest.fn().mockResolvedValue(0);
      prismaService.position.findUnique = jest.fn().mockResolvedValue(mockPosition);
      prismaService.positionHierarchy.deleteMany = jest.fn().mockResolvedValue({});
      prismaService.position.delete = jest.fn().mockResolvedValue(mockPosition);

      await service.remove('pos-1', 'test-user');

      expect(prismaService.position.delete).toHaveBeenCalledWith({
        where: { id: 'pos-1' }
      });
      expectTransaction(prismaService);
    });

    it('should prevent deletion with active assignments', async () => {
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      prismaService.userPosition.count = jest.fn().mockResolvedValue(3);

      await expect(service.remove('pos-1', 'test-user')).rejects.toThrow(
        ConflictException
      );
      expect(prismaService.position.delete).not.toHaveBeenCalled();
    });

    it('should prevent deletion with dependent positions', async () => {
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      prismaService.userPosition.count = jest.fn().mockResolvedValue(0);
      prismaService.positionHierarchy.count = jest.fn().mockResolvedValue(2);

      await expect(service.remove('pos-1', 'test-user')).rejects.toThrow(
        ConflictException
      );
      expect(prismaService.position.delete).not.toHaveBeenCalled();
    });
  });

  describe('checkAvailability', () => {
    it('should return position availability status', async () => {
      const mockPosition = createMockPosition({
        maxHolders: 3,
        isUnique: false,
        userPositions: [
          {
            ...createMockUserPosition({ isPlt: false }),
            userProfile: {
              dataKaryawan: { nama: 'John Doe' }
            }
          },
          {
            ...createMockUserPosition({ id: 'user-pos-2', isPlt: true }),
            userProfile: {
              dataKaryawan: { nama: 'Jane Smith' }
            }
          }
        ]
      });
      prismaService.position.findUnique = jest.fn().mockResolvedValue(mockPosition);

      const result = await service.checkAvailability('pos-1', 'test-user');

      expect(result).toMatchObject({
        positionId: 'pos-1',
        positionName: 'Test Position',
        isAvailable: true,
        maxHolders: 3,
        currentHolders: 1, // Only non-PLT counted
        availableSlots: 2,
        currentAssignments: expect.arrayContaining([
          expect.objectContaining({ isPlt: false }),
          expect.objectContaining({ isPlt: true })
        ])
      });
    });

    it('should handle unique positions', async () => {
      const mockPosition = createMockPosition({
        maxHolders: 1,
        isUnique: true,
        userPositions: [{
          ...createMockUserPosition({ isPlt: false }),
          userProfile: {
            dataKaryawan: { nama: 'John Doe' }
          }
        }]
      });
      prismaService.position.findUnique = jest.fn().mockResolvedValue(mockPosition);

      const result = await service.checkAvailability('pos-1', 'test-user');

      expect(result.isAvailable).toBe(false);
      expect(result.availableSlots).toBe(0);
    });
  });

  describe('getHolders', () => {
    it('should return current, PLT, and historical holders', async () => {
      const now = new Date();
      const pastDate = new Date('2023-01-01');
      
      const mockPosition = createMockPosition({
        userPositions: [
          createMockUserPosition({ isPlt: false, isActive: true }),
          createMockUserPosition({ id: 'user-pos-2', isPlt: true, isActive: true }),
          createMockUserPosition({ 
            id: 'user-pos-3', 
            isActive: false, 
            endDate: pastDate 
          })
        ]
      });
      prismaService.position.findUnique = jest.fn().mockResolvedValue(mockPosition);

      const result = await service.getHolders('pos-1', 'test-user');

      expect(result).toMatchObject({
        position: expect.objectContaining({
          id: 'pos-1',
          name: 'Test Position'
        }),
        currentHolders: expect.arrayContaining([
          expect.objectContaining({ isPlt: false, isActive: true })
        ]),
        pltHolders: expect.arrayContaining([
          expect.objectContaining({ isPlt: true, isActive: true })
        ]),
        historicalHolders: expect.arrayContaining([
          expect.objectContaining({ isActive: false })
        ])
      });
    });
  });
});