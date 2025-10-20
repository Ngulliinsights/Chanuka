import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitBreakerState } from '../circuit-breaker';
import { logger } from '../../observability/logging';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  
  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 2,
      successThreshold: 1,
      timeout: 1000,
      slowCallDurationThreshold: 100,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should be in CLOSED state initially', () => {
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('should execute successful operations in CLOSED state', async () => {
    const mockAction = vi.fn().mockResolvedValue('success');
    const result = await circuitBreaker.execute(mockAction);
    
    expect(result).toBe('success');
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('should transition to OPEN after reaching failure threshold', async () => {
    const mockAction = vi.fn().mockRejectedValue(new Error('test error'));

    // First failure
    await expect(circuitBreaker.execute(mockAction)).rejects.toThrow('test error');
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);

    // Second failure - should trigger OPEN state
    await expect(circuitBreaker.execute(mockAction)).rejects.toThrow('test error');
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
  });

  it('should reject calls in OPEN state', async () => {
    const mockAction = vi.fn().mockRejectedValue(new Error('test error'));

    // Force circuit breaker into OPEN state
    await expect(circuitBreaker.execute(mockAction)).rejects.toThrow();
    await expect(circuitBreaker.execute(mockAction)).rejects.toThrow();

    // Attempt call in OPEN state
    await expect(circuitBreaker.execute(mockAction)).rejects.toThrow('Circuit breaker is OPEN');
    expect(mockAction).toHaveBeenCalledTimes(2); // Should not have called the action in OPEN state
  });

  it('should transition to HALF_OPEN after timeout', async () => {
    const mockAction = vi.fn().mockRejectedValue(new Error('test error'));

    // Force circuit breaker into OPEN state
    await expect(circuitBreaker.execute(mockAction)).rejects.toThrow();
    await expect(circuitBreaker.execute(mockAction)).rejects.toThrow();
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);

    // Advance time past the timeout
    vi.advanceTimersByTime(1100);

    mockAction.mockResolvedValue('success');
    const result = await circuitBreaker.execute(mockAction);
    
    expect(result).toBe('success');
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('should detect slow calls', async () => {
    const mockAction = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 150)); // Slower than threshold
      return 'success';
    });

    await expect(circuitBreaker.execute(mockAction)).rejects.toThrow('Operation timed out');
    
    const metrics = circuitBreaker.getMetrics();
    expect(metrics.slowCalls).toBeGreaterThan(0);
  });

  it('should track metrics accurately', async () => {
    const successAction = vi.fn().mockResolvedValue('success');
    const failureAction = vi.fn().mockRejectedValue(new Error('test error'));

    // Execute a mix of successful and failed operations
    await circuitBreaker.execute(successAction);
    await expect(circuitBreaker.execute(failureAction)).rejects.toThrow();

    const metrics = circuitBreaker.getMetrics();
    expect(metrics.successes).toBe(1);
    expect(metrics.failures).toBe(1);
    expect(metrics.totalCalls).toBe(2);
  });
});












































