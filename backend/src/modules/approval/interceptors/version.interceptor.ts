import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interceptor to ensure version field is included in responses
 * for entities that support optimistic locking
 */
@Injectable()
export class VersionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // If data is null or undefined, return as is
        if (!data) {
          return data;
        }

        // Add version info to responses
        if (this.hasVersionField(data)) {
          return this.addVersionInfo(data);
        }

        // Handle arrays of entities
        if (Array.isArray(data)) {
          return data.map((item) =>
            this.hasVersionField(item) ? this.addVersionInfo(item) : item,
          );
        }

        // Handle paginated responses
        if (data.data && Array.isArray(data.data)) {
          return {
            ...data,
            data: data.data.map((item) =>
              this.hasVersionField(item) ? this.addVersionInfo(item) : item,
            ),
          };
        }

        return data;
      }),
    );
  }

  private hasVersionField(obj: any): boolean {
    return obj && typeof obj === 'object' && 'version' in obj;
  }

  private addVersionInfo(obj: any): any {
    // Add metadata about version for client-side handling
    return {
      ...obj,
      _versionInfo: {
        currentVersion: obj.version,
        message:
          'Include this version number when updating to prevent conflicts',
      },
    };
  }
}
