import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  ConflictException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

/**
 * Exception filter for handling optimistic locking conflicts
 * Provides user-friendly error messages for concurrent update scenarios
 */
@Catch(ConflictException)
export class OptimisticLockExceptionFilter implements ExceptionFilter {
  catch(exception: ConflictException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const status = exception.getStatus
      ? exception.getStatus()
      : HttpStatus.CONFLICT;
    const exceptionResponse = exception.getResponse() as any;

    // Determine if this is an optimistic locking error
    const message = exceptionResponse.message || exceptionResponse;
    const isOptimisticLockError =
      typeof message === 'string' &&
      (message.includes('modified by another user') ||
        message.includes('concurrent update') ||
        message.includes('version mismatch'));

    // Create a user-friendly response
    const errorResponse = {
      statusCode: status,
      error: 'Conflict',
      message: isOptimisticLockError
        ? 'The record has been modified by another user. Please refresh the page and try again.'
        : message,
      timestamp: new Date().toISOString(),
      details: isOptimisticLockError
        ? {
            type: 'OPTIMISTIC_LOCK_ERROR',
            resolution:
              'Refresh the page to get the latest data and retry your action.',
            userMessage:
              'Someone else has made changes to this record. Your changes could not be saved to prevent data conflicts.',
          }
        : undefined,
    };

    response.status(status).send(errorResponse);
  }
}
