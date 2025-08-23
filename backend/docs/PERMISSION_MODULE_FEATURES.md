# Permission Module - New Features Implementation

This document describes the implementation of the missing features identified in the permission module analysis.

## 1. Permission Templates

### Overview
Pre-defined permission sets that can be applied to roles or users for quick and consistent permission assignment.

### Database Schema
- `PermissionTemplate`: Stores template definitions
- `PermissionTemplateApplication`: Tracks which templates are applied to which targets

### Features
- Create and manage permission templates
- Apply templates to roles or users
- System templates that cannot be modified
- Template categories for organization
- Version control with optimistic locking

### API Endpoints
- `POST /api/v1/permission-templates` - Create template
- `GET /api/v1/permission-templates` - List templates
- `GET /api/v1/permission-templates/:id` - Get template details
- `PUT /api/v1/permission-templates/:id` - Update template
- `DELETE /api/v1/permission-templates/:id` - Delete template
- `POST /api/v1/permission-templates/apply` - Apply template
- `POST /api/v1/permission-templates/revoke` - Revoke template application

### Usage Example
```typescript
// Create a template
const template = await templateService.create({
  code: 'dept_manager',
  name: 'Department Manager',
  category: 'department_head',
  permissions: [
    { permission: 'workorder.approve', scope: 'department' },
    { permission: 'user.update', scope: 'department' }
  ],
  moduleAccess: [
    { module: 'workorder', actions: ['read', 'create', 'update', 'approve'] }
  ]
}, actorId);

// Apply to a role
await templateService.apply({
  templateId: template.id,
  targetType: TemplateTargetType.ROLE,
  targetId: roleId,
  notes: 'Applied for new department head role'
}, actorId);
```

## 2. Permission Delegation System

### Overview
Allows users to temporarily delegate their permissions to other users with time-based validity.

### Database Schema
- `PermissionDelegation`: Stores delegation records with validity periods

### Features
- Delegate specific permissions to another user
- Time-based validity (from/until dates)
- Revocation capability
- Automatic expiration handling
- Delegation history tracking

### API Endpoints
- `POST /api/v1/permission-delegations` - Create delegation
- `GET /api/v1/permission-delegations` - List delegations
- `GET /api/v1/permission-delegations/my-delegations` - User's created delegations
- `GET /api/v1/permission-delegations/delegated-to-me` - Delegations received
- `GET /api/v1/permission-delegations/active` - Active delegations
- `POST /api/v1/permission-delegations/revoke` - Revoke delegation
- `POST /api/v1/permission-delegations/:id/extend` - Extend delegation

### Usage Example
```typescript
// Create delegation
const delegation = await delegationService.create(delegatorId, {
  delegateId: 'user123',
  permissions: [
    { permission: 'workorder.approve', scope: 'department' }
  ],
  reason: 'On vacation from Dec 25 to Jan 5',
  validUntil: '2024-01-05T00:00:00Z'
});

// Check delegated permissions
const delegatedPerms = await delegationService.getDelegatedPermissions(userId);
```

## 3. Enhanced Audit Trail with Rollback

### Overview
Comprehensive permission change history with the ability to rollback changes.

### Database Schema
- `PermissionChangeHistory`: Stores all permission-related changes with rollback capability

### Features
- Record all permission changes with previous/new states
- Rollback capability for reversible changes
- Change metadata and context tracking
- User activity history
- Rollback prevention for certain operations

### API Usage
```typescript
// Record a change
await changeHistoryService.recordChange({
  entityType: 'user_permission',
  entityId: permissionId,
  operation: 'grant',
  previousState: null,
  newState: newPermission,
  performedBy: actorId,
  metadata: { reason: 'New project assignment' }
});

// Rollback a change
await changeHistoryService.rollback({
  changeId: 'change123',
  performedBy: actorId,
  reason: 'Mistakenly granted'
});
```

## 4. Permission Analytics

### Overview
Usage pattern analysis and anomaly detection for permission usage.

### Database Schema
- `PermissionAnalytics`: Stores permission usage events and anomaly scores

### Features
- Real-time event recording
- Usage pattern analysis
- Anomaly detection with scoring
- Dashboard statistics
- Trend analysis
- Daily reports

### API Endpoints
- `GET /api/v1/permission-analytics/dashboard` - Dashboard stats
- `GET /api/v1/permission-analytics/usage-patterns` - Usage patterns
- `GET /api/v1/permission-analytics/anomalies` - Detected anomalies
- `GET /api/v1/permission-analytics/user/:id/anomaly-report` - User anomaly report
- `GET /api/v1/permission-analytics/permission/:code/trends` - Permission trends

### Anomaly Detection
The system detects:
- Unusual access times (outside business hours)
- High permission denial rates
- Rapid permission changes
- Critical permission grants
- Slow response times

### Usage Example
```typescript
// Record permission check
await analyticsService.recordEvent({
  userProfileId: userId,
  permissionCode: 'workorder.approve',
  action: 'check',
  resource: 'workorder',
  resourceId: 'wo123',
  result: 'allowed',
  responseTime: 45
});

// Get anomaly report
const report = await analyticsService.getUserAnomalyReport(userId);
```

## 5. Bulk Operations

### Overview
Batch grant/revoke permissions with transaction support for efficient large-scale permission management.

### Features
- Bulk grant to multiple users/roles
- Bulk revoke with safety checks
- Transaction support for atomicity
- Preview capability
- Error handling and reporting
- Progress tracking

### API Endpoints
- `POST /api/v1/permission-bulk/grant` - Bulk grant permissions
- `POST /api/v1/permission-bulk/revoke` - Bulk revoke permissions
- `POST /api/v1/permission-bulk/preview-grant` - Preview operation

### Usage Example
```typescript
// Bulk grant
const result = await bulkService.bulkGrant({
  targetType: BulkTargetType.USERS,
  targetIds: ['user1', 'user2', 'user3'],
  permissions: [
    { permissionCode: 'workorder.read', scope: 'department' },
    { permissionCode: 'kpi.read', scope: 'department' }
  ],
  reason: 'New team members onboarding'
}, actorId);

// Result includes:
// - success: boolean
// - processed: number
// - failed: number
// - errors: detailed error information
// - summary: created/updated/skipped counts
```

## Integration with Existing Permission System

### Permission Service Updates
The main permission service should be updated to:
1. Check delegated permissions in addition to direct permissions
2. Record analytics events for permission checks
3. Support bulk operations through the new services

### Example Integration
```typescript
async checkPermission(dto: CheckPermissionDto) {
  // ... existing checks ...
  
  // Check delegated permissions
  const delegatedPerms = await this.delegationService.getDelegatedPermissions(dto.userId);
  if (delegatedPerms.includes(permissionCode)) {
    result.isAllowed = true;
    result.grantedBy.push({ type: 'delegation', source: 'delegation' });
  }
  
  // Record analytics
  await this.analyticsService.recordEvent({
    userProfileId: dto.userId,
    permissionCode,
    action: 'check',
    result: result.isAllowed ? 'allowed' : 'denied',
    responseTime: Date.now() - startTime
  });
  
  return result;
}
```

## Security Considerations

1. **Template Security**
   - System templates cannot be modified
   - Templates require specific permissions to create/apply
   - Template applications are tracked in audit logs

2. **Delegation Security**
   - Users can only delegate permissions they possess
   - Delegations have mandatory expiration dates
   - All delegations are audited

3. **Bulk Operations Security**
   - Critical permissions require force flag
   - All operations are transactional
   - Comprehensive error reporting

4. **Analytics Privacy**
   - User activity is anonymized in reports
   - Access to analytics requires specific permissions
   - Anomaly detection doesn't expose sensitive data

## Migration Steps

1. Run the database migration to create new tables:
   ```bash
   npm run db:migrate:dev
   ```

2. Seed permission templates:
   ```bash
   npx ts-node prisma/seeds/permission-templates.seed.ts
   ```

3. Update the permission module to include new services and controllers

4. Test all new endpoints and features

## Performance Considerations

1. **Caching**
   - Template applications should be cached
   - Delegated permissions should be cached with TTL
   - Analytics aggregations should be cached

2. **Indexing**
   - All new tables have appropriate indexes
   - Composite indexes for common query patterns

3. **Batch Processing**
   - Bulk operations use transactions with timeout
   - Analytics processing can be queued for large datasets

## Monitoring

1. **Metrics to Track**
   - Template application rate
   - Delegation usage patterns
   - Bulk operation performance
   - Analytics processing time

2. **Alerts**
   - High anomaly scores
   - Expired delegations not cleaned up
   - Bulk operation failures
   - Slow permission checks