import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
  path?: string;
}

export class ApiResponseMeta {
  @ApiProperty({ description: 'Response timestamp' })
  timestamp: string;

  @ApiPropertyOptional({ description: 'Request path' })
  path?: string;

  // Additional metadata can be added dynamically
  [key: string]: any;
}

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Request success status' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Response data' })
  data?: T;

  @ApiPropertyOptional({ description: 'Success message' })
  message?: string;

  @ApiPropertyOptional({ description: 'Error information' })
  error?: {
    code: string;
    message: string;
    details?: any;
  };

  @ApiPropertyOptional({ description: 'Response metadata' })
  meta?: ApiResponseMeta;

  constructor(data?: T, meta?: Partial<ApiResponseMeta>) {
    this.success = true;
    this.data = data;
    this.meta = {
      timestamp: new Date().toISOString(),
      ...meta,
    };
  }

  static success<T>(data: T, message?: string, meta?: Partial<ApiResponseMeta>): ApiResponseDto<T> {
    const response = new ApiResponseDto(data, meta);
    response.message = message;
    return response;
  }

  static error(code: string, message: string, details?: any): ApiResponseDto<null> {
    const response = new ApiResponseDto<null>();
    response.success = false;
    response.error = { code, message, details };
    return response;
  }
}

export class SuccessResponse<T = any> implements ApiResponse<T> {
  success = true;
  data: T;
  message?: string;
  timestamp: string;
  path?: string;

  constructor(data: T, message?: string, path?: string) {
    this.data = data;
    this.message = message;
    this.timestamp = new Date().toISOString();
    this.path = path;
  }
}

export class ErrorResponse implements ApiResponse {
  success = false;
  error: string;
  message?: string;
  timestamp: string;
  path?: string;
  statusCode?: number;

  constructor(
    error: string,
    message?: string,
    path?: string,
    statusCode?: number,
  ) {
    this.error = error;
    this.message = message;
    this.timestamp = new Date().toISOString();
    this.path = path;
    this.statusCode = statusCode;
  }
}

export class PaginationMeta {
  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  pageSize: number;

  @ApiProperty({ description: 'Total number of items' })
  totalItems: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiPropertyOptional({ description: 'Whether there is a next page' })
  hasNext?: boolean;

  @ApiPropertyOptional({ description: 'Whether there is a previous page' })
  hasPrevious?: boolean;
}

export class PaginatedResponseDto<T> extends ApiResponseDto<T[]> {
  @ApiProperty({ type: ApiResponseMeta })
  meta: ApiResponseMeta & {
    pagination: PaginationMeta;
  };

  constructor(
    data: T[],
    totalItems: number,
    page: number,
    pageSize: number,
    additionalMeta?: Partial<ApiResponseMeta>,
  ) {
    super(data);
    
    const totalPages = Math.ceil(totalItems / pageSize);
    
    this.meta = {
      timestamp: new Date().toISOString(),
      ...additionalMeta,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  static paginate<T>(
    data: T[],
    totalItems: number,
    page: number,
    pageSize: number,
    message?: string,
    additionalMeta?: Partial<ApiResponseMeta>,
  ): PaginatedResponseDto<T> {
    const response = new PaginatedResponseDto(data, totalItems, page, pageSize, additionalMeta);
    response.message = message;
    return response;
  }
}

export class BulkOperationResponseDto extends ApiResponseDto<{
  successful: number;
  failed: number;
  results: Array<{
    id?: string;
    success: boolean;
    error?: string;
  }>;
}> {
  static fromResults(
    results: Array<{ id?: string; success: boolean; error?: string }>,
    message?: string,
  ): BulkOperationResponseDto {
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return ApiResponseDto.success({
      successful,
      failed,
      results,
    }, message);
  }
}
