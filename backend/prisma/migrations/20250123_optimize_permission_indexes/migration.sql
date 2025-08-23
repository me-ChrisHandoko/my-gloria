-- Optimize Permission table indexes for performance
-- Add composite index for permission lookups
CREATE INDEX IF NOT EXISTS "idx_permissions_resource_action_scope_active" 
ON gloria_ops.permissions(resource, action, scope, is_active) 
WHERE is_active = true;

-- Optimize UserPermission table indexes
-- Add composite index for user permission lookups with validity checks
CREATE INDEX IF NOT EXISTS "idx_user_permissions_user_granted_valid" 
ON gloria_ops.user_permissions(user_profile_id, is_granted, valid_from, valid_until) 
WHERE is_granted = true;

-- Add index for permission lookups
CREATE INDEX IF NOT EXISTS "idx_user_permissions_permission_valid" 
ON gloria_ops.user_permissions(permission_id, valid_from, valid_until);

-- Optimize RolePermission table indexes
-- Add composite index for role permission lookups with validity checks
CREATE INDEX IF NOT EXISTS "idx_role_permissions_role_granted_valid" 
ON gloria_ops.role_permissions(role_id, is_granted, valid_from, valid_until) 
WHERE is_granted = true;

-- Add index for permission lookups in role permissions
CREATE INDEX IF NOT EXISTS "idx_role_permissions_permission_valid" 
ON gloria_ops.role_permissions(permission_id, valid_from, valid_until);

-- Optimize UserRole table indexes
-- Add composite index for active user roles with validity checks
CREATE INDEX IF NOT EXISTS "idx_user_roles_user_active_valid" 
ON gloria_ops.user_roles(user_profile_id, is_active, valid_from, valid_until) 
WHERE is_active = true;

-- Add index for role lookups
CREATE INDEX IF NOT EXISTS "idx_user_roles_role_active_valid" 
ON gloria_ops.user_roles(role_id, is_active, valid_from, valid_until) 
WHERE is_active = true;

-- Optimize ResourcePermission table indexes
-- Add composite index for resource permission lookups
CREATE INDEX IF NOT EXISTS "idx_resource_permissions_user_resource_type_id" 
ON gloria_ops.resource_permissions(user_profile_id, resource_type, resource_id, valid_from, valid_until);

-- Add index for permission lookups in resource permissions
CREATE INDEX IF NOT EXISTS "idx_resource_permissions_permission_resource" 
ON gloria_ops.resource_permissions(permission_id, resource_type, resource_id);

-- Optimize PermissionCheckLog table indexes
-- Add index for log analysis and cleanup
CREATE INDEX IF NOT EXISTS "idx_permission_check_logs_created_allowed" 
ON gloria_ops.permission_check_logs(created_at DESC, is_allowed);

-- Add index for user-specific log analysis
CREATE INDEX IF NOT EXISTS "idx_permission_check_logs_user_resource_action" 
ON gloria_ops.permission_check_logs(user_profile_id, resource, action, created_at DESC);

-- Add statistics update to ensure query planner uses new indexes
ANALYZE gloria_ops.permissions;
ANALYZE gloria_ops.user_permissions;
ANALYZE gloria_ops.role_permissions;
ANALYZE gloria_ops.user_roles;
ANALYZE gloria_ops.resource_permissions;
ANALYZE gloria_ops.permission_check_logs;