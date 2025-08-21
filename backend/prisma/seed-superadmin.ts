/**
 * Seed script to set up superadmin users
 * Run: npx ts-node prisma/seed-superadmin.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting superadmin seed...');

  try {
    // Get all existing users
    const users = await prisma.userProfile.findMany({
      select: {
        id: true,
        clerkUserId: true,
        nip: true,
        isSuperadmin: true,
        dataKaryawan: {
          select: {
            nama: true,
            email: true
          }
        }
      }
    });

    if (users.length === 0) {
      console.log('❌ No users found in database. Please sign in first to create a user profile.');
      return;
    }

    console.log('\n📋 Found users:');
    users.forEach((user, index) => {
      const displayName = user.dataKaryawan?.nama || user.dataKaryawan?.email || user.clerkUserId;
      console.log(`${index + 1}. ${displayName} ${user.isSuperadmin ? '(Already Superadmin)' : ''}`);
    });

    // For now, make the first user a superadmin
    const userToUpdate = users[0];
    const userName = userToUpdate.dataKaryawan?.nama || userToUpdate.dataKaryawan?.email || userToUpdate.clerkUserId;
    
    if (userToUpdate.isSuperadmin) {
      console.log(`\n✅ User ${userName} is already a superadmin`);
    } else {
      // Update user to be superadmin
      const updatedUser = await prisma.userProfile.update({
        where: { id: userToUpdate.id },
        data: { isSuperadmin: true }
      });

      console.log(`\n✅ Successfully made ${userName} a superadmin`);

      // Ensure ORGANIZATION module exists
      let organizationModule = await prisma.module.findUnique({
        where: { code: 'ORGANIZATION' }
      });

      if (!organizationModule) {
        organizationModule = await prisma.module.create({
          data: {
            code: 'ORGANIZATION',
            name: 'Organization Management',
            category: 'SYSTEM',
            description: 'Manage schools, departments, and positions',
            isActive: true,
            isVisible: true
          }
        });
        console.log('✅ Created ORGANIZATION module');
      }

      // Check if user has ORGANIZATION module access
      const moduleAccess = await prisma.userModuleAccess.findFirst({
        where: {
          userProfileId: updatedUser.id,
          moduleId: 'ORGANIZATION'
        }
      });

      if (!moduleAccess) {
        // Create ORGANIZATION module access with all permissions
        await prisma.userModuleAccess.create({
          data: {
            userProfileId: updatedUser.id,
            moduleId: 'ORGANIZATION',
            permissions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
            grantedBy: updatedUser.clerkUserId,
            isActive: true
          }
        });
        console.log('✅ Added ORGANIZATION module access with full permissions');
      } else {
        // Update existing access to ensure all permissions
        await prisma.userModuleAccess.update({
          where: { id: moduleAccess.id },
          data: {
            permissions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
            isActive: true
          }
        });
        console.log('✅ Updated ORGANIZATION module access with full permissions');
      }
    }

    // Also ensure the user has a position in a school for complete access
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        code: true
      }
    });

    if (schools.length > 0) {
      const school = schools[0];
      
      // Check if user has any position in this school
      const existingPosition = await prisma.userPosition.findFirst({
        where: {
          userProfileId: userToUpdate.id,
          position: {
            schoolId: school.id
          },
          isActive: true
        }
      });

      if (!existingPosition) {
        // Create a principal position for the user
        const principalPosition = await prisma.position.findFirst({
          where: {
            schoolId: school.id,
            hierarchyLevel: { lte: 2 } // Principal level or higher
          }
        });

        if (!principalPosition) {
          // Create a principal position
          const newPosition = await prisma.position.create({
            data: {
              code: `PRINCIPAL-${school.code}`,
              name: 'Principal',
              schoolId: school.id,
              hierarchyLevel: 2,
              maxHolders: 1,
              isActive: true
            }
          });

          // Assign user to this position
          await prisma.userPosition.create({
            data: {
              userProfileId: userToUpdate.id,
              positionId: newPosition.id,
              startDate: new Date(),
              isActive: true,
              isPlt: false
            }
          });

          console.log(`✅ Created and assigned Principal position in ${school.name}`);
        } else {
          // Assign user to existing principal position
          await prisma.userPosition.create({
            data: {
              userProfileId: userToUpdate.id,
              positionId: principalPosition.id,
              startDate: new Date(),
              isActive: true,
              isPlt: false
            }
          });

          console.log(`✅ Assigned to existing Principal position in ${school.name}`);
        }
      } else {
        console.log(`✅ User already has a position in ${school.name}`);
      }
    } else {
      console.log('⚠️ No schools found. User will have superadmin access but no specific school assignment.');
    }

    console.log('\n🎉 Superadmin setup complete!');
    console.log('You should now be able to update and delete schools.');

  } catch (error) {
    console.error('❌ Error setting up superadmin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });