# RLS Implementation Workflow for Production

## Overview

This workflow guide provides a phase-by-phase approach to implement Row-Level Security (RLS) best practices for the Gloria system. Since this is a new system, we have the opportunity to implement RLS correctly from the start.

## Goals

- **Security**: Automatic row-level filtering at database level
- **Consistency**: Single security pattern across all modules
- **Maintainability**: Minimal code duplication and clear patterns
- **Scalability**: Easy addition of new modules
- **Compliance**: Complete audit trail for all operations

## Phase 1: Foundation Setup (Week 1)

### 1.1 Enable RLS Infrastructure

**Task**: Activate RLS middleware, error handlers, and core services

```typescript
// src/app.module.ts
import { RLSContextMiddleware } from './middleware/rls-context.middleware';
import { RLSExceptionFilter } from './common/exceptions/rls-error.handler';
import { RLSErrorInterceptor } from './common/interceptors/rls-error.interceptor';

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ClerkAuthMiddleware)
      .forRoutes('*')
      .apply(RLSContextMiddleware) // Uncomment this line
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

// main.ts - Add global error handling
import { RLSExceptionFilter } from './common/exceptions/rls-error.handler';
import { RLSErrorInterceptor } from './common/interceptors/rls-error.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Global error filter for RLS errors
  app.useGlobalFilters(new RLSExceptionFilter());
  
  // Global interceptor for transforming errors
  app.useGlobalInterceptors(new RLSErrorInterceptor());
  
  await app.listen(3001);
}
```

**Validation**:
```bash
npm run rls:validate
npm run rls:status
```

### 1.2 Create Base Service Pattern

**Task**: Create base service class with RLS integration and proper error handling

```typescript
// src/common/services/base-rls.service.ts
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';

@Injectable()
export abstract class BaseRLSService {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Execute database operations with RLS context
   * All queries within this method will have RLS automatically applied
   */
  protected async executeWithRLS<T>(
    operation: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction'>) => Promise<T>
  ): Promise<T> {
    try {
      return await this.prisma.executeWithRLS(operation);
    } catch (error) {
      // Handle RLS access denied errors
      if (this.isAccessDeniedError(error)) {
        throw new ForbiddenException({
          statusCode: 403,
          message: 'You do not have permission to perform this action',
          error: 'ACCESS_DENIED',
          details: 'Your current role or position does not grant access to this resource',
        });
      }
      
      // Handle record not found (which might be due to RLS filtering)
      if (this.isRecordNotFoundError(error)) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'Resource not found or you do not have permission to access it',
          error: 'NOT_FOUND_OR_NO_ACCESS',
        });
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Execute system operations that bypass RLS
   * Use only for system-level operations that require full access
   */
  protected async executeAsSystem<T>(
    operation: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction'>) => Promise<T>,
    reason: string
  ): Promise<T> {
    // Log the bypass for audit
    console.warn(`RLS Bypass: ${reason}`);
    return this.prisma.bypassRLS(operation);
  }

  /**
   * Check if error is due to RLS access denial
   */
  private isAccessDeniedError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';
    return (
      errorMessage.includes('row-level security') ||
      errorMessage.includes('row level security') ||
      errorMessage.includes('permission denied') ||
      errorMessage.includes('access denied') ||
      error.code === 'P2003' // Prisma foreign key constraint (might be RLS)
    );
  }

  /**
   * Check if error is due to record not found
   */
  private isRecordNotFoundError(error: any): boolean {
    return (
      error.code === 'P2025' || // Prisma record not found
      error.code === 'P2001' || // Prisma record not found in required relation
      error.message?.includes('Record not found')
    );
  }

  /**
   * Format error message based on user context
   */
  protected formatAccessError(action: string, resource: string): string {
    const actionMessages = {
      read: 'view',
      create: 'create',
      update: 'modify',
      delete: 'delete',
    };

    const actionVerb = actionMessages[action.toLowerCase()] || action;
    return `You do not have permission to ${actionVerb} this ${resource}`;
  }
}
```

### 1.3 Update Prisma Service

**Task**: Enhance Prisma service with better RLS support

```typescript
// src/prisma/prisma.service.ts - Add these methods
async executeWithRLS<T>(callback: (tx: any) => Promise<T>): Promise<T> {
  const context = PrismaService.asyncLocalStorage.getStore();
  
  if (!context?.userContext) {
    throw new Error('No RLS context available. Ensure RLSContextMiddleware is applied.');
  }

  return this.$transaction(async (tx) => {
    // Set the session variable for RLS
    const userContextJson = JSON.stringify(context.userContext);
    await tx.$executeRawUnsafe(
      `SET LOCAL app.user_context = ?`,
      userContextJson
    );
    
    // Execute the callback with transaction client
    return callback(tx);
  }, {
    isolationLevel: 'ReadCommitted',
    timeout: 10000,
  });
}
```

### 1.4 Create RLS Error Handler

**Task**: Create centralized error handler for RLS

```typescript
// src/common/exceptions/rls-error.handler.ts
import { 
  ExceptionFilter, 
  Catch, 
  ArgumentsHost, 
  HttpException,
  HttpStatus 
} from '@nestjs/common';
import { Response } from 'express';

interface RLSErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  details?: string;
  suggestion?: string;
  timestamp: string;
  path: string;
}

@Catch()
export class RLSExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: RLSErrorResponse = {
      statusCode: status,
      message: 'Internal server error',
      error: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Handle HTTP exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      
      errorResponse = {
        ...errorResponse,
        statusCode: status,
        message: exceptionResponse.message || exception.message,
        error: exceptionResponse.error || 'ERROR',
        details: exceptionResponse.details,
      };
    } 
    // Handle PostgreSQL RLS errors
    else if (this.isPostgreSQLRLSError(exception)) {
      status = HttpStatus.FORBIDDEN;
      errorResponse = {
        statusCode: status,
        message: 'Access denied: You do not have permission to access this resource',
        error: 'RLS_ACCESS_DENIED',
        details: 'Your current role or organizational position restricts access to this data',
        suggestion: 'Please contact your administrator if you believe you should have access',
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    }
    // Handle Prisma errors that might be RLS-related
    else if (exception.code === 'P2025') {
      status = HttpStatus.NOT_FOUND;
      errorResponse = {
        statusCode: status,
        message: 'Resource not found or access denied',
        error: 'NOT_FOUND_OR_FORBIDDEN',
        details: 'The requested resource does not exist or you do not have permission to access it',
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    }

    // Log the error for monitoring
    this.logError(exception, request, errorResponse);

    response.status(status).json(errorResponse);
  }

  private isPostgreSQLRLSError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    return (
      message.includes('row-level security') ||
      message.includes('row level security') ||
      message.includes('violates row-level security policy') ||
      (error.code === '42501' && message.includes('rls')) // PostgreSQL insufficient privilege
    );
  }

  private logError(exception: any, request: any, errorResponse: RLSErrorResponse) {
    console.error('RLS Error:', {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      user: request.user?.clerkUserId,
      error: errorResponse.error,
      message: exception.message,
      stack: exception.stack,
    });
  }
}

// src/common/interceptors/rls-error.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class RLSErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // Transform database errors to user-friendly messages
        if (this.isDatabaseAccessError(error)) {
          const request = context.switchToHttp().getRequest();
          const resource = this.extractResourceFromUrl(request.url);
          const action = this.getActionFromMethod(request.method);
          
          throw new ForbiddenException({
            statusCode: 403,
            message: `You do not have permission to ${action} ${resource}`,
            error: 'ACCESS_DENIED',
            details: this.getContextualErrorMessage(action, resource, request.user),
          });
        }
        
        return throwError(() => error);
      }),
    );
  }

  private isDatabaseAccessError(error: any): boolean {
    return (
      error.code === 'P2003' || // Foreign key constraint
      error.code === '42501' || // PostgreSQL insufficient privilege
      error.message?.includes('violates row-level security')
    );
  }

  private extractResourceFromUrl(url: string): string {
    const parts = url.split('/').filter(Boolean);
    if (parts.length >= 3) {
      return parts[2]; // e.g., /api/v1/schools -> schools
    }
    return 'resource';
  }

  private getActionFromMethod(method: string): string {
    const actions = {
      GET: 'view',
      POST: 'create',
      PUT: 'update',
      PATCH: 'update',
      DELETE: 'delete',
    };
    return actions[method] || 'access';
  }

  private getContextualErrorMessage(
    action: string, 
    resource: string, 
    user: any
  ): string {
    if (!user?.userProfileId) {
      return 'Please complete your user profile to access this feature';
    }

    const contextMessages = {
      schools: {
        view: 'You can only view schools where you have an active position',
        create: 'Only system administrators can create new schools',
        update: 'You can only update schools where you have a management position',
        delete: 'Only system administrators can delete schools',
      },
      departments: {
        view: 'You can only view departments within your assigned schools',
        create: 'You need school-level permissions to create departments',
        update: 'You can only update departments where you have a leadership role',
        delete: 'Department deletion requires school-level administrative rights',
      },
      positions: {
        view: 'You can only view positions within your organizational scope',
        create: 'Position creation requires department-level management rights',
        update: 'You can only update positions within your department',
        delete: 'Position deletion requires department-level administrative rights',
      },
    };

    return contextMessages[resource]?.[action] || 
      `Your current organizational role does not permit this action on ${resource}`;
  }
}
```

### 1.5 Create RLS Testing Framework

**Task**: Set up automated RLS testing with error scenarios

```typescript
// src/security/rls-test.helper.ts
export class RLSTestHelper {
  static async testAsUser(
    prisma: PrismaService,
    userId: string,
    testFn: () => Promise<void>
  ) {
    const context = await prisma.rlsService.getUserContext(userId);
    await prisma.withRLSContext(context, testFn);
  }

  static async expectAccessDenied(operation: () => Promise<any>) {
    await expect(operation()).rejects.toThrow(/access denied|permission denied/i);
  }

  static async expectAccessGranted(operation: () => Promise<any>) {
    await expect(operation()).resolves.toBeDefined();
  }
}
```

## Phase 2: Module Migration Pattern (Week 2-3)

### 2.1 Create Module Template

**Task**: Create a template for new modules with RLS built-in

```typescript
// templates/module-with-rls.template.ts
import { Injectable } from '@nestjs/common';
import { BaseRLSService } from '../../../common/services/base-rls.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/services/audit.service';

@Injectable()
export class __MODULE_NAME__Service extends BaseRLSService {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    super(prisma);
  }

  async findAll() {
    return this.executeWithRLS(async (tx) => {
      return tx.__tableName__.findMany({
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async findOne(id: string) {
    return this.executeWithRLS(async (tx) => {
      const result = await tx.__tableName__.findUnique({
        where: { id },
      });
      
      if (!result) {
        // This could be due to RLS filtering or actual non-existence
        throw new NotFoundException({
          statusCode: 404,
          message: '__EntityName__ not found or access denied',
          error: 'NOT_FOUND_OR_NO_ACCESS',
          details: 'The requested resource does not exist or you do not have permission to view it',
        });
      }
      
      return result;
    });
  }

  async create(data: Create__EntityName__Dto, userId: string) {
    return this.executeWithRLS(async (tx) => {
      const entity = await tx.__tableName__.create({
        data: {
          ...data,
          createdBy: userId,
        },
      });

      await this.auditService.logCreate(
        { actorId: userId, module: '__MODULE__' },
        '__EntityName__',
        entity.id,
        entity
      );

      return entity;
    });
  }

  async update(id: string, data: Update__EntityName__Dto, userId: string) {
    return this.executeWithRLS(async (tx) => {
      const oldEntity = await tx.__tableName__.findUnique({
        where: { id },
      });

      if (!oldEntity) {
        throw new NotFoundException('__EntityName__ not found');
      }

      const updated = await tx.__tableName__.update({
        where: { id },
        data: {
          ...data,
          modifiedBy: userId,
          modifiedAt: new Date(),
        },
      });

      await this.auditService.logUpdate(
        { actorId: userId, module: '__MODULE__' },
        '__EntityName__',
        id,
        oldEntity,
        updated
      );

      return updated;
    });
  }

  async delete(id: string, userId: string) {
    return this.executeWithRLS(async (tx) => {
      const entity = await tx.__tableName__.findUnique({
        where: { id },
      });

      if (!entity) {
        throw new NotFoundException('__EntityName__ not found');
      }

      await tx.__tableName__.delete({
        where: { id },
      });

      await this.auditService.logDelete(
        { actorId: userId, module: '__MODULE__' },
        '__EntityName__',
        id,
        entity
      );
    });
  }
}
```

### 2.2 Migrate Existing Modules

**Task**: Gradually migrate existing modules to use RLS

**Priority Order**:
1. Organization module (schools, departments, positions)
2. Permission module (roles, permissions)
3. User module (profiles, positions)
4. Other modules

**Migration Steps for Each Module**:

```typescript
// Example: Migrating SchoolService
// src/modules/organization/services/school.service.ts

@Injectable()
export class SchoolService extends BaseRLSService {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    super(prisma);
  }

  async findAll(filters?: SchoolFilterDto) {
    return this.executeWithRLS(async (tx) => {
      // RLS automatically filters based on user context
      return tx.school.findMany({
        where: filters ? this.buildWhereClause(filters) : undefined,
        include: {
          departments: { where: { isActive: true } },
          positions: { where: { isActive: true } },
        },
        orderBy: { name: 'asc' },
      });
    });
  }

  // System operations that need full access
  async syncFromMasterData(userId: string) {
    return this.executeAsSystem(async (tx) => {
      // Full access for data synchronization
      const masterData = await tx.dataKaryawan.findMany({
        distinct: ['lokasi'],
        where: { lokasi: { not: null } },
      });
      
      // Sync logic here...
    }, 'Master data synchronization requires full access');
  }
}
```

### 2.3 Create RLS Policies for Each Module

**Task**: Add database RLS policies for new tables

```sql
-- migrations/add_new_module_rls.sql
-- Example for a new module table

-- Enable RLS
ALTER TABLE gloria_ops.new_module_table ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
CREATE POLICY new_module_select_policy ON gloria_ops.new_module_table
    FOR SELECT
    USING (
        gloria_ops.is_superadmin() 
        OR 
        -- Add module-specific logic here
        gloria_ops.get_permission_scope('new_module', 'read') IN ('DEPARTMENT', 'SCHOOL', 'ALL')
        OR
        created_by = gloria_ops.current_user_profile_id()
    );

-- INSERT Policy
CREATE POLICY new_module_insert_policy ON gloria_ops.new_module_table
    FOR INSERT
    WITH CHECK (
        gloria_ops.is_superadmin()
        OR
        gloria_ops.get_permission_scope('new_module', 'create') != 'NONE'
    );

-- UPDATE Policy
CREATE POLICY new_module_update_policy ON gloria_ops.new_module_table
    FOR UPDATE
    USING (
        gloria_ops.is_superadmin()
        OR
        (
            gloria_ops.get_permission_scope('new_module', 'update') != 'NONE'
            AND (
                created_by = gloria_ops.current_user_profile_id()
                OR gloria_ops.get_permission_scope('new_module', 'update') IN ('DEPARTMENT', 'SCHOOL', 'ALL')
            )
        )
    );

-- DELETE Policy
CREATE POLICY new_module_delete_policy ON gloria_ops.new_module_table
    FOR DELETE
    USING (
        gloria_ops.is_superadmin()
        OR
        gloria_ops.get_permission_scope('new_module', 'delete') = 'ALL'
    );

-- Create indexes for performance
CREATE INDEX idx_new_module_created_by ON gloria_ops.new_module_table(created_by);
CREATE INDEX idx_new_module_active ON gloria_ops.new_module_table(is_active) WHERE is_active = true;
```

## Phase 3: Testing & Validation (Week 4)

### 3.1 Create RLS Test Suite

**Task**: Comprehensive testing for each module

```typescript
// src/modules/organization/tests/school.service.rls.spec.ts
describe('SchoolService RLS Tests', () => {
  let service: SchoolService;
  let prisma: PrismaService;

  beforeEach(async () => {
    // Setup test module
  });

  describe('Data Access Control', () => {
    it('should only return schools user has access to', async () => {
      // Create test data
      const school1 = await createTestSchool('School 1');
      const school2 = await createTestSchool('School 2');
      
      // Test as user with access to school1 only
      await RLSTestHelper.testAsUser(prisma, 'user-with-school1', async () => {
        const schools = await service.findAll();
        expect(schools).toHaveLength(1);
        expect(schools[0].id).toBe(school1.id);
      });
    });

    it('should deny access to unauthorized operations with proper error message', async () => {
      await RLSTestHelper.testAsUser(prisma, 'regular-user', async () => {
        try {
          await service.delete('some-school-id', 'regular-user');
          fail('Should have thrown ForbiddenException');
        } catch (error) {
          expect(error).toBeInstanceOf(ForbiddenException);
          expect(error.response).toEqual({
            statusCode: 403,
            message: 'You do not have permission to perform this action',
            error: 'ACCESS_DENIED',
            details: 'Your current role or position does not grant access to this resource',
          });
        }
      });
    });

    it('should return user-friendly error for non-existent resources', async () => {
      await RLSTestHelper.testAsUser(prisma, 'regular-user', async () => {
        try {
          await service.findOne('non-existent-id');
          fail('Should have thrown NotFoundException');
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          expect(error.response).toEqual({
            statusCode: 404,
            message: 'Resource not found or you do not have permission to access it',
            error: 'NOT_FOUND_OR_NO_ACCESS',
          });
        }
      });
    });

    it('superadmin should have full access', async () => {
      await RLSTestHelper.testAsUser(prisma, 'superadmin-user', async () => {
        const schools = await service.findAll();
        expect(schools.length).toBeGreaterThan(0);
        
        await RLSTestHelper.expectAccessGranted(() =>
          service.create({ name: 'New School' }, 'superadmin-user')
        );
      });
    });
  });
});
```

### 3.2 Performance Testing

**Task**: Ensure RLS doesn't degrade performance

```typescript
// src/security/rls-performance.test.ts
describe('RLS Performance Tests', () => {
  it('should maintain query performance with RLS', async () => {
    const startTime = Date.now();
    
    await RLSTestHelper.testAsUser(prisma, 'test-user', async () => {
      // Run typical queries
      await prisma.school.findMany();
      await prisma.department.findMany();
      await prisma.position.findMany();
    });
    
    const executionTime = Date.now() - startTime;
    expect(executionTime).toBeLessThan(100); // Should complete within 100ms
  });

  it('should use indexes effectively', async () => {
    const explainResult = await prisma.$queryRaw`
      EXPLAIN (ANALYZE, BUFFERS) 
      SELECT * FROM gloria_ops.schools 
      WHERE id = ANY(gloria_ops.user_school_ids())
    `;
    
    // Verify index usage
    expect(explainResult).toContain('Index Scan');
  });
});
```

## Phase 4: Monitoring & Optimization (Week 5)

### 4.1 Create RLS Dashboard

**Task**: Implement monitoring for RLS operations

```typescript
// src/security/rls-monitoring.service.ts
@Injectable()
export class RLSMonitoringService {
  private metrics = {
    totalQueries: 0,
    rlsFilteredQueries: 0,
    bypassedQueries: 0,
    averageFilterTime: 0,
    slowQueries: [],
  };

  async trackQuery(queryInfo: {
    operation: string;
    duration: number;
    hasRLSContext: boolean;
    rowsReturned: number;
  }) {
    this.metrics.totalQueries++;
    
    if (queryInfo.hasRLSContext) {
      this.metrics.rlsFilteredQueries++;
    } else {
      this.metrics.bypassedQueries++;
    }

    if (queryInfo.duration > 100) {
      this.metrics.slowQueries.push({
        ...queryInfo,
        timestamp: new Date(),
      });
    }

    // Update average
    this.metrics.averageFilterTime = 
      (this.metrics.averageFilterTime * (this.metrics.totalQueries - 1) + queryInfo.duration) 
      / this.metrics.totalQueries;
  }

  async getMetrics() {
    return {
      ...this.metrics,
      rlsEffectiveness: (this.metrics.rlsFilteredQueries / this.metrics.totalQueries) * 100,
      performanceHealth: this.metrics.averageFilterTime < 50 ? 'Good' : 'Needs Optimization',
    };
  }
}
```

### 4.2 Create Health Check Endpoint

**Task**: Monitor RLS health

```typescript
// src/security/rls-health.controller.ts
@Controller('system/rls-health')
@UseGuards(SuperadminGuard)
export class RLSHealthController {
  constructor(
    private readonly rlsHelper: RLSHelperService,
    private readonly monitoring: RLSMonitoringService,
  ) {}

  @Get()
  async checkHealth() {
    const [setup, metrics, sampleTest] = await Promise.all([
      this.rlsHelper.validateRLSSetup(),
      this.monitoring.getMetrics(),
      this.testSampleUser(),
    ]);

    return {
      status: setup.isValid ? 'healthy' : 'unhealthy',
      setup,
      metrics,
      sampleTest,
      recommendations: this.generateRecommendations(setup, metrics),
    };
  }

  private async testSampleUser() {
    try {
      const testUserId = 'test-user-id';
      const access = await this.rlsHelper.testUserAccess(testUserId, 'schools');
      return { success: true, access };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private generateRecommendations(setup: any, metrics: any) {
    const recommendations = [];

    if (setup.missingFunctions.length > 0) {
      recommendations.push({
        severity: 'high',
        message: `Missing RLS functions: ${setup.missingFunctions.join(', ')}`,
        action: 'Run npm run rls:setup',
      });
    }

    if (metrics.bypassedQueries > metrics.rlsFilteredQueries * 0.1) {
      recommendations.push({
        severity: 'medium',
        message: 'High number of RLS bypasses detected',
        action: 'Review bypass reasons and minimize system operations',
      });
    }

    if (metrics.averageFilterTime > 50) {
      recommendations.push({
        severity: 'medium',
        message: 'RLS queries are slower than optimal',
        action: 'Review indexes and optimize RLS policies',
      });
    }

    return recommendations;
  }
}
```

## Phase 5: Error Handling & User Experience

### 5.1 Implement Comprehensive Error Handling

**Task**: Ensure all RLS errors are user-friendly

```typescript
// src/common/dto/error-response.dto.ts
export class RLSErrorResponseDto {
  @ApiProperty({ example: 403 })
  statusCode: number;

  @ApiProperty({ example: 'You do not have permission to perform this action' })
  message: string;

  @ApiProperty({ example: 'ACCESS_DENIED' })
  error: string;

  @ApiProperty({ 
    example: 'Your current role or position does not grant access to this resource',
    required: false 
  })
  details?: string;

  @ApiProperty({ 
    example: 'Please contact your administrator if you believe you should have access',
    required: false 
  })
  suggestion?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/v1/schools/123' })
  path: string;
}
```

### 5.2 Frontend Error Handling

**Task**: Handle RLS errors gracefully in the frontend

```typescript
// frontend/src/lib/api-error-handler.ts
export class APIErrorHandler {
  static handle(error: any): string {
    if (error.response?.status === 403) {
      const errorData = error.response.data;
      
      // RLS access denied
      if (errorData.error === 'ACCESS_DENIED' || errorData.error === 'RLS_ACCESS_DENIED') {
        return errorData.details || 'You do not have permission to access this resource';
      }
    }
    
    if (error.response?.status === 404) {
      const errorData = error.response.data;
      
      // Could be RLS filtering
      if (errorData.error === 'NOT_FOUND_OR_NO_ACCESS') {
        return 'This resource does not exist or you do not have permission to view it';
      }
    }
    
    // Default error message
    return error.response?.data?.message || 'An unexpected error occurred';
  }
  
  static getSuggestion(error: any): string | null {
    return error.response?.data?.suggestion || null;
  }
  
  static shouldShowContactAdmin(error: any): boolean {
    return error.response?.status === 403 && 
           error.response?.data?.error === 'ACCESS_DENIED';
  }
}

// Usage in React component
import { toast } from 'sonner';

const handleDelete = async (id: string) => {
  try {
    await deleteSchool(id);
    toast.success('School deleted successfully');
  } catch (error) {
    const message = APIErrorHandler.handle(error);
    const suggestion = APIErrorHandler.getSuggestion(error);
    
    toast.error(message, {
      description: suggestion,
      action: APIErrorHandler.shouldShowContactAdmin(error) ? {
        label: 'Contact Admin',
        onClick: () => navigate('/support/contact'),
      } : undefined,
    });
  }
};
```

### 5.3 Error Message Localization

**Task**: Support multiple languages for error messages

```typescript
// src/common/i18n/error-messages.ts
export const RLS_ERROR_MESSAGES = {
  en: {
    ACCESS_DENIED: 'You do not have permission to perform this action',
    NOT_FOUND_OR_NO_ACCESS: 'Resource not found or access denied',
    NO_PROFILE: 'Please complete your user profile to access this feature',
    SUGGESTIONS: {
      CONTACT_ADMIN: 'Please contact your administrator if you believe you should have access',
      CHECK_PERMISSIONS: 'Check with your supervisor about your access permissions',
      PROFILE_INCOMPLETE: 'Complete your profile in the settings page',
    },
  },
  id: {
    ACCESS_DENIED: 'Anda tidak memiliki izin untuk melakukan tindakan ini',
    NOT_FOUND_OR_NO_ACCESS: 'Sumber daya tidak ditemukan atau akses ditolak',
    NO_PROFILE: 'Silakan lengkapi profil pengguna Anda untuk mengakses fitur ini',
    SUGGESTIONS: {
      CONTACT_ADMIN: 'Silakan hubungi administrator jika Anda merasa seharusnya memiliki akses',
      CHECK_PERMISSIONS: 'Periksa dengan supervisor Anda tentang izin akses Anda',
      PROFILE_INCOMPLETE: 'Lengkapi profil Anda di halaman pengaturan',
    },
  },
};
```

## Phase 6: Documentation & Training (Week 6-7)

### 6.1 Create Developer Guide

**Task**: Comprehensive documentation for developers

```markdown
# RLS Developer Guide

## Quick Start

1. All new services must extend `BaseRLSService`
2. Use `executeWithRLS()` for all database operations
3. Only use `executeAsSystem()` with proper justification
4. Test with different user contexts

## Examples

### Basic CRUD with RLS
[Include examples]

### Testing RLS
[Include test examples]

### Common Patterns
[Include patterns]

## Troubleshooting

### "No RLS context" Error
- Ensure RLSContextMiddleware is enabled
- Check if user is authenticated

### Performance Issues
- Check indexes
- Review RLS policies complexity
- Use query explain plans
```

### 6.2 Create Operation Runbook

**Task**: Operational procedures for production

```markdown
# RLS Operations Runbook

## Daily Checks
- [ ] Monitor RLS health endpoint
- [ ] Check slow query logs
- [ ] Review bypass audit logs

## Weekly Tasks
- [ ] Analyze RLS metrics trends
- [ ] Review new module implementations
- [ ] Update RLS policies if needed

## Emergency Procedures

### Disable RLS (Emergency Only)
1. Set environment variable: `RLS_EMERGENCY_BYPASS=true`
2. Restart application
3. Create incident report

### Performance Degradation
1. Check current query plans
2. Review recent policy changes
3. Analyze index usage
4. Scale database if needed
```

## Phase 7: Go-Live Checklist (Final Week)

### Pre-Production Checklist

- [ ] All modules migrated to BaseRLSService
- [ ] RLS policies created for all tables
- [ ] Performance testing completed
- [ ] Security testing completed
- [ ] Monitoring dashboard operational
- [ ] Documentation complete
- [ ] Team training completed
- [ ] Rollback plan documented

### Production Deployment

1. **Deploy database changes**
   ```bash
   npm run rls:setup
   npm run rls:validate
   ```

2. **Enable RLS middleware**
   - Deploy application with RLS middleware enabled
   - Monitor for first 24 hours

3. **Validate in production**
   ```bash
   npm run rls:status
   curl https://api.gloria.com/system/rls-health
   ```

### Post-Deployment

- [ ] Monitor RLS metrics for 1 week
- [ ] Collect feedback from developers
- [ ] Optimize slow queries if any
- [ ] Document lessons learned

## Success Metrics

- **Security**: 100% queries filtered by RLS
- **Performance**: <50ms average query time
- **Consistency**: 0 security incidents
- **Compliance**: 100% operations audited
- **Developer Satisfaction**: <2 hours to implement new module

## Continuous Improvement

1. **Monthly RLS Review**
   - Analyze metrics
   - Review bypass logs
   - Optimize policies
   - Update documentation

2. **Quarterly Security Audit**
   - Test all RLS policies
   - Verify no bypasses
   - Update threat model
   - Train new developers

3. **Annual RLS Upgrade**
   - Review PostgreSQL updates
   - Implement new RLS features
   - Refactor if needed
   - Performance optimization