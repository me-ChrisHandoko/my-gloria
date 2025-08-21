export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
  path?: string;
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
