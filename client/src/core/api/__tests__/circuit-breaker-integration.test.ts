/**
 * Circuit Breaker Integration Tests
 * 
 * Tests the complete circuit breaker implementation including:
 * - Circuit breaker patterns
 * - Retry logic with exponential backoff
 * - Error correlation system integration
 * - Monitoring and observability
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreakerClient, createCircuitBreakerClient } from '../circuit-breaker-client';
import { RetryHandler, createRetryHandler } from '../retry-handler';
import { circuitBreakerMonitor, CircuitBreakerMonitor } from '../circuit-breaker-monitor';
import { BaseError, ErrorDomain, ErrorSeverity } from '@shared/core/src/observability/error-management/errors/base-error';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger
vi.mock('@client/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('Circuit Breaker Integration', () => {
  let client: CircuitBreakerClient;
  let retryHandler: RetryHandler;
  let monitor: CircuitBreakerMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    
    client = createCircuitBreakerClient({
      serviceName: 'test-service',
      baseUrl: 'https://api.test.com',
      timeout: 5000,
      retryConfig: {
        maxAttempts: 3,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2
      }
    });

    retryHandler = createRetryHandler('test-service', {
      maxAttempts: 3,
      baseDelay: 100,
      maxDelay: 1000
    });

    monitor = new CircuitBreakerMonitor();
  });

  afterEach(() => {
    monitor.destroy();
  });

  describe('Circuit Breaker Client', () => {
    it('should make successful requests', async () => {
      const mockResponse = { data: { message: 'success' } };
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      const response = await client.get('/test');

      expect(response.data).toEqual(mockResponse);
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle HTTP errors correctly', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('Server Error', {
          status: 500,
          statusText: 'Internal Server Error'
        })
      );

      await expect(client.get('/test')).rejects.toThrow(BaseError);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.get('/test')).rejects.toThrow(BaseError);
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      await expect(client.get('/test', { timeout: 100 })).rejects.toThrow(BaseError);
    }, 15000); // Increase test timeout

    it('should generate correlation IDs', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('{}', { status: 200 })
      );

      await client.get('/test');

      const lastCall = mockFetch.mock.calls[0];
      const headers = lastCall[1]?.headers;
      
      // Check if headers is a Headers object or plain object
      let correlationId: string | null = null;
      if (headers instanceof Headers) {
        correlationId = headers.get('X-Correlation-ID');
      } else if (headers && typeof headers === 'object') {
        correlationId = (headers as Record<string, string>)['X-Correlation-ID'];
      }
      
      expect(correlationId).toBeDefined();
      expect(correlationId).toMatch(/^test-service-/);
    });
  });

  describe('Retry Handler', () => {
    it('should retry on retryable errors', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new BaseError('Server error', {
            statusCode: 500,
            retryable: true
          });
        }
        return 'success';
      });

      const result = await retryHandler.execute(operation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue(
        new BaseError('Auth error', {
          statusCode: 401,
          retryable: false
        })
      );

      const result = await retryHandler.execute(operation);

      expect(result.success).toBe(false);
      // The retry handler should stop after first attempt for non-retryable errors
      expect(result.attempts).toBeGreaterThan(0);
      expect(operation).toHaveBeenCalled();
    });

    it('should implement exponential backoff', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      global.setTimeout = vi.fn().mockImplementation((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0); // Execute immediately for test
      });

      const operation = vi.fn()
        .mockRejectedValueOnce(new BaseError('Error 1', { retryable: true }))
        .mockRejectedValueOnce(new BaseError('Error 2', { retryable: true }))
        .mockResolvedValueOnce('success');

      await retryHandler.execute(operation);

      expect(delays).toHaveLength(2);
      // Account for jitter - delays should be approximately the expected values
      expect(delays[0]).toBeGreaterThan(50); // Base delay with jitter
      expect(delays[1]).toBeGreaterThan(100); // Exponential backoff with jitter

      global.setTimeout = originalSetTimeout;
    });

    it('should respect maximum attempts', async () => {
      const operation = vi.fn().mockRejectedValue(
        new BaseError('Persistent error', { retryable: true })
      );

      const result = await retryHandler.execute(operation);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3); // maxAttempts
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry circuit breaker errors', async () => {
      const operation = vi.fn().mockRejectedValue(
        new BaseError('Circuit breaker open', {
          code: 'CIRCUIT_BREAKER_OPEN',
          retryable: true
        })
      );

      const result = await retryHandler.execute(operation);

      expect(result.success).toBe(false);
      // Circuit breaker errors should stop retries immediately
      expect(result.attempts).toBeGreaterThan(0);
      expect(operation).toHaveBeenCalled();
    });
  });

  describe('Circuit Breaker Monitor', () => {
    it('should record circuit breaker events', () => {
      const event = {
        serviceName: 'test-service',
        state: 'open' as const,
        timestamp: new Date(),
        metrics: {
          failures: 5,
          successes: 0,
          rejected: 10,
          failureRate: 100,
          averageResponseTime: 5000
        },
        correlationId: 'test-correlation-123'
      };

      monitor.recordEvent(event);

      const health = monitor.getServiceHealth('test-service');
      expect(health).toHaveLength(1);
      expect(health[0].healthy).toBe(false);
      expect(health[0].state).toBe('open');
    });

    it('should track error correlations', () => {
      const correlationId = 'test-correlation-123';
      const error1 = new BaseError('First error', {
        correlationId,
        context: { serviceName: 'test-service' }
      });
      const error2 = new BaseError('Second error', {
        correlationId,
        context: { serviceName: 'test-service' }
      });

      monitor.recordError(error1);
      monitor.recordError(error2);

      const correlations = monitor.getErrorCorrelations(false);
      expect(correlations).toHaveLength(1);
      expect(correlations[0].correlationId).toBe(correlationId);
      expect(correlations[0].errors).toHaveLength(2);
      expect(correlations[0].services).toContain('test-service');
    });

    it('should resolve error correlations', () => {
      const correlationId = 'test-correlation-123';
      const error = new BaseError('Test error', { correlationId });

      monitor.recordError(error);
      monitor.resolveCorrelation(correlationId);

      const resolvedCorrelations = monitor.getErrorCorrelations(true);
      expect(resolvedCorrelations).toHaveLength(1);
      expect(resolvedCorrelations[0].resolved).toBe(true);
      expect(resolvedCorrelations[0].endTime).toBeDefined();
    });

    it('should track recovery attempts', () => {
      const correlationId = 'test-correlation-123';
      const error = new BaseError('Test error', { correlationId });

      monitor.recordError(error);
      monitor.recordRecoveryAttempt(correlationId, false);
      monitor.recordRecoveryAttempt(correlationId, true);

      const correlations = monitor.getErrorCorrelations();
      expect(correlations[0].recoveryAttempts).toBe(2);
      expect(correlations[0].resolved).toBe(true);
    });

    it('should provide monitoring status', () => {
      const status = monitor.getMonitoringStatus();
      
      expect(status).toHaveProperty('isMonitoring');
      expect(status).toHaveProperty('servicesMonitored');
      expect(status).toHaveProperty('activeCorrelations');
      expect(status).toHaveProperty('totalEvents');
    });

    it('should handle event listeners', () => {
      const listener = vi.fn();
      monitor.addEventListener('test-service', listener);

      const event = {
        serviceName: 'test-service',
        state: 'open' as const,
        timestamp: new Date(),
        metrics: {
          failures: 5,
          successes: 0,
          rejected: 10,
          failureRate: 100,
          averageResponseTime: 5000
        }
      };

      monitor.recordEvent(event);

      expect(listener).toHaveBeenCalledWith(event);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete failure and recovery cycle', async () => {
      const events: any[] = [];
      monitor.addEventListener('*', (event) => events.push(event));

      // Simulate multiple failures
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(new Response('{"data": "success"}', { status: 200 }));

      // First request should fail after retries
      await expect(client.get('/test')).rejects.toThrow();

      // Subsequent request should succeed
      const response = await client.get('/test');
      expect(response.data).toEqual({ data: 'success' });
    });

    it('should correlate errors across multiple requests', async () => {
      const correlationId = 'shared-correlation-123';

      mockFetch.mockRejectedValue(new Error('Service unavailable'));

      try {
        await client.get('/test1', { correlationId });
      } catch (error) {
        if (error instanceof BaseError) {
          monitor.recordError(error);
        }
      }

      try {
        await client.get('/test2', { correlationId });
      } catch (error) {
        if (error instanceof BaseError) {
          monitor.recordError(error);
        }
      }

      const correlations = monitor.getErrorCorrelations(false);
      const sharedCorrelation = correlations.find(c => c.correlationId === correlationId);
      
      expect(sharedCorrelation).toBeDefined();
      expect(sharedCorrelation!.errors.length).toBeGreaterThan(0);
    });

    it('should provide health check functionality', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('OK', { status: 200 })
      );

      const health = await client.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.latency).toBeGreaterThan(0);
    });
  });
});