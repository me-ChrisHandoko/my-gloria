import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get a value from cache
   */
  async get(key: string): Promise<string | undefined> {
    try {
      const value = await this.cacheManager.get<string>(key);
      if (value) {
        this.logger.debug(`Cache hit for key: ${key}`);
      }
      return value;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Set a value in cache
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache set for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}: ${error.message}`);
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}: ${error.message}`);
    }
  }

  /**
   * Reset all cache (Note: reset is not available in all cache stores)
   */
  async reset(): Promise<void> {
    try {
      // Check if reset method exists
      if (typeof (this.cacheManager as any).reset === 'function') {
        await (this.cacheManager as any).reset();
        this.logger.log('Cache reset successfully');
      } else {
        // If reset is not available, we can't clear all keys
        // This would require a different approach like tracking all keys
        this.logger.warn('Cache reset not available for this cache store');
      }
    } catch (error) {
      this.logger.error(`Error resetting cache: ${error.message}`);
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget(keys: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get(key);
        if (value) {
          results.set(key, value);
        }
      }),
    );

    return results;
  }

  /**
   * Set multiple values in cache
   */
  async mset(entries: Array<{ key: string; value: string; ttl?: number }>): Promise<void> {
    await Promise.all(
      entries.map(({ key, value, ttl }) => this.set(key, value, ttl)),
    );
  }

  /**
   * Delete multiple keys from cache
   */
  async mdel(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.del(key)));
  }

  /**
   * Check if a key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }
}