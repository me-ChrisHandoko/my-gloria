import { Test, TestingModule } from '@nestjs/testing';
import { SchoolController } from '../../controllers/school.controller';
import { SchoolService } from '../../services/school.service';
import { ClerkAuthGuard } from '../../../../auth/guards/clerk-auth.guard';
import { AuditInterceptor } from '../../../../middleware/security.middleware';
import { createMockSchool } from '../setup/test.setup';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('SchoolController', () => {
  let controller: SchoolController;
  let schoolService: jest.Mocked<SchoolService>;

  const mockSchoolService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getHierarchy: jest.fn(),
    getStatistics: jest.fn(),
    syncWithDataKaryawan: jest.fn()
  };

  const mockRequest = {
    user: {
      clerkUserId: 'test-user-id'
    },
    auth: {
      userId: 'test-user-id'
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchoolController],
      providers: [
        {
          provide: SchoolService,
          useValue: mockSchoolService
        }
      ]
    })
    .overrideGuard(ClerkAuthGuard)
    .useValue({ canActivate: () => true })
    .overrideInterceptor(AuditInterceptor)
    .useValue({ intercept: (context, next) => next.handle() })
    .compile();

    controller = module.get<SchoolController>(SchoolController);
    schoolService = module.get(SchoolService) as jest.Mocked<SchoolService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      code: 'SCH001',
      name: 'Test School',
      lokasi: 'Jakarta',
      address: 'Test Address',
      phone: '021-1234567',
      email: 'school@test.com'
    };

    it('should create a new school', async () => {
      const mockSchool = createMockSchool(createDto);
      schoolService.create.mockResolvedValue(mockSchool);

      const result = await controller.create(createDto, mockRequest);

      expect(schoolService.create).toHaveBeenCalledWith(createDto, 'test-user-id');
      expect(result).toEqual(mockSchool);
    });

    it('should handle ConflictException', async () => {
      schoolService.create.mockRejectedValue(
        new ConflictException('School code already exists')
      );

      await expect(controller.create(createDto, mockRequest)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('findAll', () => {
    it('should return all schools with filters', async () => {
      const mockSchools = [createMockSchool(), createMockSchool({ id: 'school-2' })];
      const filters = { lokasi: 'Jakarta', isActive: true };
      
      schoolService.findAll.mockResolvedValue(mockSchools);

      const result = await controller.findAll(filters, mockRequest);

      expect(schoolService.findAll).toHaveBeenCalledWith(filters, 'test-user-id');
      expect(result).toEqual(mockSchools);
    });

    it('should handle empty results', async () => {
      schoolService.findAll.mockResolvedValue([]);

      const result = await controller.findAll({}, mockRequest);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a school by ID', async () => {
      const mockSchool = createMockSchool();
      schoolService.findOne.mockResolvedValue(mockSchool);

      const result = await controller.findOne('school-1', mockRequest);

      expect(schoolService.findOne).toHaveBeenCalledWith('school-1', 'test-user-id');
      expect(result).toEqual(mockSchool);
    });

    it('should handle NotFoundException', async () => {
      schoolService.findOne.mockRejectedValue(
        new NotFoundException('School not found')
      );

      await expect(controller.findOne('invalid-id', mockRequest)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated School',
      address: 'Updated Address'
    };

    it('should update a school', async () => {
      const updatedSchool = createMockSchool(updateDto);
      schoolService.update.mockResolvedValue(updatedSchool);

      const result = await controller.update('school-1', updateDto, mockRequest);

      expect(schoolService.update).toHaveBeenCalledWith(
        'school-1',
        updateDto,
        'test-user-id'
      );
      expect(result).toEqual(updatedSchool);
    });

    it('should handle validation errors', async () => {
      schoolService.update.mockRejectedValue(
        new ConflictException('Invalid update')
      );

      await expect(
        controller.update('school-1', updateDto, mockRequest)
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete a school', async () => {
      schoolService.remove.mockResolvedValue(undefined);

      await controller.remove('school-1', mockRequest);

      expect(schoolService.remove).toHaveBeenCalledWith('school-1', 'test-user-id');
    });

    it('should handle deletion conflicts', async () => {
      schoolService.remove.mockRejectedValue(
        new ConflictException('Cannot delete school with departments')
      );

      await expect(controller.remove('school-1', mockRequest)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('getHierarchy', () => {
    it('should return school hierarchy', async () => {
      const mockHierarchy = {
        schoolId: 'school-1',
        schoolName: 'Test School',
        departments: []
      };
      schoolService.getHierarchy.mockResolvedValue(mockHierarchy);

      const result = await controller.getHierarchy('school-1', mockRequest);

      expect(schoolService.getHierarchy).toHaveBeenCalledWith('school-1', 'test-user-id');
      expect(result).toEqual(mockHierarchy);
    });
  });

  describe('getStatistics', () => {
    it('should return school statistics', async () => {
      const mockStatistics = {
        schoolId: 'school-1',
        schoolName: 'Test School',
        summary: {
          departmentCount: 5,
          positionCount: 20,
          employeeCount: 15,
          vacantPositions: 5,
          pltCount: 2,
          fillRate: '75.00%'
        }
      };
      schoolService.getStatistics.mockResolvedValue(mockStatistics);

      const result = await controller.getStatistics('school-1', mockRequest);

      expect(schoolService.getStatistics).toHaveBeenCalledWith('school-1', 'test-user-id');
      expect(result).toEqual(mockStatistics);
    });
  });

  describe('syncWithDataKaryawan', () => {
    it('should sync school locations', async () => {
      const syncResult = { synced: 5, created: 2, updated: 3 };
      schoolService.syncWithDataKaryawan.mockResolvedValue(syncResult);

      const result = await controller.syncWithDataKaryawan(mockRequest);

      expect(schoolService.syncWithDataKaryawan).toHaveBeenCalledWith('test-user-id');
      expect(result).toEqual(syncResult);
    });

    it('should handle permission errors', async () => {
      schoolService.syncWithDataKaryawan.mockRejectedValue(
        new Error('Permission denied')
      );

      await expect(controller.syncWithDataKaryawan(mockRequest)).rejects.toThrow(
        'Permission denied'
      );
    });
  });
});