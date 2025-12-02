import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { jest } from '@jest/globals';
import { CircuitBreaker } from '@shared/core';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    // Using fake timers gives us precise control over time-dependent behavior
    // like reset timeouts and operation timeouts
    vi.useFakeTimers();
    
    // Configure with reasonable test values that complete quickly
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      timeout: 5000,
      slowCallDurationThreshold: 1000,
    });
  });

  afterEach(() => {
    // Always restore real timers to avoid affecting other tests
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should start in CLOSED state with zero failures', () => {
      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.getMetrics().failures).toBe(0);
    });
  });

  describe('CLOSED to OPEN Transition', () => {
    it('should transition to OPEN after failure threshold is reached', async () => {
      const failingOperation = vi.fn<() => Promise<never>>().mockRejectedValue(new Error('Operation failed'));
      const stateChangeSpy = vi.fn();

      circuitBreaker.on('open', stateChangeSpy);

      // Execute enough failures to trip the breaker
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('Operation failed');
      }

      expect(circuitBreaker.getState()).toBe('OPEN');
      expect(circuitBreaker.getMetrics().failures).toBe(3);
      expect(stateChangeSpy).toHaveBeenCalled();
    });

    it('should count timeouts as failures toward the threshold', async () => {
      // This operation takes longer than the configured timeout
      const slowOperation = () => new Promise(resolve => setTimeout(resolve, 2000));

      // Execute a slow operation and advance time to trigger timeout
      const promise = circuitBreaker.execute(slowOperation);
      await vi.advanceTimersByTimeAsync(1001);

      await expect(promise).rejects.toThrow('Operation timed out');
      expect(circuitBreaker.getMetrics().failures).toBe(1);
    });
  });

  describe('OPEN State Behavior', () => {
    beforeEach(async () => {
      // Helper to put the breaker into OPEN state before each test
      const failingOp = vi.fn<() => Promise<never>>().mockRejectedValue(new Error('Fail'));
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(failingOp)).rejects.toThrow();
      }
    });

    it('should reject operations immediately when OPEN', async () => {
      const successfulOperation = vi.fn<() => Promise<string>>().mockResolvedValue('success');

      // The breaker should reject without even calling the operation
      await expect(circuitBreaker.execute(successfulOperation)).rejects.toThrow('Circuit breaker is OPEN');
      expect(successfulOperation).not.toHaveBeenCalled();
    });

    it('should provide time remaining in error message', async () => {
      const operation = vi.fn<() => Promise<string>>().mockResolvedValue('success');

      try {
        await circuitBreaker.execute(operation);
        fail('Should have thrown an error');
      } catch (error: any) {
        // The error message should indicate when retry will be allowed
        expect(error.message).toMatch(/Circuit breaker is OPEN.*Retry in \d+ms/);
      }
    });
  });

  describe('OPEN to HALF_OPEN Transition', () => {
    it('should transition to HALF_OPEN after reset timeout expires', async () => {
      const stateChangeSpy = vi.fn();
      circuitBreaker.on('half-open', stateChangeSpy);

      // Trip the breaker to OPEN state
      const failingOp = vi.fn<() => Promise<never>>().mockRejectedValue(new Error('Fail'));
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(failingOp)).rejects.toThrow();
      }

      expect(circuitBreaker.getState()).toBe('OPEN');

      // Advance time past the reset timeout
      await vi.advanceTimersByTimeAsync(5001);

      // The breaker should automatically transition to HALF_OPEN
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
      expect(stateChangeSpy).toHaveBeenCalled();
    });
  });

  describe('HALF_OPEN State Behavior', () => {
    beforeEach(() => {
      // Set up HALF_OPEN state directly for cleaner test setup
      (circuitBreaker as any).state = 'HALF_OPEN';
      (circuitBreaker as any).failures = 3;
    });

    it('should transition to CLOSED on successful operation', async () => {
      const successfulOperation = vi.fn<() => Promise<string>>().mockResolvedValue('success');
      const stateChangeSpy = vi.fn();
      circuitBreaker.on('close', stateChangeSpy);

      const result = await circuitBreaker.execute(successfulOperation);

      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.getMetrics().failures).toBe(0);
      expect(stateChangeSpy).toHaveBeenCalled();
    });

    it('should transition back to OPEN on failed operation', async () => {
      const failingOperation = vi.fn<() => Promise<never>>().mockRejectedValue(new Error('Still failing'));
      const stateChangeSpy = vi.fn();
      circuitBreaker.on('open', stateChangeSpy);

      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('Still failing');

      expect(circuitBreaker.getState()).toBe('OPEN');
      expect(stateChangeSpy).toHaveBeenCalled();
    });

    it('should transition to OPEN on timeout in HALF_OPEN', async () => {
      const slowOperation = () => new Promise(resolve => setTimeout(resolve, 2000));

      const promise = circuitBreaker.execute(slowOperation);
      await vi.advanceTimersByTimeAsync(1001);

      await expect(promise).rejects.toThrow('Operation timed out');
      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });

  describe('Failure Count Management', () => {
    it('should increment failure count on each failure', async () => {
      const failingOp = vi.fn<() => Promise<never>>().mockRejectedValue(new Error('Fail'));

      expect(circuitBreaker.getMetrics().failures).toBe(0);

      await expect(circuitBreaker.execute(failingOp)).rejects.toThrow();
      expect(circuitBreaker.getMetrics().failures).toBe(1);

      await expect(circuitBreaker.execute(failingOp)).rejects.toThrow();
      expect(circuitBreaker.getMetrics().failures).toBe(2);
    });

    it('should reset failure count when transitioning to CLOSED', async () => {
      // Set up HALF_OPEN with some failures
      (circuitBreaker as any).state = 'HALF_OPEN';
      (circuitBreaker as any).failures = 3;

      const successfulOp = vi.fn<() => Promise<string>>().mockResolvedValue('success');
      await circuitBreaker.execute(successfulOp);

      // Moving to CLOSED should clear the failure count
      expect(circuitBreaker.getMetrics().failures).toBe(0);
    });

    it('should not increment failure count for successful operations', async () => {
      const successfulOp = vi.fn<() => Promise<string>>().mockResolvedValue('success');

      await circuitBreaker.execute(successfulOp);
      await circuitBreaker.execute(successfulOp);

      expect(circuitBreaker.getMetrics().failures).toBe(0);
    });
  });

  describe('Event Emissions', () => {
    it('should emit state change from CLOSED to OPEN', async () => {
      const stateChangeSpy = vi.fn();
      circuitBreaker.on('open', stateChangeSpy);

      const failingOp = vi.fn<() => Promise<never>>().mockRejectedValue(new Error('Fail'));

      // Trip the breaker
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(failingOp)).rejects.toThrow();
      }

      expect(stateChangeSpy).toHaveBeenCalled();
    });

    it('should emit all state transitions in sequence', async () => {
      const openSpy = vi.fn();
      const halfOpenSpy = vi.fn();
      const closeSpy = vi.fn();

      circuitBreaker.on('open', openSpy);
      circuitBreaker.on('half-open', halfOpenSpy);
      circuitBreaker.on('close', closeSpy);

      // CLOSED -> OPEN
      const failingOp = vi.fn<() => Promise<never>>().mockRejectedValue(new Error('Fail'));
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(failingOp)).rejects.toThrow();
      }

      // OPEN -> HALF_OPEN (after timeout)
      await vi.advanceTimersByTimeAsync(5001);

      // HALF_OPEN -> CLOSED (on success)
      const successOp = vi.fn<() => Promise<string>>().mockResolvedValue('success');
      await circuitBreaker.execute(successOp);

      // Verify we saw all three transitions
      expect(openSpy).toHaveBeenCalled();
      expect(halfOpenSpy).toHaveBeenCalled();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle operations that complete just before timeout', async () => {
      // Operation completes in 999ms, just under the 1000ms timeout
      const almostSlowOp = vi.fn<() => Promise<string>>().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('success'), 999))
      );

      const promise = circuitBreaker.execute(almostSlowOp);
      await vi.advanceTimersByTimeAsync(999);

      // Should succeed without timeout
      await expect(promise).resolves.toBe('success');
      expect(circuitBreaker.getMetrics().failures).toBe(0);
    });

    it('should handle rapid successive failures', async () => {
      const failingOp = vi.fn<() => Promise<never>>().mockRejectedValue(new Error('Fail'));

      // Execute failures in rapid succession without awaiting
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 5; i++) {
        promises.push(circuitBreaker.execute(failingOp).catch(() => {}));
      }

      await Promise.all(promises);

      // Should have tripped after threshold, subsequent calls rejected
      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });
});






































