/**
 * Comprehensive seed script for Gloria Management System
 * Creates dummy users based on data_karyawan structure with complete permissions
 * Run: npx ts-node prisma/seed-comprehensive.ts
 */

import {
  PrismaClient,
  ModuleCategory,
  PermissionAction,
  PermissionScope,
} from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

const prisma = new PrismaClient();

// Sample data for schools
const schools = [
  { code: 'TK', name: 'TK Gloria', lokasi: 'TK' },
  { code: 'SD', name: 'SD Gloria', lokasi: 'SD' },
  { code: 'SMP', name: 'SMP Gloria', lokasi: 'SMP' },
  { code: 'SMA', name: 'SMA Gloria', lokasi: 'SMA' },
  { code: 'PPM', name: 'PPM Gloria', lokasi: 'PPM' },
];

// Sample departments based on bidang_kerja
const departments = [
  // TK Departments
  {
    code: 'TK_TEACHING',
    name: 'Teaching Department',
    bagianKerja: 'Kependidikan',
    schoolCode: 'TK',
  },
  {
    code: 'TK_ADMIN',
    name: 'Administration',
    bagianKerja: 'Administrasi',
    schoolCode: 'TK',
  },
  {
    code: 'TK_SUPPORT',
    name: 'Support Staff',
    bagianKerja: 'Umum',
    schoolCode: 'TK',
  },

  // SD Departments
  {
    code: 'SD_TEACHING',
    name: 'Teaching Department',
    bagianKerja: 'Kependidikan',
    schoolCode: 'SD',
  },
  {
    code: 'SD_ADMIN',
    name: 'Administration',
    bagianKerja: 'Administrasi',
    schoolCode: 'SD',
  },
  {
    code: 'SD_LAB',
    name: 'Laboratory',
    bagianKerja: 'Laboratorium',
    schoolCode: 'SD',
  },

  // SMP Departments
  {
    code: 'SMP_TEACHING',
    name: 'Teaching Department',
    bagianKerja: 'Kependidikan',
    schoolCode: 'SMP',
  },
  {
    code: 'SMP_ADMIN',
    name: 'Administration',
    bagianKerja: 'Administrasi',
    schoolCode: 'SMP',
  },
  {
    code: 'SMP_COUNSELING',
    name: 'Counseling',
    bagianKerja: 'BK',
    schoolCode: 'SMP',
  },

  // SMA Departments
  {
    code: 'SMA_TEACHING',
    name: 'Teaching Department',
    bagianKerja: 'Kependidikan',
    schoolCode: 'SMA',
  },
  {
    code: 'SMA_ADMIN',
    name: 'Administration',
    bagianKerja: 'Administrasi',
    schoolCode: 'SMA',
  },
  {
    code: 'SMA_LAB',
    name: 'Laboratory',
    bagianKerja: 'Laboratorium',
    schoolCode: 'SMA',
  },

  // PPM Departments
  {
    code: 'PPM_HRD',
    name: 'Human Resources',
    bagianKerja: 'HRD',
    schoolCode: 'PPM',
  },
  {
    code: 'PPM_IT',
    name: 'Information Technology',
    bagianKerja: 'IT',
    schoolCode: 'PPM',
  },
  {
    code: 'PPM_GA',
    name: 'General Affairs',
    bagianKerja: 'GA',
    schoolCode: 'PPM',
  },
  {
    code: 'PPM_FINANCE',
    name: 'Finance',
    bagianKerja: 'Keuangan',
    schoolCode: 'PPM',
  },
  {
    code: 'PPM_QA',
    name: 'Quality Assurance',
    bagianKerja: 'QA',
    schoolCode: 'PPM',
  },
];

// Sample positions
const positions = [
  // Executive positions
  {
    code: 'CEO',
    name: 'Chief Executive Officer',
    hierarchyLevel: 1,
    departmentCode: 'PPM_HRD',
  },
  {
    code: 'DIR_OPS',
    name: 'Director of Operations',
    hierarchyLevel: 2,
    departmentCode: 'PPM_HRD',
  },

  // School leadership
  {
    code: 'PRINCIPAL_TK',
    name: 'Kepala Sekolah TK',
    hierarchyLevel: 3,
    departmentCode: 'TK_ADMIN',
  },
  {
    code: 'PRINCIPAL_SD',
    name: 'Kepala Sekolah SD',
    hierarchyLevel: 3,
    departmentCode: 'SD_ADMIN',
  },
  {
    code: 'PRINCIPAL_SMP',
    name: 'Kepala Sekolah SMP',
    hierarchyLevel: 3,
    departmentCode: 'SMP_ADMIN',
  },
  {
    code: 'PRINCIPAL_SMA',
    name: 'Kepala Sekolah SMA',
    hierarchyLevel: 3,
    departmentCode: 'SMA_ADMIN',
  },

  // Department heads
  {
    code: 'HEAD_HRD',
    name: 'Head of HRD',
    hierarchyLevel: 3,
    departmentCode: 'PPM_HRD',
  },
  {
    code: 'HEAD_IT',
    name: 'Head of IT',
    hierarchyLevel: 3,
    departmentCode: 'PPM_IT',
  },
  {
    code: 'HEAD_GA',
    name: 'Head of GA',
    hierarchyLevel: 3,
    departmentCode: 'PPM_GA',
  },
  {
    code: 'HEAD_FINANCE',
    name: 'Head of Finance',
    hierarchyLevel: 3,
    departmentCode: 'PPM_FINANCE',
  },
  {
    code: 'HEAD_QA',
    name: 'Head of QA',
    hierarchyLevel: 3,
    departmentCode: 'PPM_QA',
  },

  // Coordinators
  {
    code: 'COORD_TK',
    name: 'Koordinator TK',
    hierarchyLevel: 4,
    departmentCode: 'TK_TEACHING',
  },
  {
    code: 'COORD_SD',
    name: 'Koordinator SD',
    hierarchyLevel: 4,
    departmentCode: 'SD_TEACHING',
  },
  {
    code: 'COORD_SMP',
    name: 'Koordinator SMP',
    hierarchyLevel: 4,
    departmentCode: 'SMP_TEACHING',
  },
  {
    code: 'COORD_SMA',
    name: 'Koordinator SMA',
    hierarchyLevel: 4,
    departmentCode: 'SMA_TEACHING',
  },

  // Staff positions
  { code: 'TEACHER', name: 'Guru', hierarchyLevel: 5, departmentCode: null },
  {
    code: 'ADMIN_STAFF',
    name: 'Staff Administrasi',
    hierarchyLevel: 5,
    departmentCode: null,
  },
  {
    code: 'IT_STAFF',
    name: 'IT Staff',
    hierarchyLevel: 5,
    departmentCode: 'PPM_IT',
  },
  {
    code: 'HRD_STAFF',
    name: 'HRD Staff',
    hierarchyLevel: 5,
    departmentCode: 'PPM_HRD',
  },
  {
    code: 'GA_STAFF',
    name: 'GA Staff',
    hierarchyLevel: 5,
    departmentCode: 'PPM_GA',
  },
  {
    code: 'FINANCE_STAFF',
    name: 'Finance Staff',
    hierarchyLevel: 5,
    departmentCode: 'PPM_FINANCE',
  },
  {
    code: 'QA_STAFF',
    name: 'QA Staff',
    hierarchyLevel: 5,
    departmentCode: 'PPM_QA',
  },
  {
    code: 'LAB_STAFF',
    name: 'Lab Assistant',
    hierarchyLevel: 5,
    departmentCode: null,
  },
  {
    code: 'COUNSELOR',
    name: 'Konselor',
    hierarchyLevel: 5,
    departmentCode: null,
  },
  {
    code: 'SUPPORT_STAFF',
    name: 'Support Staff',
    hierarchyLevel: 6,
    departmentCode: null,
  },
];

// Function to determine position based on bidang_kerja
function determinePosition(bidangKerja: string, bagianKerja: string): string {
  const bidangKerjaLower = bidangKerja?.toLowerCase() || '';
  const bagianKerjaLower = bagianKerja?.toLowerCase() || '';
  
  // Executive positions
  if (bidangKerjaLower.includes('ceo') || bidangKerjaLower.includes('chief executive')) {
    return 'CEO';
  }
  if (bidangKerjaLower.includes('director')) {
    return 'DIR_OPS';
  }
  
  // Principal positions
  if (bidangKerjaLower.includes('kepala sekolah')) {
    // Determine school level from bagian_kerja
    if (bagianKerjaLower.includes('pgtk') || bagianKerjaLower.includes('tk')) return 'PRINCIPAL_TK';
    if (bagianKerjaLower.includes('sd')) return 'PRINCIPAL_SD';
    if (bagianKerjaLower.includes('smp')) return 'PRINCIPAL_SMP';
    if (bagianKerjaLower.includes('sma')) return 'PRINCIPAL_SMA';
    return 'PRINCIPAL_SD'; // Default principal
  }
  
  // Vice Principal / Wakil Kepala Sekolah
  if (bidangKerjaLower.includes('wakil kepala sekolah')) {
    // Determine school level from bagian_kerja
    if (bagianKerjaLower.includes('pgtk') || bagianKerjaLower.includes('tk')) return 'COORD_TK';
    if (bagianKerjaLower.includes('sd')) return 'COORD_SD';
    if (bagianKerjaLower.includes('smp')) return 'COORD_SMP';
    if (bagianKerjaLower.includes('sma')) return 'COORD_SMA';
    return 'COORD_SD'; // Default coordinator
  }
  
  // Department head positions
  if (bidangKerjaLower.includes('kepala bidang')) {
    if (bidangKerjaLower.includes('ga')) return 'HEAD_GA';
    if (bidangKerjaLower.includes('pembelian')) return 'HEAD_GA';
    if (bidangKerjaLower.includes('logistik')) return 'HEAD_GA';
  }
  if (bidangKerjaLower.includes('head of')) {
    if (bidangKerjaLower.includes('hrd')) return 'HEAD_HRD';
    if (bidangKerjaLower.includes('it')) return 'HEAD_IT';
    if (bidangKerjaLower.includes('ga')) return 'HEAD_GA';
    if (bidangKerjaLower.includes('finance') || bidangKerjaLower.includes('keuangan')) return 'HEAD_FINANCE';
    if (bidangKerjaLower.includes('qa')) return 'HEAD_QA';
  }
  
  // Coordinator positions
  if (bidangKerjaLower.includes('koordinator')) {
    if (bagianKerjaLower.includes('pgtk') || bagianKerjaLower.includes('tk')) return 'COORD_TK';
    if (bagianKerjaLower.includes('sd')) return 'COORD_SD';
    if (bagianKerjaLower.includes('smp')) return 'COORD_SMP';
    if (bagianKerjaLower.includes('sma')) return 'COORD_SMA';
    return 'COORD_SD'; // Default coordinator
  }
  
  // Specific bidang_kerja mappings
  if (bidangKerjaLower.includes('guru')) return 'TEACHER';
  if (bidangKerjaLower.includes('bimbingan') || bidangKerjaLower.includes('konseling')) return 'COUNSELOR';
  if (bidangKerjaLower.includes('perpustakaan')) return 'ADMIN_STAFF';
  if (bidangKerjaLower.includes('tata usaha')) return 'ADMIN_STAFF';
  if (bidangKerjaLower.includes('kurikulum')) return 'COORD_SD'; // Default coordinator for curriculum
  if (bidangKerjaLower.includes('pengembangan sdm')) return 'HRD_STAFF';
  if (bidangKerjaLower.includes('it')) return 'IT_STAFF';
  if (bidangKerjaLower.includes('hr')) return 'HRD_STAFF';
  if (bidangKerjaLower.includes('ga')) return 'GA_STAFF';
  if (bidangKerjaLower.includes('pembelian')) return 'GA_STAFF';
  if (bidangKerjaLower.includes('logistik')) return 'GA_STAFF';
  if (bidangKerjaLower.includes('akunting') || bidangKerjaLower.includes('keuangan')) return 'FINANCE_STAFF';
  if (bidangKerjaLower.includes('internal audit')) return 'QA_STAFF';
  if (bidangKerjaLower.includes('laboran')) return 'LAB_STAFF';
  if (bidangKerjaLower.includes('teknisi')) return 'SUPPORT_STAFF';
  if (bidangKerjaLower.includes('security') || bidangKerjaLower.includes('satpam')) return 'SUPPORT_STAFF';
  if (bidangKerjaLower.includes('kebersihan')) return 'SUPPORT_STAFF';
  if (bidangKerjaLower.includes('kantin')) return 'SUPPORT_STAFF';
  if (bidangKerjaLower.includes('sopir')) return 'SUPPORT_STAFF';
  if (bidangKerjaLower.includes('suster')) return 'SUPPORT_STAFF';
  if (bidangKerjaLower.includes('uks')) return 'SUPPORT_STAFF';
  if (bidangKerjaLower.includes('unit usaha')) return 'STAFF';
  if (bidangKerjaLower.includes('umum')) return 'SUPPORT_STAFF';
  if (bidangKerjaLower.includes('operasional')) return 'STAFF';
  if (bidangKerjaLower.includes('sekretaris')) return 'ADMIN_STAFF';
  if (bidangKerjaLower.includes('pr dan psb')) return 'ADMIN_STAFF';
  if (bidangKerjaLower.includes('misi diakonia')) return 'STAFF';
  if (bidangKerjaLower.includes('gembala sekolah')) return 'STAFF';
  if (bidangKerjaLower.includes('ppm')) return 'STAFF';
  if (bidangKerjaLower.includes('advisor')) return 'STAFF';
  
  // Check bagian_kerja if bidang_kerja didn't match
  if (bagianKerjaLower === 'it') return 'IT_STAFF';
  if (bagianKerjaLower === 'hrd' || bagianKerjaLower === 'hr') return 'HRD_STAFF';
  if (bagianKerjaLower === 'ga') return 'GA_STAFF';
  if (bagianKerjaLower === 'keuangan' || bagianKerjaLower === 'finance') return 'FINANCE_STAFF';
  if (bagianKerjaLower === 'qa') return 'QA_STAFF';
  if (bagianKerjaLower === 'laboratorium') return 'LAB_STAFF';
  if (bagianKerjaLower === 'bk') return 'COUNSELOR';
  if (bagianKerjaLower === 'administrasi') return 'ADMIN_STAFF';
  if (bagianKerjaLower === 'umum') return 'SUPPORT_STAFF';
  if (bagianKerjaLower === 'yayasan') return 'STAFF';
  if (bagianKerjaLower === 'satpam') return 'SUPPORT_STAFF';
  
  // Default
  return 'STAFF';
}

// System modules
const modules = [
  // Service Modules
  {
    code: 'WORKORDER_IT',
    name: 'Work Order IT',
    category: ModuleCategory.SERVICE,
    description: 'IT service request and ticketing system',
    icon: 'computer',
    path: '/workorder/it',
    sortOrder: 10,
  },
  {
    code: 'WORKORDER_GA',
    name: 'Work Order GA',
    category: ModuleCategory.SERVICE,
    description: 'General Affairs service request system',
    icon: 'wrench',
    path: '/workorder/ga',
    sortOrder: 11,
  },

  // Performance Modules
  {
    code: 'KPI',
    name: 'Key Performance Indicators',
    category: ModuleCategory.PERFORMANCE,
    description: 'Employee KPI management and evaluation',
    icon: 'chart-line',
    path: '/kpi',
    sortOrder: 20,
  },
  {
    code: 'PEER_EVALUATION',
    name: 'Peer Evaluation',
    category: ModuleCategory.PERFORMANCE,
    description: 'Peer-to-peer performance evaluation',
    icon: 'users',
    path: '/evaluation/peer',
    sortOrder: 21,
  },
  {
    code: 'ACTIVITY_EVALUATION',
    name: 'Evaluasi Kegiatan',
    category: ModuleCategory.PERFORMANCE,
    description: 'Activity and event evaluation',
    icon: 'calendar-check',
    path: '/evaluation/activity',
    sortOrder: 22,
  },

  // Quality Modules
  {
    code: 'ICS',
    name: 'Internal Control System',
    category: ModuleCategory.QUALITY,
    description: 'Internal control and compliance management',
    icon: 'shield',
    path: '/ics',
    sortOrder: 30,
  },
  {
    code: 'QUALITY_TARGET',
    name: 'Sasaran Mutu',
    category: ModuleCategory.QUALITY,
    description: 'Quality target setting and monitoring',
    icon: 'target',
    path: '/quality/target',
    sortOrder: 31,
  },
  {
    code: 'MEASUREMENT_TOOLS',
    name: 'Alat Ukur',
    category: ModuleCategory.QUALITY,
    description: 'Quality measurement tools and metrics',
    icon: 'ruler',
    path: '/quality/measurement',
    sortOrder: 32,
  },

  // Feedback Modules
  {
    code: 'STAFF_SURVEY',
    name: 'Angket Staff',
    category: ModuleCategory.FEEDBACK,
    description: 'Staff satisfaction survey and feedback',
    icon: 'clipboard-list',
    path: '/survey/staff',
    sortOrder: 40,
  },

  // Training Modules
  {
    code: 'TRAINING_MANAGEMENT',
    name: 'Training Management',
    category: ModuleCategory.TRAINING,
    description: 'Employee training and development',
    icon: 'graduation-cap',
    path: '/training',
    sortOrder: 50,
  },

  // System Modules
  {
    code: 'ORGANIZATION',
    name: 'Organization Management',
    category: ModuleCategory.SYSTEM,
    description: 'Manage schools, departments, and positions',
    icon: 'building',
    path: '/organization',
    sortOrder: 60,
  },
  {
    code: 'USER_MANAGEMENT',
    name: 'User Management',
    category: ModuleCategory.SYSTEM,
    description: 'User account and profile management',
    icon: 'users-cog',
    path: '/users',
    sortOrder: 61,
  },
  {
    code: 'PERMISSION_MANAGEMENT',
    name: 'Permission Management',
    category: ModuleCategory.SYSTEM,
    description: 'Roles and permissions configuration',
    icon: 'key',
    path: '/permissions',
    sortOrder: 62,
  },
  {
    code: 'AUDIT_LOG',
    name: 'Audit Log',
    category: ModuleCategory.SYSTEM,
    description: 'System audit trail and activity logs',
    icon: 'history',
    path: '/audit',
    sortOrder: 63,
  },
  {
    code: 'NOTIFICATION',
    name: 'Notification Center',
    category: ModuleCategory.SYSTEM,
    description: 'Notification management and preferences',
    icon: 'bell',
    path: '/notifications',
    sortOrder: 64,
  },
  {
    code: 'SYSTEM_CONFIG',
    name: 'System Configuration',
    category: ModuleCategory.SYSTEM,
    description: 'System settings and configuration',
    icon: 'cog',
    path: '/system/config',
    sortOrder: 65,
  },
];

// Permission templates based on roles and positions
const permissionTemplates = [
  {
    code: 'TEMPLATE_SUPERADMIN',
    name: 'Superadmin Template',
    description: 'Full system access for superadministrators',
    category: 'system',
    permissions: [{ permission: 'all.all.all', scope: 'ALL' }],
    moduleAccess: modules.map((m) => ({
      module: m.code,
      actions: [
        'CREATE',
        'READ',
        'UPDATE',
        'DELETE',
        'APPROVE',
        'EXPORT',
        'IMPORT',
      ],
    })),
  },
  {
    code: 'TEMPLATE_PRINCIPAL',
    name: 'Principal Template',
    description: 'School principal access template',
    category: 'position',
    permissions: [
      { permission: 'workorder.approve.school', scope: 'SCHOOL' },
      { permission: 'kpi.approve.school', scope: 'SCHOOL' },
      { permission: 'evaluation.approve.school', scope: 'SCHOOL' },
      { permission: 'user.read.school', scope: 'SCHOOL' },
      { permission: 'report.read.school', scope: 'SCHOOL' },
      { permission: 'report.export.school', scope: 'SCHOOL' },
    ],
    moduleAccess: [
      {
        module: 'WORKORDER_IT',
        actions: ['CREATE', 'READ', 'UPDATE', 'APPROVE'],
      },
      {
        module: 'WORKORDER_GA',
        actions: ['CREATE', 'READ', 'UPDATE', 'APPROVE'],
      },
      { module: 'KPI', actions: ['READ', 'APPROVE', 'EXPORT'] },
      { module: 'PEER_EVALUATION', actions: ['READ', 'APPROVE'] },
      { module: 'STAFF_SURVEY', actions: ['READ', 'EXPORT'] },
      { module: 'ORGANIZATION', actions: ['READ'] },
      { module: 'AUDIT_LOG', actions: ['READ'] },
    ],
  },
  {
    code: 'TEMPLATE_DEPT_HEAD',
    name: 'Department Head Template',
    description: 'Department head access template',
    category: 'position',
    permissions: [
      { permission: 'workorder.approve.department', scope: 'DEPARTMENT' },
      { permission: 'kpi.approve.department', scope: 'DEPARTMENT' },
      { permission: 'user.read.department', scope: 'DEPARTMENT' },
      { permission: 'report.read.department', scope: 'DEPARTMENT' },
    ],
    moduleAccess: [
      { module: 'WORKORDER_IT', actions: ['CREATE', 'READ', 'UPDATE'] },
      { module: 'WORKORDER_GA', actions: ['CREATE', 'READ', 'UPDATE'] },
      { module: 'KPI', actions: ['CREATE', 'READ', 'UPDATE', 'APPROVE'] },
      { module: 'PEER_EVALUATION', actions: ['READ', 'APPROVE'] },
      { module: 'TRAINING_MANAGEMENT', actions: ['READ', 'APPROVE'] },
    ],
  },
  {
    code: 'TEMPLATE_IT_STAFF',
    name: 'IT Staff Template',
    description: 'IT department staff access',
    category: 'department',
    permissions: [
      { permission: 'workorder.update.all', scope: 'ALL' },
      { permission: 'workorder.close.all', scope: 'ALL' },
      { permission: 'user.read.all', scope: 'ALL' },
      { permission: 'system.read.all', scope: 'ALL' },
    ],
    moduleAccess: [
      {
        module: 'WORKORDER_IT',
        actions: ['CREATE', 'READ', 'UPDATE', 'CLOSE'],
      },
      { module: 'USER_MANAGEMENT', actions: ['READ', 'UPDATE'] },
      { module: 'SYSTEM_CONFIG', actions: ['READ'] },
      { module: 'AUDIT_LOG', actions: ['READ'] },
    ],
  },
  {
    code: 'TEMPLATE_HRD_STAFF',
    name: 'HRD Staff Template',
    description: 'Human Resources staff access',
    category: 'department',
    permissions: [
      { permission: 'user.all.all', scope: 'ALL' },
      { permission: 'kpi.read.all', scope: 'ALL' },
      { permission: 'training.all.all', scope: 'ALL' },
      { permission: 'evaluation.read.all', scope: 'ALL' },
    ],
    moduleAccess: [
      {
        module: 'USER_MANAGEMENT',
        actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
      },
      { module: 'KPI', actions: ['CREATE', 'READ', 'UPDATE'] },
      { module: 'PEER_EVALUATION', actions: ['READ'] },
      {
        module: 'TRAINING_MANAGEMENT',
        actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'],
      },
      { module: 'ORGANIZATION', actions: ['CREATE', 'READ', 'UPDATE'] },
    ],
  },
  {
    code: 'TEMPLATE_TEACHER',
    name: 'Teacher Template',
    description: 'Teacher/instructor access',
    category: 'position',
    permissions: [
      { permission: 'workorder.create.own', scope: 'OWN' },
      { permission: 'kpi.read.own', scope: 'OWN' },
      { permission: 'evaluation.create.own', scope: 'OWN' },
      { permission: 'training.read.own', scope: 'OWN' },
    ],
    moduleAccess: [
      { module: 'WORKORDER_IT', actions: ['CREATE', 'READ'] },
      { module: 'WORKORDER_GA', actions: ['CREATE', 'READ'] },
      { module: 'KPI', actions: ['READ'] },
      { module: 'PEER_EVALUATION', actions: ['CREATE', 'READ'] },
      { module: 'TRAINING_MANAGEMENT', actions: ['READ'] },
      { module: 'STAFF_SURVEY', actions: ['CREATE', 'READ'] },
    ],
  },
  {
    code: 'TEMPLATE_STAFF',
    name: 'General Staff Template',
    description: 'Regular staff access',
    category: 'default',
    permissions: [
      { permission: 'workorder.create.own', scope: 'OWN' },
      { permission: 'workorder.read.own', scope: 'OWN' },
      { permission: 'kpi.read.own', scope: 'OWN' },
      { permission: 'survey.create.own', scope: 'OWN' },
    ],
    moduleAccess: [
      { module: 'WORKORDER_IT', actions: ['CREATE', 'READ'] },
      { module: 'WORKORDER_GA', actions: ['CREATE', 'READ'] },
      { module: 'KPI', actions: ['READ'] },
      { module: 'STAFF_SURVEY', actions: ['CREATE', 'READ'] },
      { module: 'NOTIFICATION', actions: ['READ', 'UPDATE'] },
    ],
  },
];

// Main seeding function
async function main() {
  console.log('🌱 Starting comprehensive seed...');

  try {
    // 1. Create Schools
    console.log('\n📚 Creating schools...');
    const schoolMap = new Map();

    for (const schoolData of schools) {
      const school = await prisma.school.upsert({
        where: { code: schoolData.code },
        update: {},
        create: {
          id: uuidv7(),
          code: schoolData.code,
          name: schoolData.name,
          lokasi: schoolData.lokasi,
          address: `Jl. ${schoolData.name} No. 1`,
          phone: `021-${Math.floor(1000000 + Math.random() * 9000000)}`,
          email: `admin@${schoolData.code.toLowerCase()}.gloria.sch.id`,
          isActive: true,
        },
      });
      schoolMap.set(schoolData.code, school);
      console.log(`   ✅ Created/Updated school: ${school.name}`);
    }

    // 2. Create Departments
    console.log('\n🏢 Creating departments...');
    const departmentMap = new Map();

    for (const deptData of departments) {
      const school = schoolMap.get(deptData.schoolCode);
      if (!school) continue;

      const department = await prisma.department.upsert({
        where: { code: deptData.code },
        update: {},
        create: {
          id: uuidv7(),
          code: deptData.code,
          name: deptData.name,
          bagianKerja: deptData.bagianKerja,
          schoolId: school.id,
          isActive: true,
        },
      });
      departmentMap.set(deptData.code, department);
      console.log(`   ✅ Created/Updated department: ${department.name}`);
    }

    // 3. Create Positions
    console.log('\n💼 Creating positions...');
    const positionMap = new Map();

    for (const posData of positions) {
      const department = posData.departmentCode
        ? departmentMap.get(posData.departmentCode)
        : null;
      const schoolId = department ? department.schoolId : null;

      const position = await prisma.position.upsert({
        where: { code: posData.code },
        update: {},
        create: {
          id: uuidv7(),
          code: posData.code,
          name: posData.name,
          departmentId: department?.id || null,
          schoolId: schoolId,
          hierarchyLevel: posData.hierarchyLevel,
          maxHolders: 1,
          isUnique: posData.hierarchyLevel <= 4,
          isActive: true,
        },
      });
      positionMap.set(posData.code, position);
      console.log(`   ✅ Created/Updated position: ${position.name}`);
    }

    // 4. Create Modules
    console.log('\n📦 Creating modules...');
    const moduleMap = new Map();

    for (const modData of modules) {
      const module = await prisma.module.upsert({
        where: { code: modData.code },
        update: {},
        create: {
          id: modData.code,
          code: modData.code,
          name: modData.name,
          category: modData.category,
          description: modData.description,
          icon: modData.icon,
          path: modData.path,
          sortOrder: modData.sortOrder,
          isActive: true,
          isVisible: true,
        },
      });
      moduleMap.set(modData.code, module);
      console.log(`   ✅ Created/Updated module: ${module.name}`);
    }

    // 5. Create Permission Groups
    console.log('\n🔐 Creating permission groups...');
    const permissionGroups = [
      {
        code: 'SERVICE_GROUP',
        name: 'Service Management',
        category: ModuleCategory.SERVICE,
      },
      {
        code: 'PERFORMANCE_GROUP',
        name: 'Performance Management',
        category: ModuleCategory.PERFORMANCE,
      },
      {
        code: 'QUALITY_GROUP',
        name: 'Quality Management',
        category: ModuleCategory.QUALITY,
      },
      {
        code: 'FEEDBACK_GROUP',
        name: 'Feedback Management',
        category: ModuleCategory.FEEDBACK,
      },
      {
        code: 'TRAINING_GROUP',
        name: 'Training Management',
        category: ModuleCategory.TRAINING,
      },
      {
        code: 'SYSTEM_GROUP',
        name: 'System Management',
        category: ModuleCategory.SYSTEM,
      },
    ];

    for (const groupData of permissionGroups) {
      await prisma.permissionGroup.upsert({
        where: { code: groupData.code },
        update: {},
        create: {
          id: uuidv7(),
          code: groupData.code,
          name: groupData.name,
          category: groupData.category,
          sortOrder: 0,
          isActive: true,
        },
      });
      console.log(`   ✅ Created/Updated permission group: ${groupData.name}`);
    }

    // 6. Create Permissions
    console.log('\n🔑 Creating permissions...');
    const resources = [
      'workorder',
      'kpi',
      'evaluation',
      'ics',
      'quality',
      'survey',
      'training',
      'user',
      'role',
      'permission',
      'report',
      'system',
    ];
    const actions = Object.values(PermissionAction);
    const scopes = Object.values(PermissionScope);

    for (const resource of resources) {
      for (const action of actions) {
        // Skip certain combinations that don't make sense
        if (
          (resource === 'report' &&
            !['READ', 'EXPORT', 'PRINT'].includes(action)) ||
          (resource === 'system' && !['READ', 'UPDATE'].includes(action))
        ) {
          continue;
        }

        for (const scope of scopes) {
          const code = `${resource}.${action.toLowerCase()}.${scope.toLowerCase()}`;

          try {
            await prisma.permission.upsert({
              where: { code: code },
              update: {},
              create: {
                id: uuidv7(),
                code: code,
                name: `${action} ${resource.toUpperCase()} - ${scope}`,
                resource: resource,
                action: action,
                scope: scope,
                isSystemPermission: true,
                isActive: true,
              },
            });
          } catch (error) {
            // Skip duplicate errors
          }
        }
      }
    }
    console.log('   ✅ Created permissions');

    // 7. Create Roles
    console.log('\n🎭 Creating roles...');
    const defaultRoles = [
      {
        code: 'SUPERADMIN',
        name: 'Super Administrator',
        hierarchyLevel: 1,
        isSystemRole: true,
      },
      {
        code: 'ADMIN',
        name: 'Administrator',
        hierarchyLevel: 2,
        isSystemRole: true,
      },
      {
        code: 'PRINCIPAL',
        name: 'Principal',
        hierarchyLevel: 3,
        isSystemRole: false,
      },
      {
        code: 'DEPT_HEAD',
        name: 'Department Head',
        hierarchyLevel: 3,
        isSystemRole: false,
      },
      {
        code: 'COORDINATOR',
        name: 'Coordinator',
        hierarchyLevel: 4,
        isSystemRole: false,
      },
      {
        code: 'TEACHER',
        name: 'Teacher',
        hierarchyLevel: 5,
        isSystemRole: false,
      },
      { code: 'STAFF', name: 'Staff', hierarchyLevel: 5, isSystemRole: false },
      {
        code: 'VIEWER',
        name: 'Viewer',
        hierarchyLevel: 6,
        isSystemRole: false,
      },
    ];

    const roleMap = new Map();
    for (const roleData of defaultRoles) {
      const role = await prisma.role.upsert({
        where: { code: roleData.code },
        update: {},
        create: {
          id: uuidv7(),
          code: roleData.code,
          name: roleData.name,
          hierarchyLevel: roleData.hierarchyLevel,
          isSystemRole: roleData.isSystemRole,
          isActive: true,
        },
      });
      roleMap.set(roleData.code, role);
      console.log(`   ✅ Created/Updated role: ${role.name}`);
    }

    // 8. Create Permission Templates
    console.log('\n📋 Creating permission templates...');
    for (const templateData of permissionTemplates) {
      await prisma.permissionTemplate.upsert({
        where: { code: templateData.code },
        update: {},
        create: {
          id: uuidv7(),
          code: templateData.code,
          name: templateData.name,
          description: templateData.description,
          category: templateData.category,
          permissions: templateData.permissions,
          moduleAccess: templateData.moduleAccess,
          isSystem: true,
          isActive: true,
        },
      });
      console.log(`   ✅ Created/Updated template: ${templateData.name}`);
    }

    // 9. Create User Profiles from existing data_karyawan
    console.log('\n👥 Creating user profiles from existing data_karyawan...');
    
    // Query active employees from data_karyawan
    const employees = await prisma.dataKaryawan.findMany({
      where: {
        statusAktif: 'Aktif',
      },
    });
    
    console.log(`   Found ${employees.length} active employees in data_karyawan`);

    for (const empData of employees) {
      try {
        // Generate clerk user ID from employee name
        const clerkUserId = `clerk_${empData.nama?.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || empData.nip}`;
        
        // Determine position based on bidang_kerja
        const position = determinePosition(empData.bidangKerja || '', empData.bagianKerja || '');

        // Create user profile
        const userProfile = await prisma.userProfile.upsert({
          where: { nip: empData.nip },
          update: {},
          create: {
            id: uuidv7(),
            clerkUserId: clerkUserId,
            nip: empData.nip,
            isSuperadmin: position === 'CEO',
            isActive: true,
            lastActive: new Date(),
          },
        });

        console.log(`   ✅ Created/Updated user profile: ${empData.nama}`);

        // Assign position
        const positionObj = positionMap.get(position);
        if (positionObj) {
          // Check if user already has this position
          const existingPosition = await prisma.userPosition.findFirst({
            where: {
              userProfileId: userProfile.id,
              positionId: positionObj.id,
              isActive: true,
            },
          });

          if (!existingPosition) {
            await prisma.userPosition.create({
              data: {
                id: uuidv7(),
                userProfileId: userProfile.id,
                positionId: positionObj.id,
                startDate: empData.tglMulaiBekerja || new Date(),
                isActive: true,
                isPlt: false,
              },
            });
          }
        }

        // Assign role based on position
        let roleCode = 'STAFF';
        if (position === 'CEO') roleCode = 'SUPERADMIN';
        else if (position.includes('PRINCIPAL')) roleCode = 'PRINCIPAL';
        else if (position.includes('HEAD')) roleCode = 'DEPT_HEAD';
        else if (position.includes('COORD')) roleCode = 'COORDINATOR';
        else if (position === 'TEACHER') roleCode = 'TEACHER';

        const role = roleMap.get(roleCode);
        if (role) {
          // Check if user already has this role
          const existingRole = await prisma.userRole.findFirst({
            where: {
              userProfileId: userProfile.id,
              roleId: role.id,
              isActive: true,
            },
          });

          if (!existingRole) {
            await prisma.userRole.create({
              data: {
                id: uuidv7(),
                userProfileId: userProfile.id,
                roleId: role.id,
                assignedAt: new Date(),
                isActive: true,
              },
            });
          }
        }

        // Apply permission template based on position/department
        let templateCode = 'TEMPLATE_STAFF';
        if (position === 'CEO') templateCode = 'TEMPLATE_SUPERADMIN';
        else if (position.includes('PRINCIPAL'))
          templateCode = 'TEMPLATE_PRINCIPAL';
        else if (position.includes('HEAD'))
          templateCode = 'TEMPLATE_DEPT_HEAD';
        else if (empData.bagianKerja === 'IT')
          templateCode = 'TEMPLATE_IT_STAFF';
        else if (empData.bagianKerja === 'HRD')
          templateCode = 'TEMPLATE_HRD_STAFF';
        else if (position === 'TEACHER')
          templateCode = 'TEMPLATE_TEACHER';

        const template = await prisma.permissionTemplate.findUnique({
          where: { code: templateCode },
        });

        if (template) {
          // Apply module access from template
          for (const moduleAccess of template.moduleAccess as any[]) {
            const module = moduleMap.get(moduleAccess.module);
            if (module) {
              // Check if access already exists
              const existingAccess = await prisma.userModuleAccess.findFirst({
                where: {
                  userProfileId: userProfile.id,
                  moduleId: module.id,
                },
              });

              if (!existingAccess) {
                await prisma.userModuleAccess.create({
                  data: {
                    id: uuidv7(),
                    userProfileId: userProfile.id,
                    moduleId: module.id,
                    permissions: moduleAccess.actions,
                    grantedBy: 'SYSTEM',
                    reason: `Applied from template: ${template.name}`,
                    isActive: true,
                  },
                });
              }
            }
          }

          // Check if template already applied
          const existingApplication = await prisma.permissionTemplateApplication.findFirst({
            where: {
              templateId: template.id,
              targetType: 'user',
              targetId: userProfile.id,
              isActive: true,
            },
          });

          if (!existingApplication) {
            // Record template application
            await prisma.permissionTemplateApplication.create({
              data: {
                id: uuidv7(),
                templateId: template.id,
                targetType: 'user',
                targetId: userProfile.id,
                appliedBy: 'SYSTEM',
                isActive: true,
                notes: 'Applied during initial seed',
              },
            });
          }
        }
      } catch (error) {
        console.error(`   ❌ Error creating user ${empData.nama}:`, error);
      }
    }

    // 10. Create sample approval matrix
    console.log('\n📊 Creating approval matrix...');
    const approvalMatrix = [
      // Work Order approvals
      {
        module: 'WORKORDER_IT',
        requesterRole: 'STAFF',
        approvalSequence: 1,
        approverType: 'DEPARTMENT',
        approverValue: 'PPM_IT',
      },
      {
        module: 'WORKORDER_GA',
        requesterRole: 'STAFF',
        approvalSequence: 1,
        approverType: 'DEPARTMENT',
        approverValue: 'PPM_GA',
      },

      // KPI approvals
      {
        module: 'KPI',
        requesterRole: 'STAFF',
        approvalSequence: 1,
        approverType: 'POSITION',
        approverValue: 'COORDINATOR',
      },
      {
        module: 'KPI',
        requesterRole: 'STAFF',
        approvalSequence: 2,
        approverType: 'POSITION',
        approverValue: 'DEPT_HEAD',
      },
      {
        module: 'KPI',
        requesterRole: 'TEACHER',
        approvalSequence: 1,
        approverType: 'POSITION',
        approverValue: 'PRINCIPAL',
      },

      // Training approvals
      {
        module: 'TRAINING',
        requesterRole: 'STAFF',
        approvalSequence: 1,
        approverType: 'DEPARTMENT',
        approverValue: 'PPM_HRD',
      },
    ];

    for (const matrixData of approvalMatrix) {
      try {
        await prisma.approvalMatrix.create({
          data: {
            id: uuidv7(),
            module: matrixData.module,
            requesterRole: matrixData.requesterRole,
            approvalSequence: matrixData.approvalSequence,
            approverType: matrixData.approverType as any,
            approverValue: matrixData.approverValue,
            isActive: true,
          },
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          // Duplicate key, skip
          console.log(`   ⏭️  Skipped duplicate approval matrix: ${matrixData.module}-${matrixData.requesterRole}-${matrixData.approvalSequence}`);
        } else {
          throw error;
        }
      }
    }
    console.log('   ✅ Created approval matrix');

    // 11. Create sample notification preferences
    console.log('\n🔔 Creating notification preferences...');
    const userProfiles = await prisma.userProfile.findMany();
    for (const userProfile of userProfiles) {
      await prisma.notificationPreference.create({
        data: {
          id: uuidv7(),
          userProfileId: userProfile.id,
          enabled: true,
          timezone: 'Asia/Jakarta',
          defaultChannels: ['IN_APP', 'EMAIL'],
          maxDailyNotifications: 50,
          maxHourlyNotifications: 10,
        },
      });
    }
    console.log('   ✅ Created notification preferences');

    // 12. Create feature flags
    console.log('\n🚩 Creating feature flags...');
    const featureFlags = [
      {
        name: 'NEW_APPROVAL_FLOW',
        description: 'Enable new approval workflow',
        enabled: true,
      },
      {
        name: 'MOBILE_APP_ACCESS',
        description: 'Enable mobile app access',
        enabled: false,
      },
      {
        name: 'BULK_OPERATIONS',
        description: 'Enable bulk operations',
        enabled: true,
      },
      {
        name: 'ADVANCED_REPORTING',
        description: 'Enable advanced reporting features',
        enabled: true,
      },
    ];

    for (const flagData of featureFlags) {
      try {
        await prisma.featureFlag.create({
          data: {
            id: uuidv7(),
            name: flagData.name,
            description: flagData.description,
            enabled: flagData.enabled,
            rolloutPercentage: 100,
          },
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`   ⏭️  Skipped duplicate feature flag: ${flagData.name}`);
        } else {
          throw error;
        }
      }
    }
    console.log('   ✅ Created feature flags');

    // 13. Create system configuration
    console.log('\n⚙️ Creating system configuration...');
    const systemConfigs = [
      {
        key: 'SYSTEM_NAME',
        value: 'Gloria Management System',
        category: 'GENERAL',
      },
      { key: 'DEFAULT_TIMEZONE', value: 'Asia/Jakarta', category: 'GENERAL' },
      { key: 'SESSION_TIMEOUT', value: '3600', category: 'SECURITY' },
      { key: 'MAX_LOGIN_ATTEMPTS', value: '5', category: 'SECURITY' },
      { key: 'PASSWORD_MIN_LENGTH', value: '8', category: 'SECURITY' },
      { key: 'ENABLE_2FA', value: 'false', category: 'SECURITY' },
      { key: 'EMAIL_FROM', value: 'noreply@gloria.sch.id', category: 'EMAIL' },
      { key: 'EMAIL_SMTP_HOST', value: 'smtp.gmail.com', category: 'EMAIL' },
      { key: 'EMAIL_SMTP_PORT', value: '587', category: 'EMAIL' },
      { key: 'MAINTENANCE_MODE', value: 'false', category: 'SYSTEM' },
    ];

    for (const configData of systemConfigs) {
      try {
        await prisma.systemConfig.create({
          data: {
            id: uuidv7(),
            key: configData.key,
            value: configData.value,
            category: configData.category,
            description: `${configData.key} configuration`,
            isEncrypted: configData.category === 'SECURITY',
          },
        });
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`   ⏭️  Skipped duplicate config: ${configData.key}`);
        } else {
          throw error;
        }
      }
    }
    console.log('   ✅ Created system configuration');

    console.log('\n✅ Comprehensive seed completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   - Schools: ${schools.length}`);
    console.log(`   - Departments: ${departments.length}`);
    console.log(`   - Positions: ${positions.length}`);
    console.log(`   - Modules: ${modules.length}`);
    console.log(`   - User Profiles Created: ${employees.length}`);
    console.log(`   - Permission Templates: ${permissionTemplates.length}`);
    console.log('\n🎉 System is ready for use!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
