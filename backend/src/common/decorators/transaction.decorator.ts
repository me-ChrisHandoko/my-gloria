import { PrismaService } from '../../prisma/prisma.service';

export function Transactional() {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const prisma: PrismaService = this.prisma || this.prismaService;

      if (!prisma) {
        throw new Error('PrismaService not found in class instance');
      }

      return await prisma.$transaction(async (tx) => {
        // Temporarily replace prisma instance with transaction
        const originalPrisma = this.prisma || this.prismaService;
        this.prisma = tx;
        this.prismaService = tx;

        try {
          const result = await method.apply(this, args);
          return result;
        } finally {
          // Restore original prisma instance
          this.prisma = originalPrisma;
          this.prismaService = originalPrisma;
        }
      });
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
