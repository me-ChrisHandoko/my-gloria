import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

async function createMigration() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 Creating permission features migration...');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../prisma/migrations/20250123_add_permission_features/migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await prisma.$executeRawUnsafe(statement);
          console.log('✅ Executed:', statement.trim().substring(0, 50) + '...');
        } catch (error: any) {
          if (error.code === '42P07') { // Table already exists
            console.log('⏭️  Skipping (already exists):', statement.trim().substring(0, 50) + '...');
          } else {
            throw error;
          }
        }
      }
    }

    console.log('✅ Migration completed!');
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createMigration();