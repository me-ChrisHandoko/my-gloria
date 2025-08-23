import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../../cache/cache.service';
import * as crypto from 'crypto';

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

interface DeduplicationConfig {
  ttlSeconds: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  // Rate limit configurations per notification type
  private readonly rateLimitConfigs: Map<string, RateLimitConfig> = new Map([
    ['GENERAL', { maxRequests: 10, windowSeconds: 60 }], // 10 per minute
    ['APPROVAL_REQUEST', { maxRequests: 5, windowSeconds: 60 }], // 5 per minute
    ['APPROVAL_RESULT', { maxRequests: 5, windowSeconds: 60 }], // 5 per minute
    ['DELEGATION', { maxRequests: 3, windowSeconds: 60 }], // 3 per minute
    ['CRITICAL', { maxRequests: 20, windowSeconds: 60 }], // 20 per minute for critical
    ['default', { maxRequests: 5, windowSeconds: 60 }], // Default: 5 per minute
  ]);

  // Deduplication configuration
  private readonly deduplicationConfig: DeduplicationConfig = {
    ttlSeconds: 300, // 5 minutes deduplication window
  };

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Check if a notification is rate limited
   * Uses sliding window algorithm
   */
  async isRateLimited(
    userProfileId: string,
    notificationType: string,
  ): Promise<{ limited: boolean; remaining: number; resetAt: Date }> {
    const config = this.getRateLimitConfig(notificationType);
    const key = this.getRateLimitKey(userProfileId, notificationType);
    const now = Date.now();
    const windowStart = now - config.windowSeconds * 1000;

    try {
      // Get current window data
      const windowData = await this.cacheService.get(key);
      let timestamps: number[] = windowData ? JSON.parse(windowData) : [];

      // Filter out timestamps outside current window
      timestamps = timestamps.filter((ts) => ts > windowStart);

      // Check if limit exceeded
      if (timestamps.length >= config.maxRequests) {
        const oldestTimestamp = Math.min(...timestamps);
        const resetAt = new Date(oldestTimestamp + config.windowSeconds * 1000);

        this.logger.warn(
          `Rate limit exceeded for user ${userProfileId}, type ${notificationType}. ` +
            `${timestamps.length}/${config.maxRequests} requests in window.`,
        );

        return {
          limited: true,
          remaining: 0,
          resetAt,
        };
      }

      // Add current timestamp and update cache
      timestamps.push(now);
      await this.cacheService.set(
        key,
        JSON.stringify(timestamps),
        config.windowSeconds,
      );

      return {
        limited: false,
        remaining: config.maxRequests - timestamps.length,
        resetAt: new Date(now + config.windowSeconds * 1000),
      };
    } catch (error) {
      this.logger.error(`Rate limit check failed: ${error.message}`);
      // On error, allow the request
      return {
        limited: false,
        remaining: config.maxRequests,
        resetAt: new Date(now + config.windowSeconds * 1000),
      };
    }
  }

  /**
   * Check if a notification is a duplicate
   * Uses content hash for deduplication
   */
  async isDuplicate(
    userProfileId: string,
    title: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<{ duplicate: boolean; hash: string }> {
    const hash = this.generateNotificationHash(
      userProfileId,
      title,
      message,
      data,
    );
    const key = this.getDeduplicationKey(hash);

    try {
      const exists = await this.cacheService.has(key);

      if (exists) {
        this.logger.warn(
          `Duplicate notification detected for user ${userProfileId}. ` +
            `Hash: ${hash}, Title: ${title}`,
        );
        return { duplicate: true, hash };
      }

      // Store hash to prevent duplicates
      await this.cacheService.set(
        key,
        JSON.stringify({
          userProfileId,
          title,
          timestamp: Date.now(),
        }),
        this.deduplicationConfig.ttlSeconds,
      );

      return { duplicate: false, hash };
    } catch (error) {
      this.logger.error(`Deduplication check failed: ${error.message}`);
      // On error, allow the notification
      return { duplicate: false, hash };
    }
  }

  /**
   * Reset rate limit for a user (e.g., for admin override)
   */
  async resetRateLimit(
    userProfileId: string,
    notificationType?: string,
  ): Promise<void> {
    try {
      if (notificationType) {
        const key = this.getRateLimitKey(userProfileId, notificationType);
        await this.cacheService.del(key);
        this.logger.log(
          `Rate limit reset for user ${userProfileId}, type ${notificationType}`,
        );
      } else {
        // Reset all rate limits for user
        const types = Array.from(this.rateLimitConfigs.keys());
        await Promise.all(
          types.map((type) => {
            const key = this.getRateLimitKey(userProfileId, type);
            return this.cacheService.del(key);
          }),
        );
        this.logger.log(`All rate limits reset for user ${userProfileId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to reset rate limit: ${error.message}`);
    }
  }

  /**
   * Get rate limit status for a user
   */
  async getRateLimitStatus(
    userProfileId: string,
  ): Promise<Map<string, { count: number; remaining: number; resetAt: Date }>> {
    const status = new Map();
    const now = Date.now();

    for (const [type, config] of this.rateLimitConfigs.entries()) {
      if (type === 'default') continue;

      const key = this.getRateLimitKey(userProfileId, type);
      const windowStart = now - config.windowSeconds * 1000;

      try {
        const windowData = await this.cacheService.get(key);
        let timestamps: number[] = windowData ? JSON.parse(windowData) : [];
        timestamps = timestamps.filter((ts) => ts > windowStart);

        const count = timestamps.length;
        const remaining = Math.max(0, config.maxRequests - count);
        const oldestTimestamp =
          timestamps.length > 0 ? Math.min(...timestamps) : now;
        const resetAt = new Date(oldestTimestamp + config.windowSeconds * 1000);

        status.set(type, { count, remaining, resetAt });
      } catch (error) {
        // On error, return default status
        status.set(type, {
          count: 0,
          remaining: config.maxRequests,
          resetAt: new Date(now + config.windowSeconds * 1000),
        });
      }
    }

    return status;
  }

  /**
   * Update rate limit configuration (for admin use)
   */
  updateRateLimitConfig(
    notificationType: string,
    config: RateLimitConfig,
  ): void {
    this.rateLimitConfigs.set(notificationType, config);
    this.logger.log(
      `Rate limit config updated for ${notificationType}: ` +
        `${config.maxRequests} requests per ${config.windowSeconds} seconds`,
    );
  }

  /**
   * Update deduplication configuration (for admin use)
   */
  updateDeduplicationConfig(ttlSeconds: number): void {
    this.deduplicationConfig.ttlSeconds = ttlSeconds;
    this.logger.log(`Deduplication TTL updated to ${ttlSeconds} seconds`);
  }

  private getRateLimitConfig(notificationType: string): RateLimitConfig {
    return (
      this.rateLimitConfigs.get(notificationType) ||
      this.rateLimitConfigs.get('default')!
    );
  }

  private getRateLimitKey(
    userProfileId: string,
    notificationType: string,
  ): string {
    return `notification:ratelimit:${userProfileId}:${notificationType}`;
  }

  private getDeduplicationKey(hash: string): string {
    return `notification:dedup:${hash}`;
  }

  private generateNotificationHash(
    userProfileId: string,
    title: string,
    message: string,
    data?: Record<string, any>,
  ): string {
    const content = `${userProfileId}:${title}:${message}:${JSON.stringify(data || {})}`;
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Get metrics for monitoring
   */
  async getMetrics(): Promise<{
    rateLimitHits: number;
    duplicatesBlocked: number;
    timestamp: Date;
  }> {
    // This would be enhanced with actual metrics collection
    // For now, return placeholder metrics
    return {
      rateLimitHits: 0,
      duplicatesBlocked: 0,
      timestamp: new Date(),
    };
  }

  /**
   * Cleanup expired entries (for maintenance)
   */
  async cleanup(): Promise<void> {
    // This would be implemented if needed for maintenance
    this.logger.log('Rate limit cleanup completed');
  }
}
