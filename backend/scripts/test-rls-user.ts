#!/usr/bin/env ts-node

/**
 * RLS User Test Script
 * 
 * Test RLS with specific user context
 * Run: npm run rls:test-user -- --user=<user-id>
 */

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

const log = {
  info: (msg: string) => console.log(`${colors.cyan}ℹ${colors.reset}  ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset}  ${msg}`),
  section: (msg: string) => console.log(`\n${colors.bright}${colors.blue}═══ ${msg} ═══${colors.reset}\n`),
  data: (label: string, value: any) => console.log(`  ${colors.dim}${label}:${colors.reset} ${value}`)
};

// Parse command line arguments
function parseArgs(): { userId?: string; clerkUserId?: string; email?: string } {
  const args = process.argv.slice(2);
  const result: any = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--user=')) {
      result.userId = arg.split('=')[1];
    } else if (arg.startsWith('--clerk=')) {
      result.clerkUserId = arg.split('=')[1];
    } else if (arg.startsWith('--email=')) {
      result.email = arg.split('=')[1];
    }
  });
  
  return result;
}

/**
 * Find user by various identifiers
 */
async function findUser(identifier?: { userId?: string; clerkUserId?: string; email?: string }) {
  if (identifier?.userId) {
    return prisma.userProfile.findUnique({ where: { id: identifier.userId } });
  }
  if (identifier?.clerkUserId) {
    return prisma.userProfile.findUnique({ where: { clerkUserId: identifier.clerkUserId } });
  }
  if (identifier?.email) {
    // Find through data_karyawan
    const karyawan = await prisma.dataKaryawan.findFirst({ where: { email: identifier.email } });
    if (karyawan) {
      return prisma.userProfile.findUnique({ where: { nip: karyawan.nip } });
    }
  }
  
  // Get first active user as default
  return prisma.userProfile.findFirst({ where: { isActive: true } });
}

/**
 * Build user context for RLS
 */
async function buildUserContext(userProfileId: string) {
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
      },
      roles: {
        where: { isActive: true },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!userProfile) {
    throw new Error('User profile not found');
  }

  // Extract unique IDs
  const schoolIds = [...new Set(userProfile.positions
    .map(p => p.position.schoolId)
    .filter(Boolean))] as string[];
  
  const departmentIds = [...new Set(userProfile.positions
    .map(p => p.position.departmentId)
    .filter(Boolean))] as string[];
  
  const positionIds = userProfile.positions.map(p => p.positionId);

  // Build permission scopes
  const permissionScopes: Record<string, string> = {};
  userProfile.roles.forEach(userRole => {
    userRole.role.rolePermissions.forEach(rp => {
      if (rp.permission) {
        const key = `${rp.permission.resource}:${rp.permission.action}`;
        const scope = rp.permission.scope || 'OWN';
        
        // Use most permissive scope if multiple exist
        if (!permissionScopes[key] || getScopeWeight(scope) > getScopeWeight(permissionScopes[key])) {
          permissionScopes[key] = scope;
        }
      }
    });
  });

  return {
    userProfile,
    context: {
      userProfileId: userProfile.id,
      clerkUserId: userProfile.clerkUserId,
      isSuperadmin: userProfile.isSuperadmin,
      positionIds,
      schoolIds,
      departmentIds,
      permissionScopes
    }
  };
}

function getScopeWeight(scope: string): number {
  const weights: Record<string, number> = {
    'ALL': 4,
    'SCHOOL': 3,
    'DEPARTMENT': 2,
    'OWN': 1
  };
  return weights[scope] || 0;
}

/**
 * Test data access with RLS context
 */
async function testDataAccess(context: any) {
  const results: Record<string, any> = {};

  // Test each table
  const tables = [
    { name: 'schools', query: 'SELECT id, name, lokasi FROM gloria_ops.schools' },
    { name: 'departments', query: 'SELECT id, name, bagian_kerja FROM gloria_ops.departments' },
    { name: 'positions', query: 'SELECT id, name, hierarchy_level FROM gloria_ops.positions' },
    { name: 'user_positions', query: 'SELECT id, user_profile_id, position_id FROM gloria_ops.user_positions' },
    { name: 'user_profiles', query: 'SELECT id, nip, is_superadmin FROM gloria_ops.user_profiles' },
    { name: 'requests', query: 'SELECT id, request_number, status FROM gloria_ops.requests' },
    { name: 'notifications', query: 'SELECT id, type, is_read FROM gloria_ops.notifications' }
  ];

  for (const table of tables) {
    try {
      await prisma.$transaction(async (tx) => {
        // Set RLS context
        await tx.$executeRawUnsafe(
          `SET LOCAL app.user_context = $1`,
          JSON.stringify(context)
        );

        // Execute query
        const data = await tx.$queryRawUnsafe(`${table.query} LIMIT 10`);
        results[table.name] = {
          accessible: true,
          count: Array.isArray(data) ? data.length : 0,
          sample: Array.isArray(data) ? data.slice(0, 3) : []
        };

        // Rollback to avoid any side effects
        throw new Error('Rollback');
      });
    } catch (error: any) {
      if (error.message === 'Rollback') {
        // Success - data was retrieved
      } else {
        results[table.name] = {
          accessible: false,
          error: error.message
        };
      }
    }
  }

  return results;
}

/**
 * Display user information
 */
function displayUserInfo(userProfile: any, context: any) {
  log.section('User Information');
  
  log.data('Profile ID', userProfile.id);
  log.data('Clerk ID', userProfile.clerkUserId);
  log.data('NIP', userProfile.nip);
  log.data('Superadmin', userProfile.isSuperadmin ? `${colors.green}Yes${colors.reset}` : `${colors.red}No${colors.reset}`);
  log.data('Active', userProfile.isActive ? `${colors.green}Yes${colors.reset}` : `${colors.red}No${colors.reset}`);
  
  if (userProfile.positions.length > 0) {
    console.log(`\n  ${colors.bright}Positions:${colors.reset}`);
    userProfile.positions.forEach((up: any) => {
      console.log(`    • ${up.position.name} (${up.position.department?.name || 'No Dept'}, ${up.position.school?.name || 'No School'})`);
    });
  }
  
  if (userProfile.roles.length > 0) {
    console.log(`\n  ${colors.bright}Roles:${colors.reset}`);
    userProfile.roles.forEach((ur: any) => {
      console.log(`    • ${ur.role.name} (${ur.role.rolePermissions.length} permissions)`);
    });
  }

  console.log(`\n  ${colors.bright}Access Scope:${colors.reset}`);
  log.data('Schools', context.schoolIds.length > 0 ? context.schoolIds.join(', ') : 'None');
  log.data('Departments', context.departmentIds.length > 0 ? context.departmentIds.join(', ') : 'None');
  
  if (Object.keys(context.permissionScopes).length > 0) {
    console.log(`\n  ${colors.bright}Permission Scopes:${colors.reset}`);
    Object.entries(context.permissionScopes).slice(0, 5).forEach(([key, value]) => {
      console.log(`    • ${key}: ${colors.magenta}${value}${colors.reset}`);
    });
    if (Object.keys(context.permissionScopes).length > 5) {
      console.log(`    ... and ${Object.keys(context.permissionScopes).length - 5} more`);
    }
  }
}

/**
 * Display access test results
 */
function displayAccessResults(results: Record<string, any>) {
  log.section('Data Access Test Results');
  
  const tables = Object.keys(results);
  const accessible = tables.filter(t => results[t].accessible);
  const restricted = tables.filter(t => !results[t].accessible);
  
  console.log(`  ${colors.bright}Summary:${colors.reset}`);
  console.log(`    ${colors.green}✓ Accessible:${colors.reset} ${accessible.length}/${tables.length} tables`);
  console.log(`    ${colors.red}✗ Restricted:${colors.reset} ${restricted.length}/${tables.length} tables\n`);
  
  tables.forEach(table => {
    const result = results[table];
    const icon = result.accessible ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    const status = result.accessible 
      ? `${colors.green}${result.count} records accessible${colors.reset}`
      : `${colors.red}Access denied${colors.reset}`;
    
    console.log(`  ${icon} ${colors.bright}${table}:${colors.reset} ${status}`);
    
    if (result.accessible && result.sample.length > 0) {
      console.log(`     Sample: ${colors.dim}${JSON.stringify(result.sample[0]).substring(0, 80)}...${colors.reset}`);
    }
  });
}

/**
 * Interactive test mode
 */
async function interactiveMode(context: any) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query: string): Promise<string> => {
    return new Promise(resolve => rl.question(query, resolve));
  };

  console.log(`\n${colors.cyan}Interactive SQL Test Mode${colors.reset}`);
  console.log(`Type SQL queries to test with user context. Type 'exit' to quit.\n`);

  while (true) {
    const query = await question(`${colors.cyan}SQL>${colors.reset} `);
    
    if (query.toLowerCase() === 'exit') {
      break;
    }
    
    if (!query.trim()) {
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Set RLS context
        await tx.$executeRawUnsafe(
          `SET LOCAL app.user_context = $1`,
          JSON.stringify(context)
        );

        // Execute user query
        const result = await tx.$queryRawUnsafe(query);
        
        if (Array.isArray(result)) {
          console.log(`${colors.green}Results: ${result.length} rows${colors.reset}`);
          result.slice(0, 5).forEach((row, i) => {
            console.log(`  [${i}] ${JSON.stringify(row)}`);
          });
          if (result.length > 5) {
            console.log(`  ... and ${result.length - 5} more rows`);
          }
        } else {
          console.log(`${colors.green}Query executed successfully${colors.reset}`);
        }
        
        // Rollback
        throw new Error('Rollback');
      });
    } catch (error: any) {
      if (error.message !== 'Rollback') {
        console.log(`${colors.red}Error: ${error.message}${colors.reset}`);
      }
    }
  }

  rl.close();
}

/**
 * Main function
 */
async function main() {
  console.log(`
${colors.bright}${colors.blue}═══════════════════════════════════════════════════════════
     RLS User Access Testing
═══════════════════════════════════════════════════════════${colors.reset}
`);

  try {
    // Parse arguments
    const args = parseArgs();
    
    // Find user
    log.info('Finding user...');
    const user = await findUser(args);
    
    if (!user) {
      log.error('No user found. Please specify --user=<id>, --clerk=<id>, or --email=<email>');
      process.exit(1);
    }
    
    log.success(`Found user: ${user.nip}`);
    
    // Build context
    log.info('Building user context...');
    const { userProfile, context } = await buildUserContext(user.id);
    
    // Display user info
    displayUserInfo(userProfile, context);
    
    // Test data access
    log.info('Testing data access with RLS...');
    const results = await testDataAccess(context);
    
    // Display results
    displayAccessResults(results);
    
    // Ask for interactive mode
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise<string>(resolve => {
      rl.question(`\n${colors.cyan}Would you like to test custom SQL queries? (y/n):${colors.reset} `, resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() === 'y') {
      await interactiveMode(context);
    }
    
    log.section('Test Complete');
    log.success('RLS user test completed successfully!');
    
  } catch (error: any) {
    log.error(`Test failed: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
main();