// lib/utils/mutex.ts
/**
 * Mutex implementation for preventing concurrent operations
 * Useful for preventing race conditions in async operations
 */

type MutexReleaser = () => void;

export class Mutex {
  private locked = false;
  private queue: Array<(release: MutexReleaser) => void> = [];

  /**
   * Acquire the mutex lock
   * Returns a promise that resolves with a release function when lock is acquired
   */
  async acquire(): Promise<MutexReleaser> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve(() => this.release());
      } else {
        this.queue.push((release) => resolve(release));
      }
    });
  }

  /**
   * Release the mutex lock
   * Allows next operation in queue to proceed
   */
  private release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        next(() => this.release());
      }
    } else {
      this.locked = false;
    }
  }

  /**
   * Check if mutex is currently locked
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * Get number of operations waiting in queue
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Execute a function with mutex protection
   * Automatically acquires and releases lock
   */
  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

/**
 * Keyed mutex for managing multiple independent locks
 * Each key has its own mutex
 */
export class KeyedMutex {
  private mutexes = new Map<string, Mutex>();

  /**
   * Get or create mutex for a specific key
   */
  private getMutex(key: string): Mutex {
    if (!this.mutexes.has(key)) {
      this.mutexes.set(key, new Mutex());
    }
    return this.mutexes.get(key)!;
  }

  /**
   * Acquire lock for specific key
   */
  async acquire(key: string): Promise<MutexReleaser> {
    return this.getMutex(key).acquire();
  }

  /**
   * Execute function with mutex protection for specific key
   */
  async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    return this.getMutex(key).runExclusive(fn);
  }

  /**
   * Check if specific key is locked
   */
  isLocked(key: string): boolean {
    const mutex = this.mutexes.get(key);
    return mutex ? mutex.isLocked() : false;
  }

  /**
   * Get queue length for specific key
   */
  getQueueLength(key: string): number {
    const mutex = this.mutexes.get(key);
    return mutex ? mutex.getQueueLength() : 0;
  }

  /**
   * Clean up mutex for key if not locked
   */
  cleanup(key: string): void {
    const mutex = this.mutexes.get(key);
    if (mutex && !mutex.isLocked() && mutex.getQueueLength() === 0) {
      this.mutexes.delete(key);
    }
  }

  /**
   * Clean up all unlocked mutexes
   */
  cleanupAll(): void {
    for (const [key] of this.mutexes) {
      this.cleanup(key);
    }
  }
}

/**
 * Global mutex instances for common use cases
 */
export const globalMutex = new Mutex();
export const formSubmissionMutex = new KeyedMutex();
export const apiCallMutex = new KeyedMutex();

/**
 * Decorator for async functions to ensure exclusive execution
 */
export function withMutex(mutex: Mutex) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return mutex.runExclusive(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Utility to prevent duplicate concurrent executions of a function
 * Returns the same promise if called while previous call is still pending
 */
export function createDedupedFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const pendingCalls = new Map<string, Promise<any>>();

  return (async (...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : 'default';

    // Return existing promise if call is pending
    if (pendingCalls.has(key)) {
      return pendingCalls.get(key);
    }

    // Create new promise
    const promise = fn(...args)
      .then((result) => {
        pendingCalls.delete(key);
        return result;
      })
      .catch((error) => {
        pendingCalls.delete(key);
        throw error;
      });

    pendingCalls.set(key, promise);
    return promise;
  }) as T;
}
