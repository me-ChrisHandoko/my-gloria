import { HttpException, HttpStatus } from '@nestjs/common';

export enum PermissionErrorCode {
  // Permission not found
  PERMISSION_NOT_FOUND = 'PERM_001',
  PERMISSION_CODE_NOT_FOUND = 'PERM_002',
  
  // Permission conflicts
  PERMISSION_ALREADY_EXISTS = 'PERM_003',
  PERMISSION_CODE_CONFLICT = 'PERM_004',
  PERMISSION_COMBINATION_EXISTS = 'PERM_005',
  
  // System permission errors
  SYSTEM_PERMISSION_IMMUTABLE = 'PERM_006',
  SYSTEM_PERMISSION_DELETE_FORBIDDEN = 'PERM_007',
  
  // Permission check errors
  PERMISSION_CHECK_FAILED = 'PERM_008',
  PERMISSION_DENIED = 'PERM_009',
  PERMISSION_EXPIRED = 'PERM_010',
  
  // Dependency errors
  PERMISSION_DEPENDENCY_CYCLE = 'PERM_011',
  PERMISSION_DEPENDENCY_NOT_FOUND = 'PERM_012',
  
  // Cache errors
  PERMISSION_CACHE_ERROR = 'PERM_013',
  PERMISSION_CACHE_INVALIDATION_FAILED = 'PERM_014',
  
  // Database errors
  PERMISSION_DB_CONNECTION_FAILED = 'PERM_015',
  PERMISSION_DB_QUERY_FAILED = 'PERM_016',
  PERMISSION_DB_TRANSACTION_FAILED = 'PERM_017',
  
  // Validation errors
  PERMISSION_INVALID_RESOURCE = 'PERM_018',
  PERMISSION_INVALID_ACTION = 'PERM_019',
  PERMISSION_INVALID_SCOPE = 'PERM_020',
  PERMISSION_INVALID_CONDITIONS = 'PERM_021',
  
  // Performance errors
  PERMISSION_CHECK_TIMEOUT = 'PERM_022',
  PERMISSION_RATE_LIMIT_EXCEEDED = 'PERM_023',
  
  // Batch operation errors
  PERMISSION_BATCH_PARTIAL_FAILURE = 'PERM_024',
  PERMISSION_BATCH_SIZE_EXCEEDED = 'PERM_025',
}

export interface PermissionErrorDetails {
  code: PermissionErrorCode;
  message: string;
  resource?: string;
  action?: string;
  scope?: string;
  userId?: string;
  permissionId?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  traceId?: string;
}

export class PermissionException extends HttpException {
  public readonly errorCode: PermissionErrorCode;
  public readonly details: PermissionErrorDetails;

  constructor(
    errorCode: PermissionErrorCode,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    additionalDetails?: Partial<PermissionErrorDetails>,
  ) {
    const details: PermissionErrorDetails = {
      code: errorCode,
      message,
      timestamp: new Date().toISOString(),
      ...additionalDetails,
    };

    super(
      {
        statusCode,
        error: 'PermissionError',
        details,
      },
      statusCode,
    );

    this.errorCode = errorCode;
    this.details = details;
  }

  // Factory methods for common errors
  static notFound(permissionId: string): PermissionException {
    return new PermissionException(
      PermissionErrorCode.PERMISSION_NOT_FOUND,
      `Permission with ID ${permissionId} not found`,
      HttpStatus.NOT_FOUND,
      { permissionId },
    );
  }

  static codeNotFound(code: string): PermissionException {
    return new PermissionException(
      PermissionErrorCode.PERMISSION_CODE_NOT_FOUND,
      `Permission with code ${code} not found`,
      HttpStatus.NOT_FOUND,
      { metadata: { code } },
    );
  }

  static alreadyExists(code: string): PermissionException {
    return new PermissionException(
      PermissionErrorCode.PERMISSION_CODE_CONFLICT,
      `Permission with code ${code} already exists`,
      HttpStatus.CONFLICT,
      { metadata: { code } },
    );
  }

  static combinationExists(
    resource: string,
    action: string,
    scope?: string,
  ): PermissionException {
    return new PermissionException(
      PermissionErrorCode.PERMISSION_COMBINATION_EXISTS,
      `Permission for ${resource}.${action}${scope ? ` with scope ${scope}` : ''} already exists`,
      HttpStatus.CONFLICT,
      { resource, action, scope },
    );
  }

  static systemPermissionImmutable(): PermissionException {
    return new PermissionException(
      PermissionErrorCode.SYSTEM_PERMISSION_IMMUTABLE,
      'System permissions cannot be modified',
      HttpStatus.FORBIDDEN,
    );
  }

  static systemPermissionDeleteForbidden(): PermissionException {
    return new PermissionException(
      PermissionErrorCode.SYSTEM_PERMISSION_DELETE_FORBIDDEN,
      'System permissions cannot be deleted',
      HttpStatus.FORBIDDEN,
    );
  }

  static denied(
    userId: string,
    resource: string,
    action: string,
    reason?: string,
  ): PermissionException {
    return new PermissionException(
      PermissionErrorCode.PERMISSION_DENIED,
      reason || `Permission denied for ${resource}.${action}`,
      HttpStatus.FORBIDDEN,
      { userId, resource, action },
    );
  }

  static checkFailed(
    userId: string,
    resource: string,
    action: string,
    error: string,
  ): PermissionException {
    return new PermissionException(
      PermissionErrorCode.PERMISSION_CHECK_FAILED,
      'Permission check failed',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { 
        userId, 
        resource, 
        action,
        metadata: { error },
      },
    );
  }

  static cacheError(operation: string, error: string): PermissionException {
    return new PermissionException(
      PermissionErrorCode.PERMISSION_CACHE_ERROR,
      `Cache operation failed: ${operation}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      { metadata: { operation, error } },
    );
  }

  static dbError(operation: string, error: string): PermissionException {
    return new PermissionException(
      PermissionErrorCode.PERMISSION_DB_QUERY_FAILED,
      `Database operation failed: ${operation}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      { metadata: { operation, error } },
    );
  }

  static timeout(
    userId: string,
    resource: string,
    action: string,
    duration: number,
  ): PermissionException {
    return new PermissionException(
      PermissionErrorCode.PERMISSION_CHECK_TIMEOUT,
      `Permission check timed out after ${duration}ms`,
      HttpStatus.REQUEST_TIMEOUT,
      { 
        userId, 
        resource, 
        action,
        metadata: { duration },
      },
    );
  }

  static rateLimitExceeded(userId: string): PermissionException {
    return new PermissionException(
      PermissionErrorCode.PERMISSION_RATE_LIMIT_EXCEEDED,
      'Permission check rate limit exceeded',
      HttpStatus.TOO_MANY_REQUESTS,
      { userId },
    );
  }

  static invalidConditions(conditions: any): PermissionException {
    return new PermissionException(
      PermissionErrorCode.PERMISSION_INVALID_CONDITIONS,
      'Invalid permission conditions format',
      HttpStatus.BAD_REQUEST,
      { metadata: { conditions } },
    );
  }
}