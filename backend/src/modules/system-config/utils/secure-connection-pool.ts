import { Injectable, Logger } from '@nestjs/common';
import { Pool, PoolConfig, PoolClient } from 'pg';
import {
  SecureDatabaseConnection,
  SecureConnectionConfig,
} from './secure-db-connection';

export interface PoolSecurityConfig {
  maxConnections?: number;
  minConnections?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
  maxConnectionAge?: number;
  statementTimeout?: number;
  lockTimeout?: number;
  maxQueriesPerConnection?: number;
  enableQueryLogging?: boolean;
}

export interface PoolMetrics {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  totalQueries: number;
  averageQueryTime: number;
  connectionErrors: number;
}

@Injectable()
export class SecureConnectionPool {
  private readonly logger = new Logger(SecureConnectionPool.name);
  private pool: Pool | null = null;
  private connectionCounts = new Map<string, number>();
  private queryMetrics = {
    totalQueries: 0,
    totalTime: 0,
    errors: 0,
  };

  // Security limits
  private readonly MAX_POOL_SIZE = 20;
  private readonly MIN_POOL_SIZE = 2;
  private readonly DEFAULT_POOL_SIZE = 10;
  private readonly MAX_STATEMENT_TIMEOUT = 300000; // 5 minutes
  private readonly MAX_IDLE_TIMEOUT = 60000; // 1 minute
  private readonly MAX_CONNECTION_AGE = 3600000; // 1 hour
  private readonly MAX_QUERIES_PER_CONNECTION = 1000;

  constructor(private readonly dbConnection: SecureDatabaseConnection) {}

  /**
   * Creates a secure connection pool
   */
  async createPool(
    config: SecureConnectionConfig,
    securityConfig: PoolSecurityConfig = {},
  ): Promise<void> {
    // Validate configuration
    this.dbConnection.validateConnectionParams(config);
    this.validatePoolConfig(securityConfig);

    // Create base client config
    const clientConfig = this.dbConnection.createSecureClientConfig(config);

    // Create pool configuration
    const poolConfig: PoolConfig = {
      ...clientConfig,
      max: securityConfig.maxConnections || this.DEFAULT_POOL_SIZE,
      min: securityConfig.minConnections || this.MIN_POOL_SIZE,
      connectionTimeoutMillis: securityConfig.connectionTimeout || 10000,
      idleTimeoutMillis: securityConfig.idleTimeout || 30000,
      maxUses:
        securityConfig.maxQueriesPerConnection ||
        this.MAX_QUERIES_PER_CONNECTION,
    };

    // Create pool
    this.pool = new Pool(poolConfig);

    // Set up event handlers
    this.setupPoolEventHandlers(securityConfig);

    // Log pool creation
    const connId = this.dbConnection.createConnectionIdentifier(config);
    this.logger.log(
      `Secure connection pool created [${connId}] - Size: ${poolConfig.min}-${poolConfig.max}`,
    );
  }

  /**
   * Validates pool configuration
   */
  private validatePoolConfig(config: PoolSecurityConfig): void {
    if (config.maxConnections) {
      if (
        config.maxConnections < this.MIN_POOL_SIZE ||
        config.maxConnections > this.MAX_POOL_SIZE
      ) {
        throw new Error(
          `Max connections must be between ${this.MIN_POOL_SIZE} and ${this.MAX_POOL_SIZE}`,
        );
      }
    }

    if (config.minConnections) {
      if (
        config.minConnections < 1 ||
        config.minConnections >
          (config.maxConnections || this.DEFAULT_POOL_SIZE)
      ) {
        throw new Error(
          'Min connections must be between 1 and max connections',
        );
      }
    }

    if (config.statementTimeout) {
      if (
        config.statementTimeout < 1000 ||
        config.statementTimeout > this.MAX_STATEMENT_TIMEOUT
      ) {
        throw new Error(
          `Statement timeout must be between 1000ms and ${this.MAX_STATEMENT_TIMEOUT}ms`,
        );
      }
    }

    if (config.idleTimeout) {
      if (
        config.idleTimeout < 1000 ||
        config.idleTimeout > this.MAX_IDLE_TIMEOUT
      ) {
        throw new Error(
          `Idle timeout must be between 1000ms and ${this.MAX_IDLE_TIMEOUT}ms`,
        );
      }
    }
  }

  /**
   * Sets up pool event handlers for monitoring
   */
  private setupPoolEventHandlers(config: PoolSecurityConfig): void {
    if (!this.pool) return;

    // Connection created
    this.pool.on('connect', (client: PoolClient) => {
      const clientId = this.getClientId(client);
      this.connectionCounts.set(clientId, 0);

      // Set security parameters for each connection
      client.query(
        `SET statement_timeout = ${config.statementTimeout || 30000}`,
      );
      client.query(`SET lock_timeout = ${config.lockTimeout || 10000}`);
      client.query(
        `SET idle_in_transaction_session_timeout = ${config.idleTimeout || 30000}`,
      );

      // Enable query logging if requested
      if (config.enableQueryLogging && process.env.NODE_ENV !== 'production') {
        client.query("SET log_statement = 'all'");
      }
    });

    // Connection removed
    this.pool.on('remove', (client: PoolClient) => {
      const clientId = this.getClientId(client);
      const queryCount = this.connectionCounts.get(clientId) || 0;
      this.connectionCounts.delete(clientId);

      if (queryCount >= this.MAX_QUERIES_PER_CONNECTION) {
        this.logger.warn(
          `Connection ${clientId} removed after reaching query limit: ${queryCount}`,
        );
      }
    });

    // Connection error
    this.pool.on('error', (err: Error, client: PoolClient) => {
      this.queryMetrics.errors++;
      this.logger.error('Pool client error', err);
    });
  }

  /**
   * Gets a client from the pool with security checks
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Connection pool not initialized');
    }

    // Check pool health
    const metrics = await this.getMetrics();
    if (metrics.waitingClients > 10) {
      this.logger.warn(
        `High connection pool pressure: ${metrics.waitingClients} waiting clients`,
      );
    }

    const client = await this.pool.connect();
    const clientId = this.getClientId(client);

    // Track query count
    const currentCount = this.connectionCounts.get(clientId) || 0;
    this.connectionCounts.set(clientId, currentCount + 1);

    // Wrap query method to add monitoring
    const originalQuery = client.query.bind(client);
    client.query = async (...args: any[]) => {
      const startTime = Date.now();
      try {
        const result = await originalQuery(...args);
        const duration = Date.now() - startTime;

        this.queryMetrics.totalQueries++;
        this.queryMetrics.totalTime += duration;

        if (duration > 1000) {
          this.logger.warn(`Slow query detected: ${duration}ms`);
        }

        return result;
      } catch (error) {
        this.queryMetrics.errors++;
        throw error;
      }
    };

    return client;
  }

  /**
   * Executes a query with automatic client management
   */
  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(text, params);
      return result.rows as T[];
    } finally {
      client.release();
    }
  }

  /**
   * Executes a transaction with automatic rollback on error
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Gets pool metrics
   */
  async getMetrics(): Promise<PoolMetrics> {
    if (!this.pool) {
      throw new Error('Connection pool not initialized');
    }

    const poolStats = this.pool as any; // Access private properties
    const averageQueryTime =
      this.queryMetrics.totalQueries > 0
        ? this.queryMetrics.totalTime / this.queryMetrics.totalQueries
        : 0;

    return {
      totalConnections: poolStats._clients?.length || 0,
      idleConnections: poolStats._idle?.length || 0,
      waitingClients: poolStats._pendingQueue?.length || 0,
      totalQueries: this.queryMetrics.totalQueries,
      averageQueryTime,
      connectionErrors: this.queryMetrics.errors,
    };
  }

  /**
   * Checks pool health
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    metrics: PoolMetrics;
    warnings: string[];
  }> {
    try {
      const metrics = await this.getMetrics();
      const warnings: string[] = [];
      let healthy = true;

      // Check connection availability
      if (metrics.idleConnections === 0 && metrics.waitingClients > 0) {
        warnings.push('No idle connections available');
        healthy = false;
      }

      // Check error rate
      const errorRate =
        metrics.totalQueries > 0
          ? (metrics.connectionErrors / metrics.totalQueries) * 100
          : 0;

      if (errorRate > 5) {
        warnings.push(`High error rate: ${errorRate.toFixed(2)}%`);
        healthy = false;
      }

      // Check query performance
      if (metrics.averageQueryTime > 1000) {
        warnings.push(
          `Slow average query time: ${metrics.averageQueryTime.toFixed(0)}ms`,
        );
      }

      // Test connection
      try {
        await this.query('SELECT 1');
      } catch {
        warnings.push('Health check query failed');
        healthy = false;
      }

      return { healthy, metrics, warnings };
    } catch {
      return {
        healthy: false,
        metrics: {
          totalConnections: 0,
          idleConnections: 0,
          waitingClients: 0,
          totalQueries: 0,
          averageQueryTime: 0,
          connectionErrors: 0,
        },
        warnings: ['Failed to get pool metrics'],
      };
    }
  }

  /**
   * Closes the connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.connectionCounts.clear();
      this.logger.log('Connection pool closed');
    }
  }

  /**
   * Gets a unique identifier for a client
   */
  private getClientId(client: PoolClient): string {
    return (client as any).processID || 'unknown';
  }
}
