import { PrismaClient, PermissionAction, PermissionScope } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

const prisma = new PrismaClient();

interface ModulePermission {
  resource: string;
  actions: PermissionAction[];
  scopes: PermissionScope[];
  description?: string;
}

// Define all module permissions
const modulePermissions: ModulePermission[] = [
  // Work Order Module
  {
    resource: 'workorder',
    actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'CLOSE'],
    scopes: ['OWN', 'DEPARTMENT', 'SCHOOL', 'ALL'],
    description: 'Work Order IT/GA Management'
  },
  // KPI Module
  {
    resource: 'kpi',
    actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT'],
    scopes: ['OWN', 'DEPARTMENT', 'SCHOOL', 'ALL'],
    description: 'Key Performance Indicators'
  },
  // User Management
  {
    resource: 'user',
    actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'ASSIGN'],
    scopes: ['OWN', 'DEPARTMENT', 'SCHOOL', 'ALL'],
    description: 'User Management'
  },
  // Reports
  {
    resource: 'report',
    actions: ['READ', 'EXPORT', 'PRINT'],
    scopes: ['OWN', 'DEPARTMENT', 'SCHOOL', 'ALL'],
    description: 'Reports and Analytics'
  },
  // Training Module
  {
    resource: 'training',
    actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'ASSIGN'],
    scopes: ['OWN', 'DEPARTMENT', 'SCHOOL', 'ALL'],
    description: 'Training Management'
  },
  // Peer Evaluation
  {
    resource: 'evaluation',
    actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'],
    scopes: ['OWN', 'DEPARTMENT', 'SCHOOL', 'ALL'],
    description: 'Peer Evaluation'
  },
  // ICS (Internal Control System)
  {
    resource: 'ics',
    actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'],
    scopes: ['OWN', 'DEPARTMENT', 'SCHOOL', 'ALL'],
    description: 'Internal Control System'
  },
  // Quality Target (Sasaran Mutu)
  {
    resource: 'quality',
    actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'],
    scopes: ['OWN', 'DEPARTMENT', 'SCHOOL', 'ALL'],
    description: 'Quality Target Management'
  },
  // Staff Survey (Angket Staf)
  {
    resource: 'survey',
    actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT'],
    scopes: ['OWN', 'DEPARTMENT', 'SCHOOL', 'ALL'],
    description: 'Staff Survey Management'
  },
  // Role & Permission Management
  {
    resource: 'role',
    actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'ASSIGN'],
    scopes: ['ALL'],
    description: 'Role Management'
  },
  {
    resource: 'permission',
    actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'ASSIGN'],
    scopes: ['ALL'],
    description: 'Permission Management'
  }
];

async function seedPermissions() {
  console.log('🌱 Seeding permissions...');
  
  let createdCount = 0;
  let skippedCount = 0;

  for (const module of modulePermissions) {
    console.log(`📦 Processing ${module.resource} permissions...`);
    
    for (const action of module.actions) {
      for (const scope of module.scopes) {
        const code = `${module.resource}.${action.toLowerCase()}.${scope.toLowerCase()}`;
        
        try {
          // Check if permission already exists
          const existing = await prisma.permission.findFirst({
            where: {
              resource: module.resource,
              action: action,
              scope: scope
            }
          });

          if (existing) {
            skippedCount++;
            console.log(`   ⏭️  Skipped: ${code} (already exists)`);
            continue;
          }

          // Create new permission
          await prisma.permission.create({
            data: {
              id: uuidv7(),
              code: code,
              name: `${action} ${module.resource.toUpperCase()} - ${scope}`,
              description: `${module.description}: ${action} access for ${scope} scope`,
              resource: module.resource,
              action: action,
              scope: scope,
              isSystemPermission: true,
              isActive: true
            }
          });
          
          createdCount++;
          console.log(`   ✅ Created: ${code}`);
        } catch (error) {
          console.error(`   ❌ Error creating ${code}:`, error);
        }
      }
    }
  }

  console.log('\n📊 Seed Summary:');
  console.log(`   ✅ Created: ${createdCount} permissions`);
  console.log(`   ⏭️  Skipped: ${skippedCount} permissions`);
  console.log(`   📄 Total: ${createdCount + skippedCount} permissions`);
}

// Seed default roles
async function seedDefaultRoles() {
  console.log('\n🎭 Seeding default roles...');

  const defaultRoles = [
    {
      code: 'SUPERADMIN',
      name: 'Super Administrator',
      description: 'Full system access',
      hierarchyLevel: 1,
      isSystemRole: true
    },
    {
      code: 'ADMIN',
      name: 'Administrator',
      description: 'Administrative access',
      hierarchyLevel: 2,
      isSystemRole: true
    },
    {
      code: 'MANAGER',
      name: 'Manager',
      description: 'Department manager access',
      hierarchyLevel: 3,
      isSystemRole: false
    },
    {
      code: 'STAFF',
      name: 'Staff',
      description: 'Regular staff access',
      hierarchyLevel: 4,
      isSystemRole: false
    },
    {
      code: 'VIEWER',
      name: 'Viewer',
      description: 'Read-only access',
      hierarchyLevel: 5,
      isSystemRole: false
    }
  ];

  for (const roleData of defaultRoles) {
    try {
      const existing = await prisma.role.findUnique({
        where: { code: roleData.code }
      });

      if (existing) {
        console.log(`   ⏭️  Skipped: ${roleData.code} (already exists)`);
        continue;
      }

      const role = await prisma.role.create({
        data: {
          id: uuidv7(),
          ...roleData,
          isActive: true
        }
      });

      console.log(`   ✅ Created role: ${roleData.code}`);

      // Assign permissions based on role
      await assignDefaultPermissionsToRole(role.id, roleData.code);
    } catch (error) {
      console.error(`   ❌ Error creating role ${roleData.code}:`, error);
    }
  }
}

// Assign default permissions to roles
async function assignDefaultPermissionsToRole(roleId: string, roleCode: string) {
  console.log(`   🔐 Assigning permissions to ${roleCode}...`);

  let permissions: any[] = [];

  switch (roleCode) {
    case 'SUPERADMIN':
      // Grant all permissions
      permissions = await prisma.permission.findMany({
        where: { isActive: true }
      });
      break;

    case 'ADMIN':
      // Grant all permissions except system permissions
      permissions = await prisma.permission.findMany({
        where: {
          isActive: true,
          NOT: {
            resource: { in: ['role', 'permission'] }
          }
        }
      });
      break;

    case 'MANAGER':
      // Grant department-level permissions
      permissions = await prisma.permission.findMany({
        where: {
          isActive: true,
          scope: { in: ['OWN', 'DEPARTMENT'] },
          NOT: {
            resource: { in: ['role', 'permission', 'user'] }
          }
        }
      });
      break;

    case 'STAFF':
      // Grant own-level permissions
      permissions = await prisma.permission.findMany({
        where: {
          isActive: true,
          scope: 'OWN',
          NOT: {
            resource: { in: ['role', 'permission', 'user'] },
            action: { in: ['DELETE', 'APPROVE'] }
          }
        }
      });
      break;

    case 'VIEWER':
      // Grant read-only permissions
      permissions = await prisma.permission.findMany({
        where: {
          isActive: true,
          action: 'READ',
          scope: { in: ['OWN', 'DEPARTMENT'] }
        }
      });
      break;
  }

  // Create role-permission relationships
  for (const permission of permissions) {
    try {
      await prisma.rolePermission.create({
        data: {
          id: uuidv7(),
          roleId: roleId,
          permissionId: permission.id,
          isGranted: true,
          grantedBy: 'SYSTEM'
        }
      });
    } catch (error) {
      // Ignore duplicate errors
      if (!(error as any).code === 'P2002') {
        console.error(`Error assigning permission to role:`, error);
      }
    }
  }

  console.log(`   ✅ Assigned ${permissions.length} permissions to ${roleCode}`);
}

// Set up role hierarchy
async function setupRoleHierarchy() {
  console.log('\n🏗️  Setting up role hierarchy...');

  const hierarchies = [
    { child: 'ADMIN', parent: 'SUPERADMIN' },
    { child: 'MANAGER', parent: 'ADMIN' },
    { child: 'STAFF', parent: 'MANAGER' },
    { child: 'VIEWER', parent: 'STAFF' }
  ];

  for (const hierarchy of hierarchies) {
    try {
      const childRole = await prisma.role.findUnique({
        where: { code: hierarchy.child }
      });
      const parentRole = await prisma.role.findUnique({
        where: { code: hierarchy.parent }
      });

      if (!childRole || !parentRole) {
        console.log(`   ⚠️  Skipped: ${hierarchy.child} -> ${hierarchy.parent} (role not found)`);
        continue;
      }

      // Check if hierarchy already exists
      const existing = await prisma.roleHierarchy.findFirst({
        where: {
          roleId: childRole.id,
          parentRoleId: parentRole.id
        }
      });

      if (existing) {
        console.log(`   ⏭️  Skipped: ${hierarchy.child} -> ${hierarchy.parent} (already exists)`);
        continue;
      }

      await prisma.roleHierarchy.create({
        data: {
          id: uuidv7(),
          roleId: childRole.id,
          parentRoleId: parentRole.id,
          inheritPermissions: true
        }
      });

      console.log(`   ✅ Created hierarchy: ${hierarchy.child} inherits from ${hierarchy.parent}`);
    } catch (error) {
      console.error(`   ❌ Error creating hierarchy:`, error);
    }
  }
}

// Main seed function
async function main() {
  try {
    console.log('🚀 Starting permission system seed...\n');
    
    // Seed permissions
    await seedPermissions();
    
    // Seed default roles
    await seedDefaultRoles();
    
    // Set up role hierarchy
    await setupRoleHierarchy();
    
    console.log('\n✅ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });