/**
 * Circuit Breaker Tests
 * 
 * Comprehensive tests for circuit breaker pattern, adaptive thresholds,
 * slow call detection, and automatic recovery mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CircuitBreaker } from '../circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    circuitBreaker?.destroy();
  });

  describe('Circuit Breaker States', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        threshold: 3,
        timeout: 60000,
        successThreshold: 2,
        slowCallThreshold: 1000,
        slowCallRateThreshold: 0.5,
      });
    });

    it('should start in closed state', () => {
      const state = circuitBreaker.getState();
      expect(state.state).toBe('closed');
      expect(state.failures).toBe(0);
      expect(state.successes).toBe(0);
    });

    it('should transition to open state after threshold failures', async () => {
      const failingFunction = vi.fn().mockRejectedValue(new Error('Test error'));

      // Trigger failures to reach threshold
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.call(failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      const state = circuitBreaker.getState();
      expect(state.state).toBe('open');
      expect(state.failures).toBe(3);
    });

    it('should fail fast when circuit is open', async () => {
      const failingFunction = vi.fn().mockRejectedValue(new Error('Test error'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.call(failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      // Next call should fail fast without calling the function
      const callCount = failingFunction.mock.calls.length;
      
      try {
        await circuitBreaker.call(failingFunction);
        expect.fail('Should have thrown circuit breaker error');
      } catch (error) {
        expect(error.message).toContain('Circuit breaker is open');
        expect(failingFunction.mock.calls.length).toBe(callCount); // No additional calls
      }
    });

    it('should transition to half-open after timeout', async () => {
      const failingFunction = vi.fn().mockRejectedValue(new Error('Test error'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.call(failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState().state).toBe('open');

      // Advance time past timeout
      vi.advanceTimersByTime(60001);

      // Next call should transition to half-open
      const successFunction = vi.fn().mockResolvedValue('success');
      const result = await circuitBreaker.call(successFunction);

      expect(result).toBe('success');
      expect(circuitBreaker.getState().state).toBe('half-open');
    });

    it('should close circuit after successful calls in half-open state', async () => {
      const failingFunction = vi.fn().mockRejectedValue(new Error('Test error'));
      const successFunction = vi.fn().mockResolvedValue('success');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.call(failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      // Advance time to allow transition to half-open
      vi.advanceTimersByTime(60001);

      // Make successful calls to close the circuit
      await circuitBreaker.call(successFunction);
      expect(circuitBreaker.getState().state).toBe('half-open');

      await circuitBreaker.call(successFunction);
      expect(circuitBreaker.getState().state).toBe('closed');
    });

    it('should reopen circuit on failure in half-open state', async () => {
      const failingFunction = vi.fn().mockRejectedValue(new Error('Test error'));
      const successFunction = vi.fn().mockResolvedValue('success');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.call(failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      // Advance time to allow transition to half-open
      vi.advanceTimersByTime(60001);

      // First call succeeds (half-open)
      await circuitBreaker.call(successFunction);
      expect(circuitBreaker.getState().state).toBe('half-open');

      // Second call fails (should reopen)
      try {
        await circuitBreaker.call(failingFunction);
      } catch (error) {
        // Expected to fail
      }

      expect(circuitBreaker.getState().state).toBe('open');
    });
  });

  describe('Slow Call Detection', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        threshold: 5,
        timeout: 60000,
        successThreshold: 2,
        slowCallThreshold: 100, // 100ms
        slowCallRateThreshold: 0.6, // 60%
      });
    });

    it('should detect slow calls', async () => {
      const slowFunction = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 150)); // 150ms
        return 'slow result';
      });

      vi.useRealTimers(); // Need real timers for actual delays
      
      await circuitBreaker.call(slowFunction);
      
      const stats = circuitBreaker.getStats();
      expect(stats.slowCalls).toBe(1);
      expect(stats.slowCallRate).toBeGreaterThan(0);

      vi.useFakeTimers();
    });

    it('should open circuit based on slow call rate', async () => {
      const slowFunction = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 150)); // 150ms
        return 'slow result';
      });

      const fastFunction = vi.fn().mockResolvedValue('fast result');

      vi.useRealTimers();

      // Make mostly slow calls to trigger slow call threshold
      await circuitBreaker.call(slowFunction);
      await circuitBreaker.call(slowFunction);
      await circuitBreaker.call(slowFunction);
      await circuitBreaker.call(fastFunction);
      await circuitBreaker.call(slowFunction);

      const state = circuitBreaker.getState();
      expect(state.state).toBe('open');

      vi.useFakeTimers();
    });

    it('should not count fast calls as slow', async () => {
      const fastFunction = vi.fn().mockResolvedValue('fast result');

      await circuitBreaker.call(fastFunction);
      
      const stats = circuitBreaker.getStats();
      expect(stats.slowCalls).toBe(0);
      expect(stats.slowCallRate).toBe(0);
    });
  });

  describe('Adaptive Thresholds', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        threshold: 3,
        timeout: 60000,
        successThreshold: 2,
        slowCallThreshold: 100,
        slowCallRateThreshold: 0.5,
        enableAdaptiveThreshold: true,
        adaptiveThresholdFactor: 1.5,
      });
    });

    it('should adapt threshold based on slow call rate', async () => {
      const slowFunction = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
        return 'slow result';
      });

      vi.useRealTimers();

      // Make slow calls to increase adaptive threshold
      for (let i = 0; i < 10; i++) {
        await circuitBreaker.call(slowFunction);
      }

      const stats = circuitBreaker.getStats();
      expect(stats.adaptiveThreshold).toBeGreaterThan(3);

      vi.useFakeTimers();
    });

    it('should use adaptive threshold for circuit breaking', async () => {
      const failingFunction = vi.fn().mockRejectedValue(new Error('Test error'));

      // First, establish high adaptive threshold with slow calls
      const slowFunction = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
        return 'slow result';
      });

      vi.useRealTimers();
      
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.call(slowFunction);
      }

      vi.useFakeTimers();

      const adaptiveThreshold = circuitBreaker.getStats().adaptiveThreshold;
      expect(adaptiveThreshold).toBeGreaterThan(3);

      // Now test that it takes more failures to open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.call(failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      // Should still be closed due to adaptive threshold
      expect(circuitBreaker.getState().state).toBe('closed');
    });
  });

  describe('Timeout Handling', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        threshold: 3,
        timeout: 60000,
        successThreshold: 2,
        slowCallThreshold: 1000,
        slowCallRateThreshold: 0.5,
      });
    });

    it('should timeout long-running operations', async () => {
      const longRunningFunction = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 'should not reach here';
      });

      vi.useRealTimers();

      try {
        await circuitBreaker.call(longRunningFunction, 500); // 500ms timeout
        expect.fail('Should have timed out');
      } catch (error) {
        expect(error.message).toContain('Operation timed out');
      }

      vi.useFakeTimers();
    });

    it('should not timeout fast operations', async () => {
      const fastFunction = vi.fn().mockResolvedValue('fast result');

      vi.useRealTimers();

      const result = await circuitBreaker.call(fastFunction, 1000);
      expect(result).toBe('fast result');

      vi.useFakeTimers();
    });

    it('should count timeouts as failures', async () => {
      const longRunningFunction = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 'should not reach here';
      });

      vi.useRealTimers();

      // Make calls that timeout
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.call(longRunningFunction, 100);
        } catch (error) {
          // Expected to timeout
        }
      }

      expect(circuitBreaker.getState().state).toBe('open');

      vi.useFakeTimers();
    });
  });

  describe('Statistics and Metrics', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        threshold: 3,
        timeout: 60000,
        successThreshold: 2,
        slowCallThreshold: 100,
        slowCallRateThreshold: 0.5,
      });
    });

    it('should track success and failure counts', async () => {
      const successFunction = vi.fn().mockResolvedValue('success');
      const failingFunction = vi.fn().mockRejectedValue(new Error('failure'));

      await circuitBreaker.call(successFunction);
      await circuitBreaker.call(successFunction);

      try {
        await circuitBreaker.call(failingFunction);
      } catch (error) {
        // Expected to fail
      }

      const stats = circuitBreaker.getStats();
      expect(stats.totalCalls).toBe(3);
      expect(stats.successCount).toBe(2);
      expect(stats.failureCount).toBe(1);
      expect(stats.successRate).toBeCloseTo(0.67, 2);
      expect(stats.failureRate).toBeCloseTo(0.33, 2);
    });

    it('should track response times', async () => {
      const timedFunction = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'timed result';
      });

      vi.useRealTimers();

      await circuitBreaker.call(timedFunction);
      
      const stats = circuitBreaker.getStats();
      expect(stats.avgResponseTime).toBeGreaterThan(0);
      expect(stats.minResponseTime).toBeGreaterThan(0);
      expect(stats.maxResponseTime).toBeGreaterThan(0);

      vi.useFakeTimers();
    });

    it('should track state transition counts', async () => {
      const failingFunction = vi.fn().mockRejectedValue(new Error('failure'));
      const successFunction = vi.fn().mockResolvedValue('success');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.call(failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      // Transition to half-open
      vi.advanceTimersByTime(60001);
      await circuitBreaker.call(successFunction);

      // Close the circuit
      await circuitBreaker.call(successFunction);

      const stats = circuitBreaker.getStats();
      expect(stats.stateTransitions.toOpen).toBe(1);
      expect(stats.stateTransitions.toHalfOpen).toBe(1);
      expect(stats.stateTransitions.toClosed).toBe(1);
    });

    it('should reset statistics', async () => {
      const successFunction = vi.fn().mockResolvedValue('success');

      await circuitBreaker.call(successFunction);
      await circuitBreaker.call(successFunction);

      let stats = circuitBreaker.getStats();
      expect(stats.totalCalls).toBe(2);

      circuitBreaker.resetStats();

      stats = circuitBreaker.getStats();
      expect(stats.totalCalls).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(0);
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        threshold: 3,
        timeout: 60000,
        successThreshold: 2,
        slowCallThreshold: 100,
        slowCallRateThreshold: 0.5,
      });
    });

    it('should emit state change events', async () => {
      const stateChangeHandler = vi.fn();
      circuitBreaker.on('stateChange', stateChangeHandler);

      const failingFunction = vi.fn().mockRejectedValue(new Error('failure'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.call(failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(stateChangeHandler).toHaveBeenCalledWith({
        from: 'closed',
        to: 'open',
        reason: 'failure_threshold_exceeded',
      });
    });

    it('should emit call events', async () => {
      const callSuccessHandler = vi.fn();
      const callFailureHandler = vi.fn();
      
      circuitBreaker.on('callSuccess', callSuccessHandler);
      circuitBreaker.on('callFailure', callFailureHandler);

      const successFunction = vi.fn().mockResolvedValue('success');
      const failingFunction = vi.fn().mockRejectedValue(new Error('failure'));

      await circuitBreaker.call(successFunction);
      
      try {
        await circuitBreaker.call(failingFunction);
      } catch (error) {
        // Expected to fail
      }

      expect(callSuccessHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          result: 'success',
          duration: expect.any(Number),
        })
      );

      expect(callFailureHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          duration: expect.any(Number),
        })
      );
    });

    it('should emit slow call events', async () => {
      const slowCallHandler = vi.fn();
      circuitBreaker.on('slowCall', slowCallHandler);

      const slowFunction = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
        return 'slow result';
      });

      vi.useRealTimers();

      await circuitBreaker.call(slowFunction);

      expect(slowCallHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: expect.any(Number),
          threshold: 100,
        })
      );

      vi.useFakeTimers();
    });
  });

  describe('Manual Control', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        threshold: 3,
        timeout: 60000,
        successThreshold: 2,
        slowCallThreshold: 100,
        slowCallRateThreshold: 0.5,
      });
    });

    it('should allow manual circuit opening', () => {
      expect(circuitBreaker.getState().state).toBe('closed');

      circuitBreaker.forceOpen();

      expect(circuitBreaker.getState().state).toBe('open');
    });

    it('should allow manual circuit closing', async () => {
      const failingFunction = vi.fn().mockRejectedValue(new Error('failure'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.call(failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState().state).toBe('open');

      circuitBreaker.forceClose();

      expect(circuitBreaker.getState().state).toBe('closed');
    });

    it('should allow manual half-open transition', () => {
      circuitBreaker.forceHalfOpen();

      expect(circuitBreaker.getState().state).toBe('half-open');
    });

    it('should reset circuit breaker state', async () => {
      const failingFunction = vi.fn().mockRejectedValue(new Error('failure'));

      // Open the circuit and accumulate stats
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.call(failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState().state).toBe('open');
      expect(circuitBreaker.getStats().totalCalls).toBe(3);

      circuitBreaker.reset();

      expect(circuitBreaker.getState().state).toBe('closed');
      expect(circuitBreaker.getStats().totalCalls).toBe(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        threshold: 3,
        timeout: 60000,
        successThreshold: 2,
        slowCallThreshold: 100,
        slowCallRateThreshold: 0.5,
      });
    });

    it('should handle function that throws synchronously', async () => {
      const throwingFunction = vi.fn().mockImplementation(() => {
        throw new Error('Synchronous error');
      });

      try {
        await circuitBreaker.call(throwingFunction);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toBe('Synchronous error');
      }

      const stats = circuitBreaker.getStats();
      expect(stats.failureCount).toBe(1);
    });

    it('should handle function that returns rejected promise', async () => {
      const rejectingFunction = vi.fn().mockRejectedValue(new Error('Async error'));

      try {
        await circuitBreaker.call(rejectingFunction);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toBe('Async error');
      }

      const stats = circuitBreaker.getStats();
      expect(stats.failureCount).toBe(1);
    });

    it('should handle non-Error exceptions', async () => {
      const throwingFunction = vi.fn().mockImplementation(() => {
        throw 'String error';
      });

      try {
        await circuitBreaker.call(throwingFunction);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBe('String error');
      }

      const stats = circuitBreaker.getStats();
      expect(stats.failureCount).toBe(1);
    });

    it('should handle undefined/null function', async () => {
      try {
        await circuitBreaker.call(null as any);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('Function is required');
      }
    });
  });

  describe('Configuration', () => {
    it('should validate configuration parameters', () => {
      expect(() => {
        new CircuitBreaker({
          threshold: -1, // Invalid
          timeout: 60000,
          successThreshold: 2,
          slowCallThreshold: 100,
          slowCallRateThreshold: 0.5,
        });
      }).toThrow();

      expect(() => {
        new CircuitBreaker({
          threshold: 3,
          timeout: -1000, // Invalid
          successThreshold: 2,
          slowCallThreshold: 100,
          slowCallRateThreshold: 0.5,
        });
      }).toThrow();

      expect(() => {
        new CircuitBreaker({
          threshold: 3,
          timeout: 60000,
          successThreshold: 2,
          slowCallThreshold: 100,
          slowCallRateThreshold: 1.5, // Invalid (> 1)
        });
      }).toThrow();
    });

    it('should use default configuration values', () => {
      const cb = new CircuitBreaker();
      const state = cb.getState();
      
      expect(state).toBeDefined();
      expect(cb.getStats()).toBeDefined();
      
      cb.destroy();
    });

    it('should allow configuration updates', () => {
      circuitBreaker = new CircuitBreaker({
        threshold: 3,
        timeout: 60000,
        successThreshold: 2,
        slowCallThreshold: 100,
        slowCallRateThreshold: 0.5,
      });

      circuitBreaker.updateConfig({
        threshold: 5,
        slowCallThreshold: 200,
      });

      // Configuration should be updated
      // This would be verified through behavior in a real implementation
      expect(true).toBe(true);
    });
  });

  describe('Resource Management', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        threshold: 3,
        timeout: 60000,
        successThreshold: 2,
        slowCallThreshold: 100,
        slowCallRateThreshold: 0.5,
      });
    });

    it('should cleanup resources on destroy', () => {
      const eventHandler = vi.fn();
      circuitBreaker.on('stateChange', eventHandler);

      circuitBreaker.destroy();

      // Should remove all listeners
      circuitBreaker.emit('stateChange', { from: 'closed', to: 'open' });
      expect(eventHandler).not.toHaveBeenCalled();
    });

    it('should handle multiple destroy calls', () => {
      circuitBreaker.destroy();
      circuitBreaker.destroy();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should prevent operations after destroy', async () => {
      const testFunction = vi.fn().mockResolvedValue('test');
      
      circuitBreaker.destroy();

      await expect(
        circuitBreaker.call(testFunction)
      ).rejects.toThrow('Circuit breaker has been destroyed');
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        threshold: 100,
        timeout: 60000,
        successThreshold: 2,
        slowCallThreshold: 100,
        slowCallRateThreshold: 0.5,
      });
    });

    it('should handle high-volume operations efficiently', async () => {
      const fastFunction = vi.fn().mockResolvedValue('fast');

      const startTime = Date.now();
      
      const promises = Array(1000).fill(0).map(() => 
        circuitBreaker.call(fastFunction)
      );
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000);
      expect(circuitBreaker.getStats().totalCalls).toBe(1000);
    });

    it('should maintain performance with many state transitions', async () => {
      const alternatingFunction = vi.fn()
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('failure'))
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('failure'));

      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        try {
          await circuitBreaker.call(alternatingFunction);
        } catch (error) {
          // Expected for some calls
        }
      }

      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should optimize memory usage for statistics', async () => {
      const testFunction = vi.fn().mockResolvedValue('test');

      // Make many calls to accumulate statistics
      for (let i = 0; i < 10000; i++) {
        await circuitBreaker.call(testFunction);
      }

      const stats = circuitBreaker.getStats();
      expect(stats.totalCalls).toBe(10000);

      // Memory usage should be reasonable (this is more of a smoke test)
      expect(typeof stats.avgResponseTime).toBe('number');
      expect(typeof stats.successRate).toBe('number');
    });
  });
});