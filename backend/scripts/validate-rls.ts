#!/usr/bin/env ts-node

/**
 * RLS Validation Script
 * 
 * Validates PostgreSQL Row Level Security setup
 * Run: npm run rls:validate
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

const log = {
  info: (msg: string) => console.log(`${colors.cyan}ℹ${colors.reset}  ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset}  ${msg}`),
  section: (msg: string) => console.log(`\n${colors.bright}${colors.blue}═══ ${msg} ═══${colors.reset}\n`)
};

interface ValidationResult {
  category: string;
  item: string;
  status: 'pass' | 'fail' | 'warning';
  message?: string;
}

const validationResults: ValidationResult[] = [];

/**
 * Add validation result
 */
function addResult(category: string, item: string, status: 'pass' | 'fail' | 'warning', message?: string) {
  validationResults.push({ category, item, status, message });
  
  const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '⚠';
  const color = status === 'pass' ? colors.green : status === 'fail' ? colors.red : colors.yellow;
  
  console.log(`  ${color}${icon}${colors.reset} ${item}${message ? ` - ${message}` : ''}`);
}

/**
 * Validate RLS functions
 */
async function validateFunctions() {
  log.section('Validating RLS Functions');
  
  const requiredFunctions = [
    { name: 'current_user_context', description: 'Get user context from session' },
    { name: 'is_superadmin', description: 'Check superadmin status' },
    { name: 'user_school_ids', description: 'Get user school IDs' },
    { name: 'user_department_ids', description: 'Get user department IDs' },
    { name: 'current_user_profile_id', description: 'Get current user profile ID' },
    { name: 'get_permission_scope', description: 'Get permission scope for module/action' }
  ];

  for (const func of requiredFunctions) {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT 
          proname,
          prorettype::regtype as return_type,
          pronargs as arg_count
        FROM pg_proc 
        WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'gloria_ops')
        AND proname = ${func.name}
      `;
      
      if (result.length > 0) {
        addResult('Functions', func.description, 'pass');
      } else {
        addResult('Functions', func.description, 'fail', `Function gloria_ops.${func.name} not found`);
      }
    } catch (error) {
      addResult('Functions', func.description, 'fail', 'Error checking function');
    }
  }
}

/**
 * Validate RLS enabled on tables
 */
async function validateTablesRLS() {
  log.section('Validating RLS on Tables');
  
  const requiredTables = [
    'schools',
    'departments',
    'positions',
    'user_positions',
    'user_profiles',
    'requests',
    'approval_steps',
    'notifications'
  ];

  for (const table of requiredTables) {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT 
          relname,
          relrowsecurity,
          relforcerowsecurity
        FROM pg_class 
        WHERE relname = ${table}
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'gloria_ops')
      `;
      
      if (result.length > 0) {
        if (result[0].relrowsecurity) {
          addResult('Table RLS', table, 'pass');
        } else {
          addResult('Table RLS', table, 'fail', 'RLS not enabled');
        }
      } else {
        addResult('Table RLS', table, 'fail', 'Table not found');
      }
    } catch (error) {
      addResult('Table RLS', table, 'fail', 'Error checking table');
    }
  }
}

/**
 * Validate RLS policies
 */
async function validatePolicies() {
  log.section('Validating RLS Policies');
  
  const expectedPolicies = [
    { table: 'schools', policies: ['school_select_policy', 'school_insert_policy', 'school_update_policy', 'school_delete_policy'] },
    { table: 'departments', policies: ['department_select_policy', 'department_insert_policy', 'department_update_policy', 'department_delete_policy'] },
    { table: 'positions', policies: ['position_select_policy', 'position_insert_policy', 'position_update_policy', 'position_delete_policy'] },
    { table: 'user_positions', policies: ['user_position_select_policy', 'user_position_insert_policy', 'user_position_update_policy'] },
    { table: 'user_profiles', policies: ['user_profile_select_policy', 'user_profile_update_policy'] },
    { table: 'requests', policies: ['request_select_policy', 'request_insert_policy', 'request_update_policy'] },
    { table: 'notifications', policies: ['notification_select_policy', 'notification_update_policy'] }
  ];

  for (const { table, policies } of expectedPolicies) {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT 
          polname as policy_name,
          CASE polcmd
            WHEN 'r' THEN 'SELECT'
            WHEN 'a' THEN 'INSERT'
            WHEN 'w' THEN 'UPDATE'
            WHEN 'd' THEN 'DELETE'
            WHEN '*' THEN 'ALL'
          END as command
        FROM pg_policy
        WHERE polrelid = (
          SELECT oid FROM pg_class 
          WHERE relname = ${table}
          AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'gloria_ops')
        )
      `;
      
      const foundPolicies = result.map(r => r.policy_name);
      const missingPolicies = policies.filter(p => !foundPolicies.includes(p));
      
      if (missingPolicies.length === 0) {
        addResult('Policies', `${table} (${policies.length} policies)`, 'pass');
      } else if (foundPolicies.length > 0) {
        addResult('Policies', `${table} (${foundPolicies.length}/${policies.length} policies)`, 'warning', 
          `Missing: ${missingPolicies.join(', ')}`);
      } else {
        addResult('Policies', table, 'fail', 'No policies found');
      }
    } catch (error) {
      addResult('Policies', table, 'fail', 'Error checking policies');
    }
  }
}

/**
 * Validate indexes for RLS performance
 */
async function validateIndexes() {
  log.section('Validating Performance Indexes');
  
  const requiredIndexes = [
    { table: 'user_positions', index: 'idx_user_positions_user_profile_active' },
    { table: 'positions', index: 'idx_positions_school_dept' },
    { table: 'departments', index: 'idx_departments_school' },
    { table: 'requests', index: 'idx_requests_requester' },
    { table: 'approval_steps', index: 'idx_approval_steps_approver' }
  ];

  for (const { table, index } of requiredIndexes) {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'gloria_ops'
        AND tablename = ${table}
        AND indexname = ${index}
      `;
      
      if (result.length > 0) {
        addResult('Indexes', `${table}.${index}`, 'pass');
      } else {
        addResult('Indexes', `${table}.${index}`, 'warning', 'Index not found (optional)');
      }
    } catch (error) {
      addResult('Indexes', `${table}.${index}`, 'warning', 'Error checking index');
    }
  }
}

/**
 * Validate role and permissions
 */
async function validatePermissions() {
  log.section('Validating Database Permissions');
  
  try {
    // Check if gloria_app role exists
    const roleResult = await prisma.$queryRaw<any[]>`
      SELECT rolname 
      FROM pg_roles 
      WHERE rolname = 'gloria_app'
    `;
    
    if (roleResult.length > 0) {
      addResult('Permissions', 'gloria_app role exists', 'pass');
    } else {
      addResult('Permissions', 'gloria_app role', 'warning', 'Role not found (optional)');
    }

    // Check schema permissions
    const schemaResult = await prisma.$queryRaw<any[]>`
      SELECT has_schema_privilege('gloria_ops', 'USAGE') as has_usage
    `;
    
    if (schemaResult[0]?.has_usage) {
      addResult('Permissions', 'Schema usage permission', 'pass');
    } else {
      addResult('Permissions', 'Schema usage permission', 'warning', 'No usage permission');
    }
  } catch (error) {
    addResult('Permissions', 'Database permissions', 'warning', 'Could not check permissions');
  }
}

/**
 * Test RLS with sample data
 */
async function testRLSFunctionality() {
  log.section('Testing RLS Functionality');
  
  try {
    // Test setting context (without actual user)
    const testContext = {
      userProfileId: 'test-id',
      isSuperadmin: false,
      schoolIds: ['school-1'],
      departmentIds: ['dept-1'],
      permissionScopes: {}
    };

    await prisma.$transaction(async (tx) => {
      // Try to set context
      await tx.$executeRawUnsafe(
        `SET LOCAL app.user_context = $1`,
        JSON.stringify(testContext)
      );
      
      // Test getting context back
      const result = await tx.$queryRaw<any[]>`
        SELECT gloria_ops.current_user_context() as context
      `;
      
      if (result[0]?.context) {
        addResult('Functionality', 'Context setting and retrieval', 'pass');
      } else {
        addResult('Functionality', 'Context setting and retrieval', 'fail');
      }
      
      // Rollback transaction
      throw new Error('Rollback test');
    }).catch(error => {
      if (error.message !== 'Rollback test') {
        throw error;
      }
    });

    // Test superadmin check
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SET LOCAL app.user_context = $1`,
        JSON.stringify({ ...testContext, isSuperadmin: true })
      );
      
      const result = await tx.$queryRaw<any[]>`
        SELECT gloria_ops.is_superadmin() as is_admin
      `;
      
      if (result[0]?.is_admin === true) {
        addResult('Functionality', 'Superadmin check function', 'pass');
      } else {
        addResult('Functionality', 'Superadmin check function', 'fail');
      }
      
      throw new Error('Rollback test');
    }).catch(error => {
      if (error.message !== 'Rollback test') {
        throw error;
      }
    });

  } catch (error: any) {
    addResult('Functionality', 'RLS functionality test', 'fail', error.message);
  }
}

/**
 * Generate summary report
 */
function generateSummary() {
  log.section('Validation Summary');
  
  const passed = validationResults.filter(r => r.status === 'pass').length;
  const failed = validationResults.filter(r => r.status === 'fail').length;
  const warnings = validationResults.filter(r => r.status === 'warning').length;
  const total = validationResults.length;
  
  console.log(`
  ${colors.bright}Results:${colors.reset}
    ${colors.green}✓ Passed:${colors.reset}  ${passed}/${total}
    ${colors.red}✗ Failed:${colors.reset}  ${failed}/${total}
    ${colors.yellow}⚠ Warnings:${colors.reset} ${warnings}/${total}
  `);

  // Group failures by category
  const failures = validationResults.filter(r => r.status === 'fail');
  if (failures.length > 0) {
    console.log(`  ${colors.bright}${colors.red}Failed Items:${colors.reset}`);
    const categories = [...new Set(failures.map(f => f.category))];
    categories.forEach(cat => {
      console.log(`    ${colors.bright}${cat}:${colors.reset}`);
      failures.filter(f => f.category === cat).forEach(f => {
        console.log(`      - ${f.item}${f.message ? `: ${f.message}` : ''}`);
      });
    });
  }

  // Overall status
  if (failed === 0) {
    console.log(`
  ${colors.bright}${colors.green}✨ RLS validation PASSED!${colors.reset}
  Your Row Level Security setup is properly configured.
    `);
    return true;
  } else {
    console.log(`
  ${colors.bright}${colors.red}❌ RLS validation FAILED${colors.reset}
  Please fix the issues above and run validation again.
  
  To fix: ${colors.cyan}npm run rls:setup${colors.reset}
    `);
    return false;
  }
}

/**
 * Main validation function
 */
async function main() {
  console.log(`
${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════
     PostgreSQL Row Level Security Validation
═══════════════════════════════════════════════════════════${colors.reset}
`);

  try {
    // Run all validations
    await validateFunctions();
    await validateTablesRLS();
    await validatePolicies();
    await validateIndexes();
    await validatePermissions();
    await testRLSFunctionality();
    
    // Generate summary
    const isValid = generateSummary();
    
    // Exit with appropriate code
    process.exit(isValid ? 0 : 1);
  } catch (error: any) {
    log.error(`Validation failed: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run validation
main();