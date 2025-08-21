# Path-to-Regexp Migration Fix

## Issue
The application was failing to start with the following error:
```
[Nest] ERROR [LegacyRouteConverter] Unsupported route path: "/api/health*"
TypeError: Missing parameter name at 12
```

This error occurs because the newer version of `path-to-regexp` (used by NestJS for route matching) no longer supports the old wildcard syntax (`*`, `+`, `?`) without named parameters.

## Root Cause
The middleware routes in `app.module.ts` were using the legacy wildcard syntax:
- `health*` - Match all routes starting with "health"
- `system*` - Match all routes starting with "system"
- `*` - Match all routes

## Solution
Updated all wildcard routes to use the new regex-based syntax:

### Before (Legacy Syntax)
```typescript
// Old wildcard syntax - NOT SUPPORTED in path-to-regexp v8+
consumer
  .apply(RLSBypassMiddleware)
  .forRoutes(
    { path: 'health*', method: RequestMethod.ALL },
    { path: 'system*', method: RequestMethod.ALL }
  );

consumer
  .apply(RLSDebugMiddleware)
  .forRoutes('*');

consumer
  .apply(RLSContextMiddleware)
  .exclude(
    { path: 'health*', method: RequestMethod.ALL }
  )
  .forRoutes('*');
```

### After (New Syntax)
```typescript
// New regex-based syntax - COMPATIBLE with path-to-regexp v8+
consumer
  .apply(RLSBypassMiddleware)
  .forRoutes(
    { path: 'health/(.*)', method: RequestMethod.ALL },
    { path: 'system/(.*)', method: RequestMethod.ALL }
  );

consumer
  .apply(RLSDebugMiddleware)
  .forRoutes({ path: '(.*)', method: RequestMethod.ALL });

consumer
  .apply(RLSContextMiddleware)
  .exclude(
    { path: 'health/(.*)', method: RequestMethod.ALL }
  )
  .forRoutes({ path: '(.*)', method: RequestMethod.ALL });
```

## Pattern Explanation

| Old Pattern | New Pattern | Description |
|-------------|------------|-------------|
| `*` | `(.*)` | Match all routes |
| `health*` | `health/(.*)` | Match "health" and all sub-routes |
| `users/*` | `users/(.*)` | Match all routes under "users" |
| `api/:id*` | `api/:id/(.*)` | Match param and sub-routes |

## Alternative Patterns

For specific use cases, you can use:

```typescript
// Match exactly "health" OR any sub-route
{ path: 'health', method: RequestMethod.ALL }     // Exact match
{ path: 'health/(.*)', method: RequestMethod.ALL } // With sub-routes

// Match with optional trailing path
{ path: 'health/:path?', method: RequestMethod.ALL } // Optional param

// Match multiple segments
{ path: 'api/:version/:resource/(.*)', method: RequestMethod.ALL }
```

## Testing

After applying these changes:
1. ✅ TypeScript compilation successful
2. ✅ Build process completes without errors
3. ✅ Server starts without path-to-regexp errors
4. ✅ Middleware properly applied to routes

## Affected Files
- `/src/app.module.ts` - Updated middleware route configurations

## References
- [path-to-regexp v8 Migration Guide](https://github.com/pillarjs/path-to-regexp#readme)
- [NestJS Middleware Documentation](https://docs.nestjs.com/middleware)
- [Express.js Path Patterns](https://expressjs.com/en/guide/routing.html#route-paths)

## Prevention
For future route configurations:
1. Always use regex patterns `(.*)` instead of bare wildcards `*`
2. Test route patterns after NestJS version upgrades
3. Consider using exact routes when wildcards aren't necessary