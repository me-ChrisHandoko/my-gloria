import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CacheEntry, CacheOptions, CacheMetrics, ICacheService } from './cache.interface';

@Injectable()
export class OrganizationCacheService<T> implements ICacheService<T> {
  private readonly logger = new Logger(OrganizationCacheService.name);
  private readonly cache = new Map<string, CacheEntry<T>>();
  private readonly metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
  };

  // Default TTL: 5 minutes
  private readonly DEFAULT_TTL = 5 * 60 * 1000;
  // Maximum cache size
  private readonly MAX_SIZE = 1000;

  constructor(private readonly eventEmitter: EventEmitter2) {
    // Listen for cache invalidation events
    this.setupInvalidationListeners();
  }

  async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    // Check if entry is expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.metrics.evictions++;
      return null;
    }

    this.metrics.hits++;
    return entry.data;
  }

  async set(key: string, value: T, options?: CacheOptions): Promise<void> {
    // Check cache size limit
    if (this.cache.size >= this.MAX_SIZE) {
      this.evictOldest();
    }

    const ttl = options?.ttl ?? this.DEFAULT_TTL;
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl,
    };

    this.cache.set(key, entry);
    this.metrics.size = this.cache.size;

    // Setup invalidation listeners if specified
    if (options?.invalidateOn) {
      options.invalidateOn.forEach((event) => {
        this.eventEmitter.once(event, () => {
          this.delete(key);
        });
      });
    }
  }

  async delete(key: string): Promise<void> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.metrics.size = this.cache.size;
      this.logger.debug(`Cache key deleted: ${key}`);
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.metrics.size = 0;
    this.logger.debug('Cache cleared');
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry || this.isExpired(entry)) {
      return false;
    }
    return true;
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Generate cache key with namespace
   */
  static generateKey(namespace: string, ...parts: string[]): string {
    return `${namespace}:${parts.join(':')}`;
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict oldest cache entries (LRU)
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.metrics.evictions++;
      this.logger.debug(`Evicted cache key: ${oldestKey}`);
    }
  }

  /**
   * Setup event listeners for cache invalidation
   */
  private setupInvalidationListeners(): void {
    // Invalidate on entity updates
    this.eventEmitter.on('organization.school.updated', (payload) => {
      this.invalidatePattern(`school:${payload.id}:*`);
    });

    this.eventEmitter.on('organization.department.updated', (payload) => {
      this.invalidatePattern(`department:${payload.id}:*`);
    });

    this.eventEmitter.on('organization.position.updated', (payload) => {
      this.invalidatePattern(`position:${payload.id}:*`);
    });

    // Invalidate on entity deletions
    this.eventEmitter.on('organization.school.deleted', (payload) => {
      this.invalidatePattern(`school:${payload.id}:*`);
    });

    this.eventEmitter.on('organization.department.deleted', (payload) => {
      this.invalidatePattern(`department:${payload.id}:*`);
    });

    this.eventEmitter.on('organization.position.deleted', (payload) => {
      this.invalidatePattern(`position:${payload.id}:*`);
    });
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  private invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      this.logger.debug(`Invalidated cache key: ${key}`);
    });

    this.metrics.size = this.cache.size;
  }
}