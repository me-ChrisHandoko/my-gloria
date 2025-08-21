/**
 * Script to make a user a superadmin for development purposes
 * Usage: npx ts-node scripts/make-superadmin.ts <clerkUserId>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeSuperadmin(clerkUserId: string) {
  try {
    // Update the user to be a superadmin
    const userProfile = await prisma.userProfile.update({
      where: { clerkUserId },
      data: { isSuperadmin: true }
    });

    console.log(`✅ Successfully made user ${userProfile.fullName} (${clerkUserId}) a superadmin`);
    
    // Also give them access to the ORGANIZATION module if not already present
    const existingAccess = await prisma.moduleAccess.findFirst({
      where: {
        userProfileId: userProfile.id,
        moduleId: 'ORGANIZATION'
      }
    });

    if (!existingAccess) {
      await prisma.moduleAccess.create({
        data: {
          userProfileId: userProfile.id,
          moduleId: 'ORGANIZATION',
          permissions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
          isActive: true
        }
      });
      console.log('✅ Added ORGANIZATION module access');
    }

  } catch (error) {
    console.error('❌ Error making user superadmin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get clerkUserId from command line arguments
const clerkUserId = process.argv[2];

if (!clerkUserId) {
  console.error('❌ Please provide a clerkUserId as an argument');
  console.log('Usage: npx ts-node scripts/make-superadmin.ts <clerkUserId>');
  process.exit(1);
}

makeSuperadmin(clerkUserId);