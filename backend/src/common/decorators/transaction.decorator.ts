import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Transaction decorator for wrapping methods in database transactions
 * Provides automatic rollback on errors and proper error handling
 */
export function Transactional(options?: {
  isolationLevel?:
    | 'ReadUncommitted'
    | 'ReadCommitted'
    | 'RepeatableRead'
    | 'Serializable';
  maxWait?: number;
  timeout?: number;
}) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;
    const logger = new Logger(`${target.constructor.name}@${propertyName}`);

    descriptor.value = async function (...args: any[]) {
      const prisma: PrismaService = this.prisma || this.prismaService;

      if (!prisma) {
        logger.warn('Transaction decorator requires PrismaService instance');
        throw new Error('PrismaService not found in class instance');
      }

      try {
        logger.debug(`Starting transaction for ${propertyName}`);

        return await prisma.$transaction(
          async (tx) => {
            // Temporarily replace prisma instance with transaction
            const originalPrisma = this.prisma || this.prismaService;
            this.prisma = tx;
            this.prismaService = tx;

            try {
              const result = await method.apply(this, args);
              logger.debug(
                `Transaction completed successfully for ${propertyName}`,
              );
              return result;
            } finally {
              // Restore original prisma instance
              this.prisma = originalPrisma;
              this.prismaService = originalPrisma;
            }
          },
          {
            maxWait: options?.maxWait ?? 5000,
            timeout: options?.timeout ?? 10000,
            isolationLevel: options?.isolationLevel ?? 'ReadCommitted',
          },
        );
      } catch (error) {
        logger.error(
          `Transaction failed for ${propertyName}: ${error.message}`,
        );
        throw error;
      }
    };

    return descriptor;
  };
}

export function RetryOnConflict(maxRetries: number = 3, delayMs: number = 100) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let lastError: any;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await method.apply(this, args);
        } catch (error) {
          lastError = error;

          // Check if it's a conflict error
          if (error.code === 'P2002' || error.code === 'P2034') {
            if (attempt < maxRetries) {
              // Wait before retrying
              await new Promise((resolve) =>
                setTimeout(resolve, delayMs * attempt),
              );
              continue;
            }
          }

          throw error;
        }
      }

      throw lastError;
    };

    return descriptor;
  };
}
