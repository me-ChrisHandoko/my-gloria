import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';

@Injectable()
export class MemoryHealthIndicator extends HealthIndicator {
  private readonly heapUsedThreshold = 0.9; // 90% heap usage threshold
  private readonly rssThreshold = 1024 * 1024 * 1024; // 1GB RSS threshold

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const memoryUsage = process.memoryUsage();

    const heapUsedPercentage = memoryUsage.heapUsed / memoryUsage.heapTotal;
    const rssInMB = Math.round(memoryUsage.rss / 1024 / 1024);
    const heapUsedInMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalInMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);

    const isHealthy =
      heapUsedPercentage < this.heapUsedThreshold &&
      memoryUsage.rss < this.rssThreshold;

    const details = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      rss: `${rssInMB} MB`,
      heapUsed: `${heapUsedInMB} MB`,
      heapTotal: `${heapTotalInMB} MB`,
      heapUsedPercentage: `${(heapUsedPercentage * 100).toFixed(2)}%`,
      uptime: `${Math.floor(process.uptime())} seconds`,
    };

    if (!isHealthy) {
      throw new HealthCheckError(
        'Memory usage is too high',
        this.getStatus(key, false, details),
      );
    }

    return this.getStatus(key, true, details);
  }
}
