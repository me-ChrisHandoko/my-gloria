import { Injectable, Logger } from '@nestjs/common';
import { ApprovalContext, LogLevel, LogMetadata } from './logging.interface';

@Injectable()
export class ApprovalLoggerService {
  private readonly logger = new Logger('ApprovalModule');
  private readonly contexts = new Map<string, ApprovalContext>();

  /**
   * Create a new logging context for a request
   */
  createContext(requestId: string): ApprovalContext {
    const context: ApprovalContext = {
      requestId,
      correlationId: this.generateCorrelationId(),
      startTime: Date.now(),
      metadata: {},
    };
    this.contexts.set(requestId, context);
    return context;
  }

  /**
   * Get or create a logging context
   */
  getContext(requestId: string): ApprovalContext {
    return this.contexts.get(requestId) || this.createContext(requestId);
  }

  /**
   * Clear a context (call after request completion)
   */
  clearContext(requestId: string): void {
    this.contexts.delete(requestId);
  }

  /**
   * Log an approval action with context
   */
  logAction(
    action: string,
    context: ApprovalContext,
    metadata?: LogMetadata,
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
      requestId: context.requestId,
      action,
      userId: context.userId,
      module: context.module,
      duration: context.startTime ? Date.now() - context.startTime : undefined,
      ...metadata,
    };

    this.logger.log(JSON.stringify(logData));
  }

  /**
   * Log an error with context
   */
  logError(
    error: Error,
    context: ApprovalContext,
    metadata?: LogMetadata,
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
      requestId: context.requestId,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      userId: context.userId,
      module: context.module,
      duration: context.startTime ? Date.now() - context.startTime : undefined,
      ...metadata,
    };

    this.logger.error(JSON.stringify(logData));
  }

  /**
   * Log a warning with context
   */
  logWarning(
    message: string,
    context: ApprovalContext,
    metadata?: LogMetadata,
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
      requestId: context.requestId,
      warning: message,
      userId: context.userId,
      module: context.module,
      ...metadata,
    };

    this.logger.warn(JSON.stringify(logData));
  }

  /**
   * Log debug information
   */
  logDebug(
    message: string,
    context: ApprovalContext,
    metadata?: LogMetadata,
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
      requestId: context.requestId,
      debug: message,
      userId: context.userId,
      module: context.module,
      ...metadata,
    };

    this.logger.debug(JSON.stringify(logData));
  }

  /**
   * Log approval state transition
   */
  logStateTransition(
    requestId: string,
    fromStatus: string,
    toStatus: string,
    userId: string,
    metadata?: LogMetadata,
  ): void {
    const context = this.getContext(requestId);
    context.userId = userId;

    this.logAction('STATE_TRANSITION', context, {
      fromStatus,
      toStatus,
      ...metadata,
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(
    operation: string,
    duration: number,
    context: ApprovalContext,
    metadata?: LogMetadata,
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
      requestId: context.requestId,
      performance: {
        operation,
        duration,
        durationUnit: 'ms',
      },
      userId: context.userId,
      module: context.module,
      ...metadata,
    };

    this.logger.log(JSON.stringify(logData));
  }

  /**
   * Log database query
   */
  logQuery(
    query: string,
    duration: number,
    context: ApprovalContext,
    metadata?: LogMetadata,
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
      requestId: context.requestId,
      database: {
        query: this.sanitizeQuery(query),
        duration,
        durationUnit: 'ms',
      },
      ...metadata,
    };

    this.logger.debug(JSON.stringify(logData));
  }

  /**
   * Log external service call
   */
  logExternalCall(
    service: string,
    endpoint: string,
    duration: number,
    success: boolean,
    context: ApprovalContext,
    metadata?: LogMetadata,
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
      requestId: context.requestId,
      external: {
        service,
        endpoint,
        duration,
        durationUnit: 'ms',
        success,
      },
      ...metadata,
    };

    const level = success ? 'log' : 'warn';
    this.logger[level](JSON.stringify(logData));
  }

  /**
   * Generate a unique correlation ID
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize sensitive data from queries
   */
  private sanitizeQuery(query: string): string {
    // Remove potential sensitive data patterns
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret='***'");
  }
}
