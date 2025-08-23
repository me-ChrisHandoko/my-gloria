import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base error class for module management errors
 */
export abstract class ModuleManagementError extends HttpException {
  public readonly errorCode: string;
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    errorCode: string,
    statusCode: HttpStatus,
    context?: Record<string, any>,
  ) {
    super(
      {
        message,
        errorCode,
        context,
        timestamp: new Date(),
      },
      statusCode,
    );
    this.errorCode = errorCode;
    this.context = context;
    this.timestamp = new Date();
  }
}

/**
 * Error thrown when a module is not found
 */
export class ModuleNotFoundError extends ModuleManagementError {
  constructor(moduleId: string, context?: Record<string, any>) {
    super(
      `Module with ID ${moduleId} not found`,
      'MODULE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      { moduleId, ...context },
    );
  }
}

/**
 * Error thrown when a module code already exists
 */
export class ModuleCodeAlreadyExistsError extends ModuleManagementError {
  constructor(code: string, context?: Record<string, any>) {
    super(
      `Module with code ${code} already exists`,
      'MODULE_CODE_EXISTS',
      HttpStatus.CONFLICT,
      { code, ...context },
    );
  }
}

/**
 * Error thrown when circular dependency is detected
 */
export class CircularDependencyError extends ModuleManagementError {
  constructor(
    moduleId: string,
    parentId: string,
    context?: Record<string, any>,
  ) {
    super(
      `Setting parent ${parentId} for module ${moduleId} would create circular dependency`,
      'CIRCULAR_DEPENDENCY',
      HttpStatus.BAD_REQUEST,
      { moduleId, parentId, ...context },
    );
  }
}

/**
 * Error thrown when module access is not found
 */
export class ModuleAccessNotFoundError extends ModuleManagementError {
  constructor(accessType: 'role' | 'user', id: string, moduleId: string) {
    super(
      `Module access for ${accessType} ${id} and module ${moduleId} not found`,
      'MODULE_ACCESS_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      { accessType, id, moduleId },
    );
  }
}

/**
 * Error thrown when module access already exists
 */
export class ModuleAccessAlreadyExistsError extends ModuleManagementError {
  constructor(accessType: 'role' | 'user', id: string, moduleId: string) {
    super(
      `Module access for ${accessType} ${id} and module ${moduleId} already exists`,
      'MODULE_ACCESS_EXISTS',
      HttpStatus.CONFLICT,
      { accessType, id, moduleId },
    );
  }
}

/**
 * Error thrown when there's a database operation error
 */
export class DatabaseOperationError extends ModuleManagementError {
  constructor(operation: string, error: any, context?: Record<string, any>) {
    super(
      `Database operation failed: ${operation}`,
      'DATABASE_OPERATION_FAILED',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { operation, originalError: error.message, ...context },
    );
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends ModuleManagementError {
  constructor(field: string, value: any, reason: string) {
    super(
      `Validation failed for field ${field}: ${reason}`,
      'VALIDATION_ERROR',
      HttpStatus.BAD_REQUEST,
      { field, value, reason },
    );
  }
}

/**
 * Error thrown when cache operation fails
 */
export class CacheOperationError extends ModuleManagementError {
  constructor(operation: string, key: string, error: any) {
    super(
      `Cache operation ${operation} failed for key ${key}`,
      'CACHE_OPERATION_FAILED',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { operation, key, originalError: error.message },
    );
  }
}

/**
 * Error thrown when permission check fails
 */
export class InsufficientPermissionError extends ModuleManagementError {
  constructor(userId: string, moduleId: string, requiredPermission: string) {
    super(
      `User ${userId} does not have permission ${requiredPermission} for module ${moduleId}`,
      'INSUFFICIENT_PERMISSION',
      HttpStatus.FORBIDDEN,
      { userId, moduleId, requiredPermission },
    );
  }
}

/**
 * Error thrown when bulk operation partially fails
 */
export class BulkOperationPartialFailureError extends ModuleManagementError {
  constructor(
    successful: number,
    failed: number,
    errors: Array<{ item: any; error: string }>,
  ) {
    super(
      `Bulk operation partially failed: ${successful} succeeded, ${failed} failed`,
      'BULK_OPERATION_PARTIAL_FAILURE',
      HttpStatus.PARTIAL_CONTENT,
      { successful, failed, errors },
    );
  }
}
