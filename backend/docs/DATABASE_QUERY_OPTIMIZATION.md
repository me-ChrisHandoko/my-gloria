# Database Query Optimization Implementation

## Overview
This document describes the database query optimization implementation for the module-management system, addressing the high-priority recommendation #2 from the improvement analysis.

## Implementation Details

### 1. Database Indexes
**Location**: `/prisma/migrations/20250123_add_indexes/migration.sql`

Created comprehensive indexes for all frequently queried columns:

#### Module Table Indexes
- `idx_module_code`: Fast lookup by module code
- `idx_module_parent_id`: Hierarchy traversal optimization
- `idx_module_is_active`: Filter active modules
- `idx_module_composite`: Combined index for common query patterns

#### Access Control Indexes
- **RoleModuleAccess**: Indexes on roleId, moduleId, isActive
- **UserModuleAccess**: Indexes on userProfileId, moduleId, validFrom/Until
- **UserOverride**: Indexes on userProfileId, moduleId, permissionType

#### Partial Indexes
Created partial indexes for active records only, reducing index size:
```sql
CREATE INDEX idx_module_active_only ON "Module"("id") 
WHERE "isActive" = true;
```

### 2. Query Optimizer Utility
**Location**: `/src/common/utils/query-optimizer.util.ts`

Provides optimized query patterns to avoid N+1 problems:

#### Field Projection
Instead of using `include` which fetches all fields:
```typescript
// Before - fetches all fields
include: {
  parent: true,
  children: true,
}

// After - selective field projection
select: {
  id: true,
  name: true,
  parent: {
    select: { id: true, name: true }
  }
}
```

#### Pagination Support
```typescript
static getPaginationOptions(page = 1, limit = 20): {
  skip: number;
  take: number;
}
```

#### Batch Loading Pattern
Prevents N+1 queries by batch loading related data:
```typescript
static async batchLoadRelations<T>(
  items: T[],
  relationKey: keyof T,
  loadFunction: (ids: string[]) => Promise<any[]>
): Promise<T[]>
```

### 3. Optimized Service Methods

#### getUserAccessibleModules Optimization
**Before**: Multiple queries with nested includes causing N+1 problems
**After**: 
- Parallel fetching of roles and revoked modules
- Selective field projection
- Single optimized query with proper joins
- In-memory permission merging

```typescript
// Parallel fetch for better performance
const [userRoles, revokedModuleIds] = await Promise.all([
  this.prisma.userRole.findMany({ /* optimized query */ }),
  this.prisma.userOverride.findMany({ /* optimized query */ })
]);

// Single optimized query with projections
const query = QueryOptimizer.getUserAccessibleModulesQuery(
  userProfileId,
  roleIds
);
```

#### findAll Method Enhancement
- Added pagination support
- Replaced `include` with selective `select`
- Parallel count query for pagination metadata

### 4. Performance Improvements

#### Query Optimization Techniques Applied
1. **Selective Field Projection**: Only fetch required fields
2. **Index Usage**: Leverage composite indexes for common patterns
3. **Parallel Queries**: Use Promise.all for independent queries
4. **Caching**: Utilize existing cache service for frequently accessed data
5. **Batch Operations**: Process multiple records in single queries

#### Expected Performance Gains
- **N+1 Query Elimination**: ~60-80% reduction in database round trips
- **Data Transfer**: ~40-50% reduction by selective field projection
- **Index Performance**: ~70-90% faster lookups on indexed columns
- **Parallel Execution**: ~30-40% faster for independent queries

## Migration Guide

### 1. Apply Database Indexes
```bash
# Run the migration
npx prisma migrate dev --name add_indexes

# Or manually apply SQL
psql -d your_database -f prisma/migrations/20250123_add_indexes/migration.sql
```

### 2. Update Service Imports
```typescript
import { QueryOptimizer } from '../../../common/utils/query-optimizer.util';
import { PaginationQueryDto, PaginationResponseDto } from '../../../common/dto/pagination.dto';
```

### 3. Update Query Patterns
Replace `include` with selective `select`:
```typescript
// Before
const modules = await this.prisma.module.findMany({
  include: { parent: true, children: true }
});

// After
const modules = await this.prisma.module.findMany({
  select: QueryOptimizer.getModuleSelect(true)
});
```

## Monitoring & Maintenance

### Query Performance Monitoring
1. Enable Prisma query logging in development:
```typescript
log: ['query', 'info', 'warn', 'error']
```

2. Monitor slow queries in production using database tools

3. Track API response times for endpoints

### Index Maintenance
1. Regularly analyze index usage:
```sql
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan;
```

2. Rebuild indexes periodically:
```sql
REINDEX INDEX CONCURRENTLY idx_name;
```

## Best Practices

### 1. Always Use Projection
- Avoid `include: true` without specific field selection
- Use QueryOptimizer utility methods for consistent projections

### 2. Pagination for Lists
- Implement pagination for all list endpoints
- Use cursor-based pagination for large datasets

### 3. Parallel Query Execution
- Use Promise.all for independent queries
- Batch related queries when possible

### 4. Cache Strategic Data
- Cache user permissions and module access
- Invalidate cache on updates

### 5. Monitor Performance
- Track query execution times
- Set up alerts for slow queries
- Regular index analysis

## Future Improvements

1. **Query Result Caching**: Implement Redis caching for frequently accessed data
2. **Read Replicas**: Use read replicas for heavy read operations
3. **Materialized Views**: Create views for complex permission calculations
4. **GraphQL DataLoader**: Implement DataLoader pattern for GraphQL APIs
5. **Query Complexity Analysis**: Add query complexity scoring for automatic optimization