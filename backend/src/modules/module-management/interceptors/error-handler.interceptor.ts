import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ModuleManagementError } from '../errors/module-errors';

/**
 * Interceptor for centralized error handling and logging
 */
@Injectable()
export class ModuleErrorHandlerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ModuleErrorHandlerInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const userId = request.user?.id;

    return next.handle().pipe(
      catchError((error) => {
        const errorContext = {
          method,
          url,
          userId,
          timestamp: new Date().toISOString(),
          errorType: error.constructor.name,
        };

        // Handle ModuleManagementError
        if (error instanceof ModuleManagementError) {
          this.logger.warn(`Module management error: ${error.errorCode}`, {
            ...errorContext,
            errorCode: error.errorCode,
            context: error.context,
          });
          return throwError(() => error);
        }

        // Handle Prisma errors
        if (error.code === 'P2002') {
          const message = 'Unique constraint violation';
          this.logger.warn(message, errorContext);
          return throwError(
            () =>
              new HttpException(
                {
                  message,
                  errorCode: 'UNIQUE_CONSTRAINT_VIOLATION',
                  timestamp: new Date(),
                },
                HttpStatus.CONFLICT,
              ),
          );
        }

        if (error.code === 'P2025') {
          const message = 'Record not found';
          this.logger.warn(message, errorContext);
          return throwError(
            () =>
              new HttpException(
                {
                  message,
                  errorCode: 'RECORD_NOT_FOUND',
                  timestamp: new Date(),
                },
                HttpStatus.NOT_FOUND,
              ),
          );
        }

        if (error.code === 'P2003') {
          const message = 'Foreign key constraint violation';
          this.logger.warn(message, errorContext);
          return throwError(
            () =>
              new HttpException(
                {
                  message,
                  errorCode: 'FOREIGN_KEY_VIOLATION',
                  timestamp: new Date(),
                },
                HttpStatus.BAD_REQUEST,
              ),
          );
        }

        // Handle database connection errors
        if (error.code === 'P2024') {
          const message = 'Database connection timeout';
          this.logger.error(message, errorContext);
          return throwError(
            () =>
              new HttpException(
                {
                  message,
                  errorCode: 'DATABASE_TIMEOUT',
                  timestamp: new Date(),
                },
                HttpStatus.SERVICE_UNAVAILABLE,
              ),
          );
        }

        // Handle standard HTTP exceptions
        if (error instanceof HttpException) {
          this.logger.warn(`HTTP exception: ${error.message}`, errorContext);
          return throwError(() => error);
        }

        // Handle unexpected errors
        this.logger.error(`Unexpected error: ${error.message}`, {
          ...errorContext,
          stack: error.stack,
        });

        return throwError(
          () =>
            new HttpException(
              {
                message: 'An unexpected error occurred',
                errorCode: 'INTERNAL_SERVER_ERROR',
                timestamp: new Date(),
              },
              HttpStatus.INTERNAL_SERVER_ERROR,
            ),
        );
      }),
    );
  }
}
