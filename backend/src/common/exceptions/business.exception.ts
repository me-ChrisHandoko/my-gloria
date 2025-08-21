import { HttpException, HttpStatus } from '@nestjs/common';

export enum BusinessErrorCode {
  // General errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  INVALID_OPERATION = 'INVALID_OPERATION',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Organization specific
  SCHOOL_NOT_FOUND = 'SCHOOL_NOT_FOUND',
  DEPARTMENT_NOT_FOUND = 'DEPARTMENT_NOT_FOUND',
  POSITION_NOT_FOUND = 'POSITION_NOT_FOUND',
  HIERARCHY_CYCLE = 'HIERARCHY_CYCLE',
  INVALID_HIERARCHY = 'INVALID_HIERARCHY',

  // User specific
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
}

export class BusinessException extends HttpException {
  constructor(
    public readonly code: BusinessErrorCode,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: any,
  ) {
    super(
      {
        statusCode,
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }

  static notFound(resource: string, id?: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.RESOURCE_NOT_FOUND,
      `${resource} not found${id ? `: ${id}` : ''}`,
      HttpStatus.NOT_FOUND,
    );
  }

  static duplicate(
    resource: string,
    field: string,
    value: string,
  ): BusinessException {
    return new BusinessException(
      BusinessErrorCode.DUPLICATE_RESOURCE,
      `${resource} with ${field} '${value}' already exists`,
      HttpStatus.CONFLICT,
    );
  }

  static invalidOperation(message: string): BusinessException {
    return new BusinessException(
      BusinessErrorCode.INVALID_OPERATION,
      message,
      HttpStatus.BAD_REQUEST,
    );
  }

  static unauthorized(
    message: string = 'Unauthorized access',
  ): BusinessException {
    return new BusinessException(
      BusinessErrorCode.UNAUTHORIZED_ACCESS,
      message,
      HttpStatus.UNAUTHORIZED,
    );
  }
}
