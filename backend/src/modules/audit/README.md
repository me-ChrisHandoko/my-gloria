# Audit Module

## Overview
The Audit Module provides comprehensive audit logging and tracking capabilities for the Gloria Internal Management System. It tracks all data modifications, user actions, and system events with compliance and security requirements in mind.

## Features

### Core Capabilities
- **Automatic Change Tracking**: Interceptor-based automatic capture of all CRUD operations
- **Manual Audit Logging**: Programmatic audit logging for custom events
- **Audit Trail Query**: Advanced filtering and search capabilities
- **Statistics & Analytics**: Aggregated audit data for compliance reporting
- **Data Export**: Export audit logs in CSV, JSON, or Excel formats
- **Compliance Reporting**: Generate compliance reports with detailed breakdowns
- **Retention Management**: Automated cleanup of old audit logs

### Security Features
- **Permission-based Access**: Role-based access control for audit logs
- **Sensitive Data Sanitization**: Automatic redaction of passwords and tokens
- **IP Address Tracking**: Track source IP addresses for all actions
- **User Agent Logging**: Browser and client information capture

## Architecture

### Module Structure
```
src/modules/audit/
├── audit.module.ts           # Module definition
├── controllers/
│   └── audit.controller.ts   # REST API endpoints
├── services/
│   └── audit.service.ts      # Core audit logic
├── interceptors/
│   └── audit.interceptor.ts  # Automatic change capture
├── decorators/
│   └── audit.decorator.ts    # Controller decorators
└── dto/
    ├── query-audit-log.dto.ts
    ├── audit-log-response.dto.ts
    ├── audit-statistics.dto.ts
    └── export-audit-log.dto.ts
```

## Usage

### Automatic Audit Logging

Use decorators on controller methods to automatically capture changes:

```typescript
import { AuditCreate, AuditUpdate, AuditDelete } from '@/modules/audit/decorators/audit.decorator';

@Controller('users')
export class UserController {
  @Post()
  @AuditCreate('User')
  async create(@Body() dto: CreateUserDto) {
    // Automatically logs CREATE action
    return this.userService.create(dto);
  }

  @Patch(':id')
  @AuditUpdate('User', { captureOldValues: true })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    // Automatically logs UPDATE action with old and new values
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @AuditDelete('User')
  async delete(@Param('id') id: string) {
    // Automatically logs DELETE action
    return this.userService.delete(id);
  }
}
```

### Manual Audit Logging

For custom events or complex scenarios:

```typescript
import { AuditService } from '@/modules/audit/services/audit.service';

@Injectable()
export class ApprovalService {
  constructor(private readonly auditService: AuditService) {}

  async approveRequest(requestId: string, user: any) {
    // Process approval
    const result = await this.processApproval(requestId);

    // Log approval action
    await this.auditService.logApprove(
      {
        actorId: user.clerkUserId,
        module: 'approval',
        ipAddress: user.ipAddress,
      },
      'ApprovalRequest',
      requestId,
      {
        approvedBy: user.name,
        approvalTime: new Date(),
        comments: 'Approved via system',
      },
      `Request #${requestId}`,
    );

    return result;
  }
}
```

### Global Interceptor Usage

To enable automatic audit logging globally:

```typescript
import { AuditInterceptor } from '@/modules/audit/interceptors/audit.interceptor';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
```

## API Endpoints

### Query Audit Logs
```
GET /api/v1/audit/logs
```
Query parameters:
- `entityType`: Filter by entity type
- `entityId`: Filter by specific entity
- `module`: Filter by module
- `actorId`: Filter by user
- `actions[]`: Filter by action types
- `startDate`: Start date for filtering
- `endDate`: End date for filtering
- `limit`: Number of records (default: 50, max: 100)
- `offset`: Skip records for pagination

### Get Entity Audit Trail
```
GET /api/v1/audit/entity/:entityType/:entityId
```
Returns complete audit history for a specific entity.

### Get User Activity
```
GET /api/v1/audit/user/:userId
```
Returns all actions performed by a specific user.

### Get My Activity
```
GET /api/v1/audit/my-activity
```
Returns current user's audit trail.

### Get Statistics
```
GET /api/v1/audit/statistics
```
Query parameters:
- `startDate`: Start date (required)
- `endDate`: End date (required)
- `groupBy`: Group by module, action, actor, or entityType

### Export Audit Logs
```
POST /api/v1/audit/export
```
Request body:
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "format": "csv|json|excel",
  "entityType": "User",
  "module": "organization"
}
```

### Generate Compliance Report
```
GET /api/v1/audit/compliance-report
```
Query parameters:
- `startDate`: Report start date
- `endDate`: Report end date

### Clean Up Old Logs
```
POST /api/v1/audit/cleanup
```
Request body:
```json
{
  "retentionDays": 365
}
```

## Audit Actions

The following actions are tracked:
- `CREATE`: Entity creation
- `UPDATE`: Entity modification
- `DELETE`: Entity deletion
- `APPROVE`: Approval actions
- `REJECT`: Rejection actions
- `LOGIN`: User login events
- `LOGOUT`: User logout events
- `EXPORT`: Data export operations
- `IMPORT`: Data import operations
- `ASSIGN`: Assignment operations (roles, permissions)
- `REVOKE`: Revocation operations
- `DELEGATE`: Delegation actions

## Permissions

Required permissions for audit operations:
- `audit:READ`: View audit logs
- `audit:DELETE`: Clean up old logs
- `audit:EXPORT`: Export audit data

## Best Practices

1. **Use Decorators**: Prefer decorators over manual logging for consistency
2. **Capture Context**: Always include relevant context (user, IP, module)
3. **Sanitize Sensitive Data**: Never log passwords, tokens, or sensitive information
4. **Entity Display Names**: Include human-readable entity names for better readability
5. **Metadata**: Use metadata field for additional context-specific information
6. **Regular Cleanup**: Schedule regular cleanup of old audit logs
7. **Monitor Performance**: Audit logging should be asynchronous to avoid impacting performance

## Configuration

Environment variables:
```env
AUDIT_RETENTION_DAYS=365       # Days to retain audit logs
AUDIT_EXPORT_MAX_RECORDS=10000 # Maximum records for export
AUDIT_ENABLE_INTERCEPTOR=true  # Enable global audit interceptor
```

## Integration with Other Modules

The Audit Module is integrated with:
- **Organization Module**: Tracks organizational structure changes
- **Permission Module**: Logs permission and role changes
- **User Profile Module**: Tracks user profile modifications
- **Approval Module** (future): Will track approval workflows

## Performance Considerations

- Audit logging is asynchronous to minimize performance impact
- Indexes are maintained on commonly queried fields
- Consider partitioning audit tables for large datasets
- Use batch operations for bulk changes
- Implement caching for frequently accessed audit trails

## Security Considerations

- All audit logs are immutable once created
- Audit service runs with elevated privileges
- Sensitive data is automatically sanitized
- IP addresses and user agents are tracked for security analysis
- Consider encrypting audit logs at rest for sensitive environments