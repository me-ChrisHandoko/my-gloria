import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { FastifyRequest, FastifyReply } from 'fastify';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const response = ctx.getResponse<FastifyReply>();

    // Generate correlation ID if not present
    const correlationId =
      (request.headers['x-correlation-id'] as string) || uuidv7();

    // Attach correlation ID to request and response
    (request as any).correlationId = correlationId;
    response.header('x-correlation-id', correlationId);

    const startTime = Date.now();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';

    // Log incoming request
    this.logger.log({
      message: 'Incoming request',
      correlationId,
      method,
      url,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Log successful response
        this.logger.log({
          message: 'Request completed',
          correlationId,
          method,
          url,
          statusCode,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        });

        // Log slow requests as warnings
        if (duration > 1000) {
          this.logger.warn({
            message: 'Slow request detected',
            correlationId,
            method,
            url,
            duration: `${duration}ms`,
            threshold: '1000ms',
          });
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        // Log error response
        this.logger.error({
          message: 'Request failed',
          correlationId,
          method,
          url,
          error: error.message || 'Unknown error',
          stack: error.stack,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        });

        throw error;
      }),
    );
  }
}
