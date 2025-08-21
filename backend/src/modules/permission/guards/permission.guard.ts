import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../services/permission.service';
import {
  PERMISSIONS_KEY,
  PERMISSION_SCOPE_KEY,
  PERMISSION_MODE_KEY,
} from '../decorators/permission.decorator';
import { PermissionAction, PermissionScope } from '@prisma/client';

export interface RequiredPermission {
  resource: string;
  action: PermissionAction;
  scope?: PermissionScope;
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<
      RequiredPermission[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required
    }

    // Get permission scope override if any
    const scopeOverride = this.reflector.getAllAndOverride<PermissionScope>(
      PERMISSION_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Get permission mode (ANY or ALL)
    const mode =
      this.reflector.getAllAndOverride<'ANY' | 'ALL'>(PERMISSION_MODE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || 'ALL';

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.profileId) {
      throw new ForbiddenException('User profile not found');
    }

    // Check if user is superadmin (bypass all permission checks)
    if (user.isSuperadmin) {
      return true;
    }

    const userId = user.profileId;
    const resourceId = this.extractResourceId(request);

    // Check permissions based on mode
    if (mode === 'ANY') {
      // User needs at least one of the required permissions
      for (const permission of requiredPermissions) {
        const result = await this.permissionService.checkPermission({
          userId,
          resource: permission.resource,
          action: permission.action,
          scope: scopeOverride || permission.scope,
          resourceId,
        });

        if (result.isAllowed) {
          // Store permission check result in request for logging
          request.permissionCheckResult = result;
          return true;
        }
      }

      throw new ForbiddenException('Insufficient permissions');
    } else {
      // User needs all required permissions (ALL mode)
      const deniedPermissions: string[] = [];

      for (const permission of requiredPermissions) {
        const result = await this.permissionService.checkPermission({
          userId,
          resource: permission.resource,
          action: permission.action,
          scope: scopeOverride || permission.scope,
          resourceId,
        });

        if (!result.isAllowed) {
          deniedPermissions.push(
            `${permission.resource}.${permission.action}${permission.scope ? `.${permission.scope}` : ''}`,
          );
        }
      }

      if (deniedPermissions.length > 0) {
        throw new ForbiddenException({
          message: 'Insufficient permissions',
          denied: deniedPermissions,
        });
      }

      return true;
    }
  }

  private extractResourceId(request: any): string | undefined {
    // Try to extract resource ID from different sources
    // 1. From route params (e.g., /api/workorders/:id)
    if (request.params?.id) {
      return request.params.id;
    }

    // 2. From query params (e.g., ?resourceId=123)
    if (request.query?.resourceId) {
      return request.query.resourceId;
    }

    // 3. From body (e.g., for batch operations)
    if (request.body?.resourceId) {
      return request.body.resourceId;
    }

    return undefined;
  }
}
