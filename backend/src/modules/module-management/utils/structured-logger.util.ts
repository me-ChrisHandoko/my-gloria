import { Injectable, Logger, Scope } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';

/**
 * Log levels for structured logging
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Structured log entry interface
 */
export interface StructuredLogEntry {
  timestamp: Date;
  level: LogLevel;
  correlationId: string;
  service: string;
  operation: string;
  message: string;
  duration?: number;
  userId?: string;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {
    startTime: number;
    endTime: number;
    duration: number;
    memoryUsed?: number;
  };
}

/**
 * Operation context for tracking
 */
export interface OperationContext {
  correlationId: string;
  operation: string;
  userId?: string;
  startTime: number;
  metadata?: Record<string, unknown>;
}

/**
 * Structured logger service with correlation ID support
 */
@Injectable({ scope: Scope.REQUEST })
export class StructuredLogger {
  private readonly logger: Logger;
  private correlationId: string;
  private userId?: string;
  private readonly activeOperations = new Map<string, OperationContext>();

  constructor(serviceName: string) {
    this.logger = new Logger(serviceName);
    this.correlationId = uuidv7();
  }

  /**
   * Set correlation ID for the request
   */
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Set user ID for the request
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Start tracking an operation
   */
  startOperation(
    operation: string,
    metadata?: Record<string, unknown>,
  ): string {
    const operationId = `${operation}-${Date.now()}`;
    const context: OperationContext = {
      correlationId: this.correlationId,
      operation,
      userId: this.userId,
      startTime: Date.now(),
      metadata,
    };

    this.activeOperations.set(operationId, context);

    this.log(LogLevel.DEBUG, `Starting operation: ${operation}`, {
      operationId,
      ...metadata,
    });

    return operationId;
  }

  /**
   * End tracking an operation
   */
  endOperation(
    operationId: string,
    success: boolean = true,
    metadata?: Record<string, unknown>,
  ): void {
    const context = this.activeOperations.get(operationId);

    if (!context) {
      this.warn(`Attempted to end unknown operation: ${operationId}`);
      return;
    }

    const duration = Date.now() - context.startTime;

    this.log(
      success ? LogLevel.INFO : LogLevel.ERROR,
      `Completed operation: ${context.operation}`,
      {
        operationId,
        duration,
        success,
        ...context.metadata,
        ...metadata,
      },
    );

    this.activeOperations.delete(operationId);
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Log an info message
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Log an error message
   */
  error(
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>,
  ): void {
    const errorInfo = error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code,
        }
      : undefined;

    this.log(LogLevel.ERROR, message, metadata, errorInfo);
  }

  /**
   * Log a fatal message
   */
  fatal(
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>,
  ): void {
    const errorInfo = error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code,
        }
      : undefined;

    this.log(LogLevel.FATAL, message, metadata, errorInfo);
  }

  /**
   * Log with performance metrics
   */
  logPerformance(
    operation: string,
    startTime: number,
    metadata?: Record<string, unknown>,
  ): void {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const memoryUsage = process.memoryUsage();

    this.log(LogLevel.INFO, `Performance metrics for ${operation}`, {
      ...metadata,
      performance: {
        startTime,
        endTime,
        duration,
        memoryUsed: memoryUsage.heapUsed,
      },
    });
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: StructuredLogEntry['error'],
  ): void {
    const entry: StructuredLogEntry = {
      timestamp: new Date(),
      level,
      correlationId: this.correlationId,
      service: this.logger.constructor.name,
      operation: this.getCurrentOperation(),
      message,
      userId: this.userId,
      metadata,
      error,
    };

    // Format for console output
    const formattedMessage = this.formatMessage(entry);

    // Log using appropriate NestJS logger method
    switch (level) {
      case LogLevel.DEBUG:
        this.logger.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        this.logger.log(formattedMessage);
        break;
      case LogLevel.WARN:
        this.logger.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        this.logger.error(formattedMessage, error?.stack);
        break;
      case LogLevel.FATAL:
        this.logger.fatal(formattedMessage, error?.stack);
        break;
    }

    // Also emit structured log for external systems (e.g., ELK stack)
    this.emitStructuredLog(entry);
  }

  /**
   * Format log message for console output
   */
  private formatMessage(entry: StructuredLogEntry): string {
    const parts: string[] = [
      `[${entry.correlationId.substring(0, 8)}]`,
      entry.operation ? `[${entry.operation}]` : '',
      entry.userId ? `[User: ${entry.userId}]` : '',
      entry.message,
    ];

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      parts.push(`| ${JSON.stringify(entry.metadata)}`);
    }

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Get current operation from active operations
   */
  private getCurrentOperation(): string {
    const operations = Array.from(this.activeOperations.values());
    return operations.length > 0
      ? operations[operations.length - 1].operation
      : 'unknown';
  }

  /**
   * Emit structured log for external systems
   */
  private emitStructuredLog(entry: StructuredLogEntry): void {
    // This could be sent to:
    // - Elasticsearch
    // - CloudWatch
    // - Application Insights
    // - Custom logging service

    // For now, we'll just output to console in JSON format
    if (process.env.STRUCTURED_LOGGING === 'true') {
      console.log(JSON.stringify(entry));
    }
  }
}

/**
 * Factory for creating structured loggers
 */
@Injectable()
export class StructuredLoggerFactory {
  private readonly loggers = new Map<string, StructuredLogger>();

  /**
   * Get or create a logger for a service
   */
  getLogger(serviceName: string): StructuredLogger {
    if (!this.loggers.has(serviceName)) {
      this.loggers.set(serviceName, new StructuredLogger(serviceName));
    }

    return this.loggers.get(serviceName)!;
  }

  /**
   * Set correlation ID for all loggers
   */
  setCorrelationId(correlationId: string): void {
    this.loggers.forEach((logger) => logger.setCorrelationId(correlationId));
  }

  /**
   * Set user ID for all loggers
   */
  setUserId(userId: string): void {
    this.loggers.forEach((logger) => logger.setUserId(userId));
  }
}
