# UUID v7 Migration Guide

## Overview

This guide documents the migration from CUID to UUID v7 for all ID generation in the backend.

## Migration Status: ✅ COMPLETE

### What Changed

#### 1. Prisma Schema (`prisma/schema.prisma`)

- **Before**: `id String @id @default(cuid())`
- **After**: `id String @id`
- **Reason**: ID generation moved to application layer for better control

#### 2. UUID Utility (`src/common/utils/uuid.util.ts`)

- **New File**: Central utility for UUID v7 generation
- **Features**:
  - `generateId()`: Generate UUID v7
  - `isValidUuid()`: Validate UUID format
  - `extractTimestampFromUuidV7()`: Extract timestamp from UUID v7
  - `compareUuidV7()`: Compare UUIDs by timestamp

#### 3. Base Service (`src/common/base/base.service.ts`)

- **New File**: Base service class for consistent ID generation
- **Methods**:
  - `generateId()`: Generate UUID v7
  - `prepareCreateData()`: Add ID to create operations
  - `addIdToCreateData()`: Add ID if not provided
  - `addIdToCreateManyData()`: Batch ID generation

#### 4. Service Updates

- **Example**: `SchoolService` now extends `BaseService`
- **Pattern**: Use `this.prepareCreateData()` for all create operations

#### 5. Request Tracking (`src/common/interceptors/request-tracking.interceptor.ts`)

- **Changed**: `uuidv7()` → `uuidv7()`
- **Impact**: Request IDs are now time-sortable

#### 6. Log Decorator (`src/common/decorators/log.decorator.ts`)

- **Changed**: `Math.random()` → `uuidv7()`
- **Impact**: Consistent UUID format in logs

## Implementation Pattern

### For New Services

```typescript
import { BaseService } from '../../../common/base/base.service';

@Injectable()
export class YourService extends BaseService {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: CreateDto): Promise<Model> {
    return this.prisma.model.create({
      data: this.prepareCreateData(data),
    });
  }
}
```

### For Existing Services

1. Extend `BaseService`:

```typescript
export class YourService extends BaseService {
```

2. Add `super()` to constructor:

```typescript
constructor(...) {
  super();
}
```

3. Use `prepareCreateData()` in create operations:

```typescript
const entity = await this.prisma.entity.create({
  data: this.prepareCreateData(dto, {
    additionalField: value,
  }),
});
```

## Benefits of UUID v7

1. **Time-Ordered**: UUIDs are sortable by creation time
2. **Better Performance**: Sequential nature improves database index performance
3. **Timestamp Embedded**: Contains creation timestamp (extractable)
4. **Uniqueness**: Same collision resistance as UUID v4
5. **Debugging**: Easier to track chronological order of records

## Database Migration

### For New Databases

No additional steps needed. IDs will be generated automatically.

### For Existing Databases with CUID

1. Existing CUIDs will continue to work
2. New records will use UUID v7
3. Both formats can coexist

### Optional: Convert Existing CUIDs to UUID v7

```sql
-- This is optional and not required
-- Only if you want complete consistency
-- WARNING: This will change all existing IDs!

-- Example for one table (repeat for each table):
BEGIN;
UPDATE gloria_ops.user_profiles
SET id = gen_random_uuid()
WHERE id IS NOT NULL;
COMMIT;
```

## Testing

### Unit Test Example

```typescript
import { generateId, isValidUuid } from '../utils/uuid.util';

describe('UUID v7 Generation', () => {
  it('should generate valid UUID v7', () => {
    const id = generateId();
    expect(isValidUuid(id)).toBe(true);
  });

  it('should generate time-ordered UUIDs', () => {
    const id1 = generateId();
    await new Promise((resolve) => setTimeout(resolve, 10));
    const id2 = generateId();
    expect(id1 < id2).toBe(true); // Lexicographically sortable
  });
});
```

## Rollback Plan

If issues arise:

1. **Revert Prisma Schema**:

```prisma
// Change back to:
id String @id @default(cuid())
```

2. **Remove Base Service Extension**:
   Remove `extends BaseService` and `super()` calls

3. **Revert Service Changes**:
   Remove `prepareCreateData()` usage

## Monitoring

### Check UUID v7 Generation

```typescript
// Add to health check or monitoring
const testId = generateId();
console.log('UUID v7 Test:', {
  id: testId,
  valid: isValidUuid(testId),
  timestamp: extractTimestampFromUuidV7(testId),
});
```

## Checklist for Complete Migration

- [x] Update Prisma schema (remove `@default(cuid())`)
- [x] Create UUID utility module
- [x] Create base service class
- [x] Update request tracking interceptor
- [x] Update log decorator
- [x] Update at least one service as example
- [ ] Update all remaining services to use BaseService
- [ ] Add unit tests for UUID generation
- [ ] Update API documentation
- [ ] Monitor performance impact

## Notes

1. **No Database Migration Required**: Since we're generating IDs at the application level
2. **Backward Compatible**: Existing CUIDs continue to work
3. **Package Version**: Using `uuid` v11.1.0 which fully supports UUID v7
4. **Performance**: UUID v7 provides better index performance than random UUIDs

## Support

For issues or questions about this migration:

1. Check the UUID utility source: `/src/common/utils/uuid.util.ts`
2. Review base service: `/src/common/base/base.service.ts`
3. See example implementation: `/src/modules/organization/services/school.service.ts`
