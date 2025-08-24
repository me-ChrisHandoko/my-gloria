import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import * as zlib from 'zlib';
import { pipeline } from 'stream/promises';
import {
  SecureDatabaseConnection,
  SecureConnectionConfig,
} from './secure-db-connection';

export interface BackupOptions {
  schema?: string;
  includeTables?: string[];
  excludeTables?: string[];
  dataOnly?: boolean;
  schemaOnly?: boolean;
  compress?: boolean;
}

export interface BackupResult {
  success: boolean;
  filePath: string;
  sizeBytes: number;
  duration: number;
  error?: string;
}

@Injectable()
export class SecureBackupUtility {
  private readonly logger = new Logger(SecureBackupUtility.name);

  constructor(private readonly dbConnection: SecureDatabaseConnection) {}

  /**
   * Validates backup directory path to prevent path traversal
   */
  private validateBackupPath(backupDir: string, fileName: string): string {
    // Resolve the absolute paths
    const resolvedDir = path.resolve(backupDir);
    const resolvedFile = path.resolve(backupDir, fileName);

    // Ensure the file is within the backup directory
    if (!resolvedFile.startsWith(resolvedDir)) {
      throw new Error(
        'Invalid backup file path - potential path traversal detected',
      );
    }

    // Validate file extension
    const allowedExtensions = ['.sql', '.sql.gz'];
    const hasValidExtension = allowedExtensions.some((ext) =>
      resolvedFile.endsWith(ext),
    );

    if (!hasValidExtension) {
      throw new Error('Invalid backup file extension');
    }

    return resolvedFile;
  }

  /**
   * Creates a secure database backup
   */
  async createBackup(
    config: SecureConnectionConfig,
    backupPath: string,
    options: BackupOptions = {},
  ): Promise<BackupResult> {
    const startTime = Date.now();
    const client = this.dbConnection.createSecureClient(config);

    try {
      await client.connect();

      // Initialize security settings
      await this.dbConnection.initializeSecuritySettings(client, config);

      // Verify connection encryption
      const isEncrypted =
        await this.dbConnection.verifyConnectionEncryption(client);
      if (process.env.NODE_ENV === 'production' && !isEncrypted) {
        throw new Error('Database connection is not encrypted');
      }

      // Log connection security info (without credentials)
      const connId = this.dbConnection.createConnectionIdentifier(config);
      const securityInfo =
        await this.dbConnection.getConnectionSecurityInfo(client);
      this.logger.log(
        `Backup connection ${connId} - SSL: ${securityInfo.encrypted}`,
      );

      // Create backup file
      const writeStream = createWriteStream(backupPath);

      // Write backup header
      await this.writeBackupHeader(writeStream, options);

      // Backup schema if needed
      if (!options.dataOnly) {
        await this.backupSchema(client, writeStream, options);
      }

      // Backup data if needed
      if (!options.schemaOnly) {
        await this.backupData(client, writeStream, options);
      }

      writeStream.end();

      // Wait for write to complete
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', (err) => reject(err));
      });

      // Get file size
      const stats = await fs.stat(backupPath);
      let finalPath = backupPath;
      let finalSize = stats.size;

      // Compress if requested
      if (options.compress && !backupPath.endsWith('.gz')) {
        const compressedPath = `${backupPath}.gz`;
        await this.compressFile(backupPath, compressedPath);

        // Remove uncompressed file
        await fs.unlink(backupPath);
        finalPath = compressedPath;

        const compressedStats = await fs.stat(compressedPath);
        finalSize = compressedStats.size;

        this.logger.log(
          `Backup compressed from ${stats.size} to ${finalSize} bytes`,
        );
      }

      const duration = Date.now() - startTime;
      return {
        success: true,
        filePath: finalPath,
        sizeBytes: finalSize,
        duration,
      };
    } catch (error) {
      this.logger.error('Backup failed', error);

      // Clean up partial backup file
      try {
        await fs.unlink(backupPath);
      } catch {}

      return {
        success: false,
        filePath: backupPath,
        sizeBytes: 0,
        duration: Date.now() - startTime,
        error: error.message,
      };
    } finally {
      await client.end();
    }
  }

  /**
   * Writes backup header with metadata
   */
  private async writeBackupHeader(
    stream: NodeJS.WritableStream,
    options: BackupOptions,
  ): Promise<void> {
    const header = [
      '-- PostgreSQL database backup',
      `-- Generated at: ${new Date().toISOString()}`,
      `-- Schema: ${options.schema || 'all'}`,
      `-- Data only: ${options.dataOnly || false}`,
      `-- Schema only: ${options.schemaOnly || false}`,
      '--',
      '',
    ].join('\n');

    stream.write(header);
  }

  /**
   * Backs up database schema
   */
  private async backupSchema(
    client: Client,
    stream: NodeJS.WritableStream,
    options: BackupOptions,
  ): Promise<void> {
    const schema = options.schema || 'gloria_ops';

    // Get all tables in schema
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const tablesResult = await client.query(tablesQuery, [schema]);
    const tables = tablesResult.rows
      .map((row) => row.table_name)
      .filter((table) => {
        if (options.includeTables && options.includeTables.length > 0) {
          return options.includeTables.includes(table);
        }
        if (options.excludeTables && options.excludeTables.length > 0) {
          return !options.excludeTables.includes(table);
        }
        return true;
      });

    // Write schema creation
    stream.write(`\n-- Schema: ${schema}\n`);
    stream.write(`CREATE SCHEMA IF NOT EXISTS ${schema};\n\n`);

    // Backup table definitions
    for (const table of tables) {
      await this.backupTableSchema(client, stream, schema, table);
    }
  }

  /**
   * Backs up individual table schema
   */
  private async backupTableSchema(
    client: Client,
    stream: NodeJS.WritableStream,
    schema: string,
    table: string,
  ): Promise<void> {
    stream.write(`\n-- Table: ${schema}.${table}\n`);

    // Get table definition using pg_dump equivalent queries
    const createTableQuery = `
      SELECT 
        'CREATE TABLE ' || quote_ident($1) || '.' || quote_ident($2) || ' (' || 
        string_agg(
          quote_ident(column_name) || ' ' || 
          data_type || 
          CASE 
            WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')'
            ELSE ''
          END ||
          CASE 
            WHEN is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
          END ||
          CASE 
            WHEN column_default IS NOT NULL 
            THEN ' DEFAULT ' || column_default
            ELSE ''
          END,
          ', '
        ) || ');' as create_statement
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      GROUP BY table_schema, table_name
    `;

    const result = await client.query(createTableQuery, [schema, table]);
    if (result.rows[0]) {
      stream.write(result.rows[0].create_statement + '\n');
    }

    // Get indexes
    const indexQuery = `
      SELECT indexdef || ';' as index_statement
      FROM pg_indexes
      WHERE schemaname = $1 AND tablename = $2
    `;

    const indexResult = await client.query(indexQuery, [schema, table]);
    for (const row of indexResult.rows) {
      stream.write(row.index_statement + '\n');
    }
  }

  /**
   * Backs up table data
   */
  private async backupData(
    client: Client,
    stream: NodeJS.WritableStream,
    options: BackupOptions,
  ): Promise<void> {
    const schema = options.schema || 'gloria_ops';

    // Get tables to backup
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const tablesResult = await client.query(tablesQuery, [schema]);
    const tables = tablesResult.rows
      .map((row) => row.table_name)
      .filter((table) => {
        if (options.includeTables && options.includeTables.length > 0) {
          return options.includeTables.includes(table);
        }
        if (options.excludeTables && options.excludeTables.length > 0) {
          return !options.excludeTables.includes(table);
        }
        return true;
      });

    // Backup data for each table
    for (const table of tables) {
      await this.backupTableData(client, stream, schema, table);
    }
  }

  /**
   * Backs up individual table data using COPY command
   */
  private async backupTableData(
    client: Client,
    stream: NodeJS.WritableStream,
    schema: string,
    table: string,
  ): Promise<void> {
    stream.write(`\n-- Data for table: ${schema}.${table}\n`);

    // Use COPY TO for efficient data export
    const copyQuery = `COPY ${schema}.${table} TO STDOUT WITH (FORMAT CSV, HEADER true, DELIMITER ',', QUOTE '"', ESCAPE '"')`;

    stream.write(
      `\\copy ${schema}.${table} FROM stdin WITH (FORMAT CSV, HEADER true, DELIMITER ',', QUOTE '"', ESCAPE '"');\n`,
    );

    // Stream the data
    const copyStream = client.query(copyQuery) as any;

    await new Promise<void>((resolve, reject) => {
      copyStream.on('data', (chunk: Buffer) => {
        stream.write(chunk);
      });
      copyStream.on('end', () => {
        stream.write('\\.\n');
        resolve();
      });
      copyStream.on('error', (err: Error) => reject(err));
    });
  }

  /**
   * Compresses a file using gzip
   */
  private async compressFile(
    sourcePath: string,
    targetPath: string,
  ): Promise<void> {
    await pipeline(
      createReadStream(sourcePath),
      zlib.createGzip({ level: 9 }), // Maximum compression
      createWriteStream(targetPath),
    );
  }

  /**
   * Restores a database backup
   */
  async restoreBackup(
    config: SecureConnectionConfig,
    backupPath: string,
    verify: boolean = false,
  ): Promise<BackupResult> {
    const startTime = Date.now();
    const client = this.dbConnection.createSecureClient(config);

    try {
      // Check if file exists
      await fs.access(backupPath);

      // Decompress if needed
      let restorePath = backupPath;
      let tempFile: string | null = null;

      if (backupPath.endsWith('.gz')) {
        tempFile = backupPath.replace('.gz', '.temp.sql');
        await pipeline(
          createReadStream(backupPath),
          zlib.createGunzip(),
          createWriteStream(tempFile),
        );
        restorePath = tempFile;
      }

      // Read backup file
      const backupContent = await fs.readFile(restorePath, 'utf-8');

      await client.connect();

      // Initialize security settings
      await this.dbConnection.initializeSecuritySettings(client, config);

      // Verify connection encryption
      const isEncrypted =
        await this.dbConnection.verifyConnectionEncryption(client);
      if (process.env.NODE_ENV === 'production' && !isEncrypted) {
        throw new Error('Database connection is not encrypted');
      }

      if (verify) {
        // Verify only - use transaction and rollback
        await client.query('BEGIN');
        try {
          await client.query(backupContent);
          await client.query('ROLLBACK');
          this.logger.log('Backup verification successful');
        } catch (error) {
          await client.query('ROLLBACK');
          throw new Error(`Backup verification failed: ${error.message}`);
        }
      } else {
        // Execute restore
        await client.query(backupContent);
        this.logger.log('Backup restored successfully');
      }

      // Clean up temp file
      if (tempFile) {
        await fs.unlink(tempFile);
      }

      const duration = Date.now() - startTime;
      return {
        success: true,
        filePath: backupPath,
        sizeBytes: 0,
        duration,
      };
    } catch (error) {
      this.logger.error('Restore failed', error);
      return {
        success: false,
        filePath: backupPath,
        sizeBytes: 0,
        duration: Date.now() - startTime,
        error: error.message,
      };
    } finally {
      await client.end();
    }
  }
}
