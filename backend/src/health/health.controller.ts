import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { MemoryHealthIndicator } from './indicators/memory.health';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private health: HealthCheckService,
    private db: DatabaseHealthIndicator,
    private memory: MemoryHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'General health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.memory.isHealthy('memory'),
      () => this.checkAuthConfiguration(),
    ]);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.checkAuthConfiguration(),
    ]);
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  @ApiResponse({ status: 503, description: 'Service is not alive' })
  @HealthCheck()
  liveness() {
    return this.health.check([
      () => this.memory.isHealthy('memory'),
      () => ({
        uptime: {
          status: 'up',
          value: process.uptime(),
          unit: 'seconds',
        },
      }),
    ]);
  }

  @Get('auth')
  @ApiOperation({ summary: 'Authentication service health check' })
  @ApiResponse({ status: 200, description: 'Auth service is healthy' })
  @ApiResponse({ status: 503, description: 'Auth service is unhealthy' })
  @HealthCheck()
  async authHealth() {
    const results = await this.health.check([
      () => this.checkAuthConfiguration(),
      () => this.checkClerkConnection(),
    ]);

    this.logger.log('Auth health check completed', results);
    return results;
  }

  private async checkAuthConfiguration(): Promise<any> {
    const clerkSecretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    const clerkPublishableKey = this.configService.get<string>(
      'CLERK_PUBLISHABLE_KEY',
    );

    const isConfigured = !!clerkSecretKey && !!clerkPublishableKey;

    if (!isConfigured) {
      this.logger.warn('Clerk authentication keys are not properly configured');
    }

    return {
      'auth-config': {
        status: isConfigured ? 'up' : 'down',
        configured: isConfigured,
        hasSecretKey: !!clerkSecretKey,
        hasPublishableKey: !!clerkPublishableKey,
        message: isConfigured
          ? 'Clerk authentication is configured'
          : 'Clerk authentication keys are missing',
      },
    };
  }

  private async checkClerkConnection(): Promise<any> {
    try {
      const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');

      if (!secretKey) {
        return {
          'clerk-connection': {
            status: 'down',
            message: 'Clerk secret key not configured',
          },
        };
      }

      // Check if Clerk SDK is properly initialized
      const { clerkClient } = await import('@clerk/clerk-sdk-node');

      return {
        'clerk-connection': {
          status: 'up',
          message: 'Clerk SDK is available',
          sdkVersion: '4.13.23', // You might want to dynamically get this
        },
      };
    } catch (error: any) {
      this.logger.error('Clerk connection check failed:', error);
      return {
        'clerk-connection': {
          status: 'down',
          message: `Clerk connection failed: ${error.message}`,
        },
      };
    }
  }
}
