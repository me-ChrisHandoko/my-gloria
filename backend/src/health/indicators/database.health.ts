import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // Test database connection with a simple query
      await this.prisma.$queryRaw`SELECT 1`;

      const responseTime = Date.now() - startTime;

      // Get database statistics
      const [schoolCount, userCount, positionCount] = await Promise.all([
        this.prisma.school.count(),
        this.prisma.userProfile.count(),
        this.prisma.position.count(),
      ]);

      return this.getStatus(key, true, {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        statistics: {
          schools: schoolCount,
          users: userCount,
          positions: positionCount,
        },
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      throw new HealthCheckError(
        'Database check failed',
        this.getStatus(key, false, {
          status: 'unhealthy',
          responseTime: `${responseTime}ms`,
          error: error.message,
        }),
      );
    }
  }
}
