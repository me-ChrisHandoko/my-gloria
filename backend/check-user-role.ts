/**
 * Script to check user role for a specific email
 * Run: npx tsx check-user-role.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserRole() {
  const targetEmail = 'christian_handoko@gloriaschool.org';
  
  console.log('=== User Role Check ===');
  console.log(`Checking role for email: "${targetEmail}"`);
  console.log('');

  try {
    // Step 1: Find the employee in data_karyawan
    console.log('Step 1: Searching for employee in data_karyawan...');
    const employee = await prisma.dataKaryawan.findFirst({
      where: {
        email: {
          equals: targetEmail,
          mode: 'insensitive',
        },
      },
      select: {
        nip: true,
        nama: true,
        email: true,
        jenisKaryawan: true,
        bagianKerja: true,
        lokasi: true,
        statusAktif: true,
      },
    });

    if (!employee) {
      console.log('❌ Employee not found with this email in data_karyawan table');
      console.log('');
      
      // Try to find similar emails
      console.log('Searching for similar emails...');
      const similarEmails = await prisma.dataKaryawan.findMany({
        where: {
          OR: [
            { email: { contains: 'christian', mode: 'insensitive' } },
            { email: { contains: 'handoko', mode: 'insensitive' } },
          ],
        },
        select: {
          nama: true,
          email: true,
        },
        take: 5,
      });
      
      if (similarEmails.length > 0) {
        console.log('Found similar emails:');
        similarEmails.forEach(emp => {
          console.log(`  - ${emp.nama}: "${emp.email}"`);
        });
      }
      
      return;
    }

    console.log('✅ Employee found:');
    console.log(`  - NIP: ${employee.nip}`);
    console.log(`  - Name: ${employee.nama}`);
    console.log(`  - Email: ${employee.email}`);
    console.log(`  - Type: ${employee.jenisKaryawan}`);
    console.log(`  - Department: ${employee.bagianKerja}`);
    console.log(`  - Location: ${employee.lokasi}`);
    console.log(`  - Status: ${employee.statusAktif}`);
    console.log('');

    // Step 2: Check if employee has a UserProfile
    console.log('Step 2: Checking UserProfile...');
    const userProfile = await prisma.userProfile.findUnique({
      where: { nip: employee.nip },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        positions: {
          include: {
            position: {
              include: {
                department: true,
                school: true,
              },
            },
          },
          where: {
            isActive: true,
          },
        },
        moduleAccess: {
          include: {
            module: true,
          },
          where: {
            isActive: true,
          },
        },
      },
    });

    if (!userProfile) {
      console.log('❌ No UserProfile found for this employee');
      console.log('   (User has not signed in via Clerk Auth yet)');
      return;
    }

    console.log('✅ UserProfile found:');
    console.log(`  - Profile ID: ${userProfile.id}`);
    console.log(`  - Clerk User ID: ${userProfile.clerkUserId}`);
    console.log(`  - Is Superadmin: ${userProfile.isSuperadmin ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Is Active: ${userProfile.isActive ? 'Yes' : 'No'}`);
    console.log(`  - Last Active: ${userProfile.lastActive || 'Never'}`);
    console.log('');

    // Step 3: Display Roles
    console.log('Step 3: User Roles:');
    if (userProfile.roles.length > 0) {
      userProfile.roles.forEach(userRole => {
        console.log(`  - ${userRole.role.name} (${userRole.role.code})`);
        console.log(`    Level: ${userRole.role.hierarchyLevel}`);
        console.log(`    System Role: ${userRole.role.isSystemRole ? 'Yes' : 'No'}`);
        console.log(`    Assigned: ${userRole.assignedAt}`);
        if (!userRole.isActive) {
          console.log(`    Status: INACTIVE`);
        }
      });
    } else {
      console.log('  No roles assigned');
    }
    console.log('');

    // Step 4: Display Positions
    console.log('Step 4: User Positions:');
    if (userProfile.positions.length > 0) {
      userProfile.positions.forEach(userPos => {
        console.log(`  - ${userPos.position.name} (${userPos.position.code})`);
        if (userPos.position.school) {
          console.log(`    School: ${userPos.position.school.name}`);
        }
        if (userPos.position.department) {
          console.log(`    Department: ${userPos.position.department.name}`);
        }
        console.log(`    Hierarchy Level: ${userPos.position.hierarchyLevel}`);
        console.log(`    Start Date: ${userPos.startDate}`);
        console.log(`    PLT: ${userPos.isPlt ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('  No positions assigned');
    }
    console.log('');

    // Step 5: Display Module Access
    console.log('Step 5: Module Access:');
    if (userProfile.moduleAccess.length > 0) {
      userProfile.moduleAccess.forEach(access => {
        console.log(`  - ${access.module.name} (${access.module.code})`);
        console.log(`    Permissions: ${access.permissions.join(', ')}`);
        console.log(`    Granted: ${access.grantedAt}`);
      });
    } else {
      console.log('  No module access granted');
    }
    console.log('');

    // Summary
    console.log('=== SUMMARY ===');
    if (userProfile.isSuperadmin) {
      console.log('🔑 User has SUPERADMIN role - Full system access');
    } else if (userProfile.roles.length > 0) {
      const highestRole = userProfile.roles.reduce((prev, current) => 
        prev.role.hierarchyLevel < current.role.hierarchyLevel ? prev : current
      );
      console.log(`🎭 Highest Role: ${highestRole.role.name} (Level ${highestRole.role.hierarchyLevel})`);
    } else if (userProfile.positions.length > 0) {
      const highestPosition = userProfile.positions.reduce((prev, current) => 
        prev.position.hierarchyLevel < current.position.hierarchyLevel ? prev : current
      );
      console.log(`📍 Highest Position: ${highestPosition.position.name} (Level ${highestPosition.position.hierarchyLevel})`);
    } else {
      console.log('👤 Regular User - No special roles or positions');
    }

  } catch (error) {
    console.error('❌ Error checking user role:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkUserRole().catch(console.error);