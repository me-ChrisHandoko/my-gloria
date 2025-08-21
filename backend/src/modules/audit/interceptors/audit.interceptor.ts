import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../services/audit.service';
import { AuditAction } from '@prisma/client';
import { Reflector } from '@nestjs/core';

export const AUDIT_METADATA_KEY = 'audit:metadata';
export const SKIP_AUDIT_KEY = 'audit:skip';

export interface AuditMetadata {
  entityType?: string;
  action?: AuditAction;
  entityIdField?: string;
  entityDisplayField?: string;
  module?: string;
  captureOldValues?: boolean;
  captureNewValues?: boolean;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Check if audit should be skipped
    const skipAudit = this.reflector.getAllAndOverride<boolean>(
      SKIP_AUDIT_KEY,
      [handler, controller],
    );

    if (skipAudit) {
      return next.handle();
    }

    // Get audit metadata from decorator
    const metadata =
      this.reflector.getAllAndOverride<AuditMetadata>(AUDIT_METADATA_KEY, [
        handler,
        controller,
      ]) || {};

    // Determine action from HTTP method if not specified
    if (!metadata.action) {
      const method = request.method;
      switch (method) {
        case 'POST':
          metadata.action = AuditAction.CREATE;
          break;
        case 'PUT':
        case 'PATCH':
          metadata.action = AuditAction.UPDATE;
          break;
        case 'DELETE':
          metadata.action = AuditAction.DELETE;
          break;
        default:
          // Skip audit for GET and other read operations
          return next.handle();
      }
    }

    // Extract module from route if not specified
    if (!metadata.module) {
      const route = request.route?.path || request.url;
      const pathParts = route.split('/').filter(Boolean);
      metadata.module = pathParts[2] || 'UNKNOWN';
    }

    // Capture old values for UPDATE and DELETE operations
    let oldValues: any = null;
    if (
      metadata.captureOldValues &&
      (metadata.action === AuditAction.UPDATE ||
        metadata.action === AuditAction.DELETE)
    ) {
      // This would need to be implemented based on your data access pattern
      // For now, we'll store it in request context if available
      oldValues = request.auditOldValues;
    }

    const auditContext = this.auditService.createContextFromRequest(request);

    return next.handle().pipe(
      tap({
        next: (response) => {
          // Skip if no response or read operation
          if (!response || !metadata.action) {
            return;
          }

          // Extract entity information from response
          const entityId = this.extractEntityId(response, metadata, request);
          const entityDisplay = this.extractEntityDisplay(response, metadata);
          const entityType =
            metadata.entityType || this.extractEntityType(request);

          if (!entityId || !entityType) {
            return;
          }

          // Prepare new values
          let newValues: any = null;
          if (
            metadata.captureNewValues &&
            metadata.action !== AuditAction.DELETE
          ) {
            newValues = this.sanitizeValues(response);
          }

          // Log the audit entry asynchronously
          this.auditService
            .log(auditContext, {
              entityType,
              entityId,
              entityDisplay: entityDisplay || undefined,
              action: metadata.action,
              oldValues,
              newValues,
              metadata: {
                endpoint: request.route?.path,
                method: request.method,
                ...this.extractAdditionalMetadata(request, response),
              },
            })
            .catch((error) => {
              console.error(
                'Failed to create audit log in interceptor:',
                error,
              );
            });
        },
        error: (error) => {
          // Log errors as metadata on the existing action
          if (metadata.action && request.user) {
            console.error('Operation failed:', {
              entityType: metadata.entityType || 'UNKNOWN',
              action: metadata.action,
              error: error.message,
              statusCode: error.status,
              endpoint: request.route?.path,
            });
          }
        },
      }),
    );
  }

  private extractEntityId(
    response: any,
    metadata: AuditMetadata,
    request: any,
  ): string | null {
    // Try to extract from response
    if (metadata.entityIdField && response?.[metadata.entityIdField]) {
      return response[metadata.entityIdField];
    }

    // Try common field names
    if (response?.id) {
      return response.id;
    }

    // Try to extract from request params
    if (request.params?.id) {
      return request.params.id;
    }

    // For batch operations, might return array
    if (Array.isArray(response) && response.length === 1) {
      return response[0]?.id;
    }

    return null;
  }

  private extractEntityDisplay(
    response: any,
    metadata: AuditMetadata,
  ): string | null {
    if (
      metadata.entityDisplayField &&
      response?.[metadata.entityDisplayField]
    ) {
      return response[metadata.entityDisplayField];
    }

    // Try common display field names
    const displayFields = [
      'name',
      'title',
      'nama',
      'displayName',
      'description',
    ];
    for (const field of displayFields) {
      if (response?.[field]) {
        return response[field];
      }
    }

    return null;
  }

  private extractEntityType(request: any): string {
    // Extract from route path
    const route = request.route?.path || request.url;
    const pathParts = route.split('/').filter(Boolean);

    // Typically the entity type is the third part of the path
    // e.g., /api/v1/users -> users
    if (pathParts.length >= 3) {
      const entityPart = pathParts[2];
      // Convert to singular PascalCase
      return this.toPascalCase(this.toSingular(entityPart));
    }

    return 'UNKNOWN';
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private toSingular(str: string): string {
    // Simple pluralization rules
    if (str.endsWith('ies')) {
      return str.slice(0, -3) + 'y';
    }
    if (str.endsWith('es')) {
      return str.slice(0, -2);
    }
    if (str.endsWith('s')) {
      return str.slice(0, -1);
    }
    return str;
  }

  private sanitizeValues(values: any): any {
    if (!values) {
      return null;
    }

    // Remove sensitive fields
    const sanitized = { ...values };
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'refreshToken',
      'accessToken',
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Remove system fields that are not relevant for audit
    const systemFields = ['createdAt', 'updatedAt', 'deletedAt'];
    for (const field of systemFields) {
      delete sanitized[field];
    }

    return sanitized;
  }

  private extractAdditionalMetadata(request: any, response: any): any {
    const metadata: any = {};

    // Add query parameters if any
    if (Object.keys(request.query || {}).length > 0) {
      metadata.queryParams = request.query;
    }

    // Add response status if available
    if (response?.statusCode) {
      metadata.statusCode = response.statusCode;
    }

    // Add user roles if available
    if (request.user?.roles) {
      metadata.userRoles = request.user.roles;
    }

    return metadata;
  }
}
