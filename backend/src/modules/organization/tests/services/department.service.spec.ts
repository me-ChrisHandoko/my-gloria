import { TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DepartmentService } from '../../services/department.service';
import { PrismaService } from '../../../../prisma/prisma.service';
import { RowLevelSecurityService } from '../../../../security/row-level-security.service';
import { AuditService } from '../../../../audit/audit.service';
import { DepartmentValidator } from '../../../../validators/department.validator';
import {
  createTestModule,
  createMockDepartment,
  expectTransaction
} from '../setup/test.setup';

describe('DepartmentService', () => {
  let service: DepartmentService;
  let prismaService: jest.Mocked<PrismaService>;
  let rlsService: jest.Mocked<RowLevelSecurityService>;
  let auditService: jest.Mocked<AuditService>;
  let departmentValidator: jest.Mocked<DepartmentValidator>;

  beforeEach(async () => {
    const module: TestingModule = await createTestModule([DepartmentService]);

    service = module.get<DepartmentService>(DepartmentService);
    prismaService = module.get(PrismaService);
    rlsService = module.get(RowLevelSecurityService);
    auditService = module.get(AuditService);
    departmentValidator = module.get(DepartmentValidator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      code: 'DEPT002',
      name: 'New Department',
      description: 'New Department Description',
      schoolId: 'school-1',
      parentId: undefined,
      bagianKerja: 'ADMINISTRATIVE' as any
    };

    it('should create a new department successfully', async () => {
      const mockDepartment = createMockDepartment(createDto);
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      departmentValidator.validateCreate = jest.fn().mockResolvedValue(undefined);
      prismaService.department.create = jest.fn().mockResolvedValue(mockDepartment);

      const result = await service.create(createDto, 'test-user');

      expect(departmentValidator.validateCreate).toHaveBeenCalledWith(createDto);
      expect(prismaService.department.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...createDto,
          createdBy: 'test-user',
          modifiedBy: 'test-user'
        }),
        include: expect.any(Object)
      });
      expectTransaction(prismaService);
      expect(result).toEqual(mockDepartment);
    });

    it('should validate department creation', async () => {
      departmentValidator.validateCreate = jest.fn().mockRejectedValue(
        new ConflictException('Invalid parent department')
      );

      await expect(service.create(createDto, 'test-user')).rejects.toThrow(
        ConflictException
      );
      expect(prismaService.department.create).not.toHaveBeenCalled();
    });

    it('should log audit on successful creation', async () => {
      const mockDepartment = createMockDepartment(createDto);
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      departmentValidator.validateCreate = jest.fn().mockResolvedValue(undefined);
      prismaService.department.create = jest.fn().mockResolvedValue(mockDepartment);

      await service.create(createDto, 'test-user');

      expect(auditService.logCreate).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'test-user' }),
        'Department',
        mockDepartment.id,
        mockDepartment,
        mockDepartment.name
      );
    });
  });

  describe('findAll', () => {
    it('should return departments with filters', async () => {
      const mockDepartments = [
        createMockDepartment(),
        createMockDepartment({ id: 'dept-2', parentId: 'dept-1' })
      ];
      prismaService.department.findMany = jest.fn().mockResolvedValue(mockDepartments);

      const filters = { schoolId: 'school-1', isActive: true };
      const result = await service.findAll(filters, 'test-user');

      expect(prismaService.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId: { in: ['school-1'] },  // RLS transforms to 'in' array
            isActive: true
          })
        })
      );
      expect(result).toHaveLength(2);
    });

    it('should build department tree when includeChildren is true', async () => {
      const mockDepartments = [
        createMockDepartment({ id: 'dept-1', parentId: null }),
        createMockDepartment({ id: 'dept-2', parentId: 'dept-1' }),
        createMockDepartment({ id: 'dept-3', parentId: 'dept-1' })
      ];
      prismaService.department.findMany = jest.fn().mockResolvedValue(mockDepartments);

      const filters = { includeChildren: true };
      const result = await service.findAll(filters, 'test-user');

      // Should return tree structure with root department having children
      expect(result).toHaveLength(1); // Only root department
      expect(result[0].children).toHaveLength(2); // Two children
    });

    it('should apply RLS for non-superadmin users', async () => {
      const mockContext = {
        isSuperadmin: false,
        schoolIds: ['school-1'],
        departmentIds: ['dept-1', 'dept-2'],
        positionIds: []
      };
      rlsService.getUserContext = jest.fn().mockResolvedValue(mockContext);
      prismaService.department.findMany = jest.fn().mockResolvedValue([]);

      await service.findAll({}, 'test-user');

      expect(prismaService.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId: { in: ['school-1'] },
            OR: expect.arrayContaining([
              { id: { in: ['dept-1', 'dept-2'] } }
            ])
          })
        })
      );
    });

    it('should sanitize search input', async () => {
      prismaService.department.findMany = jest.fn().mockResolvedValue([]);

      const filters = { search: "'; DELETE FROM departments; --" };
      await service.findAll(filters, 'test-user');

      expect(prismaService.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: expect.objectContaining({
                  contains: 'DELETE FROM departments --',  // Sanitized version
                  mode: 'insensitive'
                })
              })
            ])
          })
        })
      );
    });
  });

  describe('move', () => {
    const moveDto = {
      departmentId: 'dept-1',
      newParentId: 'dept-2',
      newSchoolId: 'school-2'
    };

    it('should move department successfully', async () => {
      const mockDepartment = createMockDepartment();
      const movedDepartment = { ...mockDepartment, ...moveDto };
      
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      departmentValidator.validateMove = jest.fn().mockResolvedValue(undefined);
      prismaService.department.findUnique = jest.fn().mockResolvedValue(mockDepartment);
      prismaService.department.update = jest.fn().mockResolvedValue(movedDepartment);

      const result = await service.move(moveDto, 'test-user');

      expect(departmentValidator.validateMove).toHaveBeenCalledWith(moveDto);
      expect(prismaService.department.update).toHaveBeenCalledWith({
        where: { id: 'dept-1' },
        data: expect.objectContaining({
          parentId: 'dept-2',
          schoolId: 'school-2',
          modifiedBy: 'test-user'
        }),
        include: expect.any(Object)
      });
      expectTransaction(prismaService);
      expect(result).toEqual(movedDepartment);
    });

    it('should validate move operation', async () => {
      departmentValidator.validateMove = jest.fn().mockRejectedValue(
        new ConflictException('Circular reference detected')
      );

      await expect(service.move(moveDto, 'test-user')).rejects.toThrow(
        ConflictException
      );
    });

    it('should check RLS permissions for move', async () => {
      rlsService.canAccessRecord = jest.fn().mockResolvedValue(false);

      await expect(service.move(moveDto, 'test-user')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should log organizational change on move', async () => {
      const mockDepartment = createMockDepartment();
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      departmentValidator.validateMove = jest.fn().mockResolvedValue(undefined);
      prismaService.department.findUnique = jest.fn().mockResolvedValue(mockDepartment);
      prismaService.department.update = jest.fn().mockResolvedValue(mockDepartment);

      await service.move(moveDto, 'test-user');

      expect(auditService.logOrganizationalChange).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'test-user' }),
        expect.objectContaining({
          type: 'DEPARTMENT_MOVE',
          entityId: 'dept-1',
          entityName: mockDepartment.name,
          details: expect.objectContaining({
            oldParentId: mockDepartment.parentId,
            newParentId: moveDto.newParentId
          })
        })
      );
    });
  });

  describe('remove', () => {
    it('should delete department successfully', async () => {
      const mockDepartment = createMockDepartment();
      // Set up the transaction mock to pass the same prismaService instance
      prismaService.$transaction = jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      departmentValidator.validateDelete = jest.fn().mockResolvedValue(undefined);
      prismaService.department.findUnique = jest.fn().mockResolvedValue(mockDepartment);
      prismaService.department.delete = jest.fn().mockResolvedValue(mockDepartment);

      await service.remove('dept-1', 'test-user');

      expect(departmentValidator.validateDelete).toHaveBeenCalledWith('dept-1');
      expect(prismaService.department.delete).toHaveBeenCalledWith({
        where: { id: 'dept-1' }
      });
      expectTransaction(prismaService);
    });

    it('should validate delete operation', async () => {
      departmentValidator.validateDelete = jest.fn().mockRejectedValue(
        new ConflictException('Department has child departments')
      );

      await expect(service.remove('dept-1', 'test-user')).rejects.toThrow(
        ConflictException
      );
      expect(prismaService.department.delete).not.toHaveBeenCalled();
    });
  });

  describe('getTree', () => {
    it('should build department tree with employee counts', async () => {
      const mockDepartments = [
        { ...createMockDepartment({ id: 'dept-1', parentId: null }), positions: [] },
        { ...createMockDepartment({ id: 'dept-2', parentId: 'dept-1' }), positions: [] }
      ];
      
      prismaService.department.findMany = jest.fn().mockResolvedValue(mockDepartments);
      prismaService.userPosition.groupBy = jest.fn().mockResolvedValue([
        { positionId: 'pos-1', _count: { id: 5 } }
      ]);

      const result = await service.getTree(null, 'test-user');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'dept-1',
        children: expect.arrayContaining([
          expect.objectContaining({ id: 'dept-2' })
        ])
      });
    });

    it('should filter by rootId when provided', async () => {
      prismaService.department.findMany = jest.fn().mockResolvedValue([]);
      prismaService.userPosition.groupBy = jest.fn().mockResolvedValue([]);

      await service.getTree('dept-1', 'test-user');

      expect(prismaService.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ id: 'dept-1' }, { parentId: 'dept-1' }]
          })
        })
      );
    });
  });

  describe('validateHierarchy', () => {
    it('should validate hierarchy for superadmin', async () => {
      const mockContext = { isSuperadmin: true };
      rlsService.getUserContext = jest.fn().mockResolvedValue(mockContext);
      
      const validationResult = { valid: true, issues: [] };
      departmentValidator.validateHierarchyConsistency = jest.fn()
        .mockResolvedValue(validationResult);

      const result = await service.validateHierarchy('superadmin');

      expect(departmentValidator.validateHierarchyConsistency).toHaveBeenCalled();
      expect(result).toEqual(validationResult);
    });

    it('should throw ForbiddenException for non-superadmin', async () => {
      const mockContext = { isSuperadmin: false };
      rlsService.getUserContext = jest.fn().mockResolvedValue(mockContext);

      await expect(service.validateHierarchy('regular-user')).rejects.toThrow(
        ForbiddenException
      );
    });
  });
});