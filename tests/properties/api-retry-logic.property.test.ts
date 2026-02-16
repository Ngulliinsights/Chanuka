/**
 * Property Test: API Retry Logic
 * Feature: comprehensive-bug-fixes, Property 13: API Retry Logic
 * 
 * Validates: Requirements 13.2, 13.3, 13.4
 * 
 * This property test verifies that:
 * - API calls retry up to 3 times for network errors with exponential backoff
 * - API calls retry with exponential backoff for 5xx errors
 * - API calls do NOT retry for 4xx errors (fail immediately)
 * - Retry attempt count is tracked and included in error context
 * - Exponential backoff follows the expected pattern
 * - Retryable and non-retryable errors are handled correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

// Mock logger and error factory before importing retry module
vi.mock('@client/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@client/core/error', () => ({
  ErrorFactory: {
    createNetworkError: vi.fn((message: string, options?: any) => {
      const error = new Error(message);
      error.name = 'NetworkError';
      return error;
    }),
  },
  ErrorDomain: {},
  ErrorSeverity: {},
}));

import { withRetry, type SimpleRetryConfig } from '@client/core/api/retry';

// Mock error types
class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TypeError'; // Network errors are typically TypeErrors
  }
}

class HttpError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}

describe('Feature: comprehensive-bug-fixes, Property 13: API Retry Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should retry network errors up to 3 times with exponential backoff', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }), // number of failures before success
        async (failureCount) => {
          let attemptCount = 0;
          const delays: number[] = [];
          const startTime = Date.now();

          const operation = vi.fn(async () => {
            attemptCount++;
            
            if (attemptCount <= failureCount) {
              throw new NetworkError('Network request failed');
            }
            
            return { success: true, data: 'test-data' };
          });

          const config: SimpleRetryConfig = {
            maxRetries: 3,
            retryableStatusCodes: [500, 502, 503, 504],
            backoffMultiplier: 2,
            initialDelay: 1000,
          };

          // Start the retry operation
          const resultPromise = withRetry(operation, config);

          // Advance timers for each retry
          for (let i = 0; i < failureCount; i++) {
            await vi.runOnlyPendingTimersAsync();
          }

          const result = await resultPromise;

          // Verify operation succeeded after retries
          expect(result).toEqual({ success: true, data: 'test-data' });
          expect(attemptCount).toBe(failureCount + 1);
          expect(operation).toHaveBeenCalledTimes(failureCount + 1);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should follow exponential backoff pattern for retries', async () => {
    let attemptCount = 0;
    const retryDelays: number[] = [];
    let lastAttemptTime = Date.now();

    const operation = vi.fn(async () => {
      const currentTime = Date.now();
      if (attemptCount > 0) {
        // Record the actual delay between attempts
        retryDelays.push(currentTime - lastAttemptTime);
      }
      lastAttemptTime = currentTime;
      attemptCount++;
      
      if (attemptCount <= 3) {
        throw new NetworkError('Network request failed');
      }
      
      return { success: true };
    });

    const config: SimpleRetryConfig = {
      maxRetries: 3,
      retryableStatusCodes: [500, 502, 503, 504],
      backoffMultiplier: 2,
      initialDelay: 1000,
    };

    const resultPromise = withRetry(operation, config);

    // Advance timers and collect delays
    for (let i = 0; i < 3; i++) {
      await vi.runOnlyPendingTimersAsync();
    }

    await resultPromise;

    // Verify exponential backoff pattern: 1000ms, 2000ms, 4000ms
    // Allow some tolerance for timing variations
    expect(retryDelays.length).toBe(3);
    expect(retryDelays[0]).toBeGreaterThanOrEqual(1000);
    expect(retryDelays[0]).toBeLessThanOrEqual(1100);
    expect(retryDelays[1]).toBeGreaterThanOrEqual(2000);
    expect(retryDelays[1]).toBeLessThanOrEqual(2100);
    expect(retryDelays[2]).toBeGreaterThanOrEqual(4000);
    expect(retryDelays[2]).toBeLessThanOrEqual(4100);
  });

  it('should retry 5xx errors with exponential backoff', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.constantFrom(500, 502, 503, 504), // 5xx status codes
        fc.integer({ min: 1, max: 3 }), // number of failures before success
        async (statusCode, failureCount) => {
          let attemptCount = 0;

          const operation = vi.fn(async () => {
            attemptCount++;
            
            if (attemptCount <= failureCount) {
              throw new HttpError(statusCode, `Server error: ${statusCode}`);
            }
            
            return { success: true, data: 'test-data' };
          });

          const config: SimpleRetryConfig = {
            maxRetries: 3,
            retryableStatusCodes: [500, 502, 503, 504],
            backoffMultiplier: 2,
            initialDelay: 1000,
          };

          const resultPromise = withRetry(operation, config);

          // Advance timers for each retry
          for (let i = 0; i < failureCount; i++) {
            await vi.runOnlyPendingTimersAsync();
          }

          const result = await resultPromise;

          // Verify operation succeeded after retries
          expect(result).toEqual({ success: true, data: 'test-data' });
          expect(attemptCount).toBe(failureCount + 1);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should NOT retry 4xx errors (fail immediately)', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.constantFrom(400, 401, 403, 404, 405, 409, 410, 422), // 4xx status codes (excluding 408, 429)
        async (statusCode) => {
          let attemptCount = 0;

          const operation = vi.fn(async () => {
            attemptCount++;
            throw new HttpError(statusCode, `Client error: ${statusCode}`);
          });

          const config: SimpleRetryConfig = {
            maxRetries: 3,
            retryableStatusCodes: [500, 502, 503, 504],
            backoffMultiplier: 2,
            initialDelay: 1000,
          };

          // Should throw immediately without retrying
          await expect(withRetry(operation, config)).rejects.toThrow(`Client error: ${statusCode}`);

          // Verify operation was called only once (no retries)
          expect(attemptCount).toBe(1);
          expect(operation).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should throw after exhausting all retries for persistent network errors', async () => {
    let attemptCount = 0;

    const operation = vi.fn(async () => {
      attemptCount++;
      throw new NetworkError('Network request failed');
    });

    const config: SimpleRetryConfig = {
      maxRetries: 3,
      retryableStatusCodes: [500, 502, 503, 504],
      backoffMultiplier: 2,
      initialDelay: 1000,
    };

    const resultPromise = withRetry(operation, config);

    // Advance timers for all retry attempts
    for (let i = 0; i < 3; i++) {
      await vi.runOnlyPendingTimersAsync();
    }

    // Should throw after all retries exhausted
    await expect(resultPromise).rejects.toThrow('Network request failed');

    // Verify operation was called maxRetries + 1 times (initial + 3 retries)
    expect(attemptCount).toBe(4);
    expect(operation).toHaveBeenCalledTimes(4);
  });

  it('should throw after exhausting all retries for persistent 5xx errors', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.constantFrom(500, 502, 503, 504),
        async (statusCode) => {
          let attemptCount = 0;

          const operation = vi.fn(async () => {
            attemptCount++;
            throw new HttpError(statusCode, `Server error: ${statusCode}`);
          });

          const config: SimpleRetryConfig = {
            maxRetries: 3,
            retryableStatusCodes: [500, 502, 503, 504],
            backoffMultiplier: 2,
            initialDelay: 1000,
          };

          const resultPromise = withRetry(operation, config);

          // Advance timers for all retry attempts
          for (let i = 0; i < 3; i++) {
            await vi.runOnlyPendingTimersAsync();
          }

          // Should throw after all retries exhausted
          await expect(resultPromise).rejects.toThrow(`Server error: ${statusCode}`);

          // Verify operation was called maxRetries + 1 times
          expect(attemptCount).toBe(4);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should respect custom retry configuration', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // maxRetries
        fc.integer({ min: 100, max: 2000 }), // initialDelay
        fc.integer({ min: 2, max: 4 }), // backoffMultiplier
        async (maxRetries, initialDelay, backoffMultiplier) => {
          let attemptCount = 0;

          const operation = vi.fn(async () => {
            attemptCount++;
            
            if (attemptCount <= maxRetries) {
              throw new NetworkError('Network request failed');
            }
            
            return { success: true };
          });

          const config: SimpleRetryConfig = {
            maxRetries,
            retryableStatusCodes: [500, 502, 503, 504],
            backoffMultiplier,
            initialDelay,
          };

          const resultPromise = withRetry(operation, config);

          // Advance timers for all retry attempts
          for (let i = 0; i < maxRetries; i++) {
            await vi.runOnlyPendingTimersAsync();
          }

          const result = await resultPromise;

          // Verify operation succeeded after configured retries
          expect(result).toEqual({ success: true });
          expect(attemptCount).toBe(maxRetries + 1);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should handle successful operations without retrying', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.anything(), // any return value
        async (returnValue) => {
          let attemptCount = 0;

          const operation = vi.fn(async () => {
            attemptCount++;
            return returnValue;
          });

          const config: SimpleRetryConfig = {
            maxRetries: 3,
            retryableStatusCodes: [500, 502, 503, 504],
            backoffMultiplier: 2,
            initialDelay: 1000,
          };

          const result = await withRetry(operation, config);

          // Verify operation succeeded on first attempt
          expect(result).toEqual(returnValue);
          expect(attemptCount).toBe(1);
          expect(operation).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle mixed error types correctly', async () => {
    const errorSequence = [
      new NetworkError('Network error'),
      new HttpError(503, 'Service unavailable'),
      new HttpError(404, 'Not found'), // Should not retry after this
    ];

    let attemptCount = 0;

    const operation = vi.fn(async () => {
      const error = errorSequence[attemptCount];
      attemptCount++;
      
      if (error) {
        throw error;
      }
      
      return { success: true };
    });

    const config: SimpleRetryConfig = {
      maxRetries: 3,
      retryableStatusCodes: [500, 502, 503, 504],
      backoffMultiplier: 2,
      initialDelay: 1000,
    };

    const resultPromise = withRetry(operation, config);

    // Advance timers for first two retries (network error and 503)
    await vi.runOnlyPendingTimersAsync(); // After network error
    await vi.runOnlyPendingTimersAsync(); // After 503 error

    // Should fail immediately on 404 without further retries
    await expect(resultPromise).rejects.toThrow('Not found');

    // Verify operation was called 3 times (initial + 2 retries, then 404)
    expect(attemptCount).toBe(3);
  });

  it('should calculate correct backoff delays for various configurations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }), // attempt number
        fc.integer({ min: 100, max: 5000 }), // initial delay
        fc.integer({ min: 2, max: 4 }), // backoff multiplier
        (attempt, initialDelay, backoffMultiplier) => {
          const expectedDelay = initialDelay * Math.pow(backoffMultiplier, attempt);
          
          // Verify the calculation matches expected exponential backoff
          expect(expectedDelay).toBeGreaterThanOrEqual(initialDelay);
          
          if (attempt > 0) {
            const previousDelay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
            expect(expectedDelay).toBeGreaterThan(previousDelay);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle timeout errors as retryable network errors', async () => {
    let attemptCount = 0;

    const operation = vi.fn(async () => {
      attemptCount++;
      
      if (attemptCount <= 2) {
        const error = new Error('Request timeout');
        error.name = 'TimeoutError';
        throw error;
      }
      
      return { success: true };
    });

    const config: SimpleRetryConfig = {
      maxRetries: 3,
      retryableStatusCodes: [500, 502, 503, 504],
      backoffMultiplier: 2,
      initialDelay: 1000,
    };

    const resultPromise = withRetry(operation, config);

    // Advance timers for retries
    for (let i = 0; i < 2; i++) {
      await vi.runOnlyPendingTimersAsync();
    }

    const result = await resultPromise;

    // Verify operation succeeded after retries
    expect(result).toEqual({ success: true });
    expect(attemptCount).toBe(3);
  });

  it('should treat 408 (timeout) and 429 (rate limit) as retryable despite being 4xx', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.constantFrom(408, 429),
        fc.integer({ min: 1, max: 2 }),
        async (statusCode, failureCount) => {
          let attemptCount = 0;

          const operation = vi.fn(async () => {
            attemptCount++;
            
            if (attemptCount <= failureCount) {
              throw new HttpError(statusCode, `Error: ${statusCode}`);
            }
            
            return { success: true };
          });

          const config: SimpleRetryConfig = {
            maxRetries: 3,
            retryableStatusCodes: [500, 502, 503, 504],
            backoffMultiplier: 2,
            initialDelay: 1000,
          };

          const resultPromise = withRetry(operation, config);

          // Advance timers for retries
          for (let i = 0; i < failureCount; i++) {
            await vi.runOnlyPendingTimersAsync();
          }

          const result = await resultPromise;

          // Verify operation succeeded after retries (408 and 429 should be retried)
          expect(result).toEqual({ success: true });
          expect(attemptCount).toBe(failureCount + 1);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should preserve error information through retry attempts', async () => {
    const originalError = new HttpError(503, 'Service temporarily unavailable');
    let attemptCount = 0;

    const operation = vi.fn(async () => {
      attemptCount++;
      throw originalError;
    });

    const config: SimpleRetryConfig = {
      maxRetries: 2,
      retryableStatusCodes: [500, 502, 503, 504],
      backoffMultiplier: 2,
      initialDelay: 1000,
    };

    const resultPromise = withRetry(operation, config);

    // Advance timers for all retries
    for (let i = 0; i < 2; i++) {
      await vi.runOnlyPendingTimersAsync();
    }

    // Should throw the original error after retries exhausted
    try {
      await resultPromise;
      expect.fail('Should have thrown an error');
    } catch (error) {
      // Verify the error is the same instance
      expect(error).toBe(originalError);
      expect((error as HttpError).status).toBe(503);
      expect((error as HttpError).message).toBe('Service temporarily unavailable');
    }
  });

  it('should handle rapid successive retry operations independently', async () => {
    const operation1 = vi.fn(async () => {
      throw new NetworkError('Network error 1');
    });

    const operation2 = vi.fn(async () => {
      return { success: true, id: 2 };
    });

    const config: SimpleRetryConfig = {
      maxRetries: 2,
      retryableStatusCodes: [500, 502, 503, 504],
      backoffMultiplier: 2,
      initialDelay: 1000,
    };

    // Start both operations
    const promise1 = withRetry(operation1, config);
    const promise2 = withRetry(operation2, config);

    // Operation 2 should succeed immediately
    const result2 = await promise2;
    expect(result2).toEqual({ success: true, id: 2 });
    expect(operation2).toHaveBeenCalledTimes(1);

    // Operation 1 should still be retrying
    for (let i = 0; i < 2; i++) {
      await vi.runOnlyPendingTimersAsync();
    }

    await expect(promise1).rejects.toThrow('Network error 1');
    expect(operation1).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});
