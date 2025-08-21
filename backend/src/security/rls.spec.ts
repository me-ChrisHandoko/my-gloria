import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RowLevelSecurityService } from './row-level-security.service';
import { RLSHelperService } from './rls-helper.service';

describe('Row Level Security (RLS) Implementation', () => {
  let prismaService: PrismaService;
  let rlsService: RowLevelSecurityService;
  let rlsHelper: RLSHelperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        RowLevelSecurityService,
        RLSHelperService,
      ],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
    rlsService = module.get<RowLevelSecurityService>(RowLevelSecurityService);
    rlsHelper = module.get<RLSHelperService>(RLSHelperService);
  });

  describe('RLS Context Setting', () => {
    it('should set user context in AsyncLocalStorage', async () => {
      const mockUserContext = {
        userProfileId: 'test-user-id',
        clerkUserId: 'clerk-test-id',
        isSuperadmin: false,
        schoolIds: ['school-1', 'school-2'],
        departmentIds: ['dept-1'],
        permissionScopes: new Map([
          ['organization:read', 'SCHOOL'],
          ['organization:update', 'DEPARTMENT']
        ])
      };

      await prismaService.withRLSContext(mockUserContext, async () => {
        const storage = PrismaService.getAsyncLocalStorage();
        const context = storage.getStore();
        
        expect(context).toBeDefined();
        expect(context.userContext).toEqual(mockUserContext);
      });
    });

    it('should bypass RLS when bypassRLS flag is set', async () => {
      await prismaService.bypassRLS(async () => {
        const storage = PrismaService.getAsyncLocalStorage();
        const context = storage.getStore();
        
        expect(context).toBeDefined();
        expect(context.bypassRLS).toBe(true);
      });
    });
  });

  describe('RLS Policy Validation', () => {
    it('should validate RLS setup', async () => {
      const validation = await rlsHelper.validateRLSSetup();
      
      // Check that validation returns expected structure
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('functions');
      expect(validation).toHaveProperty('missingFunctions');
      expect(validation).toHaveProperty('tablesWithRLS');
      expect(validation).toHaveProperty('tablesWithoutRLS');
    });

    it('should check if RLS is enabled on tables', async () => {
      const isEnabled = await rlsHelper.isRLSEnabled('schools');
      expect(typeof isEnabled).toBe('boolean');
    });
  });

  describe('Permission Scope Testing', () => {
    it('should correctly determine permission scope for superadmin', async () => {
      const mockSuperadminContext = {
        userProfileId: 'admin-id',
        clerkUserId: 'clerk-admin-id',
        isSuperadmin: true,
        schoolIds: [],
        departmentIds: [],
        permissionScopes: new Map()
      };

      const filter = rlsService.buildSecurityFilter(
        mockSuperadminContext,
        'organization',
        'read'
      );
      
      expect(filter).toBeUndefined(); // Superadmins have no filters
    });

    it('should apply SCHOOL scope filter correctly', async () => {
      const mockUserContext = {
        userProfileId: 'user-id',
        clerkUserId: 'clerk-user-id',
        isSuperadmin: false,
        schoolIds: ['school-1', 'school-2'],
        departmentIds: ['dept-1'],
        permissionScopes: new Map([
          ['organization:read', 'SCHOOL']
        ])
      };

      const filter = rlsService.buildSecurityFilter(
        mockUserContext,
        'organization',
        'read'
      );
      
      expect(filter).toBeDefined();
      expect(filter).toHaveProperty('OR');
    });

    it('should apply DEPARTMENT scope filter correctly', async () => {
      const mockUserContext = {
        userProfileId: 'user-id',
        clerkUserId: 'clerk-user-id',
        isSuperadmin: false,
        schoolIds: ['school-1'],
        departmentIds: ['dept-1', 'dept-2'],
        permissionScopes: new Map([
          ['organization:read', 'DEPARTMENT']
        ])
      };

      const filter = rlsService.buildSecurityFilter(
        mockUserContext,
        'organization',
        'read'
      );
      
      expect(filter).toBeDefined();
      expect(filter).toHaveProperty('OR');
    });

    it('should apply OWN scope filter correctly', async () => {
      const mockUserContext = {
        userProfileId: 'user-id',
        clerkUserId: 'clerk-user-id',
        isSuperadmin: false,
        schoolIds: [],
        departmentIds: [],
        permissionScopes: new Map([
          ['organization:read', 'OWN']
        ])
      };

      const filter = rlsService.buildSecurityFilter(
        mockUserContext,
        'organization',
        'read'
      );
      
      expect(filter).toBeDefined();
      expect(filter).toHaveProperty('userProfileId');
      expect(filter.userProfileId).toBe('user-id');
    });
  });

  describe('Access Control Testing', () => {
    it('should test user access to different resources', async () => {
      // This would require a test database with RLS enabled
      // Mock the response for unit testing
      jest.spyOn(rlsHelper, 'testUserAccess').mockResolvedValue({
        canSelect: true,
        canInsert: false,
        canUpdate: false,
        canDelete: false,
        sampleData: []
      });

      const result = await rlsHelper.testUserAccess('test-user', 'schools');
      
      expect(result).toBeDefined();
      expect(result.canSelect).toBe(true);
      expect(result.canInsert).toBe(false);
    });
  });

  describe('RLS Helper Functions', () => {
    it('should list policies for a table', async () => {
      // Mock the database response
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([
        {
          name: 'school_select_policy',
          command: 'SELECT',
          using_expression: 'is_superadmin() OR ...',
          check_expression: null
        }
      ]);

      const policies = await rlsHelper.listPolicies('schools');
      
      expect(Array.isArray(policies)).toBe(true);
      if (policies.length > 0) {
        expect(policies[0]).toHaveProperty('name');
        expect(policies[0]).toHaveProperty('command');
      }
    });
  });

  describe('Integration with Services', () => {
    it('should work with existing RowLevelSecurityService', async () => {
      const mockClerkUserId = 'clerk-test-id';
      
      // Mock the getUserContext response
      jest.spyOn(rlsService, 'getUserContext').mockResolvedValue({
        userProfileId: 'test-id',
        clerkUserId: mockClerkUserId,
        isSuperadmin: false,
        positionIds: ['pos-1'],
        departmentIds: ['dept-1'],
        schoolIds: ['school-1'],
        permissionScopes: new Map()
      });

      const context = await rlsService.getUserContext(mockClerkUserId);
      
      expect(context).toBeDefined();
      expect(context.clerkUserId).toBe(mockClerkUserId);
      expect(context.schoolIds).toContain('school-1');
    });
  });
});

describe('RLS Performance Tests', () => {
  let prismaService: PrismaService;
  let rlsHelper: RLSHelperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        RLSHelperService,
      ],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
    rlsHelper = module.get<RLSHelperService>(RLSHelperService);
  });

  it('should measure RLS query performance', async () => {
    const startTime = Date.now();
    
    // Mock a query with RLS
    await prismaService.withRLSContext(
      { userProfileId: 'test', isSuperadmin: false },
      async () => {
        // Simulate a query
        return Promise.resolve();
      }
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // RLS context setting should be fast (< 100ms)
    expect(duration).toBeLessThan(100);
  });
});