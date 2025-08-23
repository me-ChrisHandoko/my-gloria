import { PrismaClient } from '@prisma/client';

async function setupSchemas() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 Setting up database schemas...');

    // Create schemas if they don't exist
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS gloria_master`);
    console.log('✅ Created gloria_master schema');

    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS gloria_ops`);
    console.log('✅ Created gloria_ops schema');

    console.log('✅ Database schemas setup completed!');
  } catch (error) {
    console.error('❌ Error setting up schemas:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupSchemas();