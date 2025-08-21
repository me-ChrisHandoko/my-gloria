# Permission Module Integration Guide

## Overview
This guide explains how to integrate the enhanced permissions module with your existing Prisma schema for comprehensive role-based access control (RBAC) with fine-grained permissions.

## Architecture

### Permission Hierarchy
```
PermissionGroup
    └── Permission (fine-grained)
            ├── RolePermission (role assignments)
            ├── UserPermission (direct user assignments)
            └── ResourcePermission (resource-specific)

Role
    ├── UserRole (user-role mapping)
    ├── RolePermission (role-permission mapping)
    └── RoleHierarchy (inheritance)
```

## Key Features

### 1. Fine-Grained Permissions
- **Permission Model**: Core permission definitions with resource, action, and scope
- **Granular Control**: Permissions like "workorder.create", "kpi.approve"
- **Scoped Access**: OWN, DEPARTMENT, SCHOOL, ALL levels

### 2. Permission Assignment Layers
- **Role-Based**: Permissions assigned to roles (RolePermission)
- **User-Specific**: Direct permission overrides (UserPermission)
- **Resource-Specific**: Permissions for individual records (ResourcePermission)

### 3. Advanced Features
- **Permission Groups**: Organize permissions by category
- **Permission Dependencies**: Define prerequisite permissions
- **Role Hierarchy**: Permission inheritance from parent roles
- **Permission Policies**: Complex authorization rules
- **Permission Cache**: Performance optimization

## Integration Steps

### Step 1: Update Main Schema
Add these relations to your existing models in `schema.prisma`:

```prisma
// In Role model, add:
model Role {
  // ... existing fields ...
  
  // New relations for permissions
  rolePermissions   RolePermission[]
  childRoles        RoleHierarchy[]    @relation("ParentRoleRelation")
  parentRoles       RoleHierarchy[]    @relation("RoleRelation")
}

// In UserProfile model, add:
model UserProfile {
  // ... existing fields ...
  
  // New relations for permissions
  userPermissions     UserPermission[]
  resourcePermissions ResourcePermission[]
  permissionCache     PermissionCache[]
}
```

### Step 2: Merge Permission Models
Copy the models from `permissions-module.prisma` into your main `schema.prisma` file.

### Step 3: Run Migrations
```bash
# Generate migration
npx prisma migrate dev --name add-permissions-module

# Apply migration
npx prisma migrate deploy
```

## Usage Examples

### 1. Creating Permissions
```typescript
// Create a permission group
const group = await prisma.permissionGroup.create({
  data: {
    id: uuidv7(),
    code: 'WORK_ORDER',
    name: 'Work Order Management',
    category: 'SERVICE'
  }
});

// Create a permission
const permission = await prisma.permission.create({
  data: {
    id: uuidv7(),
    code: 'workorder.create',
    name: 'Create Work Order',
    resource: 'workorder',
    action: 'CREATE',
    scope: 'OWN',
    groupId: group.id
  }
});
```

### 2. Assigning Permissions to Roles
```typescript
// Assign permission to role
await prisma.rolePermission.create({
  data: {
    id: uuidv7(),
    roleId: 'role-id',
    permissionId: permission.id,
    isGranted: true,
    grantedBy: clerkUserId
  }
});
```

### 3. Direct User Permissions
```typescript
// Grant specific permission to user
await prisma.userPermission.create({
  data: {
    id: uuidv7(),
    userProfileId: 'user-profile-id',
    permissionId: permission.id,
    isGranted: true,
    grantedBy: clerkUserId,
    grantReason: 'Temporary elevated access for project X',
    validUntil: new Date('2024-12-31')
  }
});
```

### 4. Resource-Specific Permissions
```typescript
// Grant permission for specific work order
await prisma.resourcePermission.create({
  data: {
    id: uuidv7(),
    userProfileId: 'user-profile-id',
    permissionId: approvePermission.id,
    resourceType: 'WorkOrder',
    resourceId: 'work-order-123',
    isGranted: true,
    grantedBy: clerkUserId
  }
});
```

## Permission Checking Algorithm

### Priority Order
1. **Resource Permissions** (highest priority)
2. **User Permissions** (direct assignments)
3. **Role Permissions** (through user roles)
4. **Inherited Permissions** (through role hierarchy)

### Check Flow
```typescript
async function hasPermission(
  userId: string,
  resource: string,
  action: string,
  scope?: string,
  resourceId?: string
): Promise<boolean> {
  // 1. Check resource-specific permission
  if (resourceId) {
    const resourcePerm = await checkResourcePermission(userId, resource, action, resourceId);
    if (resourcePerm !== null) return resourcePerm;
  }

  // 2. Check direct user permission
  const userPerm = await checkUserPermission(userId, resource, action, scope);
  if (userPerm !== null) return userPerm;

  // 3. Check role permissions
  const rolePerm = await checkRolePermissions(userId, resource, action, scope);
  if (rolePerm !== null) return rolePerm;

  // 4. Check inherited permissions
  const inheritedPerm = await checkInheritedPermissions(userId, resource, action, scope);
  if (inheritedPerm !== null) return inheritedPerm;

  // Default deny
  return false;
}
```

## Best Practices

### 1. Permission Naming Convention
- Format: `resource.action`
- Examples: 
  - `workorder.create`
  - `kpi.approve`
  - `user.manage`
  - `report.export`

### 2. Scope Usage
- **OWN**: User can only access their own data
- **DEPARTMENT**: Access to department data
- **SCHOOL**: Access to school-wide data
- **ALL**: System-wide access

### 3. Permission Groups
- Group related permissions together
- Use categories matching your modules
- Makes permission management easier

### 4. Audit Trail
- Always set `grantedBy` when assigning permissions
- Provide `grantReason` for user permissions
- Use PermissionCheckLog for debugging

### 5. Performance
- Use PermissionCache for frequently checked permissions
- Set appropriate cache expiration times
- Invalidate cache on permission changes

## Security Considerations

1. **Principle of Least Privilege**: Grant minimum necessary permissions
2. **Regular Audits**: Review permission assignments periodically
3. **Temporary Permissions**: Use `validUntil` for time-limited access
4. **Explicit Deny**: Use `isGranted: false` to explicitly deny permissions
5. **Permission Dependencies**: Define required permission chains

## Migration from Existing System

If migrating from the current module-based system:

1. Map existing module permissions to new fine-grained permissions
2. Create permission groups for each module category
3. Generate role permissions based on current RoleModuleAccess
4. Convert UserModuleAccess to UserPermission entries
5. Test thoroughly before removing old permission tables

## Testing Checklist

- [ ] Permission creation and management
- [ ] Role-based permission assignment
- [ ] User-specific permission overrides
- [ ] Resource-specific permissions
- [ ] Permission inheritance through role hierarchy
- [ ] Permission caching and invalidation
- [ ] Permission check performance
- [ ] Audit logging
- [ ] Edge cases (conflicts, denials, expirations)