-- Add indexes for Module Management performance optimization

-- Module table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_module_code ON "Module"(code);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_module_parent_id ON "Module"("parentId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_module_is_active ON "Module"("isActive");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_module_category ON "Module"(category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_module_sort_order ON "Module"("sortOrder");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_module_composite ON "Module"("isActive", "parentId", "sortOrder");

-- RoleModuleAccess table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_module_access_role_id ON "RoleModuleAccess"("roleId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_module_access_module_id ON "RoleModuleAccess"("moduleId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_module_access_is_active ON "RoleModuleAccess"("isActive");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_module_access_position_id ON "RoleModuleAccess"("positionId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_module_access_composite ON "RoleModuleAccess"("roleId", "isActive");

-- UserModuleAccess table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_module_access_user_profile_id ON "UserModuleAccess"("userProfileId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_module_access_module_id ON "UserModuleAccess"("moduleId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_module_access_is_active ON "UserModuleAccess"("isActive");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_module_access_valid_from ON "UserModuleAccess"("validFrom");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_module_access_valid_until ON "UserModuleAccess"("validUntil");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_module_access_composite ON "UserModuleAccess"("userProfileId", "isActive", "validFrom", "validUntil");

-- UserOverride table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_override_user_profile_id ON "UserOverride"("userProfileId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_override_module_id ON "UserOverride"("moduleId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_override_permission_type ON "UserOverride"("permissionType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_override_is_granted ON "UserOverride"("isGranted");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_override_valid_until ON "UserOverride"("validUntil");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_override_composite ON "UserOverride"("userProfileId", "moduleId", "permissionType", "validUntil");

-- UserRole table indexes for getUserAccessibleModules optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_role_user_profile_id ON "UserRole"("userProfileId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_role_role_id ON "UserRole"("roleId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_role_is_active ON "UserRole"("isActive");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_role_composite ON "UserRole"("userProfileId", "isActive");

-- UserProfile table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profile_clerk_user_id ON "UserProfile"("clerkUserId");

-- Partial indexes for active records (more efficient for common queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_module_active_only ON "Module"("id") WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_module_access_active_only ON "RoleModuleAccess"("roleId", "moduleId") WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_module_access_active_only ON "UserModuleAccess"("userProfileId", "moduleId") WHERE "isActive" = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_override_active_only ON "UserOverride"("userProfileId", "moduleId") WHERE "validUntil" IS NULL OR "validUntil" > NOW();