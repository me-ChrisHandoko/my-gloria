import { Logger } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';

export function LogMethod() {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;
    const logger = new Logger(target.constructor.name);

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      const requestId = uuidv7();

      logger.log(`[${requestId}] → ${propertyName} started`);

      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - start;

        logger.log(
          `[${requestId}] ✓ ${propertyName} completed (${duration}ms)`,
        );

        return result;
      } catch (error) {
        const duration = Date.now() - start;

        logger.error(
          `[${requestId}] ✗ ${propertyName} failed (${duration}ms): ${error.message}`,
          error.stack,
        );

        throw error;
      }
    };

    return descriptor;
  };
}

export function LogPerformance(thresholdMs: number = 1000) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;
    const logger = new Logger(target.constructor.name);

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();

      const result = await method.apply(this, args);

      const duration = Date.now() - start;
      if (duration > thresholdMs) {
        logger.warn(
          `⚠️ ${propertyName} took ${duration}ms (threshold: ${thresholdMs}ms)`,
        );
      }

      return result;
    };

    return descriptor;
  };
}
