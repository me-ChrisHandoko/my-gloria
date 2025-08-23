import {
  Controller,
  Get,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../../auth/guards/clerk-auth.guard';
import { CircuitBreakerService, CircuitBreakerState } from '../services/circuit-breaker.service';
import { PermissionMetricsService } from '../services/permission-metrics.service';

export class HealthMetrics {
  @ApiProperty({ description: 'Average permission check duration in ms' })
  avgCheckDuration: number;

  @ApiProperty({ description: 'Cache hit rate percentage' })
  cacheHitRate: number;

  @ApiProperty({ description: 'Error rate percentage' })
  errorRate: number;

  @ApiProperty({ description: 'Number of active permission checks' })
  activeChecks: number;
}

export class CircuitBreakerStatus {
  @ApiProperty({ description: 'Circuit breaker name' })
  name: string;

  @ApiProperty({ description: 'Circuit state' })
  state: string;

  @ApiProperty({ description: 'Number of failures' })
  failures: number;

  @ApiProperty({ description: 'Number of successes' })
  successes: number;

  @ApiPropertyOptional({ description: 'Last failure timestamp' })
  lastFailureTime?: Date;
}

export class MonitoringResponse {
  @ApiProperty({ 
    description: 'System health status',
    enum: ['healthy', 'degraded', 'unhealthy']
  })
  status: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({ 
    description: 'Health metrics',
    type: HealthMetrics
  })
  metrics: HealthMetrics;

  @ApiProperty({ 
    description: 'Circuit breaker statuses',
    type: [CircuitBreakerStatus]
  })
  circuitBreakers: CircuitBreakerStatus[];

  @ApiProperty({ description: 'Timestamp' })
  timestamp: string;
}

@ApiTags('Permission Monitoring')
@ApiBearerAuth()
@Controller('permissions/monitoring')
@UseGuards(ClerkAuthGuard)
export class PermissionMonitoringController {
  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly metricsService: PermissionMetricsService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Get permission system health status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission system health metrics',
    type: MonitoringResponse,
  })
  async getHealth(): Promise<MonitoringResponse> {
    // Get health metrics
    const metrics = await this.metricsService.getHealthMetrics();
    
    // Get circuit breaker states
    const circuitStates = this.circuitBreakerService.getAllCircuitStates();
    const circuitBreakers: CircuitBreakerStatus[] = [];
    
    for (const [name, state] of circuitStates) {
      circuitBreakers.push({
        name,
        state: state.state,
        failures: state.failures,
        successes: state.successes,
        lastFailureTime: state.lastFailureTime,
      });
    }
    
    // Determine overall health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    // Check for unhealthy conditions
    const openCircuits = circuitBreakers.filter(cb => cb.state === 'open');
    if (openCircuits.length > 0) {
      status = 'unhealthy';
    } else if (metrics.errorRate > 5 || metrics.avgCheckDuration > 100) {
      status = 'degraded';
    } else if (metrics.cacheHitRate < 70) {
      status = 'degraded';
    }
    
    return {
      status,
      metrics,
      circuitBreakers,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('circuit-breakers')
  @ApiOperation({ summary: 'Get circuit breaker status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Circuit breaker status',
    type: [CircuitBreakerStatus],
  })
  getCircuitBreakers(): CircuitBreakerStatus[] {
    const circuitStates = this.circuitBreakerService.getAllCircuitStates();
    const result: CircuitBreakerStatus[] = [];
    
    for (const [name, state] of circuitStates) {
      result.push({
        name,
        state: state.state,
        failures: state.failures,
        successes: state.successes,
        lastFailureTime: state.lastFailureTime,
      });
    }
    
    return result;
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get current permission metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current permission system metrics',
    type: HealthMetrics,
  })
  async getMetrics(): Promise<HealthMetrics> {
    return this.metricsService.getHealthMetrics();
  }
}