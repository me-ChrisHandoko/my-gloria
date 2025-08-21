import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RowLevelSecurityService } from '../security/row-level-security.service';
import { AuditService } from '../audit/audit.service';

interface AuthenticatedRequest extends Request {
  user?: {
    clerkUserId: string;
    profileId?: string;
    isSuperadmin?: boolean;
  };
}

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  constructor(
    private readonly rlsService: RowLevelSecurityService,
    private readonly auditService: AuditService,
  ) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Skip security for health checks and public endpoints
      if (this.isPublicEndpoint(req.path)) {
        return next();
      }

      // Ensure user is authenticated
      if (!req.user?.clerkUserId) {
        throw new ForbiddenException('User not authenticated');
      }

      // Get user security context
      const userContext = await this.rlsService.getUserContext(
        req.user.clerkUserId,
      );

      // Attach context to request for later use
      (req as any).securityContext = userContext;

      // Log API access for sensitive operations
      if (this.isSensitiveOperation(req)) {
        const auditContext = this.auditService.createContextFromRequest(req);
        await this.auditService.log(auditContext, {
          entityType: 'API_ACCESS',
          entityId: req.path,
          action: 'READ' as any,
          metadata: {
            method: req.method,
            path: req.path,
            query: req.query,
            body: this.sanitizeBody(req.body),
          },
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Checks if endpoint is public
   */
  private isPublicEndpoint(path: string): boolean {
    const publicPaths = ['/health', '/api/auth/webhook', '/api/public'];

    return publicPaths.some((p) => path.startsWith(p));
  }

  /**
   * Checks if operation is sensitive and should be audited
   */
  private isSensitiveOperation(req: AuthenticatedRequest): boolean {
    // All write operations are sensitive
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return true;
    }

    // Specific read operations that are sensitive
    const sensitivePaths = [
      '/api/users',
      '/api/positions',
      '/api/permissions',
      '/api/audit',
    ];

    return sensitivePaths.some((p) => req.path.startsWith(p));
  }

  /**
   * Sanitizes request body for audit logging
   */
  private sanitizeBody(body: any): any {
    if (!body) return null;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

/**
 * Guard for checking row-level security
 */
@Injectable()
export class RowLevelSecurityGuard {
  constructor(private readonly rlsService: RowLevelSecurityService) {}

  /**
   * Validates access to a specific resource
   */
  async canAccess(
    req: AuthenticatedRequest,
    entityType: string,
    entityId: string,
    action: string,
  ): Promise<boolean> {
    const context = (req as any).securityContext;

    if (!context) {
      throw new ForbiddenException('Security context not found');
    }

    return this.rlsService.canAccessRecord(
      context,
      entityType,
      entityId,
      action,
    );
  }

  /**
   * Applies row-level security filter to query
   */
  applySecurityFilter(
    req: AuthenticatedRequest,
    module: string,
    action: string,
  ): any {
    const context = (req as any).securityContext;

    if (!context) {
      throw new ForbiddenException('Security context not found');
    }

    return this.rlsService.buildSecurityFilter(context, module, action);
  }
}

/**
 * Interceptor for automatic audit logging
 */
import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (response) => {
        // Only audit successful write operations
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          return;
        }

        const duration = Date.now() - startTime;
        const auditContext = this.auditService.createContextFromRequest(req);

        // Determine entity information from response
        const entityInfo = this.extractEntityInfo(req, response);

        if (entityInfo) {
          await this.auditService.log(auditContext, {
            ...entityInfo,
            metadata: {
              duration,
              statusCode: context.switchToHttp().getResponse().statusCode,
            },
          });
        }
      }),
    );
  }

  /**
   * Extracts entity information from request and response
   */
  private extractEntityInfo(req: any, response: any): any {
    const path = req.route?.path || req.path || req.url || '';
    const method = req.method;

    // Handle undefined path
    if (!path) {
      console.warn('Warning: Unable to extract path from request');
      return {
        entityType: 'UNKNOWN',
        action: method || 'UNKNOWN',
        entityId: null,
        entityDisplay: null,
      };
    }

    // Parse entity type from path (e.g., /api/positions/:id -> Position)
    const pathParts = path
      .split('/')
      .filter((p: string) => p && !p.startsWith(':'));
    const entityType = pathParts[pathParts.length - 1];

    // Determine action based on HTTP method
    let action: string;
    switch (method) {
      case 'POST':
        action = 'CREATE';
        break;
      case 'PUT':
      case 'PATCH':
        action = 'UPDATE';
        break;
      case 'DELETE':
        action = 'DELETE';
        break;
      default:
        return null;
    }

    // Extract entity ID from response or params
    const entityId = response?.id || req.params?.id || 'unknown';

    return {
      entityType: entityType.charAt(0).toUpperCase() + entityType.slice(1),
      entityId,
      action,
      newValues: method === 'DELETE' ? null : response,
    };
  }
}

/**
 * Decorator for method-level audit logging
 */
export function Audit(action: string, entityType: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const auditService = this.auditService;

      if (!auditService) {
        console.warn('AuditService not found in class instance');
        return method.apply(this, args);
      }

      const result = await method.apply(this, args);

      // Create audit log
      try {
        await auditService.log(
          {
            actorId: args[0]?.user?.clerkUserId || 'SYSTEM',
            module: target.constructor.name,
          },
          {
            entityType,
            entityId: result?.id || 'unknown',
            action,
            newValues: result,
          },
        );
      } catch (error) {
        console.error('Audit logging failed:', error);
      }

      return result;
    };
  };
}
