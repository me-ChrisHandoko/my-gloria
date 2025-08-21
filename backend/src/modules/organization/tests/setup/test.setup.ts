import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../prisma/prisma.service';
import { RowLevelSecurityService } from '../../../../security/row-level-security.service';
import { AuditService } from '../../../../audit/audit.service';
import { DepartmentValidator } from '../../../../validators/department.validator';
import { PositionValidator } from '../../../../validators/position.validator';
import { HierarchyValidator } from '../../../../validators/hierarchy.validator';

/**
 * Mock implementations for testing
 */
export const mockPrismaService = () => ({
  $transaction: jest.fn((callback) => callback(mockPrismaService())),
  school: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  department: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  position: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  userPosition: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  positionHierarchy: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  userProfile: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  dataKaryawan: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
});

export const mockRLSService = () => ({
  getUserContext: jest.fn().mockResolvedValue({
    userProfileId: 'test-user-id',
    clerkUserId: 'clerk-test-id',
    isSuperadmin: false,
    schoolIds: ['school-1'],
    departmentIds: ['dept-1'],
    positionIds: ['pos-1'],
  }),
  canAccessRecord: jest.fn().mockResolvedValue(true),
  buildSecurityFilter: jest.fn().mockReturnValue({}),
});

export const mockAuditService = () => ({
  log: jest.fn().mockResolvedValue(undefined),
  logCreate: jest.fn().mockResolvedValue(undefined),
  logUpdate: jest.fn().mockResolvedValue(undefined),
  logDelete: jest.fn().mockResolvedValue(undefined),
  logOrganizationalChange: jest.fn().mockResolvedValue(undefined),
  auditPositionAssignment: jest.fn().mockResolvedValue(undefined),
  auditHierarchyChange: jest.fn().mockResolvedValue(undefined),
  createContextFromRequest: jest.fn().mockReturnValue({
    actorId: 'test-user',
    module: 'ORGANIZATION',
  }),
});

export const mockDepartmentValidator = () => ({
  validateCreate: jest.fn().mockResolvedValue(undefined),
  validateUpdate: jest.fn().mockResolvedValue(undefined),
  validateDelete: jest.fn().mockResolvedValue(undefined),
  validateMove: jest.fn().mockResolvedValue(undefined),
  validateParentDepartment: jest.fn().mockResolvedValue(undefined),
  validateHierarchyConsistency: jest.fn().mockResolvedValue({
    valid: true,
    issues: [],
  }),
  detectCircularReference: jest.fn().mockResolvedValue(false),
});

export const mockPositionValidator = () => ({
  validateAssignment: jest.fn().mockResolvedValue(undefined),
  validateTermination: jest.fn().mockResolvedValue(undefined),
  validateAppointer: jest.fn().mockResolvedValue(undefined),
  validatePositionCapacity: jest.fn().mockResolvedValue(undefined),
  validateNoOverlap: jest.fn().mockResolvedValue(undefined),
  validateDates: jest.fn().mockResolvedValue(undefined),
  checkPositionAvailability: jest.fn().mockResolvedValue({
    available: true,
    currentHolders: 0,
  }),
});

export const mockHierarchyValidator = () => ({
  validateHierarchy: jest.fn().mockResolvedValue(undefined),
  detectCircularReference: jest.fn().mockResolvedValue(false),
  getReportingChain: jest.fn().mockResolvedValue([]),
  getSubordinates: jest.fn().mockResolvedValue([]),
  validateHierarchyConsistency: jest.fn().mockResolvedValue({
    valid: true,
    issues: [],
  }),
  validateReportingLine: jest.fn().mockResolvedValue(true),
});

/**
 * Test data factories
 */
export const createMockSchool = (overrides = {}) => ({
  id: 'school-1',
  code: 'SCH001',
  name: 'Test School',
  lokasi: 'Jakarta',
  address: 'Test Address',
  phone: '021-1234567',
  email: 'school@test.com',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  createdBy: 'admin',
  modifiedBy: 'admin',
  ...overrides,
});

export const createMockDepartment = (overrides = {}) => ({
  id: 'dept-1',
  code: 'DEPT001',
  name: 'Test Department',
  description: 'Test Department Description',
  schoolId: 'school-1',
  parentId: undefined as string | undefined,
  bagianKerja: 'ACADEMIC',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  createdBy: 'admin',
  modifiedBy: 'admin',
  ...overrides,
});

export const createMockPosition = (overrides = {}) => ({
  id: 'pos-1',
  code: 'POS001',
  name: 'Test Position',
  description: 'Test Position Description',
  departmentId: 'dept-1',
  schoolId: 'school-1',
  hierarchyLevel: 3,
  maxHolders: 1,
  isUnique: true,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  createdBy: 'admin',
  modifiedBy: 'admin',
  ...overrides,
});

export const createMockUserPosition = (overrides = {}) => ({
  id: 'user-pos-1',
  userProfileId: 'user-1',
  positionId: 'pos-1',
  startDate: new Date('2024-01-01'),
  endDate: null,
  isPlt: false,
  isActive: true,
  appointedBy: 'admin',
  skNumber: 'SK/001/2024',
  notes: 'Test appointment',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockPositionHierarchy = (overrides = {}) => ({
  id: 'hierarchy-1',
  positionId: 'pos-1',
  reportsToId: 'pos-2',
  coordinatorId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockUserProfile = (overrides = {}) => ({
  id: 'user-1',
  clerkUserId: 'clerk-user-1',
  dataKaryawanId: 'karyawan-1',
  dataKaryawan: {
    id: 'karyawan-1',
    nama: 'Test User',
    nip: 'NIP001',
    email: 'test@example.com',
    noPonsel: '081234567890',
    lokasi: 'Jakarta',
  },
  ...overrides,
});

/**
 * Create test module helper
 */
export async function createTestModule(
  providers: any[],
): Promise<TestingModule> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ...providers,
      {
        provide: PrismaService,
        useValue: mockPrismaService(),
      },
      {
        provide: RowLevelSecurityService,
        useValue: mockRLSService(),
      },
      {
        provide: AuditService,
        useValue: mockAuditService(),
      },
      {
        provide: DepartmentValidator,
        useValue: mockDepartmentValidator(),
      },
      {
        provide: PositionValidator,
        useValue: mockPositionValidator(),
      },
      {
        provide: HierarchyValidator,
        useValue: mockHierarchyValidator(),
      },
    ],
  }).compile();

  return module;
}

/**
 * Test assertions helpers
 */
export const expectAuditLog = (auditService: any, action: string) => {
  expect(auditService.log).toHaveBeenCalledWith(
    expect.objectContaining({
      actorId: expect.any(String),
      module: 'ORGANIZATION',
    }),
    expect.objectContaining({
      action: expect.any(String),
    }),
  );
};

export const expectTransaction = (prismaService: any) => {
  expect(prismaService.$transaction).toHaveBeenCalled();
};

export const expectRLSCheck = (
  rlsService: any,
  entityType: string,
  action: string,
) => {
  expect(rlsService.canAccessRecord).toHaveBeenCalledWith(
    expect.any(Object),
    entityType,
    expect.any(String),
    action,
  );
};
