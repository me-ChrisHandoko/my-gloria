# Fastify Permission System Usage Guide

## Overview
This guide shows how to use the permission system with Fastify and NestJS.

## Setup

### 1. Import the Middleware

```typescript
import {
  requirePermission,
  requirePermissions,
  requireAnyPermission,
  requireResourcePermission,
  requireSuperadmin,
  attachUserPermissions,
  PermissionGuard,
  SuperadminGuard,
  RequirePermissions,
  RequireSuperadmin
} from './middleware/permission.fastify.middleware';
```

## Usage Methods

### Method 1: Using Fastify Hooks (Pure Fastify)

```typescript
// In your Fastify route definitions
fastify.route({
  method: 'POST',
  url: '/api/workorders',
  preHandler: requirePermission('workorder', 'CREATE', 'DEPARTMENT'),
  handler: async (request, reply) => {
    // Your handler logic
  }
});

// Multiple permissions
fastify.route({
  method: 'PUT',
  url: '/api/kpi/:id',
  preHandler: requirePermissions([
    { resource: 'kpi', action: 'UPDATE', scope: 'OWN' },
    { resource: 'kpi', action: 'APPROVE', scope: 'DEPARTMENT' }
  ]),
  handler: async (request, reply) => {
    // Your handler logic
  }
});

// Any permission
fastify.route({
  method: 'GET',
  url: '/api/reports',
  preHandler: requireAnyPermission([
    { resource: 'report', action: 'READ', scope: 'DEPARTMENT' },
    { resource: 'report', action: 'EXPORT', scope: 'OWN' }
  ]),
  handler: async (request, reply) => {
    // Your handler logic
  }
});

// Superadmin only
fastify.route({
  method: 'DELETE',
  url: '/api/users/:id',
  preHandler: requireSuperadmin(),
  handler: async (request, reply) => {
    // Your handler logic
  }
});

// Attach user permissions to request
fastify.addHook('preHandler', attachUserPermissions);
```

### Method 2: Using NestJS Controllers with Guards

```typescript
import { Controller, Get, Post, Put, Delete, UseGuards } from '@nestjs/common';
import { 
  PermissionGuard, 
  SuperadminGuard,
  RequirePermissions,
  RequireSuperadmin 
} from './middleware/permission.fastify.middleware';

@Controller('workorders')
@UseGuards(PermissionGuard)
export class WorkOrderController {
  
  @Post()
  @RequirePermissions(
    { resource: 'workorder', action: 'CREATE', scope: 'DEPARTMENT' }
  )
  async create() {
    // Create work order
  }

  @Put(':id')
  @RequirePermissions(
    { resource: 'workorder', action: 'UPDATE', scope: 'OWN' }
  )
  async update() {
    // Update work order
  }

  @Delete(':id')
  @UseGuards(SuperadminGuard)
  async delete() {
    // Delete work order (superadmin only)
  }

  @Get('export')
  @RequirePermissions(
    { resource: 'workorder', action: 'EXPORT', scope: 'DEPARTMENT' },
    { resource: 'report', action: 'CREATE', scope: 'DEPARTMENT' }
  )
  async export() {
    // Export work orders (requires multiple permissions)
  }
}
```

### Method 3: Using in NestJS Module Setup

```typescript
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionGuard } from './middleware/permission.fastify.middleware';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Global permission attachment
    consumer
      .apply(attachUserPermissions)
      .forRoutes('*');
  }
}
```

### Method 4: Direct Service Usage in Controllers

```typescript
import { Injectable } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { permissionService } from './middleware/permission.fastify.middleware';

@Injectable()
export class SomeService {
  async handleRequest(request: FastifyRequest, reply: FastifyReply) {
    const userProfileId = request.user?.profileId;
    
    if (!userProfileId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Direct permission check
    const hasPermission = await permissionService.hasPermission(
      userProfileId,
      'resource',
      'ACTION',
      'SCOPE'
    );

    if (!hasPermission) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // Your logic here
  }

  // Check multiple permissions
  async checkMultiple(userProfileId: string) {
    const permissions = [
      { resource: 'workorder', action: 'CREATE', scope: 'DEPARTMENT' },
      { resource: 'workorder', action: 'APPROVE', scope: 'DEPARTMENT' }
    ];

    return await permissionService.hasPermissions(userProfileId, permissions);
  }

  // Get all user permissions
  async getUserPerms(userProfileId: string) {
    return await permissionService.getUserPermissions(userProfileId);
  }

  // Invalidate cache after permission change
  async updatePermissions(userProfileId: string) {
    // Update permissions...
    await permissionService.invalidateCache(userProfileId);
  }
}
```

## Permission Scopes

- **OWN**: User can only access their own resources
- **DEPARTMENT**: User can access resources in their department
- **SCHOOL**: User can access resources in their school
- **ALL**: User can access all resources system-wide

## Permission Actions

- **CREATE**: Create new resources
- **READ**: View resources
- **UPDATE**: Modify existing resources
- **DELETE**: Remove resources
- **APPROVE**: Approve requests or changes
- **EXPORT**: Export data
- **IMPORT**: Import data
- **PRINT**: Print resources
- **ASSIGN**: Assign resources to users
- **CLOSE**: Close or finalize resources

## Example Route Registration

```typescript
// app.module.ts or routes file
import { FastifyInstance } from 'fastify';
import { registerPermissionHook } from './middleware/permission.fastify.middleware';

export function registerRoutes(fastify: FastifyInstance) {
  // Register permission hooks for specific routes
  registerPermissionHook(
    fastify,
    '/api/workorders',
    'POST',
    'workorder',
    'CREATE',
    'DEPARTMENT'
  );

  registerPermissionHook(
    fastify,
    '/api/workorders/:id',
    'PUT',
    'workorder',
    'UPDATE',
    'OWN'
  );

  registerPermissionHook(
    fastify,
    '/api/workorders/:id',
    'DELETE',
    'workorder',
    'DELETE',
    'DEPARTMENT'
  );

  // Your route handlers
  fastify.post('/api/workorders', async (request, reply) => {
    // Handler logic
  });

  fastify.put('/api/workorders/:id', async (request, reply) => {
    // Handler logic
  });

  fastify.delete('/api/workorders/:id', async (request, reply) => {
    // Handler logic
  });
}
```

## Testing Permissions

```typescript
// In your tests
import { permissionService } from './middleware/permission.fastify.middleware';

describe('Permission Tests', () => {
  it('should check user permission', async () => {
    const hasPermission = await permissionService.hasPermission(
      'user-profile-id',
      'workorder',
      'CREATE',
      'DEPARTMENT'
    );
    
    expect(hasPermission).toBeDefined();
  });

  it('should invalidate cache', async () => {
    await permissionService.invalidateCache('user-profile-id');
  });
});
```

## Error Responses

The middleware returns standardized error responses:

```json
// 401 Unauthorized
{
  "success": false,
  "error": "Unauthorized",
  "message": "Authentication required"
}

// 403 Forbidden
{
  "success": false,
  "error": "Forbidden",
  "message": "You don't have permission to CREATE workorder",
  "required": {
    "resource": "workorder",
    "action": "CREATE",
    "scope": "DEPARTMENT"
  }
}

// 500 Internal Server Error
{
  "success": false,
  "error": "Internal Server Error",
  "message": "Failed to check permissions"
}
```

## Performance Tips

1. **Use Permission Cache**: The system automatically caches permissions for 5 minutes
2. **Batch Permission Checks**: Use `hasPermissions()` for multiple checks
3. **Invalidate Cache**: Call `invalidateCache()` after permission changes
4. **Attach Permissions Once**: Use `attachUserPermissions` globally to avoid repeated queries

## Migration from Express

If migrating from Express middleware:

1. Replace `Request, Response, NextFunction` with `FastifyRequest, FastifyReply, HookHandlerDoneFunction`
2. Replace `res.status(code).json()` with `reply.code(code).send()`
3. Replace `next()` with `done()`
4. Use `preHandler` hooks instead of Express middleware
5. For NestJS, use Guards with decorators instead of middleware