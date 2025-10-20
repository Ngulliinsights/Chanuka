import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitBreakerState } from '../patterns/circuit-breaker';
import { SystemError } from '../errors/specialized';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: 'test-breaker',
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000,
    });
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should have correct initial metrics', () => {
      const metrics = breaker.getMetrics();
      expect(metrics.failures).toBe(0);
      expect(metrics.successes).toBe(0);
      expect(metrics.rejected).toBe(0);
      expect(metrics.totalCalls).toBe(0);
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('execute', () => {
    it('should execute successful operations', async () => {
      const mockAction = vi.fn().mockResolvedValue('success');

      const result = await breaker.execute(mockAction);

      expect(result).toBe('success');
      expect(mockAction).toHaveBeenCalledTimes(1);

      const metrics = breaker.getMetrics();
      expect(metrics.successes).toBe(1);
      expect(metrics.totalCalls).toBe(1);
    });

    it('should handle operation failures', async () => {
      const mockAction = vi.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(breaker.execute(mockAction)).rejects.toThrow(SystemError);

      const metrics = breaker.getMetrics();
      expect(metrics.failures).toBe(1);
      expect(metrics.totalCalls).toBe(1);
    });

    it('should open circuit after failure threshold', async () => {
      const mockAction = vi.fn().mockRejectedValue(new Error('Operation failed'));

      // Trigger failures to reach threshold
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(mockAction)).rejects.toThrow(SystemError);
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Next call should be rejected without executing action
      await expect(breaker.execute(mockAction)).rejects.toThrow('Circuit breaker is open');
      expect(mockAction).toHaveBeenCalledTimes(3); // Not called again
    });

    it('should transition to half-open after timeout', async () => {
      const mockAction = vi.fn().mockRejectedValue(new Error('Operation failed'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(mockAction)).rejects.toThrow(SystemError);
      }
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Wait for timeout (mock the timeout)
      breaker['lastStateChange'] = new Date(Date.now() - 2000);

      // Next call should attempt reset
      await expect(breaker.execute(mockAction)).rejects.toThrow(SystemError);
      expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    });

    it('should close circuit after success threshold in half-open state', async () => {
      const mockFailureAction = vi.fn().mockRejectedValue(new Error('Operation failed'));
      const mockSuccessAction = vi.fn().mockResolvedValue('success');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(mockFailureAction)).rejects.toThrow(SystemError);
      }
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Force to half-open for testing
      breaker.forceState(CircuitBreakerState.HALF_OPEN);

      // Execute successful operations to reach success threshold
      for (let i = 0; i < 2; i++) {
        await breaker.execute(mockSuccessAction);
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('adaptive threshold', () => {
    it('should increase threshold when opening', () => {
      const initialThreshold = breaker.getMetrics().currentThreshold;

      // Simulate opening
      breaker['adjustThreshold'](true);

      expect(breaker.getMetrics().currentThreshold).toBeGreaterThan(initialThreshold);
    });

    it('should decrease threshold when closing', () => {
      // First increase threshold
      breaker['adjustThreshold'](true);
      const increasedThreshold = breaker.getMetrics().currentThreshold;

      // Then decrease
      breaker['adjustThreshold'](false);

      expect(breaker.getMetrics().currentThreshold).toBeLessThan(increasedThreshold);
    });
  });

  describe('metrics', () => {
    it('should track slow calls', async () => {
      const slowAction = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('slow'), 2000))
      );

      await breaker.execute(slowAction);

      const metrics = breaker.getMetrics();
      expect(metrics.slowCalls).toBe(1);
    });

    it('should calculate failure rate correctly', async () => {
      const successAction = vi.fn().mockResolvedValue('success');
      const failureAction = vi.fn().mockRejectedValue(new Error('failed'));

      await breaker.execute(successAction);
      await expect(breaker.execute(failureAction)).rejects.toThrow();

      const metrics = breaker.getMetrics();
      expect(metrics.failureRate).toBe(50); // 1 failure out of 2 calls
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', () => {
      // Add some metrics
      breaker['failures'] = 5;
      breaker['successes'] = 3;
      breaker['totalCalls'] = 8;

      breaker.resetMetrics();

      const metrics = breaker.getMetrics();
      expect(metrics.failures).toBe(0);
      expect(metrics.successes).toBe(0);
      expect(metrics.totalCalls).toBe(0);
    });
  });
});




































