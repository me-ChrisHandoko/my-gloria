import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Transaction Manager for complex multi-step operations
 * Provides structured error handling, rollback mechanisms, and saga pattern support
 */
@Injectable()
export class TransactionManager {
  private readonly logger = new Logger(TransactionManager.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute a series of operations within a transaction
   * with proper error handling and rollback
   */
  async executeInTransaction<T>(
    operations: Array<{
      name: string;
      operation: (tx: any) => Promise<any>;
      rollback?: (tx: any, error: any) => Promise<void>;
    }>,
    options?: {
      isolationLevel?:
        | 'ReadUncommitted'
        | 'ReadCommitted'
        | 'RepeatableRead'
        | 'Serializable';
      maxWait?: number;
      timeout?: number;
    },
  ): Promise<T> {
    this.logger.debug(
      `Starting transaction with ${operations.length} operations`,
    );

    const executedOperations: Array<{ name: string; result: any }> = [];

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          let finalResult: any;

          for (const { name, operation } of operations) {
            try {
              this.logger.debug(`Executing operation: ${name}`);
              const result = await operation(tx);
              executedOperations.push({ name, result });
              finalResult = result;
              this.logger.debug(`Operation ${name} completed successfully`);
            } catch (error) {
              this.logger.error(`Operation ${name} failed: ${error.message}`);

              // Execute rollback operations in reverse order
              for (let i = executedOperations.length - 1; i >= 0; i--) {
                const executedOp = operations.find(
                  (op) => op.name === executedOperations[i].name,
                );
                if (executedOp?.rollback) {
                  try {
                    this.logger.debug(
                      `Rolling back operation: ${executedOp.name}`,
                    );
                    await executedOp.rollback(tx, error);
                  } catch (rollbackError) {
                    this.logger.error(
                      `Rollback failed for ${executedOp.name}: ${rollbackError.message}`,
                    );
                  }
                }
              }

              throw error;
            }
          }

          return finalResult;
        },
        {
          maxWait: options?.maxWait ?? 5000,
          timeout: options?.timeout ?? 10000,
          isolationLevel: options?.isolationLevel ?? 'ReadCommitted',
        },
      );
    } catch (error) {
      this.logger.error(`Transaction failed: ${error.message}`);
      this.handleTransactionError(error);
      throw error;
    }
  }

  /**
   * Execute operations with saga pattern for distributed transactions
   * Each step has its own compensating action
   */
  async executeSaga<T>(
    steps: Array<{
      name: string;
      execute: () => Promise<any>;
      compensate: (error: any) => Promise<void>;
    }>,
  ): Promise<T> {
    this.logger.debug(`Starting saga with ${steps.length} steps`);

    const executedSteps: Array<{ name: string; result: any }> = [];

    try {
      let finalResult: any;

      for (const step of steps) {
        try {
          this.logger.debug(`Executing saga step: ${step.name}`);
          const result = await step.execute();
          executedSteps.push({ name: step.name, result });
          finalResult = result;
          this.logger.debug(`Saga step ${step.name} completed successfully`);
        } catch (error) {
          this.logger.error(`Saga step ${step.name} failed: ${error.message}`);

          // Compensate in reverse order
          for (let i = executedSteps.length - 1; i >= 0; i--) {
            const executedStep = steps.find(
              (s) => s.name === executedSteps[i].name,
            );
            if (executedStep?.compensate) {
              try {
                this.logger.debug(
                  `Compensating saga step: ${executedStep.name}`,
                );
                await executedStep.compensate(error);
                this.logger.debug(
                  `Compensation completed for: ${executedStep.name}`,
                );
              } catch (compensationError) {
                this.logger.error(
                  `Compensation failed for ${executedStep.name}: ${compensationError.message}`,
                );
                // Continue with other compensations despite failure
              }
            }
          }

          throw error;
        }
      }

      return finalResult;
    } catch (error) {
      this.logger.error(`Saga failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute operations in parallel within a transaction
   * All operations must succeed or all will be rolled back
   */
  async executeParallelInTransaction<T>(
    operations: Array<{
      name: string;
      operation: (tx: any) => Promise<any>;
    }>,
    options?: {
      isolationLevel?:
        | 'ReadUncommitted'
        | 'ReadCommitted'
        | 'RepeatableRead'
        | 'Serializable';
      maxWait?: number;
      timeout?: number;
    },
  ): Promise<T[]> {
    this.logger.debug(
      `Starting parallel transaction with ${operations.length} operations`,
    );

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const promises = operations.map(({ name, operation }) => {
            this.logger.debug(`Executing parallel operation: ${name}`);
            return operation(tx).catch((error) => {
              this.logger.error(
                `Parallel operation ${name} failed: ${error.message}`,
              );
              throw error;
            });
          });

          const results = await Promise.all(promises);
          this.logger.debug('All parallel operations completed successfully');
          return results as T[];
        },
        {
          maxWait: options?.maxWait ?? 5000,
          timeout: options?.timeout ?? 10000,
          isolationLevel: options?.isolationLevel ?? 'ReadCommitted',
        },
      );
    } catch (error) {
      this.logger.error(`Parallel transaction failed: ${error.message}`);
      this.handleTransactionError(error);
      throw error;
    }
  }

  /**
   * Handle and categorize transaction errors
   */
  private handleTransactionError(error: any): void {
    if (error.code === 'P2034') {
      throw new Error(
        'Transaction failed due to write conflict. Please retry.',
      );
    }
    if (error.code === 'P2028') {
      throw new Error('Transaction API error. Please contact support.');
    }
    if (error.message?.includes('timeout')) {
      throw new Error('Transaction timeout. The operation took too long.');
    }
    if (error.message?.includes('deadlock')) {
      throw new Error('Transaction deadlock detected. Please retry.');
    }
  }
}
