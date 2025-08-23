import { Test } from '@nestjs/testing';
import { CircuitBreakerService, CircuitState, CircuitBreaker } from './circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CircuitBreakerService],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  afterEach(() => {
    service.resetAllCircuits();
  });

  describe('Circuit Creation', () => {
    it('should create a new circuit', () => {
      const circuit = service.getCircuit('test-circuit');
      expect(circuit).toBeDefined();
      expect(circuit).toBeInstanceOf(CircuitBreaker);
    });

    it('should return the same circuit for the same name', () => {
      const circuit1 = service.getCircuit('test-circuit');
      const circuit2 = service.getCircuit('test-circuit');
      expect(circuit1).toBe(circuit2);
    });

    it('should create different circuits for different names', () => {
      const circuit1 = service.getCircuit('circuit-1');
      const circuit2 = service.getCircuit('circuit-2');
      expect(circuit1).not.toBe(circuit2);
    });
  });

  describe('Circuit Execution', () => {
    it('should execute successful function', async () => {
      const result = await service.execute('test-circuit', async () => {
        return 'success';
      });
      expect(result).toBe('success');
    });

    it('should handle failures and open circuit', async () => {
      const failingFn = jest.fn().mockRejectedValue(new Error('Failed'));
      
      // Fail multiple times to open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('test-circuit', failingFn, {
            failureThreshold: 5,
          });
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit should be open now
      await expect(
        service.execute('test-circuit', failingFn),
      ).rejects.toThrow('Circuit breaker is OPEN');
      
      // Function should not be called when circuit is open
      expect(failingFn).toHaveBeenCalledTimes(5);
    });

    it('should use fallback function when circuit is open', async () => {
      const failingFn = jest.fn().mockRejectedValue(new Error('Failed'));
      const fallbackFn = jest.fn().mockResolvedValue('fallback');

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('fallback-circuit', failingFn, {
            failureThreshold: 5,
            fallbackFunction: fallbackFn,
          });
        } catch (error) {
          // Expected to fail initially
        }
      }

      // Should use fallback when circuit is open
      const result = await service.execute('fallback-circuit', failingFn, {
        fallbackFunction: fallbackFn,
      });
      
      expect(result).toBe('fallback');
      expect(fallbackFn).toHaveBeenCalled();
    });
  });

  describe('Circuit Metrics', () => {
    it('should track metrics correctly', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      const failFn = jest.fn().mockRejectedValue(new Error('Failed'));

      // Execute some successful requests
      await service.execute('metrics-circuit', successFn);
      await service.execute('metrics-circuit', successFn);

      // Execute some failed requests
      try {
        await service.execute('metrics-circuit', failFn);
      } catch (error) {
        // Expected
      }

      const metrics = service.getMetrics('metrics-circuit');
      expect(metrics).toBeDefined();
      expect(metrics?.totalRequests).toBe(3);
      expect(metrics?.successfulRequests).toBe(2);
      expect(metrics?.failedRequests).toBe(1);
      expect(metrics?.state).toBe(CircuitState.CLOSED);
    });

    it('should return metrics for all circuits', () => {
      service.getCircuit('circuit-1');
      service.getCircuit('circuit-2');
      service.getCircuit('circuit-3');

      const allMetrics = service.getAllMetrics();
      expect(allMetrics.size).toBe(3);
      expect(allMetrics.has('circuit-1')).toBe(true);
      expect(allMetrics.has('circuit-2')).toBe(true);
      expect(allMetrics.has('circuit-3')).toBe(true);
    });
  });

  describe('Circuit Control', () => {
    it('should reset a specific circuit', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('Failed'));
      
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('reset-circuit', failFn, {
            failureThreshold: 5,
          });
        } catch (error) {
          // Expected
        }
      }

      let metrics = service.getMetrics('reset-circuit');
      expect(metrics?.state).toBe(CircuitState.OPEN);

      // Reset the circuit
      service.resetCircuit('reset-circuit');
      
      metrics = service.getMetrics('reset-circuit');
      expect(metrics?.state).toBe(CircuitState.CLOSED);
      expect(metrics?.consecutiveFailures).toBe(0);
    });

    it('should force open a circuit', () => {
      service.getCircuit('force-circuit');
      service.forceOpen('force-circuit');
      
      const metrics = service.getMetrics('force-circuit');
      expect(metrics?.state).toBe(CircuitState.OPEN);
    });

    it('should force close a circuit', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('Failed'));
      
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute('force-close-circuit', failFn, {
            failureThreshold: 5,
          });
        } catch (error) {
          // Expected
        }
      }

      service.forceClose('force-close-circuit');
      
      const metrics = service.getMetrics('force-close-circuit');
      expect(metrics?.state).toBe(CircuitState.CLOSED);
    });
  });
});

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker('test-breaker', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
      errorThresholdPercentage: 50,
      volumeThreshold: 5,
    });
  });

  afterEach(() => {
    circuitBreaker.destroy();
  });

  describe('State Transitions', () => {
    it('should start in CLOSED state', () => {
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.CLOSED);
    });

    it('should transition to OPEN after consecutive failures', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('Failed'));

      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failFn);
        } catch (error) {
          // Expected
        }
      }

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.OPEN);
      expect(metrics.consecutiveFailures).toBe(3);
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('Failed'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failFn);
        } catch (error) {
          // Expected
        }
      }

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should transition to HALF_OPEN on next attempt
      const successFn = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(successFn);

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.HALF_OPEN);
    });

    it('should transition from HALF_OPEN to CLOSED after successes', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('Failed'));
      const successFn = jest.fn().mockResolvedValue('success');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failFn);
        } catch (error) {
          // Expected
        }
      }

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Success in HALF_OPEN state
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.CLOSED);
      expect(metrics.consecutiveSuccesses).toBe(2);
    });

    it('should transition from HALF_OPEN to OPEN on failure', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('Failed'));
      const successFn = jest.fn().mockResolvedValue('success');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failFn);
        } catch (error) {
          // Expected
        }
      }

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // First request succeeds
      await circuitBreaker.execute(successFn);

      // Second request fails - should go back to OPEN
      try {
        await circuitBreaker.execute(failFn);
      } catch (error) {
        // Expected
      }

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.OPEN);
    });
  });

  describe('Error Threshold', () => {
    it('should open based on error percentage', async () => {
      const failFn = jest.fn().mockRejectedValue(new Error('Failed'));
      const successFn = jest.fn().mockResolvedValue('success');

      // Need at least volumeThreshold (5) requests
      // With 50% error threshold, 3 failures out of 5 should open
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);
      
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failFn);
        } catch (error) {
          // Expected
        }
      }

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.OPEN);
      expect(metrics.totalRequests).toBe(5);
      expect(metrics.failedRequests).toBe(3);
    });
  });

  describe('Response Time Tracking', () => {
    it('should track average response time', async () => {
      const delayedFn = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve('success'), 100);
        });
      });

      await circuitBreaker.execute(delayedFn);
      await circuitBreaker.execute(delayedFn);

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.averageResponseTime).toBeGreaterThan(90);
      expect(metrics.averageResponseTime).toBeLessThan(150);
    });
  });

  describe('Event Emissions', () => {
    it('should emit state change events', async () => {
      const stateChanges: any[] = [];
      circuitBreaker.on('state-change', (data) => {
        stateChanges.push(data);
      });

      const failFn = jest.fn().mockRejectedValue(new Error('Failed'));

      // Trigger state change from CLOSED to OPEN
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failFn);
        } catch (error) {
          // Expected
        }
      }

      expect(stateChanges).toHaveLength(1);
      expect(stateChanges[0].from).toBe(CircuitState.CLOSED);
      expect(stateChanges[0].to).toBe(CircuitState.OPEN);
    });
  });
});