#!/usr/bin/env ts-node

/**
 * RLS Control Script
 * 
 * Enable/disable RLS on tables
 * Run: npm run rls:enable -- [table]
 *      npm run rls:disable -- [table]
 *      npm run rls:status
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

const TABLES = [
  'schools',
  'departments',
  'positions',
  'user_positions',
  'user_profiles',
  'requests',
  'approval_steps',
  'notifications',
  'audit_logs',
  'roles',
  'user_roles',
  'permissions',
  'role_permissions',
  'user_permissions'
];

/**
 * Enable RLS on a table or all tables
 */
async function enableRLS(tableName?: string) {
  const tables = tableName ? [tableName] : TABLES;
  
  log.section(`Enabling RLS${tableName ? ` on ${tableName}` : ' on all tables'}`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE gloria_ops.${table} ENABLE ROW LEVEL SECURITY`
      );
      log.success(`Enabled RLS on ${table}`);
      successCount++;
    } catch (error: any) {
      if (error.message.includes('row-level security is already enabled')) {
        log.info(`RLS already enabled on ${table}`);
        successCount++;
      } else if (error.message.includes('does not exist')) {
        log.warning(`Table ${table} does not exist`);
      } else {
        log.error(`Failed to enable RLS on ${table}: ${error.message}`);
        errorCount++;
      }
    }
  }
  
  console.log(`\n${colors.bright}Summary:${colors.reset}`);
  console.log(`  ${colors.green}✓ Success:${colors.reset} ${successCount}/${tables.length}`);
  console.log(`  ${colors.red}✗ Failed:${colors.reset} ${errorCount}/${tables.length}`);
}

/**
 * Disable RLS on a table or all tables
 */
async function disableRLS(tableName?: string) {
  const tables = tableName ? [tableName] : TABLES;
  
  log.section(`Disabling RLS${tableName ? ` on ${tableName}` : ' on all tables'}`);
  
  log.warning('⚠️  WARNING: Disabling RLS removes database-level security!');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE gloria_ops.${table} DISABLE ROW LEVEL SECURITY`
      );
      log.success(`Disabled RLS on ${table}`);
      successCount++;
    } catch (error: any) {
      if (error.message.includes('row-level security is not enabled')) {
        log.info(`RLS already disabled on ${table}`);
        successCount++;
      } else if (error.message.includes('does not exist')) {
        log.warning(`Table ${table} does not exist`);
      } else {
        log.error(`Failed to disable RLS on ${table}: ${error.message}`);
        errorCount++;
      }
    }
  }
  
  console.log(`\n${colors.bright}Summary:${colors.reset}`);
  console.log(`  ${colors.green}✓ Success:${colors.reset} ${successCount}/${tables.length}`);
  console.log(`  ${colors.red}✗ Failed:${colors.reset} ${errorCount}/${tables.length}`);
}

/**
 * Check RLS status on all tables
 */
async function checkStatus() {
  log.section('RLS Status Check');
  
  const results: { table: string; rlsEnabled: boolean; policies: number }[] = [];
  
  for (const table of TABLES) {
    try {
      // Check if RLS is enabled
      const rlsResult = await prisma.$queryRaw<any[]>`
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = ${table}
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'gloria_ops')
      `;
      
      if (rlsResult.length === 0) {
        continue; // Table doesn't exist
      }
      
      const rlsEnabled = rlsResult[0]?.relrowsecurity || false;
      
      // Count policies
      const policyResult = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count
        FROM pg_policy
        WHERE polrelid = (
          SELECT oid FROM pg_class 
          WHERE relname = ${table}
          AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'gloria_ops')
        )
      `;
      
      const policies = parseInt(policyResult[0]?.count || '0');
      
      results.push({ table, rlsEnabled, policies });
    } catch (error) {
      // Skip tables that don't exist or have errors
    }
  }
  
  // Display results
  console.log(`\n${colors.bright}Table${' '.repeat(25)}RLS Status    Policies${colors.reset}`);
  console.log('─'.repeat(60));
  
  let enabledCount = 0;
  let totalPolicies = 0;
  
  results.forEach(({ table, rlsEnabled, policies }) => {
    const status = rlsEnabled 
      ? `${colors.green}Enabled${colors.reset} ` 
      : `${colors.red}Disabled${colors.reset}`;
    
    const policyColor = policies > 0 ? colors.green : colors.yellow;
    
    console.log(
      `${table.padEnd(30)} ${status.padEnd(20)} ${policyColor}${policies}${colors.reset}`
    );
    
    if (rlsEnabled) enabledCount++;
    totalPolicies += policies;
  });
  
  console.log('─'.repeat(60));
  console.log(`\n${colors.bright}Summary:${colors.reset}`);
  console.log(`  Tables with RLS: ${enabledCount}/${results.length}`);
  console.log(`  Total policies: ${totalPolicies}`);
  
  if (enabledCount === 0) {
    log.warning('\n⚠️  RLS is not enabled on any tables!');
    console.log(`To enable: ${colors.cyan}npm run rls:enable${colors.reset}`);
  } else if (enabledCount < results.length) {
    log.warning('\n⚠️  RLS is only partially enabled');
    console.log(`To enable all: ${colors.cyan}npm run rls:enable${colors.reset}`);
  } else {
    log.success('\n✨ RLS is fully enabled on all tables!');
  }
}

/**
 * Main function
 */
async function main() {
  const command = process.argv[2];
  const tableName = process.argv[3];
  
  console.log(`
${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════
     PostgreSQL Row Level Security Control
═══════════════════════════════════════════════════════════${colors.reset}
`);

  try {
    switch (command) {
      case 'enable':
        await enableRLS(tableName);
        break;
      
      case 'disable':
        await disableRLS(tableName);
        break;
      
      case 'status':
        await checkStatus();
        break;
      
      default:
        log.error('Invalid command');
        console.log(`
Usage:
  npm run rls:enable [table]    Enable RLS on table(s)
  npm run rls:disable [table]   Disable RLS on table(s)
  npm run rls:status            Check RLS status

Examples:
  npm run rls:enable            Enable RLS on all tables
  npm run rls:enable schools    Enable RLS on schools table
  npm run rls:disable           Disable RLS on all tables
  npm run rls:status            Show current RLS status
        `);
        process.exit(1);
    }
  } catch (error: any) {
    log.error(`Operation failed: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();