import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class RequestTrackingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Generate unique request ID
    const requestId = request.headers['x-request-id'] || uuidv7();
    request.requestId = requestId;

    // Add request ID to response headers
    response.setHeader('X-Request-Id', requestId);

    const method = request.method;
    const url = request.url;
    const userAgent = request.get('user-agent') || '';
    const ip = request.ip;
    const userId =
      request.user?.clerkUserId || request.auth?.userId || 'anonymous';

    const now = Date.now();

    // Log incoming request
    this.logger.log(
      `[${requestId}] ${method} ${url} - ${ip} - ${userId} - ${userAgent}`,
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const statusCode = response.statusCode;
          const contentLength = response.get('content-length') || 0;
          const responseTime = Date.now() - now;

          // Log successful response
          this.logger.log(
            `[${requestId}] ${method} ${url} - ${statusCode} - ${responseTime}ms - ${contentLength} bytes`,
          );

          // Add performance metrics to response headers
          response.setHeader('X-Response-Time', `${responseTime}ms`);
        },
        error: (error) => {
          const statusCode = error.status || 500;
          const responseTime = Date.now() - now;

          // Log error response
          this.logger.error(
            `[${requestId}] ${method} ${url} - ${statusCode} - ${responseTime}ms - ${error.message}`,
            error.stack,
          );
        },
      }),
    );
  }
}
