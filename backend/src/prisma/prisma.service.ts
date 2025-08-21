import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { generateId } from '../common/utils/uuid.util';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private static asyncLocalStorage = new AsyncLocalStorage<any>();

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['warn', 'error'],
      errorFormat:
        process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
    });

    // Log database queries in development
    if (process.env.NODE_ENV === 'development') {
      this.$on('query' as never, (e: any) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Params: ${e.params}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');

      // Test the connection by checking if database is accessible
      await this.$queryRaw`SELECT 1`;
      this.logger.log('✅ Database connection verified');

      // Note: RLS context will be set via middleware and transactions
      // Prisma v6 doesn't support $use anymore, using AsyncLocalStorage instead
      this.logger.log('✅ RLS context system ready');
    } catch (error) {
      this.logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Execute a query with RLS context using transaction
   * Since Prisma v6 doesn't support $use, we wrap queries in transactions
   * @param callback The query to execute
   * @returns Query result
   */
  async executeWithRLS<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    const context = PrismaService.asyncLocalStorage.getStore();

    if (context?.userContext) {
      // Execute in transaction with RLS context
      return this.$transaction(async (tx) => {
        // Set the session variable for RLS
        const userContextJson = JSON.stringify(context.userContext);
        await tx.$executeRawUnsafe(
          `SET LOCAL app.user_context = $1`,
          userContextJson,
        );

        // Execute the callback with transaction client
        return callback(tx);
      });
    }

    // No context, execute normally
    return callback(this);
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  // Helper method for soft delete pattern if needed
  async softDelete(model: string, where: any) {
    // This is a generic helper - actual implementation depends on your models
    // You would call it like: prisma.softDelete('userProfile', { id: '123' })
    const modelDelegate = (this as any)[model];
    if (!modelDelegate) {
      throw new Error(`Model ${model} not found`);
    }
    return modelDelegate.update({
      where,
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  // Helper method for transactions
  async executeTransaction<T>(
    fn: (
      prisma: Omit<
        PrismaClient,
        | '$connect'
        | '$disconnect'
        | '$on'
        | '$transaction'
        | '$use'
        | '$extends'
      >,
    ) => Promise<T>,
  ): Promise<T> {
    return await this.$transaction(
      async (prisma) => {
        return await fn(prisma as any);
      },
      {
        maxWait: 5000, // 5 seconds max wait
        timeout: 10000, // 10 seconds timeout
        isolationLevel: 'Serializable', // Highest isolation level for critical operations
      },
    );
  }

  // Utility method to handle database errors
  handleDatabaseError(error: any): void {
    if (error.code === 'P2002') {
      throw new Error(`Unique constraint violation: ${error.meta?.target}`);
    }
    if (error.code === 'P2025') {
      throw new Error('Record not found');
    }
    if (error.code === 'P2003') {
      throw new Error(
        `Foreign key constraint violation: ${error.meta?.field_name}`,
      );
    }
    throw error;
  }

  /**
   * Helper method to generate UUID v7 for manual ID generation
   * @returns UUID v7 string
   */
  generateId(): string {
    return generateId();
  }

  /**
   * Execute a query with RLS context
   * @param userContext The user context for RLS
   * @param callback The callback function to execute
   */
  async withRLSContext<T>(
    userContext: any,
    callback: () => Promise<T>,
  ): Promise<T> {
    return PrismaService.asyncLocalStorage.run({ userContext }, callback);
  }

  /**
   * Get the current AsyncLocalStorage instance
   * Used by middleware to set context
   */
  static getAsyncLocalStorage() {
    return this.asyncLocalStorage;
  }

  /**
   * Bypass RLS for admin operations
   * Use with caution - only for system operations
   */
  async bypassRLS<T>(callback: () => Promise<T>): Promise<T> {
    return PrismaService.asyncLocalStorage.run({ bypassRLS: true }, callback);
  }
}
