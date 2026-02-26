/**
 * Unit Tests for Retry Logic
 * 
 * Tests RetryHandler class, exponential backoff, retry conditions,
 * and service-specific configurations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RetryHandler,
  DEFAULT_RETRY_CONFIG,
  retryOperation,
  safeRetryOperation,
  createHttpRetryHandler,
  createServiceRetryHandler,
  SERVICE_RETRY_CONFIGS,
  withRetry,
} from '../retry';

// Mock logger
vi.mock('@client/lib/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../error', () => ({
  ErrorFactory: {
    createNetworkError: vi.fn((message: string) => new Error(message)),
  },
  ErrorDomain: {
    NETWORK: 'NETWORK',
  },
  ErrorSeverity: {
    ERROR: 'ERROR',
  },
}));

vi.mock('../../error', () => ({
  default: {
    handleError: vi.fn(),
  },
}));

describe('RetryHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should use default config when no config provided', () => {
      const handler = new RetryHandler();
      const config = handler.getConfig();

      expect(config.maxRetries).toBe(DEFAULT_RETRY_CONFIG.maxRetries);
      expect(config.baseDelay).toBe(DEFAULT_RETRY_CONFIG.baseDelay);
      expect(config.maxDelay).toBe(DEFAULT_RETRY_CONFIG.maxDelay);
      expect(config.backoffMultiplier).toBe(DEFAULT_RETRY_CONFIG.backoffMultiplier);
    });

    it('should merge custom config with defaults', () => {
      const handler = new RetryHandler({
        maxRetries: 5,
        baseDelay: 500,
      });
      const config = handler.getConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.baseDelay).toBe(500);
      expect(config.maxDelay).toBe(DEFAULT_RETRY_CONFIG.maxDelay);
    });
  });

  describe('execute', () => {
    it('should return result on first success', async () => {
      const handler = new RetryHandler();
      const operation = vi.fn().mockResolvedValue('success');

      const result = await handler.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const handler = new RetryHandler({ maxRetries: 3, baseDelay: 100 });
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const promise = handler.execute(operation);

      // Fast-forward through retries
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries exhausted', async () => {
      const handler = new RetryHandler({ maxRetries: 2, baseDelay: 100 });
      const operation = vi.fn().mockRejectedValue(new Error('Network error'));

      const promise = handler.execute(operation);

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry when retry condition returns false', async () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        baseDelay: 100,
        retryCondition: () => false,
      });
      const operation = vi.fn().mockRejectedValue(new Error('Client error'));

      await expect(handler.execute(operation)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn();
      const handler = new RetryHandler({
        maxRetries: 2,
        baseDelay: 100,
        onRetry,
      });
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const promise = handler.execute(operation);

      await vi.runAllTimersAsync();

      await promise;

      expect(onRetry).toHaveBeenCalledWith(
        expect.any(Error),
        0,
        expect.any(Number)
      );
    });

    it('should use exponential backoff', async () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        baseDelay: 1000,
        backoffMultiplier: 2,
      });
      const operation = vi.fn().mockRejectedValue(new Error('Network error'));

      const promise = handler.execute(operation);

      // First retry should wait ~1000ms (with jitter)
      await vi.advanceTimersByTimeAsync(500);
      expect(operation).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1000);
      expect(operation).toHaveBeenCalledTimes(2);

      // Second retry should wait ~2000ms (with jitter)
      await vi.advanceTimersByTimeAsync(2500);
      expect(operation).toHaveBeenCalledTimes(3);

      await vi.runAllTimersAsync();
      await expect(promise).rejects.toThrow();
    });

    it('should respect max delay', async () => {
      const handler = new RetryHandler({
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 3000,
        backoffMultiplier: 10,
      });
      const operation = vi.fn().mockRejectedValue(new Error('Network error'));

      const promise = handler.execute(operation);

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(6); // Initial + 5 retries
    });
  });

  describe('safeExecute', () => {
    it('should return success result', async () => {
      const handler = new RetryHandler();
      const operation = vi.fn().mockResolvedValue('success');

      const result = await handler.safeExecute(operation);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('success');
        expect(result.attempts).toBe(1);
      }
    });

    it('should return failure result', async () => {
      const handler = new RetryHandler({ maxRetries: 2, baseDelay: 100 });
      const operation = vi.fn().mockRejectedValue(new Error('Network error'));

      const promise = handler.safeExecute(operation);

      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.attempts).toBe(3);
      }
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const handler = new RetryHandler({ maxRetries: 3 });

      handler.updateConfig({ maxRetries: 5, baseDelay: 500 });

      const config = handler.getConfig();
      expect(config.maxRetries).toBe(5);
      expect(config.baseDelay).toBe(500);
    });
  });

  describe('default retry condition', () => {
    it('should retry network errors', async () => {
      const handler = new RetryHandler({ maxRetries: 1, baseDelay: 100 });
      const networkError = new Error('Network error');
      networkError.name = 'TypeError';

      const operation = vi
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce('success');

      const promise = handler.execute(operation);

      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry 5xx errors', async () => {
      const handler = new RetryHandler({ maxRetries: 1, baseDelay: 100 });
      const serverError = new Error('500 Internal Server Error');

      const operation = vi
        .fn()
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce('success');

      const promise = handler.execute(operation);

      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry 4xx errors', async () => {
      const handler = new RetryHandler({ maxRetries: 3, baseDelay: 100 });
      const clientError = new Error('404 Not Found');

      const operation = vi.fn().mockRejectedValue(clientError);

      await expect(handler.execute(operation)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry 408 timeout errors', async () => {
      const handler = new RetryHandler({ maxRetries: 1, baseDelay: 100 });
      const timeoutError = new Error('408 Request Timeout');

      const operation = vi
        .fn()
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce('success');

      const promise = handler.execute(operation);

      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry 429 rate limit errors', async () => {
      const handler = new RetryHandler({ maxRetries: 1, baseDelay: 100 });
      const rateLimitError = new Error('429 Too Many Requests');

      const operation = vi
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce('success');

      const promise = handler.execute(operation);

      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});

describe('Convenience Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('retryOperation', () => {
    it('should retry operation with default config', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const promise = retryOperation(operation);

      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should use custom config', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Network error'));

      const promise = retryOperation(operation, { maxRetries: 1, baseDelay: 100 });

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe('safeRetryOperation', () => {
    it('should return result object', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await safeRetryOperation(operation);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('success');
      }
    });
  });
});

describe('HTTP Retry Handler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should retry HTTP-specific errors', async () => {
    const handler = createHttpRetryHandler({ maxRetries: 1, baseDelay: 100 });
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValueOnce('success');

    const promise = handler.execute(operation);

    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should retry on timeout errors', async () => {
    const handler = createHttpRetryHandler({ maxRetries: 1, baseDelay: 100 });
    const timeoutError = new Error('Request timeout');
    timeoutError.name = 'TimeoutError';

    const operation = vi
      .fn()
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce('success');

    const promise = handler.execute(operation);

    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
  });
});

describe('Service-Specific Retry Handlers', () => {
  it('should create handler with auth service config', () => {
    const handler = createServiceRetryHandler('auth');
    const config = handler.getConfig();

    expect(config.maxRetries).toBe(SERVICE_RETRY_CONFIGS.auth.maxRetries);
    expect(config.baseDelay).toBe(SERVICE_RETRY_CONFIGS.auth.baseDelay);
  });

  it('should create handler with bills service config', () => {
    const handler = createServiceRetryHandler('bills');
    const config = handler.getConfig();

    expect(config.maxRetries).toBe(SERVICE_RETRY_CONFIGS.bills.maxRetries);
    expect(config.baseDelay).toBe(SERVICE_RETRY_CONFIGS.bills.baseDelay);
  });

  it('should allow config overrides', () => {
    const handler = createServiceRetryHandler('auth', { maxRetries: 10 });
    const config = handler.getConfig();

    expect(config.maxRetries).toBe(10);
    expect(config.baseDelay).toBe(SERVICE_RETRY_CONFIGS.auth.baseDelay);
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should retry operation with default config', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce('success');

    const promise = withRetry(operation);

    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should not retry client errors', async () => {
    const clientError = new Error('400 Bad Request');
    (clientError as Error & { status: number }).status = 400;

    const operation = vi.fn().mockRejectedValue(clientError);

    await expect(withRetry(operation)).rejects.toThrow();
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry 408 and 429 errors', async () => {
    const timeoutError = new Error('408 Request Timeout');
    const operation = vi
      .fn()
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce('success');

    const promise = withRetry(operation);

    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should use custom retry config', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Network error'));

    const promise = withRetry(operation, {
      maxRetries: 1,
      retryableStatusCodes: [500],
      backoffMultiplier: 2,
      initialDelay: 100,
    });

    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow();
    expect(operation).toHaveBeenCalledTimes(2); // Initial + 1 retry
  });
});
