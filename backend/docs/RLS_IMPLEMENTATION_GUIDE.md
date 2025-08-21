# PostgreSQL Row Level Security (RLS) Implementation Guide

## Overview

This guide documents the implementation of PostgreSQL Row Level Security (RLS) for the Gloria backend system. RLS provides database-level security that automatically filters data based on user permissions, complementing the existing application-level security.

## Architecture

### Hybrid Security Model

The implementation uses a **hybrid approach** combining:
1. **Database-level RLS** - Automatic row filtering by PostgreSQL
2. **Application-level security** - Complex business logic in `RowLevelSecurityService`

This provides defense-in-depth security with multiple layers of protection.

## Components

### 1. Database Migration (`prisma/migrations/manual/001_enable_rls_policies.sql`)

The SQL migration creates:
- **Helper functions** for accessing user context
- **RLS policies** for each table
- **Performance indexes** to optimize RLS queries

Key functions:
- `gloria_ops.current_user_context()` - Returns current user's context
- `gloria_ops.is_superadmin()` - Checks if user is superadmin
- `gloria_ops.user_school_ids()` - Returns user's accessible schools
- `gloria_ops.user_department_ids()` - Returns user's accessible departments
- `gloria_ops.get_permission_scope()` - Returns permission scope for module/action

### 2. Prisma Service Enhancement (`src/prisma/prisma.service.ts`)

Enhanced with:
- **AsyncLocalStorage** for context propagation
- **RLS middleware** that sets PostgreSQL session variables
- **Helper methods** for context management

Key methods:
```typescript
// Execute with RLS context
prisma.withRLSContext(userContext, async () => {
  // Queries here automatically have RLS applied
});

// Bypass RLS for system operations
prisma.bypassRLS(async () => {
  // Queries here bypass RLS
});
```

### 3. RLS Context Middleware (`src/middleware/rls-context.middleware.ts`)

Three middleware components:
1. **RLSContextMiddleware** - Sets user context from auth
2. **RLSBypassMiddleware** - Bypasses RLS for system operations
3. **RLSDebugMiddleware** - Debug logging in development

### 4. RLS Helper Service (`src/security/rls-helper.service.ts`)

Utility functions for:
- Testing user access permissions
- Validating RLS setup
- Managing policies
- Performance monitoring

## Implementation Steps

### Quick Setup (Automated)

```bash
# Run interactive setup wizard
npm run rls:setup

# This will:
# 1. Check database connection
# 2. Apply RLS migration
# 3. Validate setup
# 4. Test with sample user
```

### Manual Setup

#### Step 1: Apply Database Migration

```bash
# Option 1: Direct SQL execution
npm run rls:apply

# Option 2: Using Prisma migrate
npx prisma migrate dev

# Option 3: Manual execution
npx prisma db execute --file prisma/migrations/manual/001_enable_rls_policies.sql
```

#### Step 2: Validate RLS Setup

```bash
# Run validation to ensure everything is configured correctly
npm run rls:validate

# Expected output:
# ✓ All functions created
# ✓ RLS enabled on all tables
# ✓ Policies applied
# ✓ Indexes created
```

#### Step 3: Test RLS Implementation

```bash
# Run unit tests
npm run rls:test

# Test with specific user
npm run rls:test-user -- --user=<user-id>
# or
npm run rls:test-user -- --email=user@example.com
# or
npm run rls:test-user -- --clerk=clerk-user-id

# Check RLS status
npm run rls:status
```

### Available NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run rls:setup` | Interactive setup wizard |
| `npm run rls:apply` | Apply RLS migration |
| `npm run rls:validate` | Validate RLS configuration |
| `npm run rls:test` | Run RLS unit tests |
| `npm run rls:test-user` | Test RLS with specific user |
| `npm run rls:enable [table]` | Enable RLS on table(s) |
| `npm run rls:disable [table]` | Disable RLS on table(s) |
| `npm run rls:status` | Check RLS status on all tables |

## Usage Examples

### 1. Service with RLS (Automatic)

```typescript
@Injectable()
export class SchoolService {
  async findAll(userId: string) {
    // RLS automatically applied via middleware
    return this.prisma.school.findMany();
    // Only returns schools user has access to
  }
}
```

### 2. Manual RLS Context

```typescript
async performAdminOperation(userContext: UserContext, data: any) {
  return this.prisma.withRLSContext(userContext, async () => {
    // All queries here have RLS applied with this context
    const schools = await this.prisma.school.findMany();
    const departments = await this.prisma.department.findMany();
    return { schools, departments };
  });
}
```

### 3. Bypass RLS for System Operations

```typescript
async systemSync() {
  return this.prisma.bypassRLS(async () => {
    // System operations that need full access
    return this.prisma.school.findMany();
  });
}
```

## Permission Scopes

The system supports four permission scopes:

1. **OWN** - Access only own data
2. **DEPARTMENT** - Access department data
3. **SCHOOL** - Access school-wide data
4. **ALL** - Access all data (typically superadmin)

## Security Policies

### School Policies
- **SELECT**: Based on user's school assignments
- **INSERT**: Superadmin or ALL scope only
- **UPDATE**: Own schools with proper scope
- **DELETE**: Superadmin only

### Department Policies
- **SELECT**: Based on school/department assignments
- **INSERT**: School-level permissions required
- **UPDATE**: Department-level permissions
- **DELETE**: School-level or higher

### User Position Policies
- **SELECT**: Based on scope (own/department/school)
- **INSERT**: HR permissions required
- **UPDATE**: HR permissions required

## Performance Considerations

### Indexes Added for RLS

```sql
CREATE INDEX idx_user_positions_user_profile_active 
  ON gloria_ops.user_positions(user_profile_id, is_active);

CREATE INDEX idx_positions_school_dept 
  ON gloria_ops.positions(school_id, department_id);

CREATE INDEX idx_departments_school 
  ON gloria_ops.departments(school_id);
```

### Query Optimization

- RLS policies are evaluated once per query
- Indexes ensure efficient filtering
- Context caching reduces overhead

## Monitoring and Debugging

### 1. Check RLS Status

```typescript
// Validate RLS setup
const validation = await rlsHelper.validateRLSSetup();
console.log('RLS Valid:', validation.isValid);
console.log('Missing functions:', validation.missingFunctions);
console.log('Tables without RLS:', validation.tablesWithoutRLS);
```

### 2. Test User Access

```typescript
// Test what a user can access
const access = await rlsHelper.testUserAccess(
  'clerk-user-id',
  'schools'
);
console.log('Can SELECT:', access.canSelect);
console.log('Can INSERT:', access.canInsert);
console.log('Sample data:', access.sampleData);
```

### 3. Debug Mode

Set `NODE_ENV=development` to enable RLS debug logging:
- Logs user context for each request
- Shows applied permission scopes
- Displays query filters

## Rollback Plan

If RLS needs to be disabled:

### Option 1: Disable at Database Level

```sql
-- Disable RLS on tables
ALTER TABLE gloria_ops.schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE gloria_ops.departments DISABLE ROW LEVEL SECURITY;
-- etc...
```

### Option 2: Remove Middleware

Comment out RLS middleware in `app.module.ts`:

```typescript
// consumer.apply(RLSContextMiddleware)...
```

### Option 3: Bypass in Services

Use `bypassRLS` wrapper:

```typescript
return this.prisma.bypassRLS(async () => {
  // All queries bypass RLS
});
```

## Best Practices

1. **Always test RLS policies** after deployment
2. **Monitor performance** impact of RLS
3. **Use appropriate indexes** for RLS filters
4. **Document permission requirements** in service methods
5. **Use bypass sparingly** and only for system operations
6. **Regular audits** of RLS policies and access patterns

## Troubleshooting

### Issue: "No RLS context" errors

**Solution**: Ensure RLSContextMiddleware is applied to the route

### Issue: Users can't see their own data

**Solution**: Check user context and permission scopes:
```typescript
const context = await rlsService.getUserContext(userId);
console.log('User context:', context);
```

### Issue: Performance degradation

**Solution**: 
1. Check for missing indexes
2. Analyze query plans with `EXPLAIN`
3. Consider caching frequently accessed data

## Future Enhancements

1. **Dynamic policy generation** based on role templates
2. **Policy versioning** for audit trails
3. **Performance analytics** dashboard
4. **Automated policy testing** in CI/CD
5. **Multi-tenant isolation** using RLS

## Support

For questions or issues with RLS implementation:
1. Check this guide
2. Review test cases in `rls.spec.ts`
3. Enable debug mode for detailed logging
4. Contact the backend team for assistance