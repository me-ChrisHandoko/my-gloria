import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CircuitBreakerInterceptor.name);
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime: Date | null = null;
  private successCount = 0;

  private readonly options: CircuitBreakerOptions = {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 60 seconds
    monitoringPeriod: 120000, // 2 minutes
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;

    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.logger.warn(`Circuit breaker is HALF_OPEN for ${method} ${url}`);
      } else {
        this.logger.error(`Circuit breaker is OPEN for ${method} ${url}`);
        return throwError(
          () =>
            new HttpException(
              'Service temporarily unavailable. Please try again later.',
              HttpStatus.SERVICE_UNAVAILABLE,
            ),
        );
      }
    }

    return next.handle().pipe(
      tap(() => {
        this.onSuccess();
      }),
      catchError((error) => {
        this.onFailure();
        return throwError(() => error);
      }),
    );
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= 3) {
        this.reset();
        this.logger.log('Circuit breaker is CLOSED (recovered)');
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on successful requests
      if (this.failureCount > 0) {
        const now = new Date();
        if (
          this.lastFailureTime &&
          now.getTime() - this.lastFailureTime.getTime() >
            this.options.monitoringPeriod
        ) {
          this.failureCount = 0;
        }
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      this.trip();
      this.logger.error('Circuit breaker is OPEN (half-open test failed)');
    } else if (
      this.state === CircuitState.CLOSED &&
      this.failureCount >= this.options.failureThreshold
    ) {
      this.trip();
      this.logger.error(
        `Circuit breaker is OPEN (threshold ${this.options.failureThreshold} reached)`,
      );
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;

    const now = new Date();
    return (
      now.getTime() - this.lastFailureTime.getTime() >=
      this.options.recoveryTimeout
    );
  }

  private trip(): void {
    this.state = CircuitState.OPEN;
    this.successCount = 0;
  }

  private reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }
}
