import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { Injectable, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionAction, PermissionScope } from '@prisma/client';
import PermissionService from '../services/permission.service';

// Extend Fastify Request type to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      profileId: string;
      clerkUserId: string;
      isSuperadmin?: boolean;
    };
    userPermissions?: any[];
  }
}

// Permission metadata keys
export const PERMISSIONS_KEY = 'permissions';
export const REQUIRE_SUPERADMIN_KEY = 'requireSuperadmin';

// Initialize permission service
const permissionService = new PermissionService();

/**
 * Fastify hook to check single permission
 */
export function requirePermission(
  resource: string,
  action: PermissionAction,
  scope?: PermissionScope,
) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction,
  ) => {
    try {
      // Check if user is authenticated
      if (!request.user || !request.user.profileId) {
        reply.code(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const userProfileId = request.user.profileId;

      // Check permission
      const hasPermission = await permissionService.hasPermission(
        userProfileId,
        resource,
        action,
        scope,
      );

      if (!hasPermission) {
        reply.code(403).send({
          success: false,
          error: 'Forbidden',
          message: `You don't have permission to ${action} ${resource}`,
          required: {
            resource,
            action,
            scope: scope || 'any',
          },
        });
        return;
      }

      done();
    } catch (error) {
      console.error('Permission check error:', error);
      reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to check permissions',
      });
    }
  };
}

/**
 * Fastify hook to check multiple permissions (all required)
 */
export function requirePermissions(
  permissions: Array<{
    resource: string;
    action: PermissionAction;
    scope?: PermissionScope;
  }>,
) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction,
  ) => {
    try {
      if (!request.user || !request.user.profileId) {
        reply.code(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const userProfileId = request.user.profileId;

      const hasAllPermissions = await permissionService.hasPermissions(
        userProfileId,
        permissions,
      );

      if (!hasAllPermissions) {
        reply.code(403).send({
          success: false,
          error: 'Forbidden',
          message: "You don't have all required permissions",
          required: permissions,
        });
        return;
      }

      done();
    } catch (error) {
      console.error('Permission check error:', error);
      reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to check permissions',
      });
    }
  };
}

/**
 * Fastify hook to check if user has any of the specified permissions
 */
export function requireAnyPermission(
  permissions: Array<{
    resource: string;
    action: PermissionAction;
    scope?: PermissionScope;
  }>,
) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction,
  ) => {
    try {
      if (!request.user || !request.user.profileId) {
        reply.code(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const userProfileId = request.user.profileId;

      const hasAnyPermission = await permissionService.hasAnyPermission(
        userProfileId,
        permissions,
      );

      if (!hasAnyPermission) {
        reply.code(403).send({
          success: false,
          error: 'Forbidden',
          message: 'You need at least one of the required permissions',
          required: permissions,
        });
        return;
      }

      done();
    } catch (error) {
      console.error('Permission check error:', error);
      reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to check permissions',
      });
    }
  };
}

/**
 * Fastify hook to check resource-specific permission
 */
export function requireResourcePermission(
  resource: string,
  action: PermissionAction,
) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction,
  ) => {
    try {
      if (!request.user || !request.user.profileId) {
        reply.code(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const userProfileId = request.user.profileId;
      const resourceId =
        (request.params as any)?.id || (request.body as any)?.id;

      // Determine scope based on resource ownership
      let scope: PermissionScope = 'ALL';

      // For now, default to DEPARTMENT scope
      scope = 'DEPARTMENT';

      const hasPermission = await permissionService.hasPermission(
        userProfileId,
        resource,
        action,
        scope,
        resourceId,
      );

      if (!hasPermission) {
        reply.code(403).send({
          success: false,
          error: 'Forbidden',
          message: `You don't have permission to ${action} this ${resource}`,
          required: {
            resource,
            action,
            scope,
            resourceId,
          },
        });
        return;
      }

      done();
    } catch (error) {
      console.error('Permission check error:', error);
      reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to check permissions',
      });
    }
  };
}

/**
 * Fastify hook to check if user is superadmin
 */
export function requireSuperadmin() {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction,
  ) => {
    try {
      if (!request.user || !request.user.profileId) {
        reply.code(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      if (!request.user.isSuperadmin) {
        reply.code(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Superadmin access required',
        });
        return;
      }

      done();
    } catch (error) {
      console.error('Superadmin check error:', error);
      reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to check superadmin status',
      });
    }
  };
}

/**
 * Fastify preHandler hook to attach user permissions to request
 */
export async function attachUserPermissions(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction,
) {
  try {
    if (!request.user || !request.user.profileId) {
      done();
      return;
    }

    const permissions = await permissionService.getUserPermissions(
      request.user.profileId,
    );

    // Attach permissions to request for use in controllers
    request.userPermissions = permissions;

    done();
  } catch (error) {
    console.error('Error attaching user permissions:', error);
    // Continue without permissions - don't block the request
    done();
  }
}

/**
 * NestJS Guard for permission checking (works with Fastify)
 */
@Injectable()
export class PermissionGuard {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions = this.reflector.get<
      Array<{
        resource: string;
        action: PermissionAction;
        scope?: PermissionScope;
      }>
    >(PERMISSIONS_KEY, context.getHandler());

    if (!permissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();

    if (!request.user || !request.user.profileId) {
      return false;
    }

    const userProfileId = request.user.profileId;

    // Check if user has all required permissions
    for (const permission of permissions) {
      const hasPermission = await permissionService.hasPermission(
        userProfileId,
        permission.resource,
        permission.action,
        permission.scope,
      );

      if (!hasPermission) {
        return false;
      }
    }

    return true;
  }
}

/**
 * NestJS Guard for superadmin checking
 */
@Injectable()
export class SuperadminGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    if (!request.user || !request.user.profileId) {
      return false;
    }

    return request.user.isSuperadmin || false;
  }
}

/**
 * Decorator for checking permissions (for use with NestJS controllers)
 */
export const RequirePermissions = (
  ...permissions: Array<{
    resource: string;
    action: PermissionAction;
    scope?: PermissionScope;
  }>
) => SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Decorator for requiring superadmin
 */
export const RequireSuperadmin = () =>
  SetMetadata(REQUIRE_SUPERADMIN_KEY, true);

/**
 * Helper function for registering permission hooks in Fastify routes
 */
export function registerPermissionHook(
  fastifyInstance: any,
  path: string,
  method: string,
  resource: string,
  action: PermissionAction,
  scope?: PermissionScope,
) {
  fastifyInstance.addHook(
    'preHandler',
    {
      url: path,
      method: method.toUpperCase(),
    },
    requirePermission(resource, action, scope),
  );
}

// Export permission service for direct use
export { permissionService };

export default {
  requirePermission,
  requirePermissions,
  requireAnyPermission,
  requireResourcePermission,
  requireSuperadmin,
  attachUserPermissions,
  PermissionGuard,
  SuperadminGuard,
  RequirePermissions,
  RequireSuperadmin,
  registerPermissionHook,
  permissionService,
};
