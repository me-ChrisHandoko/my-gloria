import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ApprovalLoggerService } from '../logging/approval-logger.service';
import { ApprovalMetricsService } from '../metrics/approval-metrics.service';
import { ApprovalContext } from '../logging/logging.interface';

@Injectable()
export class ApprovalLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: ApprovalLoggerService,
    private readonly metrics: ApprovalMetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Extract request information
    const { method, url, body, params, query } = request;
    const userId = request.user?.id || 'anonymous';
    const requestId = params.id || body?.requestId || this.generateRequestId();

    // Create logging context
    const loggingContext: ApprovalContext =
      this.logger.createContext(requestId);
    loggingContext.userId = userId;
    loggingContext.module = this.extractModuleName(controller.name);

    // Store context in request for use in controllers/services
    request.loggingContext = loggingContext;

    // Start performance timer
    const timerId = this.metrics.startTimer(
      `${controller.name}.${handler.name}`,
      loggingContext,
      {
        method,
        url,
        controller: controller.name,
        handler: handler.name,
      },
    );

    // Log request
    this.logger.logAction('REQUEST_RECEIVED', loggingContext, {
      method,
      url,
      controller: controller.name,
      handler: handler.name,
      params: this.sanitizeData(params),
      query: this.sanitizeData(query),
      body: this.sanitizeData(body),
    });

    const startTime = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;

        // End timer
        this.metrics.endTimer(timerId, true, {
          statusCode: response.statusCode,
          duration,
        });

        // Log successful response
        this.logger.logAction('REQUEST_COMPLETED', loggingContext, {
          method,
          url,
          statusCode: response.statusCode,
          duration,
          responseSize: this.getResponseSize(data),
        });

        // Track metrics based on operation
        this.trackOperationMetrics(
          controller.name,
          handler.name,
          duration,
          true,
        );

        // Clear context after successful completion
        this.logger.clearContext(requestId);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        // End timer with failure
        this.metrics.endTimer(timerId, false, {
          error: error.message,
          statusCode: error.status || 500,
          duration,
        });

        // Log error
        this.logger.logError(error, loggingContext, {
          method,
          url,
          statusCode: error.status || 500,
          duration,
          errorType: this.classifyError(error),
        });

        // Track error metrics
        this.metrics.trackError(this.classifyError(error));
        this.trackOperationMetrics(
          controller.name,
          handler.name,
          duration,
          false,
        );

        // Clear context after error
        this.logger.clearContext(requestId);

        // Re-throw the error
        return throwError(() => error);
      }),
    );
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract module name from controller name
   */
  private extractModuleName(controllerName: string): string {
    // Remove 'Controller' suffix and convert to lowercase
    return controllerName.replace(/Controller$/i, '').toLowerCase();
  }

  /**
   * Sanitize sensitive data from logs
   */
  private sanitizeData(data: any): any {
    if (!data) return data;

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'authorization',
    ];

    if (typeof data === 'object') {
      const sanitized = { ...data };

      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '***REDACTED***';
        }
      }

      // Recursively sanitize nested objects
      for (const key in sanitized) {
        if (typeof sanitized[key] === 'object') {
          sanitized[key] = this.sanitizeData(sanitized[key]);
        }
      }

      return sanitized;
    }

    return data;
  }

  /**
   * Calculate response size
   */
  private getResponseSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  /**
   * Classify error type for metrics
   */
  private classifyError(
    error: any,
  ): 'validation' | 'authorization' | 'database' | 'external' {
    const errorName = error.name?.toLowerCase() || '';
    const errorMessage = error.message?.toLowerCase() || '';

    if (errorName.includes('validation') || error.status === 400) {
      return 'validation';
    }

    if (
      errorName.includes('unauthorized') ||
      errorName.includes('forbidden') ||
      error.status === 401 ||
      error.status === 403
    ) {
      return 'authorization';
    }

    if (
      errorName.includes('database') ||
      errorName.includes('prisma') ||
      errorMessage.includes('database')
    ) {
      return 'database';
    }

    return 'external';
  }

  /**
   * Track operation-specific metrics
   */
  private trackOperationMetrics(
    controllerName: string,
    handlerName: string,
    duration: number,
    success: boolean,
  ): void {
    const operation = `${controllerName}.${handlerName}`;

    // Track specific approval operations
    if (operation.includes('approve')) {
      this.metrics.trackApprovalAction('approved', duration);
    } else if (operation.includes('reject')) {
      this.metrics.trackApprovalAction('rejected', duration);
    } else if (operation.includes('cancel')) {
      this.metrics.trackApprovalAction('cancelled', duration);
    } else if (operation.includes('initiate') || operation.includes('create')) {
      const module = this.extractModuleName(controllerName);
      this.metrics.trackWorkflow(
        module,
        success ? 'started' : 'failed',
        duration,
      );
    }

    // Increment general counters
    if (!success) {
      this.metrics.incrementCounter('failedRequests');
    }
  }
}
