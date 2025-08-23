import {
  Module,
  ModuleWithRelations,
  ModuleTreeNode,
} from '../interfaces/module-management.interface';

/**
 * Base response type for all API responses
 */
interface BaseResponse {
  success: boolean;
  timestamp: Date;
  correlationId?: string;
}

/**
 * Success response with data
 */
export interface SuccessResponse<T> extends BaseResponse {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

/**
 * Error response with error details
 */
export interface ErrorResponse extends BaseResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
}

/**
 * Discriminated union for API responses
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * Module operation results with discriminated unions
 */
export type ModuleOperationResult =
  | { type: 'CREATE_SUCCESS'; module: ModuleWithRelations; timestamp: Date }
  | {
      type: 'UPDATE_SUCCESS';
      module: ModuleWithRelations;
      previousVersion: number;
      timestamp: Date;
    }
  | { type: 'DELETE_SUCCESS'; moduleId: string; timestamp: Date }
  | {
      type: 'OPERATION_FAILED';
      operation: string;
      error: Error;
      timestamp: Date;
    };

/**
 * Bulk operation results
 */
export type BulkOperationResult =
  | {
      type: 'BULK_SUCCESS';
      processed: number;
      successful: string[];
      failed: never[];
      timestamp: Date;
    }
  | {
      type: 'BULK_PARTIAL';
      processed: number;
      successful: string[];
      failed: Array<{ id: string; error: string }>;
      timestamp: Date;
    }
  | {
      type: 'BULK_FAILED';
      processed: number;
      successful: never[];
      failed: Array<{ id: string; error: string }>;
      error: string;
      timestamp: Date;
    };

/**
 * Module query results
 */
export type ModuleQueryResult =
  | { type: 'SINGLE'; module: ModuleWithRelations }
  | {
      type: 'LIST';
      modules: Module[];
      total: number;
      page: number;
      limit: number;
    }
  | { type: 'TREE'; tree: ModuleTreeNode[] }
  | { type: 'NOT_FOUND'; moduleId: string }
  | { type: 'QUERY_ERROR'; error: string };

/**
 * Access validation results
 */
export type AccessValidationResult =
  | {
      type: 'GRANTED';
      permissions: string[];
      source: 'ROLE' | 'USER' | 'OVERRIDE';
    }
  | { type: 'DENIED'; reason: string }
  | { type: 'EXPIRED'; expiredAt: Date }
  | { type: 'REVOKED'; revokedBy: string; revokedAt: Date };

/**
 * Type guards for discriminated unions
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>,
): response is SuccessResponse<T> {
  return response.success === true;
}

export function isErrorResponse<T>(
  response: ApiResponse<T>,
): response is ErrorResponse {
  return response.success === false;
}

export function isCreateSuccess(
  result: ModuleOperationResult,
): result is Extract<ModuleOperationResult, { type: 'CREATE_SUCCESS' }> {
  return result.type === 'CREATE_SUCCESS';
}

export function isUpdateSuccess(
  result: ModuleOperationResult,
): result is Extract<ModuleOperationResult, { type: 'UPDATE_SUCCESS' }> {
  return result.type === 'UPDATE_SUCCESS';
}

export function isDeleteSuccess(
  result: ModuleOperationResult,
): result is Extract<ModuleOperationResult, { type: 'DELETE_SUCCESS' }> {
  return result.type === 'DELETE_SUCCESS';
}

export function isOperationFailed(
  result: ModuleOperationResult,
): result is Extract<ModuleOperationResult, { type: 'OPERATION_FAILED' }> {
  return result.type === 'OPERATION_FAILED';
}

export function isBulkSuccess(
  result: BulkOperationResult,
): result is Extract<BulkOperationResult, { type: 'BULK_SUCCESS' }> {
  return result.type === 'BULK_SUCCESS';
}

export function isBulkPartial(
  result: BulkOperationResult,
): result is Extract<BulkOperationResult, { type: 'BULK_PARTIAL' }> {
  return result.type === 'BULK_PARTIAL';
}

export function isBulkFailed(
  result: BulkOperationResult,
): result is Extract<BulkOperationResult, { type: 'BULK_FAILED' }> {
  return result.type === 'BULK_FAILED';
}

export function isAccessGranted(
  result: AccessValidationResult,
): result is Extract<AccessValidationResult, { type: 'GRANTED' }> {
  return result.type === 'GRANTED';
}

export function isAccessDenied(
  result: AccessValidationResult,
): result is Extract<AccessValidationResult, { type: 'DENIED' }> {
  return result.type === 'DENIED';
}

/**
 * Response builders for consistent API responses
 */
export class ResponseBuilder {
  static success<T>(
    data: T,
    meta?: SuccessResponse<T>['meta'],
  ): SuccessResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date(),
      meta,
    };
  }

  static error(
    code: string,
    message: string,
    details?: unknown,
  ): ErrorResponse {
    return {
      success: false,
      timestamp: new Date(),
      error: {
        code,
        message,
        details,
      },
    };
  }

  static paginatedSuccess<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): SuccessResponse<T[]> {
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data,
      timestamp: new Date(),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}
