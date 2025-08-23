import { Injectable, Logger } from '@nestjs/common';
import { PermissionMetricsService } from './permission-metrics.service';

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxAttempts: number;
  name: string;
}

export interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  consecutiveSuccesses: number;
  halfOpenAttempts: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitBreakerState>();
  private readonly options = new Map<string, CircuitBreakerOptions>();

  constructor(private readonly metricsService: PermissionMetricsService) {
    // Initialize default circuit breakers
    this.registerCircuit('database', {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 60000, // 1 minute
      halfOpenMaxAttempts: 3,
      name: 'database',
    });

    this.registerCircuit('cache', {
      failureThreshold: 10,
      resetTimeout: 30000, // 30 seconds
      monitoringPeriod: 60000, // 1 minute
      halfOpenMaxAttempts: 3,
      name: 'cache',
    });

    this.registerCircuit('matrix', {
      failureThreshold: 10,
      resetTimeout: 30000, // 30 seconds
      monitoringPeriod: 60000, // 1 minute
      halfOpenMaxAttempts: 3,
      name: 'matrix',
    });
  }

  registerCircuit(name: string, options: CircuitBreakerOptions): void {
    this.options.set(name, options);
    this.circuits.set(name, {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      consecutiveSuccesses: 0,
      halfOpenAttempts: 0,
    });
  }

  async executeWithBreaker<T>(
    circuitName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>,
  ): Promise<T> {
    const circuit = this.circuits.get(circuitName);
    const options = this.options.get(circuitName);

    if (!circuit || !options) {
      throw new Error(`Circuit breaker ${circuitName} not registered`);
    }

    // Check if circuit is open
    if (circuit.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset(circuit, options)) {
        this.transitionToHalfOpen(circuitName, circuit);
      } else {
        this.logger.warn(`Circuit ${circuitName} is OPEN, using fallback`);
        this.metricsService.recordCircuitBreakerFailure(circuitName, 'circuit_open');
        
        if (fallback) {
          return fallback();
        }
        throw new Error(`Circuit breaker ${circuitName} is OPEN`);
      }
    }

    // Check if we're in half-open state
    if (circuit.state === CircuitState.HALF_OPEN) {
      if (circuit.halfOpenAttempts >= options.halfOpenMaxAttempts) {
        this.transitionToOpen(circuitName, circuit, 'half_open_limit_exceeded');
        
        if (fallback) {
          return fallback();
        }
        throw new Error(`Circuit breaker ${circuitName} is OPEN (half-open limit exceeded)`);
      }
      circuit.halfOpenAttempts++;
    }

    try {
      const result = await operation();
      this.recordSuccess(circuitName, circuit, options);
      return result;
    } catch (error) {
      this.recordFailure(circuitName, circuit, options, error);
      
      if (circuit.state === CircuitState.OPEN && fallback) {
        return fallback();
      }
      
      throw error;
    }
  }

  private shouldAttemptReset(
    circuit: CircuitBreakerState,
    options: CircuitBreakerOptions,
  ): boolean {
    if (!circuit.lastFailureTime) {
      return true;
    }

    const timeSinceLastFailure = Date.now() - circuit.lastFailureTime.getTime();
    return timeSinceLastFailure >= options.resetTimeout;
  }

  private recordSuccess(
    circuitName: string,
    circuit: CircuitBreakerState,
    options: CircuitBreakerOptions,
  ): void {
    circuit.successes++;
    circuit.consecutiveSuccesses++;

    if (circuit.state === CircuitState.HALF_OPEN) {
      if (circuit.consecutiveSuccesses >= options.halfOpenMaxAttempts) {
        this.transitionToClosed(circuitName, circuit);
      }
    } else if (circuit.state === CircuitState.CLOSED) {
      // Reset failure count after monitoring period
      const timeSinceLastFailure = circuit.lastFailureTime
        ? Date.now() - circuit.lastFailureTime.getTime()
        : Infinity;

      if (timeSinceLastFailure > options.monitoringPeriod) {
        circuit.failures = 0;
      }
    }
  }

  private recordFailure(
    circuitName: string,
    circuit: CircuitBreakerState,
    options: CircuitBreakerOptions,
    error: any,
  ): void {
    circuit.failures++;
    circuit.consecutiveSuccesses = 0;
    circuit.lastFailureTime = new Date();

    this.logger.error(
      `Circuit ${circuitName} failure ${circuit.failures}/${options.failureThreshold}`,
      error,
    );

    if (circuit.state === CircuitState.HALF_OPEN) {
      this.transitionToOpen(circuitName, circuit, 'half_open_failure');
    } else if (
      circuit.state === CircuitState.CLOSED &&
      circuit.failures >= options.failureThreshold
    ) {
      this.transitionToOpen(circuitName, circuit, 'threshold_exceeded');
    }

    this.metricsService.recordCircuitBreakerFailure(
      circuitName,
      error.message || 'unknown',
    );
  }

  private transitionToOpen(
    circuitName: string,
    circuit: CircuitBreakerState,
    reason: string,
  ): void {
    circuit.state = CircuitState.OPEN;
    circuit.halfOpenAttempts = 0;
    
    this.logger.warn(
      `Circuit ${circuitName} transitioned to OPEN (${reason})`,
    );
    
    this.metricsService.updateCircuitBreakerStatus(
      circuitName as any,
      'open',
    );
  }

  private transitionToHalfOpen(
    circuitName: string,
    circuit: CircuitBreakerState,
  ): void {
    circuit.state = CircuitState.HALF_OPEN;
    circuit.halfOpenAttempts = 0;
    circuit.consecutiveSuccesses = 0;
    
    this.logger.log(
      `Circuit ${circuitName} transitioned to HALF_OPEN`,
    );
    
    this.metricsService.updateCircuitBreakerStatus(
      circuitName as any,
      'half_open',
    );
  }

  private transitionToClosed(
    circuitName: string,
    circuit: CircuitBreakerState,
  ): void {
    circuit.state = CircuitState.CLOSED;
    circuit.failures = 0;
    circuit.halfOpenAttempts = 0;
    
    this.logger.log(
      `Circuit ${circuitName} transitioned to CLOSED`,
    );
    
    this.metricsService.updateCircuitBreakerStatus(
      circuitName as any,
      'closed',
    );
  }

  getCircuitState(circuitName: string): CircuitBreakerState | undefined {
    return this.circuits.get(circuitName);
  }

  resetCircuit(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (circuit) {
      circuit.state = CircuitState.CLOSED;
      circuit.failures = 0;
      circuit.successes = 0;
      circuit.consecutiveSuccesses = 0;
      circuit.halfOpenAttempts = 0;
      circuit.lastFailureTime = undefined;
      
      this.metricsService.updateCircuitBreakerStatus(
        circuitName as any,
        'closed',
      );
    }
  }

  getAllCircuitStates(): Map<string, CircuitBreakerState> {
    return new Map(this.circuits);
  }
}