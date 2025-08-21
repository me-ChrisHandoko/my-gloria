import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract RLS context from request
 * Use this to get the current user context in services
 */
export const RLSContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.rlsContext || null;
  },
);

/**
 * Method decorator for automatic RLS context application
 * Wraps service methods to automatically apply RLS context
 */
export function WithRLS() {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Check if the service has prisma property
      if (!this.prisma) {
        // No prisma, execute normally
        return originalMethod.apply(this, args);
      }

      // Check if we have executeWithRLS method
      if (typeof this.prisma.executeWithRLS === 'function') {
        // Execute with RLS context
        return this.prisma.executeWithRLS(async (tx: any) => {
          // Replace this.prisma with transaction client temporarily
          const originalPrisma = this.prisma;
          this.prisma = tx;

          try {
            // Execute the original method
            const result = await originalMethod.apply(this, args);
            return result;
          } finally {
            // Restore original prisma
            this.prisma = originalPrisma;
          }
        });
      }

      // No RLS support, execute normally
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
