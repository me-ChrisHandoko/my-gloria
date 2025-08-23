# Optimistic Locking Implementation

## Overview

Optimistic locking has been implemented in the approval module to prevent data corruption from concurrent updates. This ensures that when multiple users try to modify the same request or approval step simultaneously, only one update succeeds while others receive a clear conflict error.

## What is Optimistic Locking?

Optimistic locking is a concurrency control mechanism that:
- Allows multiple users to read the same data simultaneously
- Checks for conflicts only when updating
- Prevents lost updates by verifying that data hasn't changed since it was read
- Uses a version number that increments with each update

## Implementation Details

### Schema Changes

Added `version` field to the following models:

```prisma
model Request {
  // ... other fields
  version Int @default(0)  // Optimistic locking field
}

model ApprovalStep {
  // ... other fields
  version Int @default(0)  // Optimistic locking field
}
```

### DTO Updates

All update DTOs now include a required `version` field:

```typescript
export class UpdateRequestDto {
  // ... other fields
  @ApiProperty({ description: 'Version number for optimistic locking' })
  @IsNumber()
  version: number;
}

export class CancelRequestDto {
  // ... other fields
  @ApiProperty({ description: 'Version number for optimistic locking' })
  @IsNumber()
  version: number;
}

export class ProcessApprovalDto {
  // ... other fields
  @ApiProperty({ description: 'Version number for optimistic locking' })
  @IsNumber()
  version: number;
}
```

### Service Layer Updates

#### Request Service

```typescript
async update(id: string, dto: UpdateRequestDto, updaterProfileId: string) {
  // Fetch current request
  const request = await this.findOne(id);
  
  // Update with version check
  const result = await this.prisma.request.updateMany({
    where: { 
      id,
      version: dto.version, // Check version matches
    },
    data: {
      // ... update fields
      version: { increment: 1 }, // Increment version
    },
  });

  if (result.count === 0) {
    throw new ConflictException(
      'Request has been modified by another user. Please refresh and try again.'
    );
  }
}
```

#### Workflow Service

```typescript
async processApproval(requestId: string, stepId: string, dto: ProcessApprovalDto) {
  // Update with optimistic locking
  const updateResult = await tx.approvalStep.updateMany({
    where: { 
      id: stepId,
      version: dto.version, // Check version matches
    },
    data: {
      // ... update fields
      version: { increment: 1 }, // Increment version
    },
  });

  if (updateResult.count === 0) {
    throw new ConflictException(
      'This approval step has been modified by another user. Please refresh and try again.'
    );
  }
}
```

### Error Handling

#### Exception Filter

Created `OptimisticLockExceptionFilter` to provide user-friendly error messages:

```typescript
@Catch(ConflictException)
export class OptimisticLockExceptionFilter implements ExceptionFilter {
  catch(exception: ConflictException, host: ArgumentsHost) {
    // Returns user-friendly error response
    {
      statusCode: 409,
      error: 'Conflict',
      message: 'The record has been modified by another user. Please refresh the page and try again.',
      details: {
        type: 'OPTIMISTIC_LOCK_ERROR',
        resolution: 'Refresh the page to get the latest data and retry your action.',
        userMessage: 'Someone else has made changes to this record...'
      }
    }
  }
}
```

#### Version Interceptor

Created `VersionInterceptor` to automatically include version information in responses:

```typescript
@Injectable()
export class VersionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    // Adds _versionInfo metadata to responses
    return next.handle().pipe(
      map((data) => ({
        ...data,
        _versionInfo: {
          currentVersion: data.version,
          message: 'Include this version number when updating to prevent conflicts'
        }
      }))
    );
  }
}
```

## Usage Examples

### Frontend Implementation

```typescript
// Fetch request with version
const request = await api.getRequest(requestId);
const currentVersion = request.version;

// Update request with version
const updateData = {
  details: { /* updated data */ },
  version: currentVersion, // Include current version
};

try {
  const updated = await api.updateRequest(requestId, updateData);
  // Success - update UI with new data
} catch (error) {
  if (error.status === 409) {
    // Conflict - another user updated the record
    alert('Someone else has updated this request. Please refresh and try again.');
    // Refresh data
    const latestRequest = await api.getRequest(requestId);
    // Update UI with latest data
  }
}
```

### Handling Concurrent Approvals

```typescript
// Process approval with version
const approvalData = {
  action: 'APPROVE',
  notes: 'Approved with conditions',
  version: approvalStep.version, // Include current version
};

try {
  await api.processApproval(requestId, stepId, approvalData);
  // Success
} catch (error) {
  if (error.details?.type === 'OPTIMISTIC_LOCK_ERROR') {
    // Another approver processed this step
    // Refresh the approval workflow
    const latestRequest = await api.getRequest(requestId);
    // Update UI to show current state
  }
}
```

## Benefits

1. **Data Integrity**: Prevents lost updates when multiple users modify the same record
2. **User Experience**: Clear error messages when conflicts occur
3. **Audit Trail**: Version history provides additional tracking capability
4. **Performance**: No locking overhead during reads, only during writes
5. **Scalability**: Works well in distributed environments

## Migration

To apply the optimistic locking changes to your database:

```bash
# Option 1: Run the migration SQL directly
psql -U your_user -d your_database -f prisma/migrations/20250122_add_optimistic_locking/migration.sql

# Option 2: Use Prisma push (if schemas are properly set up)
npx prisma db push

# Option 3: Manual execution
# Connect to your database and run:
ALTER TABLE "gloria_ops"."requests" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "gloria_ops"."approval_steps" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;
```

## Testing

Run the optimistic locking tests:

```bash
# Run specific test file
npm test src/modules/approval/test/optimistic-locking.test.ts

# Run all approval module tests
npm test src/modules/approval
```

## Best Practices

1. **Always Include Version**: When updating any entity with optimistic locking, always include the current version
2. **Handle Conflicts Gracefully**: Implement retry logic or user notifications for conflict scenarios
3. **Refresh on Conflict**: When a conflict occurs, refresh the data and show the latest state
4. **Transaction Boundaries**: Use database transactions to ensure consistency across related updates
5. **User Feedback**: Provide clear messages about what happened and what the user should do

## Troubleshooting

### Common Issues

1. **Missing Version Field Error**
   - Ensure DTOs include the version field
   - Check that frontend is sending version in update requests

2. **Frequent Conflicts**
   - Consider implementing automatic retry with exponential backoff
   - Review workflow to reduce concurrent updates
   - Consider using pessimistic locking for high-contention scenarios

3. **Version Not Incrementing**
   - Verify that `version: { increment: 1 }` is included in update operations
   - Check that the database migration has been applied

## Future Enhancements

1. **Version History**: Store version history for audit purposes
2. **Automatic Retry**: Implement configurable automatic retry on conflicts
3. **Conflict Resolution UI**: Build UI for manual conflict resolution
4. **Extended Coverage**: Apply optimistic locking to other modules as needed
5. **Performance Monitoring**: Track conflict rates and optimize workflows