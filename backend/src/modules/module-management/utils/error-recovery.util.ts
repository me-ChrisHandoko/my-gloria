import { Logger } from '@nestjs/common';
import { DatabaseOperationError } from '../errors/module-errors';

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoffMultiplier?: number;
  maxDelay?: number;
  shouldRetry?: (error: any) => boolean;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  monitoringPeriod?: number;
}

/**
 * Retry mechanism with exponential backoff
 */
export class RetryHandler {
  private readonly logger = new Logger(RetryHandler.name);
  private readonly defaultOptions: Required<RetryOptions> = {
    maxAttempts: 3,
    delay: 1000,
    backoffMultiplier: 2,
    maxDelay: 10000,
    shouldRetry: (error) => {
      // Retry on transient errors
      return (
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.message?.includes('deadlock') ||
        error.message?.includes('timeout')
      );
    },
  };

  async execute<T>(
    operation: () => Promise<T>,
    context: string,
    options?: RetryOptions,
  ): Promise<T> {
    const config = { ...this.defaultOptions, ...options };
    let lastError: any;
    let delay = config.delay;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        this.logger.debug(
          `Executing ${context} - Attempt ${attempt}/${config.maxAttempts}`,
        );
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === config.maxAttempts || !config.shouldRetry(error)) {
          this.logger.error(
            `${context} failed after ${attempt} attempts: ${error.message}`,
          );
          break;
        }

        this.logger.warn(
          `${context} failed on attempt ${attempt}, retrying in ${delay}ms...`,
        );

        await this.sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
      }
    }

    throw new DatabaseOperationError(context, lastError, {
      attempts: config.maxAttempts,
      lastDelay: delay,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
  private readonly logger = new Logger(CircuitBreaker.name);
  private failureCount = 0;
  private lastFailureTime?: Date;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly defaultOptions: Required<CircuitBreakerOptions> = {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    monitoringPeriod: 300000, // 5 minutes
  };
  private readonly config: Required<CircuitBreakerOptions>;

  constructor(
    private readonly name: string,
    options?: CircuitBreakerOptions,
  ) {
    this.config = { ...this.defaultOptions, ...options };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        this.logger.log(`Circuit breaker ${this.name} attempting reset`);
      } else {
        throw new Error(
          `Circuit breaker ${this.name} is OPEN - service unavailable`,
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.logger.log(`Circuit breaker ${this.name} reset to CLOSED`);
      this.reset();
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.logger.error(
        `Circuit breaker ${this.name} opened after ${this.failureCount} failures`,
      );
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) {
      return true;
    }

    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.config.resetTimeout;
  }

  private reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = undefined;
    this.state = 'CLOSED';
  }

  getState(): string {
    return this.state;
  }

  getStats(): {
    state: string;
    failureCount: number;
    lastFailureTime?: Date;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

/**
 * Error context builder for better debugging
 */
export class ErrorContextBuilder {
  private context: Record<string, any> = {};

  add(key: string, value: any): this {
    this.context[key] = value;
    return this;
  }

  addIf(condition: boolean, key: string, value: any): this {
    if (condition) {
      this.context[key] = value;
    }
    return this;
  }

  addError(error: any): this {
    this.context.errorMessage = error.message;
    this.context.errorStack = error.stack;
    this.context.errorCode = error.code;
    return this;
  }

  addTimestamp(): this {
    this.context.timestamp = new Date().toISOString();
    return this;
  }

  addUser(userId?: string, userProfileId?: string): this {
    if (userId) this.context.userId = userId;
    if (userProfileId) this.context.userProfileId = userProfileId;
    return this;
  }

  build(): Record<string, any> {
    return { ...this.context };
  }
}

/**
 * Error recovery strategies
 */
export class ErrorRecoveryStrategy {
  private readonly logger = new Logger(ErrorRecoveryStrategy.name);

  /**
   * Fallback to cached data on error
   */
  async withCacheFallback<T>(
    primaryOperation: () => Promise<T>,
    cacheOperation: () => Promise<T | null>,
    context: string,
  ): Promise<T> {
    try {
      return await primaryOperation();
    } catch (error) {
      this.logger.warn(
        `Primary operation failed for ${context}, attempting cache fallback: ${error.message}`,
      );

      const cachedResult = await cacheOperation();
      if (cachedResult !== null) {
        this.logger.log(`Using cached data for ${context}`);
        return cachedResult;
      }

      throw error;
    }
  }

  /**
   * Graceful degradation with default value
   */
  async withDefault<T>(
    operation: () => Promise<T>,
    defaultValue: T,
    context: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logger.warn(
        `Operation failed for ${context}, using default value: ${error.message}`,
      );
      return defaultValue;
    }
  }

  /**
   * Partial success handling for bulk operations
   */
  async withPartialSuccess<T, R>(
    items: T[],
    operation: (item: T) => Promise<R>,
    context: string,
  ): Promise<{
    successful: R[];
    failed: Array<{ item: T; error: string }>;
  }> {
    const successful: R[] = [];
    const failed: Array<{ item: T; error: string }> = [];

    await Promise.all(
      items.map(async (item) => {
        try {
          const result = await operation(item);
          successful.push(result);
        } catch (error) {
          failed.push({
            item,
            error: error.message || 'Unknown error',
          });
        }
      }),
    );

    this.logger.log(
      `${context}: ${successful.length} succeeded, ${failed.length} failed`,
    );

    return { successful, failed };
  }
}
