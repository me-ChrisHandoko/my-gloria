#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TemplateMigrationService } from '../src/modules/notification/services/template-migration.service';
import { Logger } from '@nestjs/common';

async function migrateTemplates() {
  const logger = new Logger('TemplateMigration');
  
  try {
    logger.log('Initializing NestJS application...');
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['log', 'error', 'warn'],
    });

    logger.log('Getting template migration service...');
    const migrationService = app.get(TemplateMigrationService);

    logger.log('Starting template migration...');
    await migrationService.migrateAllTemplates();

    logger.log('Template migration completed successfully!');
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('Template migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateTemplates();