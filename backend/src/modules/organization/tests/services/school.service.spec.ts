import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SchoolService } from '../../services/school.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { RowLevelSecurityService } from '../../../../security/row-level-security.service';
import { AuditService } from '../../../modules/audit/services/audit.service';
import {
  createTestModule,
  createMockSchool,
  expectAuditLog,
  expectTransaction,
  expectRLSCheck
} from '../setup/test.setup';

describe('SchoolService', () => {
  let service: SchoolService;
  let prismaService: jest.Mocked<PrismaService>;
  let rlsService: jest.Mocked<RowLevelSecurityService>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const module: TestingModule = await createTestModule([SchoolService]);

    service = module.get<SchoolService>(SchoolService);
    prismaService = module.get(PrismaService);
    rlsService = module.get(RowLevelSecurityService);
    auditService = module.get(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      code: 'SCH002',
      name: 'New School',
      lokasi: 'Bandung',
      address: 'New Address',
      phone: '022-9876543',
      email: 'new@school.com'
    };

    it('should create a new school successfully', async () => {
      const mockSchool = createMockSchool(createDto);
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      prismaService.school.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.school.create = jest.fn().mockResolvedValue(mockSchool);

      const result = await service.create(createDto, 'test-user');

      expect(prismaService.school.findUnique).toHaveBeenCalledWith({
        where: { code: createDto.code }
      });
      expect(prismaService.school.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...createDto,
          createdBy: 'test-user',
          modifiedBy: 'test-user'
        })
      });
      expectTransaction(prismaService);
      expect(result).toEqual(mockSchool);
    });

    it('should throw ConflictException if school code already exists', async () => {
      prismaService.school.findUnique = jest.fn().mockResolvedValue(createMockSchool());

      await expect(service.create(createDto, 'test-user')).rejects.toThrow(
        ConflictException
      );
      expect(prismaService.school.create).not.toHaveBeenCalled();
    });

    it('should log audit on successful creation', async () => {
      const mockSchool = createMockSchool(createDto);
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      prismaService.school.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.school.create = jest.fn().mockResolvedValue(mockSchool);

      await service.create(createDto, 'test-user');

      expect(auditService.logCreate).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'test-user' }),
        'School',
        mockSchool.id,
        mockSchool,
        mockSchool.name
      );
    });
  });

  describe('findAll', () => {
    it('should return all schools with filters', async () => {
      const mockSchools = [createMockSchool(), createMockSchool({ id: 'school-2' })];
      prismaService.school.findMany = jest.fn().mockResolvedValue(mockSchools);
      prismaService.userPosition.groupBy = jest.fn().mockResolvedValue([]);
      prismaService.position.findMany = jest.fn().mockResolvedValue([]);

      const filters = { lokasi: 'Jakarta', isActive: true };
      const result = await service.findAll(filters, 'test-user');

      expect(prismaService.school.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lokasi: 'Jakarta',
            isActive: true
          })
        })
      );
      expect(result).toHaveLength(2);
    });

    it('should apply RLS for non-superadmin users', async () => {
      const mockContext = {
        isSuperadmin: false,
        schoolIds: ['school-1'],
        departmentIds: [],
        positionIds: []
      };
      rlsService.getUserContext = jest.fn().mockResolvedValue(mockContext);
      prismaService.school.findMany = jest.fn().mockResolvedValue([createMockSchool()]);
      prismaService.userPosition.groupBy = jest.fn().mockResolvedValue([]);
      prismaService.position.findMany = jest.fn().mockResolvedValue([]);

      await service.findAll({}, 'test-user');

      expect(prismaService.school.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['school-1'] }
          })
        })
      );
    });

    it('should sanitize search input', async () => {
      prismaService.school.findMany = jest.fn().mockResolvedValue([]);
      prismaService.userPosition.groupBy = jest.fn().mockResolvedValue([]);
      prismaService.position.findMany = jest.fn().mockResolvedValue([]);

      const filters = { search: "'; DROP TABLE schools; --" };
      await service.findAll(filters, 'test-user');

      expect(prismaService.school.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: expect.objectContaining({
                  contains: 'DROP TABLE schools --',  // Sanitized version (no quotes or semicolons)
                  mode: 'insensitive'
                })
              })
            ])
          })
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return a school by ID', async () => {
      const mockSchool = createMockSchool({
        departments: [],
        positions: []
      });
      prismaService.school.findUnique = jest.fn().mockResolvedValue(mockSchool);

      const result = await service.findOne('school-1', 'test-user');

      expect(prismaService.school.findUnique).toHaveBeenCalledWith({
        where: { id: 'school-1' },
        include: expect.any(Object)
      });
      expectRLSCheck(rlsService, 'School', 'READ');
      expect(result).toMatchObject({
        ...mockSchool,
        employeeCount: 0,
        departmentCount: 0,
        positionCount: 0
      });
    });

    it('should throw NotFoundException if school not found', async () => {
      prismaService.school.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.findOne('invalid-id', 'test-user')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException if user lacks access', async () => {
      rlsService.canAccessRecord = jest.fn().mockResolvedValue(false);

      await expect(service.findOne('school-1', 'test-user')).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated School',
      address: 'Updated Address'
    };

    it('should update a school successfully', async () => {
      const oldSchool = createMockSchool();
      const updatedSchool = { ...oldSchool, ...updateDto };
      
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      prismaService.school.findUnique = jest.fn()
        .mockResolvedValueOnce(oldSchool)
        .mockResolvedValueOnce(null);
      prismaService.school.update = jest.fn().mockResolvedValue(updatedSchool);

      const result = await service.update('school-1', updateDto, 'test-user');

      expect(prismaService.school.update).toHaveBeenCalledWith({
        where: { id: 'school-1' },
        data: expect.objectContaining({
          ...updateDto,
          modifiedBy: 'test-user'
        })
      });
      expectTransaction(prismaService);
      expect(result).toEqual(updatedSchool);
    });

    it('should check code uniqueness when updating code', async () => {
      const oldSchool = createMockSchool();
      const updateWithCode = { ...updateDto, code: 'NEW001' };
      
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      prismaService.school.findUnique = jest.fn()
        .mockResolvedValueOnce(oldSchool)
        .mockResolvedValueOnce(null); // No conflict
      prismaService.school.update = jest.fn().mockResolvedValue({
        ...oldSchool,
        ...updateWithCode
      });

      await service.update('school-1', updateWithCode, 'test-user');

      expect(prismaService.school.findUnique).toHaveBeenCalledWith({
        where: { code: 'NEW001' }
      });
    });

    it('should throw ConflictException if new code already exists', async () => {
      const oldSchool = createMockSchool();
      const updateWithCode = { code: 'EXISTING001' };
      
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      prismaService.school.findUnique = jest.fn()
        .mockResolvedValueOnce(oldSchool)
        .mockResolvedValueOnce(createMockSchool({ id: 'other-school' }));

      await expect(
        service.update('school-1', updateWithCode, 'test-user')
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete a school successfully', async () => {
      const mockSchool = createMockSchool();
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      prismaService.school.findUnique = jest.fn().mockResolvedValue(mockSchool);
      prismaService.department.count = jest.fn().mockResolvedValue(0);
      prismaService.position.count = jest.fn().mockResolvedValue(0);
      prismaService.school.delete = jest.fn().mockResolvedValue(mockSchool);

      await service.remove('school-1', 'test-user');

      expect(prismaService.school.delete).toHaveBeenCalledWith({
        where: { id: 'school-1' }
      });
      expectTransaction(prismaService);
      expect(auditService.logDelete).toHaveBeenCalled();
    });

    it('should throw ConflictException if school has departments', async () => {
      const mockSchool = createMockSchool();
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      prismaService.school.findUnique = jest.fn().mockResolvedValue(mockSchool);
      prismaService.department.count = jest.fn().mockResolvedValue(3);

      await expect(service.remove('school-1', 'test-user')).rejects.toThrow(
        ConflictException
      );
      expect(prismaService.school.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if school has positions', async () => {
      const mockSchool = createMockSchool();
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      prismaService.school.findUnique = jest.fn().mockResolvedValue(mockSchool);
      prismaService.department.count = jest.fn().mockResolvedValue(0);
      prismaService.position.count = jest.fn().mockResolvedValue(5);

      await expect(service.remove('school-1', 'test-user')).rejects.toThrow(
        ConflictException
      );
      expect(prismaService.school.delete).not.toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should return comprehensive school statistics', async () => {
      const mockSchool = createMockSchool();
      prismaService.school.findUnique = jest.fn().mockResolvedValue(mockSchool);
      prismaService.department.count = jest.fn().mockResolvedValue(5);
      prismaService.position.count = jest.fn()
        .mockResolvedValueOnce(20)  // total positions
        .mockResolvedValueOnce(5);  // vacant positions
      prismaService.userPosition.count = jest.fn()
        .mockResolvedValueOnce(15) // employeeCount
        .mockResolvedValueOnce(2)  // pltCount
        .mockResolvedValue(3);      // department employee counts
      prismaService.department.findMany = jest.fn().mockResolvedValue([
        { id: 'dept-1', name: 'Dept 1', _count: { positions: 10 } }
      ]);

      const result = await service.getStatistics('school-1', 'test-user');

      expect(result).toMatchObject({
        schoolId: 'school-1',
        schoolName: 'Test School',
        summary: expect.objectContaining({
          departmentCount: 5,
          positionCount: 20,
          employeeCount: 15,
          vacantPositions: 5,
          pltCount: 2,
          fillRate: '75.00%'
        })
      });
    });
  });

  describe('syncWithDataKaryawan', () => {
    it('should sync school locations from data_karyawan', async () => {
      const mockContext = { isSuperadmin: true };
      rlsService.getUserContext = jest.fn().mockResolvedValue(mockContext);
      
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      
      prismaService.dataKaryawan.findMany = jest.fn().mockResolvedValue([
        { lokasi: 'Jakarta' },
        { lokasi: 'Bandung' },
        { lokasi: 'Surabaya' }
      ]);
      
      prismaService.school.findFirst = jest.fn()
        .mockResolvedValueOnce(null) // Jakarta - not exists
        .mockResolvedValueOnce({ id: 'school-2', isActive: false }) // Bandung - inactive
        .mockResolvedValueOnce({ id: 'school-3', isActive: true }); // Surabaya - active
      
      prismaService.school.create = jest.fn().mockResolvedValue(createMockSchool());
      prismaService.school.update = jest.fn().mockResolvedValue(createMockSchool());

      const result = await service.syncWithDataKaryawan('superadmin');

      expect(result).toEqual({
        synced: 3,
        created: 1,
        updated: 1
      });
      expect(prismaService.school.create).toHaveBeenCalledTimes(1);
      expect(prismaService.school.update).toHaveBeenCalledTimes(1);
    });

    it('should throw ForbiddenException for non-superadmin', async () => {
      const mockContext = { isSuperadmin: false };
      rlsService.getUserContext = jest.fn().mockResolvedValue(mockContext);

      await expect(service.syncWithDataKaryawan('regular-user')).rejects.toThrow(
        ForbiddenException
      );
    });
  });
});