import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchoolServiceRefactored } from '../school.service.refactored';
import { PrismaService } from '../../../../prisma/prisma.service';
import { RowLevelSecurityService } from '../../../../security/row-level-security.service';
import { AuditService } from '../../../audit/services/audit.service';
import { OrganizationCacheService } from '../../cache/organization-cache.service';
import { BusinessException } from '../../../../common/exceptions/business.exception';
import { CreateSchoolDto, UpdateSchoolDto } from '../../dto/school.dto';

describe('SchoolServiceRefactored', () => {
  let service: SchoolServiceRefactored;
  let prismaService: PrismaService;
  let rlsService: RowLevelSecurityService;
  let auditService: AuditService;
  let cacheService: OrganizationCacheService<any>;
  let eventEmitter: EventEmitter2;

  const mockPrismaService = {
    school: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    department: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    position: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    userPosition: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    dataKaryawan: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockRlsService = {
    getUserContext: jest.fn(),
    canAccessRecord: jest.fn(),
  };

  const mockAuditService = {
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
    log: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolServiceRefactored,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RowLevelSecurityService, useValue: mockRlsService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: 'SchoolCacheService', useValue: mockCacheService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<SchoolServiceRefactored>(SchoolServiceRefactored);
    prismaService = module.get<PrismaService>(PrismaService);
    rlsService = module.get<RowLevelSecurityService>(RowLevelSecurityService);
    auditService = module.get<AuditService>(AuditService);
    cacheService = module.get<OrganizationCacheService<any>>('SchoolCacheService');
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateSchoolDto = {
      code: 'SCH001',
      name: 'Test School',
      lokasi: 'Jakarta',
      address: 'Test Address',
      isActive: true,
    };

    const userId = 'test-user-id';

    it('should create a school successfully', async () => {
      const mockSchool = {
        id: 'school-id',
        ...createDto,
        createdBy: userId,
        modifiedBy: userId,
      };

      mockPrismaService.school.findUnique.mockResolvedValue(null);
      mockPrismaService.school.create.mockResolvedValue(mockSchool);

      const result = await service.create(createDto, userId);

      expect(result).toEqual(mockSchool);
      expect(mockPrismaService.school.findUnique).toHaveBeenCalledWith({
        where: { code: createDto.code },
      });
      expect(mockAuditService.logCreate).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'organization.school.created',
        expect.objectContaining({
          id: mockSchool.id,
          name: mockSchool.name,
          userId,
        }),
      );
    });

    it('should throw duplicate exception if code already exists', async () => {
      mockPrismaService.school.findFirst.mockResolvedValue({
        id: 'existing-id',
        code: createDto.code,
      });

      await expect(service.create(createDto, userId)).rejects.toThrow(
        BusinessException.duplicate('school', 'code', createDto.code),
      );
    });
  });

  describe('findOne', () => {
    const schoolId = 'school-id';
    const userId = 'test-user-id';

    it('should return cached school if available', async () => {
      const cachedSchool = {
        id: schoolId,
        name: 'Cached School',
        employeeCount: 10,
      };

      mockCacheService.get.mockResolvedValue(cachedSchool);

      const result = await service.findOne(schoolId, userId);

      expect(result).toEqual(cachedSchool);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringContaining(`school:${schoolId}:full`),
      );
      expect(mockPrismaService.school.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      const mockSchool = {
        id: schoolId,
        name: 'Test School',
        departments: [],
        positions: [
          {
            id: 'pos-1',
            userPositions: [{ id: 'up-1' }, { id: 'up-2' }],
          },
        ],
      };

      mockCacheService.get.mockResolvedValue(null);
      mockRlsService.getUserContext.mockResolvedValue({
        userId,
        isSuperadmin: true,
      });
      mockRlsService.canAccessRecord.mockResolvedValue(true);
      mockPrismaService.school.findUnique.mockResolvedValue(mockSchool);

      const result = await service.findOne(schoolId, userId);

      expect(result).toMatchObject({
        ...mockSchool,
        employeeCount: 2,
        departmentCount: 0,
        positionCount: 1,
      });
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should throw not found exception if school does not exist', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRlsService.getUserContext.mockResolvedValue({
        userId,
        isSuperadmin: true,
      });
      mockRlsService.canAccessRecord.mockResolvedValue(true);
      mockPrismaService.school.findUnique.mockResolvedValue(null);

      await expect(service.findOne(schoolId, userId)).rejects.toThrow(
        BusinessException.notFound('School', schoolId),
      );
    });

    it('should throw unauthorized exception if user lacks access', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRlsService.getUserContext.mockResolvedValue({
        userId,
        isSuperadmin: false,
        schoolIds: [],
      });
      mockRlsService.canAccessRecord.mockResolvedValue(false);

      await expect(service.findOne(schoolId, userId)).rejects.toThrow(
        BusinessException.unauthorized('Access denied to read this school'),
      );
    });
  });

  describe('update', () => {
    const schoolId = 'school-id';
    const userId = 'test-user-id';
    const updateDto: UpdateSchoolDto = {
      name: 'Updated School Name',
      address: 'Updated Address',
    };

    it('should update school and invalidate cache', async () => {
      const oldSchool = {
        id: schoolId,
        name: 'Old Name',
        code: 'SCH001',
      };

      const updatedSchool = {
        ...oldSchool,
        ...updateDto,
        modifiedBy: userId,
      };

      mockRlsService.getUserContext.mockResolvedValue({
        userId,
        isSuperadmin: true,
      });
      mockRlsService.canAccessRecord.mockResolvedValue(true);
      mockPrismaService.school.findUnique.mockResolvedValue(oldSchool);
      mockPrismaService.school.update.mockResolvedValue(updatedSchool);

      const result = await service.update(schoolId, updateDto, userId);

      expect(result).toEqual(updatedSchool);
      expect(mockCacheService.delete).toHaveBeenCalledWith(`school:${schoolId}:*`);
      expect(mockAuditService.logUpdate).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'organization.school.updated',
        expect.objectContaining({
          id: schoolId,
          name: updatedSchool.name,
          userId,
        }),
      );
    });
  });

  describe('remove', () => {
    const schoolId = 'school-id';
    const userId = 'test-user-id';

    it('should delete school if no dependencies exist', async () => {
      const mockSchool = {
        id: schoolId,
        name: 'Test School',
      };

      mockRlsService.getUserContext.mockResolvedValue({
        userId,
        isSuperadmin: true,
      });
      mockRlsService.canAccessRecord.mockResolvedValue(true);
      mockPrismaService.school.findUnique.mockResolvedValue(mockSchool);
      mockPrismaService.department.count.mockResolvedValue(0);
      mockPrismaService.position.count.mockResolvedValue(0);

      await service.remove(schoolId, userId);

      expect(mockPrismaService.school.delete).toHaveBeenCalledWith({
        where: { id: schoolId },
      });
      expect(mockAuditService.logDelete).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'organization.school.deleted',
        expect.objectContaining({
          id: schoolId,
          userId,
        }),
      );
    });

    it('should throw exception if departments exist', async () => {
      mockRlsService.getUserContext.mockResolvedValue({
        userId,
        isSuperadmin: true,
      });
      mockRlsService.canAccessRecord.mockResolvedValue(true);
      mockPrismaService.school.findUnique.mockResolvedValue({ id: schoolId });
      mockPrismaService.department.count.mockResolvedValue(3);

      await expect(service.remove(schoolId, userId)).rejects.toThrow(
        BusinessException.invalidOperation('Cannot delete school with 3 department(s)'),
      );
    });
  });

  describe('findAll', () => {
    const userId = 'test-user-id';

    it('should return paginated schools with employee counts', async () => {
      const mockSchools = [
        { id: 'school-1', name: 'School 1', _count: { departments: 2, positions: 5 } },
        { id: 'school-2', name: 'School 2', _count: { departments: 1, positions: 3 } },
      ];

      const mockPositions = [
        { id: 'pos-1', schoolId: 'school-1' },
        { id: 'pos-2', schoolId: 'school-1' },
        { id: 'pos-3', schoolId: 'school-2' },
      ];

      const mockEmployeeCounts = [
        { positionId: 'pos-1', _count: { id: 3 } },
        { positionId: 'pos-2', _count: { id: 2 } },
        { positionId: 'pos-3', _count: { id: 4 } },
      ];

      mockRlsService.getUserContext.mockResolvedValue({
        userId,
        isSuperadmin: true,
      });
      mockPrismaService.school.count.mockResolvedValue(2);
      mockPrismaService.school.findMany.mockResolvedValue(mockSchools);
      mockPrismaService.position.findMany.mockResolvedValue(mockPositions);
      mockPrismaService.userPosition.groupBy.mockResolvedValue(mockEmployeeCounts);

      const result = await service.findAll({ page: 1, limit: 10 }, userId);

      expect(result.total).toBe(2);
      expect(result.data[0]).toMatchObject({
        id: 'school-1',
        employeeCount: 5,
      });
      expect(result.data[1]).toMatchObject({
        id: 'school-2',
        employeeCount: 4,
      });
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate pattern-based cache entries', async () => {
      const schoolId = 'school-id';
      const updateDto: UpdateSchoolDto = { name: 'Updated' };

      mockRlsService.getUserContext.mockResolvedValue({
        userId: 'user-id',
        isSuperadmin: true,
      });
      mockRlsService.canAccessRecord.mockResolvedValue(true);
      mockPrismaService.school.findUnique.mockResolvedValue({ id: schoolId });
      mockPrismaService.school.update.mockResolvedValue({ id: schoolId, ...updateDto });

      await service.update(schoolId, updateDto, 'user-id');

      expect(mockCacheService.delete).toHaveBeenCalledWith(`school:${schoolId}:*`);
    });
  });
});