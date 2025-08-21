# Permission System Migration Guide

## Overview
This guide helps you migrate to the new fine-grained permission system that has been integrated into your schema.prisma file.

## What's New

### 1. **Permission Model**
- Fine-grained permissions with format: `resource.action`
- Scoped access control: OWN, DEPARTMENT, SCHOOL, ALL
- Conditional permissions via JSON

### 2. **RolePermission Junction**
- Many-to-many relationship between roles and permissions
- Time-based validity support
- Explicit grant/deny capabilities

### 3. **UserPermission**
- Direct permission assignments to users
- Priority-based override system
- Temporary permission support

### 4. **RoleHierarchy**
- Permission inheritance from parent roles
- Configurable inheritance (can be disabled)

### 5. **PermissionCache**
- Performance optimization
- Configurable expiration
- Automatic invalidation

## Migration Steps

### Step 1: Generate and Apply Database Migration

```bash
# Generate migration files
npx prisma migrate dev --name add_fine_grained_permissions

# If in production, use:
npx prisma migrate deploy
```

### Step 2: Seed Initial Permissions

Create a seed script to populate initial permissions:

```typescript
// prisma/seeds/permissions.seed.ts
import { PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

const prisma = new PrismaClient();

async function seedPermissions() {
  // Create basic permissions for each module
  const modules = [
    { resource: 'workorder', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'] },
    { resource: 'kpi', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'] },
    { resource: 'user', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'ASSIGN'] },
    { resource: 'report', actions: ['READ', 'EXPORT', 'PRINT'] },
    { resource: 'training', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'] },
  ];

  for (const module of modules) {
    for (const action of module.actions) {
      // Create permission for each scope
      const scopes = ['OWN', 'DEPARTMENT', 'SCHOOL', 'ALL'];
      
      for (const scope of scopes) {
        await prisma.permission.upsert({
          where: {
            resource_action_scope: {
              resource: module.resource,
              action: action as any,
              scope: scope as any,
            }
          },
          update: {},
          create: {
            id: uuidv7(),
            code: `${module.resource}.${action.toLowerCase()}.${scope.toLowerCase()}`,
            name: `${action} ${module.resource} - ${scope}`,
            resource: module.resource,
            action: action as any,
            scope: scope as any,
            isSystemPermission: true,
          }
        });
      }
    }
  }
}
```

### Step 3: Migrate Existing Role Permissions

Convert your existing RoleModuleAccess to RolePermission:

```typescript
async function migrateRolePermissions() {
  const roleModuleAccess = await prisma.roleModuleAccess.findMany({
    include: { module: true }
  });

  for (const access of roleModuleAccess) {
    const permissions = access.permissions as string[];
    
    for (const permAction of permissions) {
      // Find matching permission
      const permission = await prisma.permission.findFirst({
        where: {
          resource: access.module.code.toLowerCase(),
          action: permAction.toUpperCase() as any,
          scope: 'DEPARTMENT' // Default scope, adjust as needed
        }
      });

      if (permission) {
        await prisma.rolePermission.create({
          data: {
            id: uuidv7(),
            roleId: access.roleId,
            permissionId: permission.id,
            isGranted: true,
            grantedBy: access.createdBy,
          }
        });
      }
    }
  }
}
```

### Step 4: Set Up Role Hierarchy

Define role inheritance relationships:

```typescript
async function setupRoleHierarchy() {
  // Example: Admin inherits from Manager, Manager inherits from Staff
  const hierarchies = [
    { child: 'ADMIN', parent: 'MANAGER' },
    { child: 'MANAGER', parent: 'STAFF' },
  ];

  for (const hierarchy of hierarchies) {
    const childRole = await prisma.role.findUnique({ where: { code: hierarchy.child } });
    const parentRole = await prisma.role.findUnique({ where: { code: hierarchy.parent } });
    
    if (childRole && parentRole) {
      await prisma.roleHierarchy.create({
        data: {
          id: uuidv7(),
          roleId: childRole.id,
          parentRoleId: parentRole.id,
          inheritPermissions: true,
        }
      });
    }
  }
}
```

## Permission Checking Implementation

### Create Permission Service

```typescript
// src/services/permission.service.ts
import { PrismaClient } from '@prisma/client';

export class PermissionService {
  private prisma: PrismaClient;
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  async hasPermission(
    userProfileId: string,
    resource: string,
    action: string,
    scope?: string,
    resourceId?: string
  ): Promise<boolean> {
    // 1. Check cache first
    const cached = await this.checkCache(userProfileId, resource, action, scope);
    if (cached !== null) return cached;

    // 2. Check direct user permissions
    const userPerm = await this.checkUserPermission(userProfileId, resource, action, scope);
    if (userPerm !== null) return userPerm;

    // 3. Check role permissions (including inherited)
    const rolePerm = await this.checkRolePermissions(userProfileId, resource, action, scope);
    if (rolePerm !== null) return rolePerm;

    // Cache the result
    await this.cachePermission(userProfileId, resource, action, scope, false);
    return false;
  }

  private async checkCache(
    userProfileId: string,
    resource: string,
    action: string,
    scope?: string
  ): Promise<boolean | null> {
    const cacheKey = `user:${userProfileId}:${resource}:${action}:${scope || 'any'}`;
    
    const cached = await this.prisma.permissionCache.findFirst({
      where: {
        userProfileId,
        cacheKey,
        isValid: true,
        expiresAt: { gt: new Date() }
      }
    });

    if (cached) {
      const permissions = cached.permissions as any;
      return permissions.granted || false;
    }

    return null;
  }

  private async checkUserPermission(
    userProfileId: string,
    resource: string,
    action: string,
    scope?: string
  ): Promise<boolean | null> {
    const userPermission = await this.prisma.userPermission.findFirst({
      where: {
        userProfileId,
        permission: {
          resource,
          action: action as any,
          scope: scope as any,
        },
        validFrom: { lte: new Date() },
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } }
        ]
      },
      orderBy: { priority: 'desc' }
    });

    return userPermission ? userPermission.isGranted : null;
  }

  private async checkRolePermissions(
    userProfileId: string,
    resource: string,
    action: string,
    scope?: string
  ): Promise<boolean | null> {
    // Get user's active roles
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userProfileId,
        isActive: true,
        validFrom: { lte: new Date() },
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } }
        ]
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              where: {
                permission: {
                  resource,
                  action: action as any,
                  scope: scope as any,
                },
                validFrom: { lte: new Date() },
                OR: [
                  { validUntil: null },
                  { validUntil: { gte: new Date() } }
                ]
              },
              include: { permission: true }
            }
          }
        }
      }
    });

    // Check direct role permissions
    for (const userRole of userRoles) {
      for (const rolePerm of userRole.role.rolePermissions) {
        if (rolePerm.isGranted) return true;
        if (!rolePerm.isGranted) return false; // Explicit deny
      }
    }

    // Check inherited permissions
    const inherited = await this.checkInheritedPermissions(
      userRoles.map(ur => ur.roleId),
      resource,
      action,
      scope
    );

    return inherited;
  }

  private async checkInheritedPermissions(
    roleIds: string[],
    resource: string,
    action: string,
    scope?: string
  ): Promise<boolean | null> {
    const hierarchies = await this.prisma.roleHierarchy.findMany({
      where: {
        roleId: { in: roleIds },
        inheritPermissions: true
      },
      include: {
        parentRole: {
          include: {
            rolePermissions: {
              where: {
                permission: {
                  resource,
                  action: action as any,
                  scope: scope as any,
                }
              }
            }
          }
        }
      }
    });

    for (const hierarchy of hierarchies) {
      for (const perm of hierarchy.parentRole.rolePermissions) {
        if (perm.isGranted) return true;
        if (!perm.isGranted) return false;
      }
    }

    return null;
  }

  private async cachePermission(
    userProfileId: string,
    resource: string,
    action: string,
    scope: string | undefined,
    granted: boolean
  ): Promise<void> {
    const cacheKey = `user:${userProfileId}:${resource}:${action}:${scope || 'any'}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.cacheTimeout);

    await this.prisma.permissionCache.upsert({
      where: {
        userProfileId_cacheKey: {
          userProfileId,
          cacheKey
        }
      },
      update: {
        permissions: { granted },
        computedAt: now,
        expiresAt,
        isValid: true
      },
      create: {
        id: uuidv7(),
        userProfileId,
        cacheKey,
        permissions: { granted },
        computedAt: now,
        expiresAt,
        isValid: true
      }
    });
  }

  async invalidateCache(userProfileId?: string): Promise<void> {
    if (userProfileId) {
      await this.prisma.permissionCache.updateMany({
        where: { userProfileId },
        data: { isValid: false }
      });
    } else {
      await this.prisma.permissionCache.updateMany({
        data: { isValid: false }
      });
    }
  }
}
```

## Usage in Your Application

### Express Middleware Example

```typescript
// middleware/permission.middleware.ts
export function requirePermission(resource: string, action: string, scope?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userProfileId = req.user?.profileId;
    
    if (!userProfileId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hasPermission = await permissionService.hasPermission(
      userProfileId,
      resource,
      action,
      scope
    );

    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

// Usage in routes
router.post('/workorders',
  requirePermission('workorder', 'CREATE', 'DEPARTMENT'),
  createWorkOrder
);

router.put('/workorders/:id',
  requirePermission('workorder', 'UPDATE', 'OWN'),
  updateWorkOrder
);
```

## Testing the New System

```typescript
// Test permission assignment
const permission = await prisma.permission.create({
  data: {
    id: uuidv7(),
    code: 'test.create',
    name: 'Create Test',
    resource: 'test',
    action: 'CREATE',
    scope: 'OWN'
  }
});

// Assign to role
await prisma.rolePermission.create({
  data: {
    id: uuidv7(),
    roleId: 'role-id',
    permissionId: permission.id,
    isGranted: true
  }
});

// Test permission check
const hasPermission = await permissionService.hasPermission(
  'user-profile-id',
  'test',
  'CREATE',
  'OWN'
);
console.log('Has permission:', hasPermission);
```

## Rollback Plan

If you need to rollback:

```bash
# Rollback the migration
npx prisma migrate resolve --rolled-back

# Restore previous schema
git checkout HEAD~1 prisma/schema.prisma

# Apply previous migration
npx prisma migrate deploy
```

## Next Steps

1. Run database migration
2. Seed initial permissions
3. Migrate existing role permissions
4. Implement permission service
5. Update API endpoints with permission checks
6. Test thoroughly in staging environment
7. Deploy to production with monitoring