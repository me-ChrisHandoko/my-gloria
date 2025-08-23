export interface ApprovalContext {
  requestId: string;
  correlationId: string;
  userId?: string;
  module?: string;
  startTime?: number;
  metadata?: Record<string, any>;
}

export interface LogMetadata {
  [key: string]: any;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  errorMessage?: string;
}

export interface ApprovalMetrics {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  averageProcessingTime: number;
  averageApprovalTime: number;
  moduleBreakdown: Record<string, ModuleMetrics>;
}

export interface ModuleMetrics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  averageTime: number;
}
