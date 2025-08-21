#!/usr/bin/env ts-node

/**
 * RLS Setup Script
 * 
 * Automated setup for PostgreSQL Row Level Security
 * Run: npx ts-node scripts/setup-rls.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
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

// Utility functions
const log = {
  info: (msg: string) => console.log(`${colors.cyan}ℹ${colors.reset}  ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset}  ${msg}`),
  section: (msg: string) => console.log(`\n${colors.bright}${colors.blue}═══ ${msg} ═══${colors.reset}\n`)
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve));
};

/**
 * Check database connection
 */
async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if RLS migration file exists
 */
function checkMigrationFile(): boolean {
  const migrationPath = path.join(
    __dirname,
    '..',
    'prisma',
    'migrations',
    'manual',
    '001_enable_rls_policies.sql'
  );
  return fs.existsSync(migrationPath);
}

/**
 * Apply RLS migration
 */
async function applyRLSMigration(): Promise<void> {
  const migrationPath = path.join(
    __dirname,
    '..',
    'prisma',
    'migrations',
    'manual',
    '001_enable_rls_policies.sql'
  );

  log.info('Reading migration file...');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  log.info('Applying RLS migration...');
  
  try {
    // Split migration into statements (simple split by semicolon)
    const statements = migrationSQL
      .split(/;\s*$/m)
      .filter(stmt => stmt.trim().length > 0);

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        // Skip comments
        if (statement.trim().startsWith('--')) continue;
        
        await prisma.$executeRawUnsafe(statement);
        successCount++;
      } catch (error: any) {
        // Check if it's a "already exists" error
        if (error.message.includes('already exists')) {
          log.warning(`Object already exists, skipping...`);
        } else {
          errorCount++;
          log.error(`Failed to execute statement: ${error.message}`);
        }
      }
    }

    log.success(`Migration applied: ${successCount} statements successful, ${errorCount} errors`);
  } catch (error: any) {
    throw new Error(`Migration failed: ${error.message}`);
  }
}

/**
 * Validate RLS setup
 */
async function validateRLSSetup(): Promise<{
  isValid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  log.info('Validating RLS functions...');
  
  // Check required functions
  const requiredFunctions = [
    'current_user_context',
    'is_superadmin',
    'user_school_ids',
    'user_department_ids',
    'current_user_profile_id',
    'get_permission_scope'
  ];

  for (const func of requiredFunctions) {
    try {
      const result = await prisma.$queryRaw`
        SELECT proname 
        FROM pg_proc 
        WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'gloria_ops')
        AND proname = ${func}
      `;
      
      if (!Array.isArray(result) || result.length === 0) {
        issues.push(`Missing function: gloria_ops.${func}`);
      }
    } catch (error) {
      issues.push(`Error checking function ${func}`);
    }
  }

  log.info('Validating RLS on tables...');
  
  // Check RLS enabled on tables
  const requiredTables = [
    'schools',
    'departments',
    'positions',
    'user_positions',
    'user_profiles',
    'requests',
    'notifications'
  ];

  for (const table of requiredTables) {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = ${table}
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'gloria_ops')
      `;
      
      if (!result[0]?.relrowsecurity) {
        issues.push(`RLS not enabled on table: ${table}`);
      }
    } catch (error) {
      issues.push(`Error checking table ${table}`);
    }
  }

  log.info('Validating RLS policies...');
  
  // Check if policies exist
  for (const table of requiredTables) {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count
        FROM pg_policy
        WHERE polrelid = (
          SELECT oid FROM pg_class 
          WHERE relname = ${table}
          AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'gloria_ops')
        )
      `;
      
      if (!result[0]?.count || parseInt(result[0].count) === 0) {
        issues.push(`No policies found for table: ${table}`);
      }
    } catch (error) {
      issues.push(`Error checking policies for ${table}`);
    }
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Test RLS with sample user
 */
async function testRLSWithUser(userProfileId?: string): Promise<void> {
  if (!userProfileId) {
    // Get a sample user
    const users = await prisma.userProfile.findMany({ take: 1 });
    if (users.length === 0) {
      log.warning('No users found in database for testing');
      return;
    }
    userProfileId = users[0].id;
  }

  log.info(`Testing RLS with user: ${userProfileId}`);

  // Get user context
  const userProfile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    include: {
      positions: {
        where: { isActive: true },
        include: {
          position: {
            include: {
              school: true,
              department: true
            }
          }
        }
      }
    }
  });

  if (!userProfile) {
    log.error('User not found');
    return;
  }

  // Build context
  const schoolIds = [...new Set(userProfile.positions
    .map(p => p.position.schoolId)
    .filter(Boolean))];
  
  const departmentIds = [...new Set(userProfile.positions
    .map(p => p.position.departmentId)
    .filter(Boolean))];

  const context = {
    userProfileId: userProfile.id,
    isSuperadmin: userProfile.isSuperadmin,
    schoolIds,
    departmentIds,
    permissionScopes: {}
  };

  log.info('User context:');
  console.log(`  - Profile ID: ${context.userProfileId}`);
  console.log(`  - Superadmin: ${context.isSuperadmin}`);
  console.log(`  - Schools: ${context.schoolIds.join(', ') || 'none'}`);
  console.log(`  - Departments: ${context.departmentIds.join(', ') || 'none'}`);

  // Test queries with context
  log.info('Testing queries with RLS context...');

  try {
    // Set context and test query
    await prisma.$transaction(async (tx) => {
      // Set session context
      await tx.$executeRawUnsafe(
        `SET LOCAL app.user_context = $1`,
        JSON.stringify(context)
      );

      // Test school access
      const schools = await tx.$queryRaw`
        SELECT id, name FROM gloria_ops.schools LIMIT 5
      `;
      log.success(`User can see ${Array.isArray(schools) ? schools.length : 0} schools`);

      // Test department access
      const departments = await tx.$queryRaw`
        SELECT id, name FROM gloria_ops.departments LIMIT 5
      `;
      log.success(`User can see ${Array.isArray(departments) ? departments.length : 0} departments`);

      // Don't commit transaction (rollback)
      throw new Error('Rollback test transaction');
    }).catch(error => {
      if (error.message !== 'Rollback test transaction') {
        throw error;
      }
    });

    log.success('RLS test completed successfully');
  } catch (error: any) {
    log.error(`RLS test failed: ${error.message}`);
  }
}

/**
 * Main setup function
 */
async function main() {
  console.log(`
${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════
     PostgreSQL Row Level Security (RLS) Setup
═══════════════════════════════════════════════════════════${colors.reset}
`);

  log.section('Pre-flight Checks');

  // Check database connection
  log.info('Checking database connection...');
  const isConnected = await checkDatabaseConnection();
  if (!isConnected) {
    log.error('Cannot connect to database. Please check your DATABASE_URL');
    process.exit(1);
  }
  log.success('Database connection successful');

  // Check migration file
  log.info('Checking migration file...');
  const hasMigration = checkMigrationFile();
  if (!hasMigration) {
    log.error('RLS migration file not found');
    process.exit(1);
  }
  log.success('Migration file found');

  log.section('Setup Options');

  const mode = await question(`
Select setup mode:
  1) Full setup (apply migration + validate)
  2) Apply migration only
  3) Validate existing setup
  4) Test RLS with user
  5) Exit

Your choice (1-5): `);

  switch (mode.trim()) {
    case '1':
      // Full setup
      log.section('Applying RLS Migration');
      await applyRLSMigration();
      
      log.section('Validating Setup');
      const validation = await validateRLSSetup();
      if (validation.isValid) {
        log.success('RLS setup is valid!');
      } else {
        log.warning('RLS setup has issues:');
        validation.issues.forEach(issue => log.error(`  - ${issue}`));
      }
      
      const testChoice = await question('\nWould you like to test RLS with a user? (y/n): ');
      if (testChoice.toLowerCase() === 'y') {
        await testRLSWithUser();
      }
      break;

    case '2':
      // Apply migration only
      log.section('Applying RLS Migration');
      await applyRLSMigration();
      break;

    case '3':
      // Validate only
      log.section('Validating Setup');
      const validationOnly = await validateRLSSetup();
      if (validationOnly.isValid) {
        log.success('RLS setup is valid!');
      } else {
        log.warning('RLS setup has issues:');
        validationOnly.issues.forEach(issue => log.error(`  - ${issue}`));
      }
      break;

    case '4':
      // Test with user
      log.section('Testing RLS');
      const userId = await question('Enter user profile ID (or press Enter for random user): ');
      await testRLSWithUser(userId || undefined);
      break;

    case '5':
      log.info('Exiting...');
      break;

    default:
      log.error('Invalid choice');
  }

  log.section('Summary');
  
  // Final validation
  const finalValidation = await validateRLSSetup();
  if (finalValidation.isValid) {
    log.success('✨ RLS is properly configured and ready to use!');
    console.log(`
Next steps:
  1. Run tests: ${colors.cyan}npm run test:rls${colors.reset}
  2. Test with specific user: ${colors.cyan}npm run rls:test-user${colors.reset}
  3. Monitor in development: ${colors.cyan}NODE_ENV=development npm run start:dev${colors.reset}
`);
  } else {
    log.warning('⚠️  RLS setup needs attention');
    console.log(`
Issues found:
${finalValidation.issues.map(i => `  - ${i}`).join('\n')}

To fix, run: ${colors.cyan}npm run rls:setup${colors.reset}
`);
  }

  // Cleanup
  rl.close();
  await prisma.$disconnect();
}

// Run the script
main().catch(error => {
  log.error(`Setup failed: ${error.message}`);
  process.exit(1);
});