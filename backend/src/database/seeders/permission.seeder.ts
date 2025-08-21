import {
  PrismaClient,
  PermissionAction,
  PermissionScope,
} from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

const prisma = new PrismaClient();

interface PermissionSeed {
  code: string;
  name: string;
  resource: string;
  action: PermissionAction;
  scope?: PermissionScope;
  description?: string;
  groupCode?: string;
}

interface RoleSeed {
  code: string;
  name: string;
  description?: string;
  hierarchyLevel: number;
  isSystemRole: boolean;
  permissions: string[]; // Permission codes
}

// Define permission groups
const permissionGroups = [
  {
    id: uuidv7(),
    code: 'USER_MANAGEMENT',
    name: 'User Management',
    description: 'Permissions for managing users and profiles',
    category: 'SYSTEM' as const,
    sortOrder: 1,
  },
  {
    id: uuidv7(),
    code: 'ROLE_MANAGEMENT',
    name: 'Role Management',
    description: 'Permissions for managing roles and permissions',
    category: 'SYSTEM' as const,
    sortOrder: 2,
  },
  {
    id: uuidv7(),
    code: 'ORGANIZATION',
    name: 'Organization',
    description: 'Permissions for managing organizational structure',
    category: 'SYSTEM' as const,
    sortOrder: 3,
  },
  {
    id: uuidv7(),
    code: 'SERVICE_REQUEST',
    name: 'Service Request',
    description: 'Permissions for service requests and work orders',
    category: 'SERVICE' as const,
    sortOrder: 4,
  },
  {
    id: uuidv7(),
    code: 'PERFORMANCE',
    name: 'Performance',
    description: 'Permissions for KPI and performance management',
    category: 'PERFORMANCE' as const,
    sortOrder: 5,
  },
];

// Define permissions
const permissions: PermissionSeed[] = [
  // User Management Permissions
  {
    code: 'user.create',
    name: 'Create User',
    resource: 'user',
    action: PermissionAction.CREATE,
    groupCode: 'USER_MANAGEMENT',
  },
  {
    code: 'user.read.own',
    name: 'View Own Profile',
    resource: 'user',
    action: PermissionAction.READ,
    scope: PermissionScope.OWN,
    groupCode: 'USER_MANAGEMENT',
  },
  {
    code: 'user.read.department',
    name: 'View Department Users',
    resource: 'user',
    action: PermissionAction.READ,
    scope: PermissionScope.DEPARTMENT,
    groupCode: 'USER_MANAGEMENT',
  },
  {
    code: 'user.read.school',
    name: 'View School Users',
    resource: 'user',
    action: PermissionAction.READ,
    scope: PermissionScope.SCHOOL,
    groupCode: 'USER_MANAGEMENT',
  },
  {
    code: 'user.read.all',
    name: 'View All Users',
    resource: 'user',
    action: PermissionAction.READ,
    scope: PermissionScope.ALL,
    groupCode: 'USER_MANAGEMENT',
  },
  {
    code: 'user.update.own',
    name: 'Update Own Profile',
    resource: 'user',
    action: PermissionAction.UPDATE,
    scope: PermissionScope.OWN,
    groupCode: 'USER_MANAGEMENT',
  },
  {
    code: 'user.update.department',
    name: 'Update Department Users',
    resource: 'user',
    action: PermissionAction.UPDATE,
    scope: PermissionScope.DEPARTMENT,
    groupCode: 'USER_MANAGEMENT',
  },
  {
    code: 'user.update.all',
    name: 'Update All Users',
    resource: 'user',
    action: PermissionAction.UPDATE,
    scope: PermissionScope.ALL,
    groupCode: 'USER_MANAGEMENT',
  },
  {
    code: 'user.delete',
    name: 'Delete User',
    resource: 'user',
    action: PermissionAction.DELETE,
    groupCode: 'USER_MANAGEMENT',
  },
  {
    code: 'user.export',
    name: 'Export User Data',
    resource: 'user',
    action: PermissionAction.EXPORT,
    groupCode: 'USER_MANAGEMENT',
  },

  // Role & Permission Management
  {
    code: 'role.create',
    name: 'Create Role',
    resource: 'role',
    action: PermissionAction.CREATE,
    groupCode: 'ROLE_MANAGEMENT',
  },
  {
    code: 'role.read',
    name: 'View Roles',
    resource: 'role',
    action: PermissionAction.READ,
    groupCode: 'ROLE_MANAGEMENT',
  },
  {
    code: 'role.update',
    name: 'Update Role',
    resource: 'role',
    action: PermissionAction.UPDATE,
    groupCode: 'ROLE_MANAGEMENT',
  },
  {
    code: 'role.delete',
    name: 'Delete Role',
    resource: 'role',
    action: PermissionAction.DELETE,
    groupCode: 'ROLE_MANAGEMENT',
  },
  {
    code: 'role.assign',
    name: 'Assign Role',
    resource: 'role',
    action: PermissionAction.ASSIGN,
    groupCode: 'ROLE_MANAGEMENT',
  },

  {
    code: 'permission.create',
    name: 'Create Permission',
    resource: 'permission',
    action: PermissionAction.CREATE,
    groupCode: 'ROLE_MANAGEMENT',
  },
  {
    code: 'permission.read',
    name: 'View Permissions',
    resource: 'permission',
    action: PermissionAction.READ,
    groupCode: 'ROLE_MANAGEMENT',
  },
  {
    code: 'permission.update',
    name: 'Update Permission',
    resource: 'permission',
    action: PermissionAction.UPDATE,
    groupCode: 'ROLE_MANAGEMENT',
  },
  {
    code: 'permission.delete',
    name: 'Delete Permission',
    resource: 'permission',
    action: PermissionAction.DELETE,
    groupCode: 'ROLE_MANAGEMENT',
  },

  {
    code: 'user-permission.read',
    name: 'View User Permissions',
    resource: 'user-permission',
    action: PermissionAction.READ,
    groupCode: 'ROLE_MANAGEMENT',
  },
  {
    code: 'user-permission.assign',
    name: 'Assign User Permission',
    resource: 'user-permission',
    action: PermissionAction.ASSIGN,
    groupCode: 'ROLE_MANAGEMENT',
  },
  {
    code: 'user-permission.delete',
    name: 'Revoke User Permission',
    resource: 'user-permission',
    action: PermissionAction.DELETE,
    groupCode: 'ROLE_MANAGEMENT',
  },

  // Organization Management
  {
    code: 'school.create',
    name: 'Create School',
    resource: 'school',
    action: PermissionAction.CREATE,
    groupCode: 'ORGANIZATION',
  },
  {
    code: 'school.read',
    name: 'View Schools',
    resource: 'school',
    action: PermissionAction.READ,
    groupCode: 'ORGANIZATION',
  },
  {
    code: 'school.update',
    name: 'Update School',
    resource: 'school',
    action: PermissionAction.UPDATE,
    groupCode: 'ORGANIZATION',
  },
  {
    code: 'school.delete',
    name: 'Delete School',
    resource: 'school',
    action: PermissionAction.DELETE,
    groupCode: 'ORGANIZATION',
  },

  {
    code: 'department.create',
    name: 'Create Department',
    resource: 'department',
    action: PermissionAction.CREATE,
    groupCode: 'ORGANIZATION',
  },
  {
    code: 'department.read',
    name: 'View Departments',
    resource: 'department',
    action: PermissionAction.READ,
    groupCode: 'ORGANIZATION',
  },
  {
    code: 'department.update',
    name: 'Update Department',
    resource: 'department',
    action: PermissionAction.UPDATE,
    groupCode: 'ORGANIZATION',
  },
  {
    code: 'department.delete',
    name: 'Delete Department',
    resource: 'department',
    action: PermissionAction.DELETE,
    groupCode: 'ORGANIZATION',
  },

  {
    code: 'position.create',
    name: 'Create Position',
    resource: 'position',
    action: PermissionAction.CREATE,
    groupCode: 'ORGANIZATION',
  },
  {
    code: 'position.read',
    name: 'View Positions',
    resource: 'position',
    action: PermissionAction.READ,
    groupCode: 'ORGANIZATION',
  },
  {
    code: 'position.update',
    name: 'Update Position',
    resource: 'position',
    action: PermissionAction.UPDATE,
    groupCode: 'ORGANIZATION',
  },
  {
    code: 'position.delete',
    name: 'Delete Position',
    resource: 'position',
    action: PermissionAction.DELETE,
    groupCode: 'ORGANIZATION',
  },
  {
    code: 'position.assign',
    name: 'Assign Position',
    resource: 'position',
    action: PermissionAction.ASSIGN,
    groupCode: 'ORGANIZATION',
  },

  // Work Order Permissions
  {
    code: 'workorder.create',
    name: 'Create Work Order',
    resource: 'workorder',
    action: PermissionAction.CREATE,
    groupCode: 'SERVICE_REQUEST',
  },
  {
    code: 'workorder.read.own',
    name: 'View Own Work Orders',
    resource: 'workorder',
    action: PermissionAction.READ,
    scope: PermissionScope.OWN,
    groupCode: 'SERVICE_REQUEST',
  },
  {
    code: 'workorder.read.department',
    name: 'View Department Work Orders',
    resource: 'workorder',
    action: PermissionAction.READ,
    scope: PermissionScope.DEPARTMENT,
    groupCode: 'SERVICE_REQUEST',
  },
  {
    code: 'workorder.read.all',
    name: 'View All Work Orders',
    resource: 'workorder',
    action: PermissionAction.READ,
    scope: PermissionScope.ALL,
    groupCode: 'SERVICE_REQUEST',
  },
  {
    code: 'workorder.update.own',
    name: 'Update Own Work Orders',
    resource: 'workorder',
    action: PermissionAction.UPDATE,
    scope: PermissionScope.OWN,
    groupCode: 'SERVICE_REQUEST',
  },
  {
    code: 'workorder.update.department',
    name: 'Update Department Work Orders',
    resource: 'workorder',
    action: PermissionAction.UPDATE,
    scope: PermissionScope.DEPARTMENT,
    groupCode: 'SERVICE_REQUEST',
  },
  {
    code: 'workorder.update.all',
    name: 'Update All Work Orders',
    resource: 'workorder',
    action: PermissionAction.UPDATE,
    scope: PermissionScope.ALL,
    groupCode: 'SERVICE_REQUEST',
  },
  {
    code: 'workorder.approve',
    name: 'Approve Work Order',
    resource: 'workorder',
    action: PermissionAction.APPROVE,
    groupCode: 'SERVICE_REQUEST',
  },
  {
    code: 'workorder.close',
    name: 'Close Work Order',
    resource: 'workorder',
    action: PermissionAction.CLOSE,
    groupCode: 'SERVICE_REQUEST',
  },
  {
    code: 'workorder.export',
    name: 'Export Work Orders',
    resource: 'workorder',
    action: PermissionAction.EXPORT,
    groupCode: 'SERVICE_REQUEST',
  },

  // KPI Permissions
  {
    code: 'kpi.create',
    name: 'Create KPI',
    resource: 'kpi',
    action: PermissionAction.CREATE,
    groupCode: 'PERFORMANCE',
  },
  {
    code: 'kpi.read.own',
    name: 'View Own KPI',
    resource: 'kpi',
    action: PermissionAction.READ,
    scope: PermissionScope.OWN,
    groupCode: 'PERFORMANCE',
  },
  {
    code: 'kpi.read.department',
    name: 'View Department KPI',
    resource: 'kpi',
    action: PermissionAction.READ,
    scope: PermissionScope.DEPARTMENT,
    groupCode: 'PERFORMANCE',
  },
  {
    code: 'kpi.read.all',
    name: 'View All KPI',
    resource: 'kpi',
    action: PermissionAction.READ,
    scope: PermissionScope.ALL,
    groupCode: 'PERFORMANCE',
  },
  {
    code: 'kpi.update.own',
    name: 'Update Own KPI',
    resource: 'kpi',
    action: PermissionAction.UPDATE,
    scope: PermissionScope.OWN,
    groupCode: 'PERFORMANCE',
  },
  {
    code: 'kpi.update.department',
    name: 'Update Department KPI',
    resource: 'kpi',
    action: PermissionAction.UPDATE,
    scope: PermissionScope.DEPARTMENT,
    groupCode: 'PERFORMANCE',
  },
  {
    code: 'kpi.approve',
    name: 'Approve KPI',
    resource: 'kpi',
    action: PermissionAction.APPROVE,
    groupCode: 'PERFORMANCE',
  },
  {
    code: 'kpi.export',
    name: 'Export KPI Data',
    resource: 'kpi',
    action: PermissionAction.EXPORT,
    groupCode: 'PERFORMANCE',
  },
];

// Define roles
const roles: RoleSeed[] = [
  {
    code: 'SUPERADMIN',
    name: 'Super Administrator',
    description: 'Full system access',
    hierarchyLevel: 1,
    isSystemRole: true,
    permissions: [], // Superadmin bypasses permission checks
  },
  {
    code: 'ADMIN',
    name: 'Administrator',
    description: 'System administration',
    hierarchyLevel: 2,
    isSystemRole: true,
    permissions: [
      'user.read.all',
      'user.update.all',
      'user.delete',
      'user.export',
      'role.create',
      'role.read',
      'role.update',
      'role.delete',
      'role.assign',
      'permission.read',
      'user-permission.read',
      'user-permission.assign',
      'school.create',
      'school.read',
      'school.update',
      'school.delete',
      'department.create',
      'department.read',
      'department.update',
      'department.delete',
      'position.create',
      'position.read',
      'position.update',
      'position.delete',
      'position.assign',
    ],
  },
  {
    code: 'KABAG',
    name: 'Kepala Bagian',
    description: 'Department head',
    hierarchyLevel: 3,
    isSystemRole: false,
    permissions: [
      'user.read.department',
      'user.update.department',
      'department.read',
      'department.update',
      'position.read',
      'position.assign',
      'workorder.read.department',
      'workorder.update.department',
      'workorder.approve',
      'kpi.read.department',
      'kpi.update.department',
      'kpi.approve',
    ],
  },
  {
    code: 'COORDINATOR',
    name: 'Koordinator',
    description: 'Coordinator role',
    hierarchyLevel: 4,
    isSystemRole: false,
    permissions: [
      'user.read.department',
      'department.read',
      'position.read',
      'workorder.read.department',
      'workorder.update.department',
      'kpi.read.department',
      'kpi.update.department',
    ],
  },
  {
    code: 'STAFF',
    name: 'Staff',
    description: 'Regular staff member',
    hierarchyLevel: 5,
    isSystemRole: false,
    permissions: [
      'user.read.own',
      'user.update.own',
      'department.read',
      'position.read',
      'workorder.create',
      'workorder.read.own',
      'workorder.update.own',
      'kpi.read.own',
      'kpi.update.own',
    ],
  },
  {
    code: 'IT_SUPPORT',
    name: 'IT Support',
    description: 'IT support staff',
    hierarchyLevel: 4,
    isSystemRole: false,
    permissions: [
      'user.read.all',
      'workorder.read.all',
      'workorder.update.all',
      'workorder.close',
      'workorder.export',
    ],
  },
  {
    code: 'HR_STAFF',
    name: 'HR Staff',
    description: 'Human Resources staff',
    hierarchyLevel: 4,
    isSystemRole: false,
    permissions: [
      'user.create',
      'user.read.all',
      'user.update.all',
      'user.export',
      'department.read',
      'position.read',
      'position.assign',
      'kpi.read.all',
      'kpi.export',
    ],
  },
];

export async function seedPermissions() {
  console.log('🌱 Seeding permissions...');

  try {
    // Create permission groups
    for (const group of permissionGroups) {
      await prisma.permissionGroup.upsert({
        where: { code: group.code },
        update: {},
        create: {
          ...group,
          isActive: true,
        },
      });
    }
    console.log(`✅ Created ${permissionGroups.length} permission groups`);

    // Create permissions
    let permissionCount = 0;
    for (const perm of permissions) {
      const groupId = perm.groupCode
        ? permissionGroups.find((g) => g.code === perm.groupCode)?.id
        : null;

      await prisma.permission.upsert({
        where: { code: perm.code },
        update: {},
        create: {
          id: uuidv7(),
          code: perm.code,
          name: perm.name,
          resource: perm.resource,
          action: perm.action,
          scope: perm.scope,
          description: perm.description,
          groupId,
          isSystemPermission: true,
          isActive: true,
          createdBy: 'SYSTEM',
        },
      });
      permissionCount++;
    }
    console.log(`✅ Created ${permissionCount} permissions`);

    // Create roles
    for (const role of roles) {
      const createdRole = await prisma.role.upsert({
        where: { code: role.code },
        update: {},
        create: {
          id: uuidv7(),
          code: role.code,
          name: role.name,
          description: role.description,
          hierarchyLevel: role.hierarchyLevel,
          isSystemRole: role.isSystemRole,
          isActive: true,
          createdBy: 'SYSTEM',
        },
      });

      // Assign permissions to role
      if (role.permissions.length > 0) {
        const permissionIds = await prisma.permission.findMany({
          where: { code: { in: role.permissions } },
          select: { id: true },
        });

        for (const permission of permissionIds) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: createdRole.id,
                permissionId: permission.id,
              },
            },
            update: {},
            create: {
              id: uuidv7(),
              roleId: createdRole.id,
              permissionId: permission.id,
              isGranted: true,
              grantedBy: 'SYSTEM',
            },
          });
        }
      }
    }
    console.log(`✅ Created ${roles.length} roles with permissions`);

    // Create role hierarchy (STAFF reports to COORDINATOR, COORDINATOR reports to KABAG, etc.)
    const staffRole = await prisma.role.findUnique({
      where: { code: 'STAFF' },
    });
    const coordinatorRole = await prisma.role.findUnique({
      where: { code: 'COORDINATOR' },
    });
    const kabagRole = await prisma.role.findUnique({
      where: { code: 'KABAG' },
    });

    if (staffRole && coordinatorRole) {
      await prisma.roleHierarchy.upsert({
        where: {
          roleId_parentRoleId: {
            roleId: staffRole.id,
            parentRoleId: coordinatorRole.id,
          },
        },
        update: {},
        create: {
          id: uuidv7(),
          roleId: staffRole.id,
          parentRoleId: coordinatorRole.id,
          inheritPermissions: false, // Don't automatically inherit
        },
      });
    }

    if (coordinatorRole && kabagRole) {
      await prisma.roleHierarchy.upsert({
        where: {
          roleId_parentRoleId: {
            roleId: coordinatorRole.id,
            parentRoleId: kabagRole.id,
          },
        },
        update: {},
        create: {
          id: uuidv7(),
          roleId: coordinatorRole.id,
          parentRoleId: kabagRole.id,
          inheritPermissions: false,
        },
      });
    }
    console.log('✅ Created role hierarchy');

    console.log('✨ Permission seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    throw error;
  }
}

// Run the seeder if this file is executed directly
if (require.main === module) {
  seedPermissions()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
