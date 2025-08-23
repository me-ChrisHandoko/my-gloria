# Permission Module - Error Handling & Monitoring

This document describes the error handling and monitoring implementation for the permission module.

## Overview

The permission module now includes comprehensive error handling and monitoring capabilities:

1. **Structured Error Responses** - Consistent error codes and messages
2. **Prometheus Metrics** - Real-time performance monitoring
3. **Circuit Breaker Pattern** - Fault tolerance for external dependencies
4. **Health Monitoring** - System health checks and dashboards

## Error Handling

### Error Codes

All permission-related errors now use structured error codes defined in `PermissionErrorCode`:

```typescript
// Permission not found errors
PERM_001: PERMISSION_NOT_FOUND
PERM_002: PERMISSION_CODE_NOT_FOUND

// Permission conflict errors
PERM_003: PERMISSION_ALREADY_EXISTS
PERM_004: PERMISSION_CODE_CONFLICT
PERM_005: PERMISSION_COMBINATION_EXISTS

// System permission errors
PERM_006: SYSTEM_PERMISSION_IMMUTABLE
PERM_007: SYSTEM_PERMISSION_DELETE_FORBIDDEN

// Permission check errors
PERM_008: PERMISSION_CHECK_FAILED
PERM_009: PERMISSION_DENIED
PERM_010: PERMISSION_EXPIRED

// Cache errors
PERM_013: PERMISSION_CACHE_ERROR
PERM_014: PERMISSION_CACHE_INVALIDATION_FAILED

// Database errors
PERM_015: PERMISSION_DB_CONNECTION_FAILED
PERM_016: PERMISSION_DB_QUERY_FAILED
PERM_017: PERMISSION_DB_TRANSACTION_FAILED

// Performance errors
PERM_022: PERMISSION_CHECK_TIMEOUT
PERM_023: PERMISSION_RATE_LIMIT_EXCEEDED
```

### Error Response Format

All errors follow a consistent format:

```json
{
  "statusCode": 404,
  "error": "PermissionError",
  "details": {
    "code": "PERM_001",
    "message": "Permission with ID xxx not found",
    "permissionId": "xxx",
    "timestamp": "2024-01-23T10:00:00.000Z"
  }
}
```

## Monitoring

### Prometheus Metrics

The following metrics are collected:

#### Permission Check Metrics
- `permission_check_total` - Total permission checks by resource/action/scope
- `permission_check_allowed_total` - Total allowed permission checks
- `permission_check_denied_total` - Total denied permission checks
- `permission_check_duration_ms` - Permission check duration histogram
- `permission_check_percentile_ms` - Permission check duration percentiles

#### Cache Metrics
- `permission_cache_hits_total` - Cache hit count by cache type
- `permission_cache_misses_total` - Cache miss count
- `permission_cache_invalidations_total` - Cache invalidation count
- `permission_matrix_hits_total` - Permission matrix cache hits

#### Database Metrics
- `permission_db_query_duration_ms` - Database query duration
- `permission_db_errors_total` - Database error count

#### Performance Metrics
- `permission_check_timeout_total` - Permission check timeouts
- `permission_rate_limit_hits_total` - Rate limit hits
- `permission_active_checks` - Currently active permission checks
- `permission_slo_violation_total` - SLO violation count

#### Circuit Breaker Metrics
- `permission_circuit_breaker_status` - Circuit breaker status (0=closed, 0.5=half_open, 1=open)
- `permission_circuit_breaker_failures_total` - Circuit breaker failure count

### Health Endpoints

#### GET /api/v1/permissions/monitoring/health
Returns overall system health:

```json
{
  "status": "healthy",
  "metrics": {
    "avgCheckDuration": 25,
    "cacheHitRate": 85,
    "errorRate": 0.1,
    "activeChecks": 5
  },
  "circuitBreakers": [
    {
      "name": "database",
      "state": "closed",
      "failures": 0,
      "successes": 1000
    }
  ],
  "timestamp": "2024-01-23T10:00:00.000Z"
}
```

Status can be:
- `healthy` - All systems operational
- `degraded` - Some issues but functional
- `unhealthy` - Major issues affecting functionality

#### GET /api/v1/permissions/monitoring/circuit-breakers
Returns circuit breaker status for all services.

#### GET /api/v1/permissions/monitoring/metrics
Returns current permission metrics.

## Circuit Breaker

The circuit breaker pattern is implemented for:

1. **Database Operations** 
   - Failure threshold: 5 failures
   - Reset timeout: 60 seconds

2. **Cache Operations**
   - Failure threshold: 10 failures
   - Reset timeout: 30 seconds

3. **Permission Matrix**
   - Failure threshold: 10 failures
   - Reset timeout: 30 seconds

### Circuit Breaker States

- **Closed** - Normal operation, requests pass through
- **Open** - Failures exceeded threshold, requests fail fast
- **Half-Open** - Testing if service recovered, limited requests allowed

## Grafana Dashboard

A comprehensive dashboard is provided at `monitoring/dashboards/permission-monitoring.json` showing:

1. Permission check 95th percentile latency gauge
2. Cache hit rate gauge
3. Permission check rate by resource/action
4. Allowed vs denied permission checks
5. Circuit breaker status table
6. Database error rates

## Prometheus Alerts

Alert rules are defined in `monitoring/alerts/permission-alerts.yml`:

### Warning Alerts
- **PermissionCheckHighLatency** - 95th percentile > 100ms
- **PermissionLowCacheHitRate** - Cache hit rate < 70%
- **PermissionHighErrorRate** - Error rate > 0.1/sec
- **PermissionSLOViolation** - SLO violations detected
- **PermissionHighActiveChecks** - Active checks > 100
- **PermissionCheckTimeouts** - Timeout rate > 0.01/sec
- **PermissionRateLimitHits** - Rate limits being hit

### Critical Alerts
- **PermissionCheckVeryHighLatency** - 99th percentile > 500ms
- **PermissionCircuitBreakerOpen** - Circuit breaker open
- **PermissionCacheInvalidationStorm** - Invalidation rate > 100/sec

## Usage Examples

### Handling Permission Errors

```typescript
try {
  const permission = await permissionService.findOne(id);
} catch (error) {
  if (error instanceof PermissionException) {
    // Handle specific permission errors
    switch (error.errorCode) {
      case PermissionErrorCode.PERMISSION_NOT_FOUND:
        // Handle not found
        break;
      case PermissionErrorCode.SYSTEM_PERMISSION_IMMUTABLE:
        // Handle system permission error
        break;
    }
  }
}
```

### Monitoring Integration

The monitoring system automatically tracks all permission operations. No additional code is needed in controllers or services that use the permission service.

### Circuit Breaker Fallback

When circuit breakers are open, the system will:
1. Use cached results when available
2. Return graceful error responses
3. Continue operating in degraded mode

## Configuration

### Environment Variables

```env
# Monitoring
PROMETHEUS_PORT=9090
METRICS_ENABLED=true

# Circuit Breaker
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_DB_THRESHOLD=5
CIRCUIT_BREAKER_CACHE_THRESHOLD=10
CIRCUIT_BREAKER_RESET_TIMEOUT=60000

# Performance
PERMISSION_CHECK_TIMEOUT_MS=5000
PERMISSION_BATCH_MAX_SIZE=100
```

### Performance Tuning

1. **Cache Warming** - Pre-load frequently accessed permissions
2. **Matrix Computation** - Run background jobs to compute permission matrices
3. **Connection Pooling** - Optimize database connections
4. **Query Optimization** - Use proper indexes and query patterns

## Best Practices

1. **Always use structured errors** - Use PermissionException factory methods
2. **Monitor SLOs** - Track 95th percentile latency and cache hit rates
3. **Handle circuit breaker states** - Implement proper fallback logic
4. **Set appropriate timeouts** - Prevent long-running permission checks
5. **Use batch operations** - Reduce database round trips
6. **Monitor alert fatigue** - Tune alert thresholds based on actual usage

## Troubleshooting

### High Latency Issues
1. Check cache hit rate - should be > 80%
2. Review database query performance
3. Check for permission matrix computation delays
4. Verify circuit breakers are not flapping

### Circuit Breaker Issues
1. Check error logs for root cause
2. Verify external service health
3. Review failure thresholds
4. Check reset timeout configuration

### Cache Issues
1. Monitor invalidation patterns
2. Check for cache storms
3. Verify Redis connection health
4. Review cache TTL settings