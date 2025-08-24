import { Injectable } from '@nestjs/common';
import { Client, ClientConfig } from 'pg';
import * as crypto from 'crypto';

export interface SecureConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  connectionTimeout?: number;
  poolSize?: number;
}

@Injectable()
export class SecureDatabaseConnection {
  private readonly MAX_CONNECTION_TIMEOUT = 30000; // 30 seconds
  private readonly MIN_CONNECTION_TIMEOUT = 5000; // 5 seconds
  private readonly MAX_POOL_SIZE = 20;
  private readonly MIN_POOL_SIZE = 2;

  /**
   * Validates database connection parameters for security
   */
  validateConnectionParams(config: SecureConnectionConfig): void {
    // Validate host
    if (!config.host || config.host.trim() === '') {
      throw new Error('Database host is required');
    }

    // Prevent localhost variations in production
    if (process.env.NODE_ENV === 'production') {
      const localhostVariants = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];
      if (localhostVariants.includes(config.host.toLowerCase())) {
        throw new Error('Localhost connections not allowed in production');
      }
    }

    // Validate port
    if (!config.port || config.port < 1 || config.port > 65535) {
      throw new Error('Invalid database port');
    }

    // Validate database name
    if (!config.database || config.database.trim() === '') {
      throw new Error('Database name is required');
    }

    // Validate username
    if (!config.username || config.username.trim() === '') {
      throw new Error('Database username is required');
    }

    // Validate password
    if (!config.password || config.password.length < 8) {
      throw new Error('Database password must be at least 8 characters');
    }

    // Validate connection timeout
    if (config.connectionTimeout) {
      if (
        config.connectionTimeout < this.MIN_CONNECTION_TIMEOUT ||
        config.connectionTimeout > this.MAX_CONNECTION_TIMEOUT
      ) {
        throw new Error(
          `Connection timeout must be between ${this.MIN_CONNECTION_TIMEOUT} and ${this.MAX_CONNECTION_TIMEOUT} ms`,
        );
      }
    }

    // Validate pool size
    if (config.poolSize) {
      if (
        config.poolSize < this.MIN_POOL_SIZE ||
        config.poolSize > this.MAX_POOL_SIZE
      ) {
        throw new Error(
          `Pool size must be between ${this.MIN_POOL_SIZE} and ${this.MAX_POOL_SIZE}`,
        );
      }
    }
  }

  /**
   * Sanitizes string parameters to prevent injection
   */
  sanitizeParameter(param: string): string {
    // Remove any potentially dangerous characters
    return param.replace(/[;'"\\`${}()|&<>]/g, '');
  }

  /**
   * Creates a secure database client configuration
   */
  createSecureClientConfig(config: SecureConnectionConfig): ClientConfig {
    this.validateConnectionParams(config);

    const clientConfig: ClientConfig = {
      host: this.sanitizeParameter(config.host),
      port: config.port,
      database: this.sanitizeParameter(config.database),
      user: this.sanitizeParameter(config.username),
      password: config.password, // Password is not sanitized as it's not used in command construction
      connectionTimeoutMillis: config.connectionTimeout || 10000,
      query_timeout: config.connectionTimeout || 10000,
      statement_timeout: config.connectionTimeout || 10000,
      idle_in_transaction_session_timeout: config.connectionTimeout || 10000,
    };

    // Enable SSL in production
    if (process.env.NODE_ENV === 'production' || config.ssl) {
      clientConfig.ssl = {
        rejectUnauthorized: true,
        checkServerIdentity: () => {
          // Additional certificate validation can be added here
          return undefined;
        },
      };
    }

    return clientConfig;
  }

  /**
   * Creates a secure database client
   */
  createSecureClient(config: SecureConnectionConfig): Client {
    const clientConfig = this.createSecureClientConfig(config);
    const client = new Client(clientConfig);
    return client;
  }

  /**
   * Initializes security settings after connection
   */
  async initializeSecuritySettings(
    client: Client,
    config: SecureConnectionConfig,
  ): Promise<void> {
    // Set session-level security parameters
    await client.query('SET statement_timeout = $1', [
      config.connectionTimeout || 10000,
    ]);
    await client.query('SET lock_timeout = $1', [
      config.connectionTimeout || 10000,
    ]);
  }

  /**
   * Verifies database connection encryption
   */
  async verifyConnectionEncryption(client: Client): Promise<boolean> {
    try {
      const result = await client.query<{ ssl: string }>('SHOW ssl');
      return result.rows[0]?.ssl === 'on';
    } catch {
      return false;
    }
  }

  /**
   * Gets connection security info
   */
  async getConnectionSecurityInfo(client: Client): Promise<{
    encrypted: boolean;
    sslVersion?: string;
    sslCipher?: string;
  }> {
    try {
      const sslResult = await client.query<{ ssl: string }>('SHOW ssl');
      const encrypted = sslResult.rows[0]?.ssl === 'on';

      if (encrypted) {
        const versionResult = await client.query<{ version: string }>(
          "SELECT current_setting('ssl_version') as version",
        );
        const cipherResult = await client.query<{ cipher: string }>(
          "SELECT current_setting('ssl_cipher') as cipher",
        );

        return {
          encrypted,
          sslVersion: versionResult.rows[0]?.version,
          sslCipher: cipherResult.rows[0]?.cipher,
        };
      }

      return { encrypted };
    } catch {
      return { encrypted: false };
    }
  }

  /**
   * Creates a hashed connection identifier for logging (without exposing credentials)
   */
  createConnectionIdentifier(config: SecureConnectionConfig): string {
    const data = `${config.host}:${config.port}/${config.database}@${config.username}`;
    return crypto.createHash('sha256').update(data).digest('hex').slice(0, 8);
  }
}
