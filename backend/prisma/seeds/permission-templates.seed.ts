import { PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

const prisma = new PrismaClient();

async function seedPermissionTemplates() {
  console.log('🌱 Seeding permission templates...');

  const templates = [
    {
      code: 'viewer_template',
      name: 'Viewer Template',
      description: 'Basic read-only access to most resources',
      category: 'viewer',
      permissions: [
        { permission: 'workorder.read', scope: 'own' },
        { permission: 'kpi.read', scope: 'own' },
        { permission: 'notification.read', scope: 'own' },
        { permission: 'user.read', scope: 'own' },
        { permission: 'dashboard.view' },
      ],
      moduleAccess: [
        { module: 'workorder', actions: ['read'] },
        { module: 'kpi', actions: ['read'] },
        { module: 'notification', actions: ['read'] },
        { module: 'dashboard', actions: ['view'] },
      ],
      isSystem: true,
    },
    {
      code: 'editor_template',
      name: 'Editor Template',
      description: 'Read and write access to assigned resources',
      category: 'editor',
      permissions: [
        { permission: 'workorder.read', scope: 'department' },
        { permission: 'workorder.create' },
        { permission: 'workorder.update', scope: 'own' },
        { permission: 'kpi.read', scope: 'department' },
        { permission: 'kpi.create' },
        { permission: 'kpi.update', scope: 'own' },
        { permission: 'notification.read', scope: 'own' },
        { permission: 'user.read', scope: 'department' },
        { permission: 'dashboard.view' },
      ],
      moduleAccess: [
        { module: 'workorder', actions: ['read', 'create', 'update'] },
        { module: 'kpi', actions: ['read', 'create', 'update'] },
        { module: 'notification', actions: ['read'] },
        { module: 'user', actions: ['read'] },
        { module: 'dashboard', actions: ['view'] },
      ],
      isSystem: true,
    },
    {
      code: 'department_head_template',
      name: 'Department Head Template',
      description:
        'Full access to department resources with approval capabilities',
      category: 'department_head',
      permissions: [
        { permission: 'workorder.read', scope: 'department' },
        { permission: 'workorder.create' },
        { permission: 'workorder.update', scope: 'department' },
        { permission: 'workorder.delete', scope: 'department' },
        { permission: 'workorder.approve', scope: 'department' },
        { permission: 'kpi.read', scope: 'department' },
        { permission: 'kpi.create' },
        { permission: 'kpi.update', scope: 'department' },
        { permission: 'kpi.approve', scope: 'department' },
        { permission: 'user.read', scope: 'department' },
        { permission: 'user.update', scope: 'department' },
        { permission: 'notification.read', scope: 'own' },
        { permission: 'notification.create' },
        { permission: 'dashboard.view' },
        { permission: 'report.generate', scope: 'department' },
        { permission: 'permission.delegate' },
      ],
      moduleAccess: [
        {
          module: 'workorder',
          actions: ['read', 'create', 'update', 'delete', 'approve'],
        },
        { module: 'kpi', actions: ['read', 'create', 'update', 'approve'] },
        { module: 'user', actions: ['read', 'update'] },
        { module: 'notification', actions: ['read', 'create'] },
        { module: 'dashboard', actions: ['view'] },
        { module: 'report', actions: ['generate'] },
      ],
      isSystem: true,
    },
    {
      code: 'admin_template',
      name: 'Administrator Template',
      description: 'Full system access with administrative capabilities',
      category: 'admin',
      permissions: [
        { permission: 'workorder.read', scope: 'all' },
        { permission: 'workorder.create' },
        { permission: 'workorder.update', scope: 'all' },
        { permission: 'workorder.delete', scope: 'all' },
        { permission: 'workorder.approve', scope: 'all' },
        { permission: 'kpi.read', scope: 'all' },
        { permission: 'kpi.create' },
        { permission: 'kpi.update', scope: 'all' },
        { permission: 'kpi.delete', scope: 'all' },
        { permission: 'kpi.approve', scope: 'all' },
        { permission: 'user.read', scope: 'all' },
        { permission: 'user.create' },
        { permission: 'user.update', scope: 'all' },
        { permission: 'user.delete', scope: 'all' },
        { permission: 'role.read' },
        { permission: 'role.create' },
        { permission: 'role.update' },
        { permission: 'role.delete' },
        { permission: 'permission.read' },
        { permission: 'permission.grant' },
        { permission: 'permission.revoke' },
        { permission: 'permission.delegate' },
        { permission: 'permission.template.create' },
        { permission: 'permission.template.update' },
        { permission: 'permission.template.delete' },
        { permission: 'permission.template.apply' },
        { permission: 'permission.analytics.view' },
        { permission: 'permission.analytics.anomaly' },
        { permission: 'permission.bulk.grant' },
        { permission: 'permission.bulk.revoke' },
        { permission: 'system.settings.read' },
        { permission: 'system.settings.update' },
        { permission: 'audit.read' },
        { permission: 'dashboard.view' },
        { permission: 'report.generate', scope: 'all' },
      ],
      moduleAccess: [
        {
          module: 'workorder',
          actions: ['read', 'create', 'update', 'delete', 'approve'],
        },
        {
          module: 'kpi',
          actions: ['read', 'create', 'update', 'delete', 'approve'],
        },
        { module: 'user', actions: ['read', 'create', 'update', 'delete'] },
        { module: 'role', actions: ['read', 'create', 'update', 'delete'] },
        {
          module: 'permission',
          actions: ['read', 'create', 'update', 'delete'],
        },
        { module: 'system', actions: ['read', 'update'] },
        { module: 'audit', actions: ['read'] },
        { module: 'dashboard', actions: ['view'] },
        { module: 'report', actions: ['generate'] },
      ],
      isSystem: true,
    },
  ];

  for (const template of templates) {
    const existing = await prisma.permissionTemplate.findUnique({
      where: { code: template.code },
    });

    if (!existing) {
      await prisma.permissionTemplate.create({
        data: {
          id: uuidv7(),
          ...template,
          createdBy: 'system',
        },
      });
      console.log(`✅ Created permission template: ${template.name}`);
    } else {
      console.log(`⏭️  Permission template already exists: ${template.name}`);
    }
  }

  // Create permissions for the new features if they don't exist
  const newPermissions = [
    // Permission Template permissions
    {
      code: 'permission.template.create',
      name: 'Create Permission Templates',
      resource: 'permission',
      action: 'CREATE',
      scope: 'SYSTEM',
    },
    {
      code: 'permission.template.read',
      name: 'View Permission Templates',
      resource: 'permission',
      action: 'READ',
      scope: 'SYSTEM',
    },
    {
      code: 'permission.template.update',
      name: 'Update Permission Templates',
      resource: 'permission',
      action: 'UPDATE',
      scope: 'SYSTEM',
    },
    {
      code: 'permission.template.delete',
      name: 'Delete Permission Templates',
      resource: 'permission',
      action: 'DELETE',
      scope: 'SYSTEM',
    },
    {
      code: 'permission.template.apply',
      name: 'Apply Permission Templates',
      resource: 'permission',
      action: 'UPDATE',
      scope: 'SYSTEM',
    },
    {
      code: 'permission.template.revoke',
      name: 'Revoke Permission Templates',
      resource: 'permission',
      action: 'UPDATE',
      scope: 'SYSTEM',
    },

    // Delegation permissions
    {
      code: 'permission.delegation.create',
      name: 'Create Permission Delegations',
      resource: 'permission',
      action: 'CREATE',
      scope: 'SYSTEM',
    },
    {
      code: 'permission.delegation.read',
      name: 'View Permission Delegations',
      resource: 'permission',
      action: 'READ',
      scope: 'SYSTEM',
    },
    {
      code: 'permission.delegation.revoke',
      name: 'Revoke Permission Delegations',
      resource: 'permission',
      action: 'UPDATE',
      scope: 'SYSTEM',
    },
    {
      code: 'permission.delegation.update',
      name: 'Update Permission Delegations',
      resource: 'permission',
      action: 'UPDATE',
      scope: 'SYSTEM',
    },
    {
      code: 'permission.delegation.admin',
      name: 'Admin Permission Delegations',
      resource: 'permission',
      action: 'UPDATE',
      scope: 'SYSTEM',
    },
    {
      code: 'permission.delegate',
      name: 'Delegate Permissions',
      resource: 'permission',
      action: 'CREATE',
      scope: 'OWN',
    },

    // Analytics permissions
    {
      code: 'permission.analytics.view',
      name: 'View Permission Analytics',
      resource: 'permission',
      action: 'READ',
      scope: 'SYSTEM',
    },
    {
      code: 'permission.analytics.anomaly',
      name: 'View Anomaly Reports',
      resource: 'permission',
      action: 'READ',
      scope: 'SYSTEM',
    },
    {
      code: 'permission.analytics.admin',
      name: 'Admin Permission Analytics',
      resource: 'permission',
      action: 'UPDATE',
      scope: 'SYSTEM',
    },

    // Bulk operations permissions
    {
      code: 'permission.bulk.grant',
      name: 'Bulk Grant Permissions',
      resource: 'permission',
      action: 'CREATE',
      scope: 'SYSTEM',
    },
    {
      code: 'permission.bulk.revoke',
      name: 'Bulk Revoke Permissions',
      resource: 'permission',
      action: 'DELETE',
      scope: 'SYSTEM',
    },
  ];

  for (const perm of newPermissions) {
    const existing = await prisma.permission.findUnique({
      where: { code: perm.code },
    });

    if (!existing) {
      await prisma.permission.create({
        data: {
          id: uuidv7(),
          ...perm,
          description: perm.name,
          isActive: true,
          createdBy: 'system',
        },
      });
      console.log(`✅ Created permission: ${perm.code}`);
    } else {
      console.log(`⏭️  Permission already exists: ${perm.code}`);
    }
  }

  console.log('✅ Permission templates seeding completed!');
}

seedPermissionTemplates()
  .catch((e) => {
    console.error('❌ Error seeding permission templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
