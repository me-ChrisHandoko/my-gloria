import { PermissionAction, PermissionScope, Permission, UserPermission } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

/**
 * Test utilities and fixtures for permission module testing
 */

/**
 * Creates a mock permission object for testing
 */
export function createMockPermission(overrides?: Partial<Permission>): Permission {
  return {
    id: uuidv7(),
    code: 'test.permission',
    name: 'Test Permission',
    description: 'A test permission',
    resource: 'test',
    action: PermissionAction.READ,
    scope: PermissionScope.OWN,
    groupId: null,
    isActive: true,
    isSystemPermission: false,
    conditions: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'SYSTEM',
    ...overrides,
  };
}

/**
 * Creates a mock user permission object for testing
 */
export function createMockUserPermission(
  userProfileId: string,
  permissionId: string,
  overrides?: Partial<UserPermission>,
): UserPermission {
  return {
    id: uuidv7(),
    userProfileId,
    permissionId,
    isGranted: true,
    conditions: null,
    validFrom: new Date(),
    validUntil: null,
    grantedBy: 'SYSTEM',
    grantReason: 'Test grant',
    priority: 100,
    isTemporary: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Permission test fixtures organized by category
 */
export const permissionFixtures = {
  // Basic CRUD permissions
  crud: {
    create: createMockPermission({
      code: 'resource.create',
      name: 'Create Resource',
      action: PermissionAction.CREATE,
    }),
    read: createMockPermission({
      code: 'resource.read',
      name: 'Read Resource',
      action: PermissionAction.READ,
    }),
    update: createMockPermission({
      code: 'resource.update',
      name: 'Update Resource',
      action: PermissionAction.UPDATE,
    }),
    delete: createMockPermission({
      code: 'resource.delete',
      name: 'Delete Resource',
      action: PermissionAction.DELETE,
    }),
  },

  // Scope-based permissions
  scoped: {
    ownOnly: createMockPermission({
      code: 'doc.edit.own',
      name: 'Edit Own Documents',
      resource: 'document',
      action: PermissionAction.UPDATE,
      scope: PermissionScope.OWN,
    }),
    departmentWide: createMockPermission({
      code: 'doc.edit.dept',
      name: 'Edit Department Documents',
      resource: 'document',
      action: PermissionAction.UPDATE,
      scope: PermissionScope.DEPARTMENT,
    }),
    systemWide: createMockPermission({
      code: 'doc.edit.all',
      name: 'Edit All Documents',
      resource: 'document',
      action: PermissionAction.UPDATE,
      scope: PermissionScope.ALL,
    }),
  },

  // Conditional permissions
  conditional: {
    withDepartment: createMockPermission({
      code: 'user.create.it',
      name: 'Create IT Users',
      action: PermissionAction.CREATE,
      conditions: { department: 'IT' },
    }),
    withLevel: createMockPermission({
      code: 'approve.high',
      name: 'Approve High Value',
      action: PermissionAction.APPROVE,
      conditions: { maxAmount: 10000, minLevel: 3 },
    }),
  },

  // System permissions
  system: {
    superAdmin: createMockPermission({
      code: 'system.admin',
      name: 'System Administrator',
      isSystemPermission: true,
      action: PermissionAction.APPROVE,
      scope: PermissionScope.ALL,
    }),
    auditView: createMockPermission({
      code: 'audit.view',
      name: 'View Audit Logs',
      isSystemPermission: true,
      action: PermissionAction.READ,
      resource: 'audit',
    }),
  },
};

/**
 * Helper to create a permission check DTO
 */
export function createPermissionCheckDto(
  userId: string,
  resource: string,
  action: PermissionAction,
  scope?: PermissionScope,
  resourceId?: string,
) {
  return {
    userId,
    resource,
    action,
    scope,
    resourceId,
  };
}

/**
 * Helper to create batch permission check items
 */
export function createBatchPermissionChecks(
  items: Array<{
    resource: string;
    action: PermissionAction;
    scope?: PermissionScope;
    resourceId?: string;
  }>,
) {
  return items.map((item) => ({
    resource: item.resource,
    action: item.action,
    scope: item.scope,
    resourceId: item.resourceId,
  }));
}

/**
 * Mock data for testing permission hierarchies
 */
export const roleHierarchyFixtures = {
  roles: {
    admin: {
      id: uuidv7(),
      code: 'admin',
      name: 'Administrator',
      hierarchyLevel: 1,
    },
    manager: {
      id: uuidv7(),
      code: 'manager',
      name: 'Manager',
      hierarchyLevel: 2,
    },
    employee: {
      id: uuidv7(),
      code: 'employee',
      name: 'Employee',
      hierarchyLevel: 3,
    },
  },
  
  hierarchies: [
    {
      parentRole: 'admin',
      childRole: 'manager',
      inheritPermissions: true,
    },
    {
      parentRole: 'manager',
      childRole: 'employee',
      inheritPermissions: true,
    },
  ],
};

/**
 * Helper to simulate permission check results
 */
export function mockPermissionCheckResult(
  isAllowed: boolean,
  grantedBy?: string[],
  reason?: string,
) {
  return {
    isAllowed,
    grantedBy: grantedBy || [],
    reason,
    checkDuration: Math.floor(Math.random() * 100),
  };
}

/**
 * Helper to create temporal permission test cases
 */
export const temporalPermissionCases = {
  // Permission valid for next 7 days
  weeklyTemp: (permissionId: string) => ({
    permissionId,
    isGranted: true,
    isTemporary: true,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }),

  // Permission that expired yesterday
  expired: (permissionId: string) => ({
    permissionId,
    isGranted: true,
    isTemporary: true,
    validFrom: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    validUntil: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  }),

  // Permission that starts tomorrow
  future: (permissionId: string) => ({
    permissionId,
    isGranted: true,
    isTemporary: true,
    validFrom: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    validUntil: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
  }),
};

/**
 * Test data builder for complex permission scenarios
 */
export class PermissionTestDataBuilder {
  private permissions: Permission[] = [];
  private userPermissions: UserPermission[] = [];
  private rolePermissions: any[] = [];

  addPermission(permission: Permission): this {
    this.permissions.push(permission);
    return this;
  }

  grantToUser(
    userId: string,
    permissionId: string,
    options?: Partial<UserPermission>,
  ): this {
    this.userPermissions.push(
      createMockUserPermission(userId, permissionId, options),
    );
    return this;
  }

  grantToRole(roleId: string, permissionId: string, isGranted = true): this {
    this.rolePermissions.push({
      id: uuidv7(),
      roleId,
      permissionId,
      isGranted,
      grantedBy: 'SYSTEM',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return this;
  }

  build() {
    return {
      permissions: this.permissions,
      userPermissions: this.userPermissions,
      rolePermissions: this.rolePermissions,
    };
  }
}

/**
 * Assertion helpers for permission tests
 */
export const permissionAssertions = {
  expectAllowed(result: any, grantedBy?: string) {
    expect(result.isAllowed).toBe(true);
    if (grantedBy) {
      expect(result.grantedBy).toContain(grantedBy);
    }
  },

  expectDenied(result: any, reason?: string) {
    expect(result.isAllowed).toBe(false);
    if (reason) {
      expect(result.reason).toContain(reason);
    }
  },

  expectCacheHit(result: any) {
    expect(result.checkDuration).toBeLessThan(10); // Assuming cache hits are < 10ms
  },

  expectBatchResults(
    results: any,
    expected: Record<string, boolean>,
  ) {
    Object.entries(expected).forEach(([key, shouldBeAllowed]) => {
      expect(results[key]?.isAllowed).toBe(shouldBeAllowed);
    });
  },
};