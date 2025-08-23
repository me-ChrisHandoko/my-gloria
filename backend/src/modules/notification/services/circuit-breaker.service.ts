import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Number of failures before opening circuit
  successThreshold?: number; // Number of successes in half-open before closing
  timeout?: number; // Time in ms before attempting to close circuit
  resetTimeout?: number; // Time in ms to wait before resetting failure count
  volumeThreshold?: number; // Minimum number of requests before calculating failure rate
  errorThresholdPercentage?: number; // Percentage of failures to open circuit
  fallbackFunction?: () => Promise<any>;
  healthCheckInterval?: number; // Interval for health checks in ms
  name?: string; // Name for logging purposes
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rejectedRequests: number;
  state: CircuitState;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  averageResponseTime: number;
  lastStateChange?: Date;
}

interface RequestMetrics {
  requests: number;
  failures: number;
  successes: number;
  totalResponseTime: number;
  timestamp: number;
}

@Injectable()
export class CircuitBreakerService extends EventEmitter {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker for a specific service
   */
  getCircuit(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.circuits.has(name)) {
      const circuit = new CircuitBreaker(name, options);
      this.circuits.set(name, circuit);

      // Forward circuit events
      circuit.on('state-change', (data) => {
        this.emit('circuit-state-change', { name, ...data });
      });

      circuit.on('health-check-failed', (error) => {
        this.emit('circuit-health-check-failed', { name, error });
      });
    }

    return this.circuits.get(name)!;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    circuitName: string,
    fn: () => Promise<T>,
    options?: CircuitBreakerOptions,
  ): Promise<T> {
    const circuit = this.getCircuit(circuitName, options);
    return circuit.execute(fn);
  }

  /**
   * Get metrics for a specific circuit
   */
  getMetrics(circuitName: string): CircuitBreakerMetrics | undefined {
    const circuit = this.circuits.get(circuitName);
    return circuit?.getMetrics();
  }

  /**
   * Get metrics for all circuits
   */
  getAllMetrics(): Map<string, CircuitBreakerMetrics> {
    const metrics = new Map<string, CircuitBreakerMetrics>();

    this.circuits.forEach((circuit, name) => {
      metrics.set(name, circuit.getMetrics());
    });

    return metrics;
  }

  /**
   * Reset a specific circuit
   */
  resetCircuit(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (circuit) {
      circuit.reset();
      this.logger.log(`Circuit ${circuitName} has been reset`);
    }
  }

  /**
   * Reset all circuits
   */
  resetAllCircuits(): void {
    this.circuits.forEach((circuit, name) => {
      circuit.reset();
    });
    this.logger.log('All circuits have been reset');
  }

  /**
   * Force open a circuit (for testing or emergency)
   */
  forceOpen(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (circuit) {
      circuit.forceOpen();
    }
  }

  /**
   * Force close a circuit (for testing or manual recovery)
   */
  forceClose(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (circuit) {
      circuit.forceClose();
    }
  }
}

export class CircuitBreaker extends EventEmitter {
  private readonly logger = new Logger(CircuitBreaker.name);
  private state: CircuitState = CircuitState.CLOSED;
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private nextAttempt?: number;
  private readonly metrics: CircuitBreakerMetrics;
  private readonly requestMetrics: RequestMetrics[] = [];
  private readonly metricsWindow = 60000; // 1 minute window for metrics
  private healthCheckInterval?: NodeJS.Timeout;
  private readonly options: Required<
    Omit<CircuitBreakerOptions, 'fallbackFunction'>
  > & { fallbackFunction?: () => Promise<any> };

  constructor(
    private readonly name: string,
    options: CircuitBreakerOptions = {},
  ) {
    super();

    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      successThreshold: options.successThreshold ?? 2,
      timeout: options.timeout ?? 60000, // 1 minute
      resetTimeout: options.resetTimeout ?? 30000, // 30 seconds
      volumeThreshold: options.volumeThreshold ?? 10,
      errorThresholdPercentage: options.errorThresholdPercentage ?? 50,
      fallbackFunction: options.fallbackFunction,
      healthCheckInterval: options.healthCheckInterval ?? 30000, // 30 seconds
      name: options.name ?? this.name,
    };

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      state: this.state,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      averageResponseTime: 0,
    };

    // Start health check if configured
    if (this.options.healthCheckInterval > 0) {
      this.startHealthCheck();
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.nextAttempt && Date.now() < this.nextAttempt) {
        this.metrics.rejectedRequests++;
        this.logger.warn(`Circuit ${this.name} is OPEN, rejecting request`);

        if (this.options.fallbackFunction) {
          return this.options.fallbackFunction();
        }

        throw new Error(`Circuit breaker is OPEN for ${this.name}`);
      }

      // Attempt to transition to half-open
      this.transitionTo(CircuitState.HALF_OPEN);
    }

    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      const result = await fn();
      const responseTime = Date.now() - startTime;

      this.onSuccess(responseTime);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.onFailure(error, responseTime);

      if (this.options.fallbackFunction) {
        return this.options.fallbackFunction();
      }

      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(responseTime: number): void {
    this.metrics.successfulRequests++;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses++;
    this.metrics.lastSuccessTime = new Date();

    // Update metrics
    this.updateMetrics(true, responseTime);

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.consecutiveSuccesses >= this.options.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: any, responseTime: number): void {
    this.metrics.failedRequests++;
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures++;
    this.metrics.lastFailureTime = new Date();

    // Update metrics
    this.updateMetrics(false, responseTime);

    this.logger.error(`Circuit ${this.name} execution failed:`, error.message);

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we should open the circuit
      if (this.shouldOpen()) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  /**
   * Check if circuit should open based on failure rate
   */
  private shouldOpen(): boolean {
    // Check consecutive failures
    if (this.consecutiveFailures >= this.options.failureThreshold) {
      return true;
    }

    // Check failure rate within time window
    const recentMetrics = this.getRecentMetrics();
    if (recentMetrics.requests >= this.options.volumeThreshold) {
      const failureRate =
        (recentMetrics.failures / recentMetrics.requests) * 100;
      return failureRate >= this.options.errorThresholdPercentage;
    }

    return false;
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.metrics.state = newState;
    this.metrics.lastStateChange = new Date();

    this.logger.log(
      `Circuit ${this.name} transitioned from ${oldState} to ${newState}`,
    );

    if (newState === CircuitState.OPEN) {
      this.nextAttempt = Date.now() + this.options.timeout;
    } else if (newState === CircuitState.CLOSED) {
      this.consecutiveFailures = 0;
      this.consecutiveSuccesses = 0;
      this.nextAttempt = undefined;
    }

    this.emit('state-change', {
      from: oldState,
      to: newState,
      timestamp: new Date(),
    });
  }

  /**
   * Update rolling metrics
   */
  private updateMetrics(success: boolean, responseTime: number): void {
    const now = Date.now();

    // Add new metric
    this.requestMetrics.push({
      requests: 1,
      failures: success ? 0 : 1,
      successes: success ? 1 : 0,
      totalResponseTime: responseTime,
      timestamp: now,
    });

    // Remove old metrics outside the window
    const cutoff = now - this.metricsWindow;
    while (
      this.requestMetrics.length > 0 &&
      this.requestMetrics[0].timestamp < cutoff
    ) {
      this.requestMetrics.shift();
    }

    // Calculate average response time
    const totalResponseTime = this.requestMetrics.reduce(
      (sum, m) => sum + m.totalResponseTime,
      0,
    );
    const totalRequests = this.requestMetrics.length;
    this.metrics.averageResponseTime =
      totalRequests > 0 ? totalResponseTime / totalRequests : 0;

    // Update consecutive counts in metrics
    this.metrics.consecutiveFailures = this.consecutiveFailures;
    this.metrics.consecutiveSuccesses = this.consecutiveSuccesses;
  }

  /**
   * Get recent metrics within the time window
   */
  private getRecentMetrics(): RequestMetrics {
    const now = Date.now();
    const cutoff = now - this.metricsWindow;

    return this.requestMetrics
      .filter((m) => m.timestamp >= cutoff)
      .reduce(
        (acc, m) => ({
          requests: acc.requests + m.requests,
          failures: acc.failures + m.failures,
          successes: acc.successes + m.successes,
          totalResponseTime: acc.totalResponseTime + m.totalResponseTime,
          timestamp: now,
        }),
        {
          requests: 0,
          failures: 0,
          successes: 0,
          totalResponseTime: 0,
          timestamp: now,
        },
      );
  }

  /**
   * Start health check interval
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.options.healthCheckInterval);
  }

  /**
   * Perform a health check
   */
  private async performHealthCheck(): Promise<void> {
    if (this.state === CircuitState.OPEN && this.nextAttempt) {
      const now = Date.now();
      if (now >= this.nextAttempt) {
        this.logger.log(`Performing health check for circuit ${this.name}`);

        try {
          // If we have a health check function, use it
          // Otherwise, just transition to half-open for the next request
          this.transitionTo(CircuitState.HALF_OPEN);
        } catch (error) {
          this.logger.error(
            `Health check failed for circuit ${this.name}:`,
            error.message,
          );
          this.emit('health-check-failed', error);
          // Reset the next attempt time
          this.nextAttempt = Date.now() + this.options.timeout;
        }
      }
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.nextAttempt = undefined;
    this.metrics.state = this.state;
    this.requestMetrics.length = 0;

    this.logger.log(`Circuit ${this.name} has been reset`);
  }

  /**
   * Force the circuit to open state
   */
  forceOpen(): void {
    this.transitionTo(CircuitState.OPEN);
  }

  /**
   * Force the circuit to closed state
   */
  forceClose(): void {
    this.transitionTo(CircuitState.CLOSED);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}
