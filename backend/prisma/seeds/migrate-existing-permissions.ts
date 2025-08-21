import { PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

const prisma = new PrismaClient();

/**
 * Migrate existing RoleModuleAccess to new RolePermission system
 */
async function migrateRoleModuleAccess() {
  console.log('🔄 Migrating RoleModuleAccess to RolePermission...');
  
  const roleModuleAccess = await prisma.roleModuleAccess.findMany({
    where: { isActive: true },
    include: { 
      module: true,
      role: true 
    }
  });

  console.log(`   Found ${roleModuleAccess.length} role-module access records to migrate`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const access of roleModuleAccess) {
    const permissions = access.permissions as string[];
    
    if (!permissions || !Array.isArray(permissions)) {
      console.log(`   ⚠️  Skipped: No permissions array for ${access.role.code} - ${access.module.code}`);
      skippedCount++;
      continue;
    }

    for (const permAction of permissions) {
      try {
        // Map module permission to resource.action format
        const action = permAction.toUpperCase();
        const resource = access.module.code.toLowerCase();
        
        // Determine scope based on role hierarchy level
        let scope = 'DEPARTMENT'; // Default scope
        if (access.role.hierarchyLevel <= 2) {
          scope = 'ALL';
        } else if (access.role.hierarchyLevel === 3) {
          scope = 'SCHOOL';
        } else if (access.role.hierarchyLevel === 4) {
          scope = 'DEPARTMENT';
        } else {
          scope = 'OWN';
        }

        // Find matching permission
        const permission = await prisma.permission.findFirst({
          where: {
            resource: resource,
            action: action as any,
            scope: scope as any
          }
        });

        if (!permission) {
          console.log(`   ⚠️  Permission not found: ${resource}.${action}.${scope}`);
          // Try to create the permission if it doesn't exist
          const newPermission = await prisma.permission.create({
            data: {
              id: uuidv7(),
              code: `${resource}.${action.toLowerCase()}.${scope.toLowerCase()}`,
              name: `${action} ${resource.toUpperCase()} - ${scope}`,
              resource: resource,
              action: action as any,
              scope: scope as any,
              isSystemPermission: false,
              isActive: true
            }
          });
          console.log(`   ✅ Created missing permission: ${newPermission.code}`);
        }

        const finalPermission = permission || await prisma.permission.findFirst({
          where: {
            resource: resource,
            action: action as any,
            scope: scope as any
          }
        });

        if (finalPermission) {
          // Check if role-permission already exists
          const existing = await prisma.rolePermission.findFirst({
            where: {
              roleId: access.roleId,
              permissionId: finalPermission.id
            }
          });

          if (!existing) {
            await prisma.rolePermission.create({
              data: {
                id: uuidv7(),
                roleId: access.roleId,
                permissionId: finalPermission.id,
                isGranted: true,
                grantedBy: access.createdBy || 'MIGRATION',
                grantReason: `Migrated from RoleModuleAccess for module: ${access.module.name}`
              }
            });
            migratedCount++;
            console.log(`   ✅ Migrated: ${access.role.code} -> ${finalPermission.code}`);
          } else {
            skippedCount++;
          }
        }
      } catch (error) {
        console.error(`   ❌ Error migrating ${access.role.code} - ${permAction}:`, error);
        errorCount++;
      }
    }
  }

  console.log(`\n   📊 RoleModuleAccess Migration Summary:`);
  console.log(`      ✅ Migrated: ${migratedCount} permissions`);
  console.log(`      ⏭️  Skipped: ${skippedCount} permissions`);
  console.log(`      ❌ Errors: ${errorCount} permissions`);
}

/**
 * Migrate existing UserModuleAccess to new UserPermission system
 */
async function migrateUserModuleAccess() {
  console.log('\n🔄 Migrating UserModuleAccess to UserPermission...');
  
  const userModuleAccess = await prisma.userModuleAccess.findMany({
    where: { isActive: true },
    include: { 
      module: true,
      userProfile: true 
    }
  });

  console.log(`   Found ${userModuleAccess.length} user-module access records to migrate`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const access of userModuleAccess) {
    const permissions = access.permissions as string[];
    
    if (!permissions || !Array.isArray(permissions)) {
      console.log(`   ⚠️  Skipped: No permissions array for user ${access.userProfileId} - ${access.module.code}`);
      skippedCount++;
      continue;
    }

    for (const permAction of permissions) {
      try {
        const action = permAction.toUpperCase();
        const resource = access.module.code.toLowerCase();
        
        // For user-specific permissions, default to DEPARTMENT scope
        const scope = 'DEPARTMENT';

        // Find matching permission
        const permission = await prisma.permission.findFirst({
          where: {
            resource: resource,
            action: action as any,
            scope: scope as any
          }
        });

        if (!permission) {
          console.log(`   ⚠️  Permission not found: ${resource}.${action}.${scope}`);
          continue;
        }

        // Check if user-permission already exists
        const existing = await prisma.userPermission.findFirst({
          where: {
            userProfileId: access.userProfileId,
            permissionId: permission.id
          }
        });

        if (!existing) {
          await prisma.userPermission.create({
            data: {
              id: uuidv7(),
              userProfileId: access.userProfileId,
              permissionId: permission.id,
              isGranted: true,
              grantedBy: access.grantedBy,
              grantReason: access.reason || `Migrated from UserModuleAccess for module: ${access.module.name}`,
              validFrom: access.validFrom,
              validUntil: access.validUntil,
              priority: 100,
              isTemporary: access.validUntil ? true : false
            }
          });
          migratedCount++;
          console.log(`   ✅ Migrated: User ${access.userProfileId} -> ${permission.code}`);
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error migrating user permission:`, error);
        errorCount++;
      }
    }
  }

  console.log(`\n   📊 UserModuleAccess Migration Summary:`);
  console.log(`      ✅ Migrated: ${migratedCount} permissions`);
  console.log(`      ⏭️  Skipped: ${skippedCount} permissions`);
  console.log(`      ❌ Errors: ${errorCount} permissions`);
}

/**
 * Migrate UserOverride to new permission system
 */
async function migrateUserOverrides() {
  console.log('\n🔄 Migrating UserOverride to UserPermission...');
  
  const overrides = await prisma.userOverride.findMany({
    include: { 
      module: true,
      userProfile: true 
    }
  });

  console.log(`   Found ${overrides.length} user override records to migrate`);

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const override of overrides) {
    try {
      const resource = override.module.code.toLowerCase();
      const action = override.permissionType;
      
      // Determine scope - overrides are typically for specific access
      const scope = 'ALL'; // Overrides usually grant broader access

      // Find matching permission
      const permission = await prisma.permission.findFirst({
        where: {
          resource: resource,
          action: action,
          scope: scope as any
        }
      });

      if (!permission) {
        console.log(`   ⚠️  Permission not found: ${resource}.${action}.${scope}`);
        continue;
      }

      // Check if user-permission already exists
      const existing = await prisma.userPermission.findFirst({
        where: {
          userProfileId: override.userProfileId,
          permissionId: permission.id
        }
      });

      if (!existing) {
        await prisma.userPermission.create({
          data: {
            id: uuidv7(),
            userProfileId: override.userProfileId,
            permissionId: permission.id,
            isGranted: override.isGranted,
            grantedBy: override.grantedBy,
            grantReason: override.reason,
            validFrom: override.validFrom,
            validUntil: override.validUntil,
            priority: 200, // Higher priority for overrides
            isTemporary: override.validUntil ? true : false
          }
        });
        migratedCount++;
        console.log(`   ✅ Migrated override: User ${override.userProfileId} -> ${permission.code} (${override.isGranted ? 'granted' : 'denied'})`);
      } else {
        skippedCount++;
      }
    } catch (error) {
      console.error(`   ❌ Error migrating override:`, error);
      errorCount++;
    }
  }

  console.log(`\n   📊 UserOverride Migration Summary:`);
  console.log(`      ✅ Migrated: ${migratedCount} overrides`);
  console.log(`      ⏭️  Skipped: ${skippedCount} overrides`);
  console.log(`      ❌ Errors: ${errorCount} overrides`);
}

/**
 * Verify migration results
 */
async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');

  const stats = {
    permissions: await prisma.permission.count(),
    rolePermissions: await prisma.rolePermission.count(),
    userPermissions: await prisma.userPermission.count(),
    roles: await prisma.role.count(),
    roleHierarchies: await prisma.roleHierarchy.count(),
    
    // Old system counts
    roleModuleAccess: await prisma.roleModuleAccess.count({ where: { isActive: true } }),
    userModuleAccess: await prisma.userModuleAccess.count({ where: { isActive: true } }),
    userOverrides: await prisma.userOverride.count()
  };

  console.log('\n   📊 Final Statistics:');
  console.log('   New Permission System:');
  console.log(`      📝 Permissions: ${stats.permissions}`);
  console.log(`      🔐 Role Permissions: ${stats.rolePermissions}`);
  console.log(`      👤 User Permissions: ${stats.userPermissions}`);
  console.log(`      🎭 Roles: ${stats.roles}`);
  console.log(`      🏗️  Role Hierarchies: ${stats.roleHierarchies}`);
  console.log('\n   Old System (for reference):');
  console.log(`      📦 Role Module Access: ${stats.roleModuleAccess}`);
  console.log(`      👤 User Module Access: ${stats.userModuleAccess}`);
  console.log(`      🔄 User Overrides: ${stats.userOverrides}`);

  // Sample permission check
  const sampleUser = await prisma.userProfile.findFirst({
    where: { isActive: true },
    include: {
      roles: {
        where: { isActive: true },
        include: { role: true }
      }
    }
  });

  if (sampleUser) {
    console.log(`\n   🧪 Sample Permission Check for user: ${sampleUser.id}`);
    const userPerms = await prisma.userPermission.count({
      where: { userProfileId: sampleUser.id }
    });
    
    const rolePerms = await prisma.rolePermission.count({
      where: {
        roleId: { in: sampleUser.roles.map(ur => ur.roleId) }
      }
    });

    console.log(`      Direct permissions: ${userPerms}`);
    console.log(`      Role-based permissions: ${rolePerms}`);
    console.log(`      User roles: ${sampleUser.roles.map(ur => ur.role.code).join(', ')}`);
  }
}

/**
 * Main migration function
 */
async function main() {
  try {
    console.log('🚀 Starting permission migration...\n');
    console.log('⚠️  This will migrate existing permissions to the new fine-grained system.');
    console.log('   Make sure you have backed up your database before proceeding!\n');

    // Run migrations in sequence
    await migrateRoleModuleAccess();
    await migrateUserModuleAccess();
    await migrateUserOverrides();
    
    // Verify results
    await verifyMigration();

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test the new permission system thoroughly');
    console.log('   2. Update your application code to use PermissionService');
    console.log('   3. Once verified, you can disable or remove the old permission tables');
    console.log('   4. Monitor the permission cache for performance');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });