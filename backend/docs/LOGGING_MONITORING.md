# Approval Module - Comprehensive Logging & Monitoring

## Overview

The approval module now includes a comprehensive logging and monitoring system that provides:
- Structured logging with contextual information
- Performance metrics tracking
- Enhanced audit trail
- Health monitoring
- Real-time metrics endpoints

## Architecture

### Components

1. **ApprovalLoggerService** (`/logging/approval-logger.service.ts`)
   - Structured logging with correlation IDs
   - Context management for request tracking
   - Log levels: DEBUG, INFO, WARN, ERROR
   - Automatic sanitization of sensitive data

2. **ApprovalMetricsService** (`/metrics/approval-metrics.service.ts`)
   - Performance timing and tracking
   - Counter metrics for operations
   - Percentile calculations
   - Health status monitoring

3. **ApprovalAuditService** (`/services/approval-audit.service.ts`)
   - Enhanced audit trail creation
   - State transition tracking
   - Workflow lifecycle auditing
   - Audit report generation

4. **ApprovalLoggingInterceptor** (`/interceptors/logging.interceptor.ts`)
   - Automatic request/response logging
   - Performance measurement
   - Error tracking
   - Context injection

## Features

### 1. Structured Logging

All logs follow a consistent JSON structure:

```json
{
  "timestamp": "2025-01-22T10:30:45.123Z",
  "correlationId": "1737543045123-abc123xyz",
  "requestId": "req-123",
  "action": "STATE_TRANSITION",
  "userId": "user-456",
  "module": "leave-request",
  "duration": 150,
  "metadata": {
    "fromStatus": "PENDING",
    "toStatus": "APPROVED"
  }
}
```

### 2. Performance Metrics

Track various performance indicators:

- **Response Times**: Average, P50, P90, P95, P99
- **Operation Counts**: Total, approved, rejected, failed
- **Error Rates**: By type (validation, authorization, database, external)
- **Health Status**: Healthy, degraded, or unhealthy based on thresholds

### 3. Audit Trail

Enhanced audit logging with:

- Complete action history
- State transitions
- Actor identification
- Timestamp and correlation tracking
- Previous/new state comparison
- IP address and user agent capture

### 4. Metrics Endpoints

Access real-time metrics via REST API:

- `GET /api/v1/approval/metrics` - Current metrics snapshot
- `GET /api/v1/approval/metrics/health` - Health status
- `GET /api/v1/approval/metrics/summary` - KPI summary
- `GET /api/v1/approval/metrics/reset` - Reset metrics (admin only)

## Usage

### In Services

```typescript
import { ApprovalLoggerService } from '../logging/approval-logger.service';
import { ApprovalMetricsService } from '../metrics/approval-metrics.service';

@Injectable()
export class YourService {
  constructor(
    private readonly logger: ApprovalLoggerService,
    private readonly metrics: ApprovalMetricsService,
  ) {}

  async yourMethod(requestId: string) {
    // Create logging context
    const context = this.logger.createContext(requestId);
    context.userId = 'user-123';
    
    // Start performance timer
    const timerId = this.metrics.startTimer('your-operation', context);
    
    try {
      // Log action
      this.logger.logAction('OPERATION_START', context, {
        customField: 'value'
      });
      
      // Your business logic here
      const result = await this.doSomething();
      
      // Track metrics
      this.metrics.incrementCounter('totalRequests');
      
      // End timer
      this.metrics.endTimer(timerId, true);
      
      return result;
    } catch (error) {
      // Log error
      this.logger.logError(error, context);
      
      // Track error metrics
      this.metrics.trackError('database');
      
      // End timer with failure
      this.metrics.endTimer(timerId, false);
      
      throw error;
    } finally {
      // Clear context
      this.logger.clearContext(requestId);
    }
  }
}
```

### Audit Trail

```typescript
// Audit state transition
await this.auditService.auditStateTransition(
  requestId,
  'PENDING',
  'APPROVED',
  userId,
  'Approved by manager',
);

// Audit approval action
await this.auditService.auditApprovalAction(
  requestId,
  stepId,
  'APPROVED',
  userId,
  'Looks good to me',
);

// Get audit trail
const trail = await this.auditService.getAuditTrail(requestId);
```

## Configuration

### Log Levels

Set via environment variable:
```bash
LOG_LEVEL=debug # debug, info, warn, error
```

### Performance Thresholds

Configure in metrics service:
```typescript
// Health status thresholds
errorRate > 0.1 || avgResponseTime > 5000 // unhealthy
errorRate > 0.05 || avgResponseTime > 2000 // degraded
```

### Metrics Retention

Metrics keep last 1000 values per operation to prevent memory issues.

## Monitoring Dashboard

### Key Metrics to Monitor

1. **Request Processing**
   - Total requests per minute
   - Average processing time
   - Success/failure rates

2. **Approval Flow**
   - Approval rate
   - Rejection rate
   - Average time to approval

3. **System Health**
   - Error rate by type
   - Response time percentiles
   - Active requests

4. **Audit Compliance**
   - Audit entries per action
   - Top actors
   - Action breakdown

## Integration with External Tools

### Prometheus/Grafana

Export metrics in Prometheus format:

```typescript
// Add to metrics controller
@Get('prometheus')
async getPrometheusMetrics() {
  const metrics = this.metricsService.getMetrics();
  // Convert to Prometheus format
  return this.formatPrometheusMetrics(metrics);
}
```

### ELK Stack

Logs are JSON formatted for easy ingestion into Elasticsearch.

### APM Tools

Correlation IDs enable distributed tracing across services.

## Best Practices

1. **Always use correlation IDs** for tracking requests across services
2. **Create context early** in the request lifecycle
3. **Log at appropriate levels** (debug for development, info for production)
4. **Track all state changes** in audit trail
5. **Monitor metrics regularly** and set up alerts
6. **Clean up contexts** after request completion
7. **Sanitize sensitive data** before logging

## Performance Impact

The logging and monitoring system is designed for minimal overhead:

- Async logging to prevent blocking
- Efficient metric calculations
- Automatic cleanup of old data
- Optimized JSON serialization

Typical overhead: <5ms per request

## Troubleshooting

### High Memory Usage

- Check metrics retention settings
- Ensure contexts are being cleared
- Review log volume and adjust levels

### Missing Logs

- Verify log level configuration
- Check interceptor registration
- Ensure context creation

### Incorrect Metrics

- Verify timer start/end pairing
- Check counter increment logic
- Review metric calculation formulas

## Future Enhancements

1. **Distributed Tracing** - OpenTelemetry integration
2. **Custom Dashboards** - Built-in visualization
3. **Alert System** - Automated alerting on thresholds
4. **Log Aggregation** - Centralized log management
5. **Machine Learning** - Anomaly detection in metrics