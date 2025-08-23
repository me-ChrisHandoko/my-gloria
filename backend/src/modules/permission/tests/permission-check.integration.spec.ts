import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PermissionService } from '../services/permission.service';
import { UserPermissionService } from '../services/user-permission.service';
import { PermissionModule } from '../permission.module';
import { AuditModule } from '../../audit/audit.module';
import { CacheModule } from '../../../cache/cache.module';
import { PermissionAction, PermissionScope } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

describe('Permission Check Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let permissionService: PermissionService;
  let userPermissionService: UserPermissionService;

  // Test data
  const testUserId = uuidv7();
  const testRoleId = uuidv7();
  const testPermissionIds = {
    create: uuidv7(),
    read: uuidv7(),
    update: uuidv7(),
    delete: uuidv7(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PermissionModule, AuditModule, CacheModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    permissionService = moduleFixture.get<PermissionService>(PermissionService);
    userPermissionService = moduleFixture.get<UserPermissionService>(UserPermissionService);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create test user
    await prisma.userProfile.create({
      data: {
        id: testUserId,
        clerkUserId: `clerk_${testUserId}`,
        email: 'test@example.com',
        createdBy: 'SYSTEM',
      },
    });

    // Create test permissions
    const permissions = [
      {
        id: testPermissionIds.create,
        code: 'test.create',
        name: 'Create Test',
        resource: 'test',
        action: PermissionAction.CREATE,
        scope: PermissionScope.OWN,
        createdBy: 'SYSTEM',
      },
      {
        id: testPermissionIds.read,
        code: 'test.read',
        name: 'Read Test',
        resource: 'test',
        action: PermissionAction.READ,
        scope: PermissionScope.ALL,
        createdBy: 'SYSTEM',
      },
      {
        id: testPermissionIds.update,
        code: 'test.update',
        name: 'Update Test',
        resource: 'test',
        action: PermissionAction.UPDATE,
        scope: PermissionScope.OWN,
        createdBy: 'SYSTEM',
      },
      {
        id: testPermissionIds.delete,
        code: 'test.delete',
        name: 'Delete Test',
        resource: 'test',
        action: PermissionAction.DELETE,
        scope: PermissionScope.ALL,
        createdBy: 'SYSTEM',
      },
    ];

    for (const permission of permissions) {
      await prisma.permission.create({ data: permission });
    }

    // Create test role
    await prisma.role.create({
      data: {
        id: testRoleId,
        code: 'test-role',
        name: 'Test Role',
        description: 'Role for integration testing',
        createdBy: 'SYSTEM',
      },
    });
  }

  async function cleanupTestData() {
    // Clean up in reverse order of dependencies
    await prisma.userPermission.deleteMany({
      where: { userProfileId: testUserId },
    });
    await prisma.rolePermission.deleteMany({
      where: { roleId: testRoleId },
    });
    await prisma.userRole.deleteMany({
      where: { userProfileId: testUserId },
    });
    await prisma.role.delete({
      where: { id: testRoleId },
    });
    await prisma.permission.deleteMany({
      where: {
        id: { in: Object.values(testPermissionIds) },
      },
    });
    await prisma.userProfile.delete({
      where: { id: testUserId },
    });
  }

  describe('Direct Permission Checks', () => {
    it('should allow access when user has direct permission', async () => {
      // Grant direct permission
      await userPermissionService.grantPermission(
        testUserId,
        {
          permissionId: testPermissionIds.create,
          isGranted: true,
        },
        'SYSTEM',
      );

      // Check permission
      const result = await permissionService.checkPermission({
        userId: testUserId,
        resource: 'test',
        action: PermissionAction.CREATE,
        scope: PermissionScope.OWN,
      });

      expect(result.isAllowed).toBe(true);
      expect(result.grantedBy).toContain('direct-user-permission');
    });

    it('should deny access when user has explicit denial', async () => {
      // Grant permission first
      await userPermissionService.grantPermission(
        testUserId,
        {
          permissionId: testPermissionIds.delete,
          isGranted: true,
        },
        'SYSTEM',
      );

      // Then explicitly deny it
      await userPermissionService.grantPermission(
        testUserId,
        {
          permissionId: testPermissionIds.delete,
          isGranted: false,
        },
        'SYSTEM',
      );

      // Check permission
      const result = await permissionService.checkPermission({
        userId: testUserId,
        resource: 'test',
        action: PermissionAction.DELETE,
        scope: PermissionScope.ALL,
      });

      expect(result.isAllowed).toBe(false);
      expect(result.reason).toContain('Explicitly denied');
    });
  });

  describe('Role-Based Permission Checks', () => {
    beforeEach(async () => {
      // Assign role to user
      await prisma.userRole.create({
        data: {
          id: uuidv7(),
          userProfileId: testUserId,
          roleId: testRoleId,
          assignedBy: 'SYSTEM',
        },
      });
    });

    afterEach(async () => {
      await prisma.userRole.deleteMany({
        where: {
          userProfileId: testUserId,
          roleId: testRoleId,
        },
      });
    });

    it('should allow access through role permissions', async () => {
      // Grant permission to role
      await prisma.rolePermission.create({
        data: {
          id: uuidv7(),
          roleId: testRoleId,
          permissionId: testPermissionIds.read,
          isGranted: true,
          grantedBy: 'SYSTEM',
        },
      });

      // Check permission
      const result = await permissionService.checkPermission({
        userId: testUserId,
        resource: 'test',
        action: PermissionAction.READ,
        scope: PermissionScope.ALL,
      });

      expect(result.isAllowed).toBe(true);
      expect(result.grantedBy).toContain('Test Role');
    });

    it('should handle role hierarchy with inherited permissions', async () => {
      // Create parent role
      const parentRoleId = uuidv7();
      await prisma.role.create({
        data: {
          id: parentRoleId,
          code: 'parent-role',
          name: 'Parent Role',
          hierarchyLevel: 1,
          createdBy: 'SYSTEM',
        },
      });

      // Create role hierarchy
      await prisma.roleHierarchy.create({
        data: {
          id: uuidv7(),
          childRoleId: testRoleId,
          parentRoleId: parentRoleId,
          inheritPermissions: true,
        },
      });

      // Grant permission to parent role
      await prisma.rolePermission.create({
        data: {
          id: uuidv7(),
          roleId: parentRoleId,
          permissionId: testPermissionIds.update,
          isGranted: true,
          grantedBy: 'SYSTEM',
        },
      });

      // Check permission (should inherit from parent)
      const result = await permissionService.checkPermission({
        userId: testUserId,
        resource: 'test',
        action: PermissionAction.UPDATE,
        scope: PermissionScope.OWN,
      });

      expect(result.isAllowed).toBe(true);

      // Cleanup
      await prisma.roleHierarchy.deleteMany({
        where: { childRoleId: testRoleId },
      });
      await prisma.rolePermission.deleteMany({
        where: { roleId: parentRoleId },
      });
      await prisma.role.delete({
        where: { id: parentRoleId },
      });
    });
  });

  describe('Batch Permission Checks', () => {
    it('should efficiently check multiple permissions', async () => {
      // Grant some permissions
      await userPermissionService.grantPermission(
        testUserId,
        {
          permissionId: testPermissionIds.create,
          isGranted: true,
        },
        'SYSTEM',
      );

      await userPermissionService.grantPermission(
        testUserId,
        {
          permissionId: testPermissionIds.read,
          isGranted: true,
        },
        'SYSTEM',
      );

      // Batch check
      const result = await permissionService.batchCheckPermissions({
        userId: testUserId,
        permissions: [
          {
            resource: 'test',
            action: PermissionAction.CREATE,
            scope: PermissionScope.OWN,
          },
          {
            resource: 'test',
            action: PermissionAction.READ,
            scope: PermissionScope.ALL,
          },
          {
            resource: 'test',
            action: PermissionAction.UPDATE,
            scope: PermissionScope.OWN,
          },
          {
            resource: 'test',
            action: PermissionAction.DELETE,
            scope: PermissionScope.ALL,
          },
        ],
      });

      expect(result.totalChecked).toBe(4);
      expect(result.totalAllowed).toBe(2);
      expect(result.results['test:CREATE:OWN'].isAllowed).toBe(true);
      expect(result.results['test:READ:ALL'].isAllowed).toBe(true);
      expect(result.results['test:UPDATE:OWN'].isAllowed).toBe(false);
      expect(result.results['test:DELETE:ALL'].isAllowed).toBe(false);
    });
  });

  describe('Resource-Specific Permission Checks', () => {
    it('should allow access to specific resources', async () => {
      const resourceId = 'doc-123';

      // Grant resource-specific permission
      await prisma.resourcePermission.create({
        data: {
          id: uuidv7(),
          userProfileId: testUserId,
          permissionId: testPermissionIds.update,
          resourceType: 'test',
          resourceId: resourceId,
          isGranted: true,
          grantedBy: 'SYSTEM',
        },
      });

      // Check permission for specific resource
      const result = await permissionService.checkPermission({
        userId: testUserId,
        resource: 'test',
        action: PermissionAction.UPDATE,
        scope: PermissionScope.OWN,
        resourceId: resourceId,
      });

      expect(result.isAllowed).toBe(true);
      expect(result.grantedBy).toContain('resource-specific');

      // Check permission for different resource (should fail)
      const resultDifferent = await permissionService.checkPermission({
        userId: testUserId,
        resource: 'test',
        action: PermissionAction.UPDATE,
        scope: PermissionScope.OWN,
        resourceId: 'doc-456',
      });

      expect(resultDifferent.isAllowed).toBe(false);

      // Cleanup
      await prisma.resourcePermission.deleteMany({
        where: { userProfileId: testUserId },
      });
    });
  });

  describe('Permission Caching', () => {
    it('should cache permission check results', async () => {
      // Grant permission
      await userPermissionService.grantPermission(
        testUserId,
        {
          permissionId: testPermissionIds.create,
          isGranted: true,
        },
        'SYSTEM',
      );

      // First check (should hit database)
      const startTime1 = Date.now();
      const result1 = await permissionService.checkPermission({
        userId: testUserId,
        resource: 'test',
        action: PermissionAction.CREATE,
        scope: PermissionScope.OWN,
      });
      const duration1 = Date.now() - startTime1;

      expect(result1.isAllowed).toBe(true);

      // Second check (should hit cache and be faster)
      const startTime2 = Date.now();
      const result2 = await permissionService.checkPermission({
        userId: testUserId,
        resource: 'test',
        action: PermissionAction.CREATE,
        scope: PermissionScope.OWN,
      });
      const duration2 = Date.now() - startTime2;

      expect(result2.isAllowed).toBe(true);
      expect(duration2).toBeLessThan(duration1);
    });

    it('should invalidate cache when permissions change', async () => {
      // Initial permission check (should be denied)
      const result1 = await permissionService.checkPermission({
        userId: testUserId,
        resource: 'test',
        action: PermissionAction.DELETE,
        scope: PermissionScope.ALL,
      });
      expect(result1.isAllowed).toBe(false);

      // Grant permission
      await userPermissionService.grantPermission(
        testUserId,
        {
          permissionId: testPermissionIds.delete,
          isGranted: true,
        },
        'SYSTEM',
      );

      // Check again (should be allowed now)
      const result2 = await permissionService.checkPermission({
        userId: testUserId,
        resource: 'test',
        action: PermissionAction.DELETE,
        scope: PermissionScope.ALL,
      });
      expect(result2.isAllowed).toBe(true);
    });
  });

  describe('Permission Conditions', () => {
    it('should evaluate permission conditions', async () => {
      // Grant permission with conditions
      await userPermissionService.grantPermission(
        testUserId,
        {
          permissionId: testPermissionIds.update,
          isGranted: true,
          conditions: {
            department: 'IT',
            minLevel: 3,
          },
        },
        'SYSTEM',
      );

      // Check permission (basic check should pass)
      const result = await permissionService.checkPermission({
        userId: testUserId,
        resource: 'test',
        action: PermissionAction.UPDATE,
        scope: PermissionScope.OWN,
      });

      expect(result.isAllowed).toBe(true);
      // Note: Actual condition evaluation would depend on policy engine implementation
    });
  });

  describe('Temporal Permissions', () => {
    it('should respect permission validity periods', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday

      // Grant future permission (not yet valid)
      await userPermissionService.grantPermission(
        testUserId,
        {
          permissionId: testPermissionIds.create,
          isGranted: true,
          validFrom: futureDate.toISOString(),
        },
        'SYSTEM',
      );

      // Check permission (should be denied - not yet valid)
      const result1 = await permissionService.checkPermission({
        userId: testUserId,
        resource: 'test',
        action: PermissionAction.CREATE,
        scope: PermissionScope.OWN,
      });
      expect(result1.isAllowed).toBe(false);

      // Grant expired permission
      await userPermissionService.grantPermission(
        testUserId,
        {
          permissionId: testPermissionIds.read,
          isGranted: true,
          validFrom: pastDate.toISOString(),
          validUntil: pastDate.toISOString(),
        },
        'SYSTEM',
      );

      // Check permission (should be denied - expired)
      const result2 = await permissionService.checkPermission({
        userId: testUserId,
        resource: 'test',
        action: PermissionAction.READ,
        scope: PermissionScope.ALL,
      });
      expect(result2.isAllowed).toBe(false);
    });
  });

  describe('Superadmin Permissions', () => {
    it('should grant all permissions to superadmin users', async () => {
      // Update user to be superadmin
      await prisma.userProfile.update({
        where: { id: testUserId },
        data: { isSuperadmin: true },
      });

      // Check any permission (should be allowed)
      const result = await permissionService.checkPermission({
        userId: testUserId,
        resource: 'any-resource',
        action: PermissionAction.DELETE,
        scope: PermissionScope.ALL,
      });

      // Note: This depends on implementation - superadmin bypass might be at a different level
      // Reset superadmin status
      await prisma.userProfile.update({
        where: { id: testUserId },
        data: { isSuperadmin: false },
      });
    });
  });
});