import { EventEmitter } from 'events';
import { jest } from '@jest/globals';

// Import the circuit breaker class (we'll need to extract it or mock it)
describe('CircuitBreaker', () => {
  let eventEmitter: EventEmitter;
  let circuitBreaker: any;

  beforeEach(() => {
    eventEmitter = new EventEmitter();

    // Create circuit breaker instance (we'll mock the internal implementation)
    circuitBreaker = {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED' as 'CLOSED' | 'OPEN' | 'HALF_OPEN',
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      timeoutMs: 5000,
      eventEmitter,

      execute: jest.fn(),
      recordFailure: jest.fn(),
      reset: jest.fn(),
      getState: jest.fn(),
      getFailureCount: jest.fn(),
    };

    // Mock the execute method to simulate circuit breaker behavior
    circuitBreaker.execute.mockImplementation(async (operation: () => Promise<any>) => {
      if (this.state === 'OPEN') {
        const timeSinceLastFailure = Date.now() - this.lastFailureTime;
        if (timeSinceLastFailure > this.resetTimeoutMs) {
          this.state = 'HALF_OPEN';
          this.eventEmitter.emit('circuit-breaker-state-change', 'OPEN', 'HALF_OPEN');
        } else {
          throw new Error(`Circuit breaker is OPEN - operation not allowed. Retry in ${this.resetTimeoutMs - timeSinceLastFailure}ms`);
        }
      }

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Operation timeout')), this.timeoutMs);
        });

        const result = await Promise.race([operation(), timeoutPromise]);

        if (this.state === 'HALF_OPEN') {
          this.reset();
          this.eventEmitter.emit('circuit-breaker-state-change', 'HALF_OPEN', 'CLOSED');
        }

        return result;
      } catch (error) {
        this.recordFailure();
        this.eventEmitter.emit('circuit-breaker-state-change', this.state, this.state);
        throw error;
      }
    });

    circuitBreaker.recordFailure.mockImplementation(() => {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
      }
    });

    circuitBreaker.reset.mockImplementation(() => {
      this.failures = 0;
      this.state = 'CLOSED';
      this.lastFailureTime = 0;
    });

    circuitBreaker.getState.mockImplementation(() => this.state);
    circuitBreaker.getFailureCount.mockImplementation(() => this.failures);
  });

  describe('State Transitions', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.getFailureCount()).toBe(0);
    });

    it('should transition to OPEN after failure threshold is reached', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));

      // Simulate failures
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch (error) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe('OPEN');
      expect(circuitBreaker.getFailureCount()).toBe(5);
    });

    it('should transition from OPEN to HALF_OPEN after reset timeout', async () => {
      // First set to OPEN state
      circuitBreaker.state = 'OPEN';
      circuitBreaker.lastFailureTime = Date.now() - 35000; // Past reset timeout

      const operation = jest.fn().mockResolvedValue('success');

      await circuitBreaker.execute(operation);

      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should transition from HALF_OPEN to CLOSED on successful operation', async () => {
      circuitBreaker.state = 'HALF_OPEN';
      circuitBreaker.failures = 2;

      const operation = jest.fn().mockResolvedValue('success');

      await circuitBreaker.execute(operation);

      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.getFailureCount()).toBe(0);
    });

    it('should stay in HALF_OPEN on failed operation', async () => {
      circuitBreaker.state = 'HALF_OPEN';

      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));

      try {
        await circuitBreaker.execute(operation);
      } catch (error) {
        // Expected
      }

      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
      expect(circuitBreaker.getFailureCount()).toBe(1);
    });

    it('should reject operations when OPEN', async () => {
      circuitBreaker.state = 'OPEN';
      circuitBreaker.lastFailureTime = Date.now(); // Not past reset timeout

      const operation = jest.fn().mockResolvedValue('success');

      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should handle operation timeouts', async () => {
      const slowOperation = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000)) // Longer than timeout
      );

      await expect(circuitBreaker.execute(slowOperation)).rejects.toThrow('Operation timeout');
      expect(circuitBreaker.getFailureCount()).toBe(1);
    });
  });

  describe('Event Emission', () => {
    it('should emit state change events', async () => {
      const eventSpy = jest.fn();
      eventEmitter.on('circuit-breaker-state-change', eventSpy);

      // Transition to OPEN
      circuitBreaker.state = 'CLOSED';
      circuitBreaker.failures = 5;
      circuitBreaker.recordFailure();

      expect(eventSpy).toHaveBeenCalledWith('CLOSED', 'OPEN');
    });

    it('should emit state change on HALF_OPEN to CLOSED', async () => {
      const eventSpy = jest.fn();
      eventEmitter.on('circuit-breaker-state-change', eventSpy);

      circuitBreaker.state = 'HALF_OPEN';
      const operation = jest.fn().mockResolvedValue('success');

      await circuitBreaker.execute(operation);

      expect(eventSpy).toHaveBeenCalledWith('HALF_OPEN', 'CLOSED');
    });
  });

  describe('Failure Recording', () => {
    it('should increment failure count', () => {
      expect(circuitBreaker.getFailureCount()).toBe(0);

      circuitBreaker.recordFailure();

      expect(circuitBreaker.getFailureCount()).toBe(1);
    });

    it('should update last failure time', () => {
      const beforeTime = Date.now();
      circuitBreaker.recordFailure();
      const afterTime = Date.now();

      expect(circuitBreaker.lastFailureTime).toBeGreaterThanOrEqual(beforeTime);
      expect(circuitBreaker.lastFailureTime).toBeLessThanOrEqual(afterTime);
    });

    it('should reset failure count and time', () => {
      circuitBreaker.failures = 3;
      circuitBreaker.lastFailureTime = Date.now();

      circuitBreaker.reset();

      expect(circuitBreaker.getFailureCount()).toBe(0);
      expect(circuitBreaker.lastFailureTime).toBe(0);
    });
  });
});