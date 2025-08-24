import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

export interface RateLimitEntry {
  userId: string;
  operation: string;
  requests: number;
  windowStart: Date;
  blockedUntil?: Date;
}

/**
 * Rate limiting utility for sensitive operations
 */
@Injectable()
export class RateLimiterUtil {
  private readonly logger = new Logger(RateLimiterUtil.name);
  private readonly STORAGE_KEY_PREFIX = 'rate_limit:';
  
  // In-memory cache for performance
  private rateLimitCache: Map<string, RateLimitEntry> = new Map();
  
  // Default rate limits for different operations
  private readonly defaultLimits: Record<string, RateLimitConfig> = {
    'backup.create': {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000, // 5 backups per hour
      blockDurationMs: 15 * 60 * 1000, // 15 minute block
    },
    'backup.restore': {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000, // 3 restores per hour
      blockDurationMs: 30 * 60 * 1000, // 30 minute block
    },
    'backup.delete': {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000, // 10 deletes per hour
      blockDurationMs: 15 * 60 * 1000, // 15 minute block
    },
    'maintenance.enable': {
      maxRequests: 5,
      windowMs: 24 * 60 * 60 * 1000, // 5 times per day
      blockDurationMs: 60 * 60 * 1000, // 1 hour block
    },
    'feature-flag.create': {
      maxRequests: 20,
      windowMs: 60 * 60 * 1000, // 20 creates per hour
      blockDurationMs: 15 * 60 * 1000, // 15 minute block
    },
    'feature-flag.update': {
      maxRequests: 50,
      windowMs: 60 * 60 * 1000, // 50 updates per hour
      blockDurationMs: 15 * 60 * 1000, // 15 minute block
    },
    'feature-flag.delete': {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000, // 10 deletes per hour
      blockDurationMs: 15 * 60 * 1000, // 15 minute block
    },
    'config.update': {
      maxRequests: 30,
      windowMs: 60 * 60 * 1000, // 30 updates per hour
      blockDurationMs: 15 * 60 * 1000, // 15 minute block
    },
  };

  constructor(private readonly prisma: PrismaService) {
    // Periodically clean up expired entries
    setInterval(() => this.cleanupExpiredEntries(), 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Check if an operation is rate limited for a user
   * @param userId The user ID
   * @param operation The operation being performed
   * @param customConfig Optional custom rate limit config
   * @returns void if allowed, throws HttpException if rate limited
   */
  async checkRateLimit(
    userId: string,
    operation: string,
    customConfig?: RateLimitConfig,
  ): Promise<void> {
    const config = customConfig || this.defaultLimits[operation];
    
    if (!config) {
      // No rate limit configured for this operation
      return;
    }

    const key = this.generateKey(userId, operation);
    const now = new Date();
    
    // Check cache first
    let entry = this.rateLimitCache.get(key);
    
    if (!entry) {
      // Try to load from database
      const dbEntry = await this.loadFromDatabase(key);
      if (dbEntry) {
        entry = dbEntry;
      }
    }

    if (entry) {
      // Check if user is blocked
      if (entry.blockedUntil && entry.blockedUntil > now) {
        const blockedForMs = entry.blockedUntil.getTime() - now.getTime();
        const blockedForMinutes = Math.ceil(blockedForMs / 60000);
        
        this.logger.warn(
          `User ${userId} is blocked from ${operation} for ${blockedForMinutes} more minutes`,
        );
        
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Too many requests. Please try again in ${blockedForMinutes} minutes.`,
            error: 'Too Many Requests',
            retryAfter: blockedForMs,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Check if window has expired
      const windowEnd = new Date(
        entry.windowStart.getTime() + config.windowMs,
      );
      
      if (now > windowEnd) {
        // Reset window
        entry = {
          userId,
          operation,
          requests: 1,
          windowStart: now,
        };
      } else {
        // Increment request count
        entry.requests++;
        
        // Check if limit exceeded
        if (entry.requests > config.maxRequests) {
          // Block user
          entry.blockedUntil = new Date(
            now.getTime() + (config.blockDurationMs || 15 * 60 * 1000),
          );
          
          this.logger.warn(
            `User ${userId} exceeded rate limit for ${operation}. Blocked until ${entry.blockedUntil}`,
          );
          
          // Save to cache and database
          this.rateLimitCache.set(key, entry);
          await this.saveToDatabase(key, entry);
          
          const blockedForMinutes = Math.ceil(
            (config.blockDurationMs || 15 * 60 * 1000) / 60000,
          );
          
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: `Rate limit exceeded. Please try again in ${blockedForMinutes} minutes.`,
              error: 'Too Many Requests',
              retryAfter: config.blockDurationMs || 15 * 60 * 1000,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }
    } else {
      // First request
      entry = {
        userId,
        operation,
        requests: 1,
        windowStart: now,
      };
    }

    // Save to cache and database
    this.rateLimitCache.set(key, entry);
    await this.saveToDatabase(key, entry);
    
    this.logger.debug(
      `Rate limit check passed for user ${userId} on ${operation}: ${entry.requests}/${config.maxRequests}`,
    );
  }

  /**
   * Get current rate limit status for a user and operation
   */
  async getRateLimitStatus(
    userId: string,
    operation: string,
  ): Promise<{
    limit: number;
    remaining: number;
    resetAt: Date;
    blockedUntil?: Date;
  }> {
    const config = this.defaultLimits[operation];
    
    if (!config) {
      return {
        limit: Infinity,
        remaining: Infinity,
        resetAt: new Date(),
      };
    }

    const key = this.generateKey(userId, operation);
    let entry = this.rateLimitCache.get(key) || (await this.loadFromDatabase(key));
    
    if (!entry) {
      return {
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetAt: new Date(Date.now() + config.windowMs),
      };
    }

    const windowEnd = new Date(entry.windowStart.getTime() + config.windowMs);
    const now = new Date();
    
    if (now > windowEnd) {
      // Window expired
      return {
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetAt: new Date(now.getTime() + config.windowMs),
      };
    }

    return {
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.requests),
      resetAt: windowEnd,
      blockedUntil: entry.blockedUntil,
    };
  }

  /**
   * Reset rate limit for a user and operation
   */
  async resetRateLimit(userId: string, operation: string): Promise<void> {
    const key = this.generateKey(userId, operation);
    
    // Remove from cache
    this.rateLimitCache.delete(key);
    
    // Remove from database
    try {
      await this.prisma.systemConfig.delete({
        where: { key },
      });
      
      this.logger.log(`Rate limit reset for user ${userId} on ${operation}`);
    } catch (error) {
      this.logger.error(`Failed to reset rate limit: ${error.message}`);
    }
  }

  /**
   * Get all rate limits configuration
   */
  getRateLimitsConfig(): Record<string, RateLimitConfig> {
    return { ...this.defaultLimits };
  }

  /**
   * Update rate limit configuration for an operation
   */
  updateRateLimitConfig(operation: string, config: RateLimitConfig): void {
    this.defaultLimits[operation] = config;
    this.logger.log(`Updated rate limit config for ${operation}`, config);
  }

  private generateKey(userId: string, operation: string): string {
    return `${this.STORAGE_KEY_PREFIX}${userId}:${operation}`;
  }

  private async loadFromDatabase(key: string): Promise<RateLimitEntry | null> {
    try {
      const result = await this.prisma.systemConfig.findUnique({
        where: { key },
      });
      
      if (result?.value) {
        const entry = result.value as unknown as RateLimitEntry;
        // Convert date strings back to Date objects
        entry.windowStart = new Date(entry.windowStart);
        if (entry.blockedUntil) {
          entry.blockedUntil = new Date(entry.blockedUntil);
        }
        return entry;
      }
    } catch (error) {
      this.logger.error(`Failed to load rate limit from database: ${error.message}`);
    }
    
    return null;
  }

  private async saveToDatabase(key: string, entry: RateLimitEntry): Promise<void> {
    try {
      await this.prisma.systemConfig.upsert({
        where: { key },
        update: {
          value: entry as unknown as Prisma.InputJsonValue,
          category: 'rate_limit',
          updatedAt: new Date(),
        },
        create: {
          key,
          value: entry as unknown as Prisma.InputJsonValue,
          category: 'rate_limit',
          description: 'Rate limit entry',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to save rate limit to database: ${error.message}`);
    }
  }

  private cleanupExpiredEntries(): void {
    const now = new Date();
    const expiredKeys: string[] = [];
    
    // Clean up cache
    for (const [key, entry] of this.rateLimitCache.entries()) {
      const config = this.defaultLimits[entry.operation];
      if (!config) continue;
      
      const windowEnd = new Date(
        entry.windowStart.getTime() + config.windowMs,
      );
      
      // Remove if window expired and not blocked
      if (now > windowEnd && (!entry.blockedUntil || now > entry.blockedUntil)) {
        expiredKeys.push(key);
      }
    }
    
    // Remove expired entries
    for (const key of expiredKeys) {
      this.rateLimitCache.delete(key);
    }
    
    if (expiredKeys.length > 0) {
      this.logger.debug(`Cleaned up ${expiredKeys.length} expired rate limit entries`);
      
      // Clean up database asynchronously
      this.cleanupDatabase(expiredKeys).catch((error) => {
        this.logger.error(`Failed to cleanup database: ${error.message}`);
      });
    }
  }

  private async cleanupDatabase(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    
    try {
      await this.prisma.systemConfig.deleteMany({
        where: {
          key: {
            in: keys,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to cleanup expired entries from database: ${error.message}`);
    }
  }
}