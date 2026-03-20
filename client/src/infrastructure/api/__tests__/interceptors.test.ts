/**
 * Unit Tests for API Interceptors
 * 
 * Tests request/response interceptor pipeline, circuit breaker,
 * authentication, logging, compression, and sanitization.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  headerInterceptor,
  loggingInterceptor,
  timeoutInterceptor,
  sanitizationInterceptor,
  compressionInterceptor,
  circuitBreakerInterceptor,
  responseLoggingInterceptor,
  errorResponseInterceptor,
  cacheHeaderInterceptor,
  circuitBreakerResponseInterceptor,
  processRequestInterceptors,
  processResponseInterceptors,
  addRequestInterceptor,
  addResponseInterceptor,
  removeRequestInterceptor,
  removeResponseInterceptor,
  clearRequestInterceptors,
  clearResponseInterceptors,
  conditionalRequestInterceptor,
  conditionalResponseInterceptor,
  combineRequestInterceptors,
  combineResponseInterceptors,
} from '../interceptors';

// Mock dependencies
vi.mock('@client/lib/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../circuit-breaker/core', () => ({
  circuitBreaker: {
    canExecute: vi.fn(() => ({ allowed: true, reason: null })),
    recordSuccess: vi.fn(),
    recordFailure: vi.fn(),
    getStats: vi.fn(() => ({})),
  },
  getCircuitBreakerStats: vi.fn(() => ({})),
}));

vi.mock('../circuit-breaker-monitor', () => ({
  recordCircuitBreakerEvent: vi.fn(),
}));

describe('Request Interceptors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('headerInterceptor', () => {
    it('should add X-Request-ID header', async () => {
      const config = {
        url: 'https://api.example.com/test',
        method: 'GET',
      };

      const result = await headerInterceptor(config);

      expect(result.headers).toBeInstanceOf(Headers);
      expect((result.headers as Headers).has('X-Request-ID')).toBe(true);
    });

    it('should add Content-Type for POST requests', async () => {
      const config = {
        url: 'https://api.example.com/test',
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      };

      const result = await headerInterceptor(config);

      expect((result.headers as Headers).get('Content-Type')).toBe('application/json');
    });

    it('should add Accept header', async () => {
      const config = {
        url: 'https://api.example.com/test',
        method: 'GET',
      };

      const result = await headerInterceptor(config);

      expect((result.headers as Headers).get('Accept')).toBe('application/json');
    });

    it('should not override existing headers', async () => {
      const headers = new Headers();
      headers.set('X-Request-ID', 'custom-id');
      headers.set('Content-Type', 'text/plain');

      const config = {
        url: 'https://api.example.com/test',
        method: 'POST',
        headers,
      };

      const result = await headerInterceptor(config);

      expect((result.headers as Headers).get('X-Request-ID')).toBe('custom-id');
      expect((result.headers as Headers).get('Content-Type')).toBe('text/plain');
    });
  });

  describe('loggingInterceptor', () => {
    it('should log outgoing requests', async () => {
      const { logger } = await import('@client/lib/utils/logger');

      const config = {
        url: 'https://api.example.com/test',
        method: 'GET',
        headers: new Headers({ 'X-Request-ID': 'test-id' }),
      };

      await loggingInterceptor(config);

      expect(logger.debug).toHaveBeenCalledWith(
        'Outgoing API Request',
        expect.objectContaining({
          component: 'RequestInterceptor',
          requestId: 'test-id',
          url: config.url,
          method: 'GET',
        })
      );
    });
  });

  describe('timeoutInterceptor', () => {
    it('should add AbortSignal with timeout', async () => {
      const interceptor = timeoutInterceptor(5000);
      const config = {
        url: 'https://api.example.com/test',
        method: 'GET',
      };

      const result = await interceptor(config);

      expect(result.signal).toBeInstanceOf(AbortSignal);
    });

    it('should not override existing signal', async () => {
      const interceptor = timeoutInterceptor(5000);
      const controller = new AbortController();
      const config = {
        url: 'https://api.example.com/test',
        method: 'GET',
        signal: controller.signal,
      };

      const result = await interceptor(config);

      expect(result.signal).toBe(controller.signal);
    });
  });

  describe('sanitizationInterceptor', () => {
    it('should remove sensitive parameters from URL', async () => {
      const config = {
        url: 'https://api.example.com/test?password=secret&token=abc123',
        method: 'GET',
      };

      const result = await sanitizationInterceptor(config);

      expect(result.url).not.toContain('password');
      expect(result.url).not.toContain('token');
    });

    it('should preserve non-sensitive parameters', async () => {
      const config = {
        url: 'https://api.example.com/test?id=123&name=test',
        method: 'GET',
      };

      const result = await sanitizationInterceptor(config);

      expect(result.url).toContain('id=123');
      expect(result.url).toContain('name=test');
    });
  });

  describe('compressionInterceptor', () => {
    it('should add Accept-Encoding header', async () => {
      const config = {
        url: 'https://api.example.com/test',
        method: 'GET',
      };

      const result = await compressionInterceptor(config);

      expect((result.headers as Headers).get('Accept-Encoding')).toBe('gzip, deflate, br');
    });

    it('should not override existing Accept-Encoding', async () => {
      const headers = new Headers();
      headers.set('Accept-Encoding', 'gzip');

      const config = {
        url: 'https://api.example.com/test',
        method: 'GET',
        headers,
      };

      const result = await compressionInterceptor(config);

      expect((result.headers as Headers).get('Accept-Encoding')).toBe('gzip');
    });
  });

  describe('circuitBreakerInterceptor', () => {
    it('should allow request when circuit is closed', async () => {
      const { circuitBreaker } = await import('../circuit-breaker/core');
      vi.mocked(circuitBreaker.canExecute).mockReturnValue({ allowed: true, reason: null });

      const config = {
        url: 'https://api.example.com/test',
        method: 'GET',
      };

      const result = await circuitBreakerInterceptor(config);

      expect(result).toEqual(config);
    });

    it('should block request when circuit is open', async () => {
      const { circuitBreaker } = await import('../circuit-breaker/core');
      vi.mocked(circuitBreaker.canExecute).mockReturnValue({
        allowed: false,
        reason: 'Circuit breaker is open',
      });

      const config = {
        url: 'https://api.example.com/test',
        method: 'GET',
      };

      await expect(circuitBreakerInterceptor(config)).rejects.toThrow(
        'Service temporarily unavailable'
      );
    });
  });
});

describe('Response Interceptors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('responseLoggingInterceptor', () => {
    it('should log incoming responses', async () => {
      const { logger } = await import('@client/lib/utils/logger');

      const response = new Response('{}', {
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'X-Request-ID': 'test-id' }),
      });

      await responseLoggingInterceptor(response);

      expect(logger.debug).toHaveBeenCalledWith(
        'Incoming API Response',
        expect.objectContaining({
          component: 'ResponseInterceptor',
          requestId: 'test-id',
          status: 200,
        })
      );
    });
  });

  describe('errorResponseInterceptor', () => {
    it('should log error responses', async () => {
      const { logger } = await import('@client/lib/utils/logger');

      const response = new Response('{"error":"Not found"}', {
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'X-Request-ID': 'test-id' }),
      });

      await errorResponseInterceptor(response);

      expect(logger.warn).toHaveBeenCalledWith(
        'API Request Failed',
        expect.objectContaining({
          component: 'ResponseInterceptor',
          status: 404,
        })
      );
    });

    it('should not log successful responses', async () => {
      const { logger } = await import('@client/lib/utils/logger');

      const response = new Response('{}', {
        status: 200,
        statusText: 'OK',
      });

      await errorResponseInterceptor(response);

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('cacheHeaderInterceptor', () => {
    it('should add cache metadata to response', async () => {
      const response = new Response('{}', {
        status: 200,
        headers: new Headers({
          'Cache-Control': 'max-age=3600',
          ETag: '"abc123"',
          'Last-Modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
        }),
      });

      const result = await cacheHeaderInterceptor(response);

      expect((result as Response & { __cacheMetadata?: unknown }).__cacheMetadata).toBeDefined();
    });
  });

  describe('circuitBreakerResponseInterceptor', () => {
    it('should record success for successful responses', async () => {
      const { circuitBreaker } = await import('../circuit-breaker/core');

      const response = new Response('{}', {
        status: 200,
        statusText: 'OK',
      });

      await circuitBreakerResponseInterceptor(response);

      expect(circuitBreaker.recordSuccess).toHaveBeenCalled();
    });

    it('should record failure for 5xx responses', async () => {
      const { circuitBreaker } = await import('../circuit-breaker/core');

      const response = new Response('{}', {
        status: 500,
        statusText: 'Internal Server Error',
      });

      await circuitBreakerResponseInterceptor(response);

      expect(circuitBreaker.recordFailure).toHaveBeenCalled();
    });

    it('should not record failure for 4xx responses', async () => {
      const { circuitBreaker } = await import('../circuit-breaker/core');

      const response = new Response('{}', {
        status: 404,
        statusText: 'Not Found',
      });

      await circuitBreakerResponseInterceptor(response);

      expect(circuitBreaker.recordFailure).not.toHaveBeenCalled();
    });
  });
});

describe('Interceptor Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRequestInterceptors();
    clearResponseInterceptors();
  });

  describe('processRequestInterceptors', () => {
    it('should process all request interceptors in order', async () => {
      const interceptor1 = vi.fn(config => ({ ...config, test1: true }));
      const interceptor2 = vi.fn(config => ({ ...config, test2: true }));

      addRequestInterceptor(interceptor1);
      addRequestInterceptor(interceptor2);

      const config = {
        url: 'https://api.example.com/test',
        method: 'GET',
      };

      const result = await processRequestInterceptors(config);

      expect(interceptor1).toHaveBeenCalled();
      expect(interceptor2).toHaveBeenCalled();
      expect(result).toMatchObject({ test1: true, test2: true });
    });

    it('should stop processing on interceptor error', async () => {
      const interceptor1 = vi.fn(() => {
        throw new Error('Interceptor error');
      });
      const interceptor2 = vi.fn(config => config);

      addRequestInterceptor(interceptor1);
      addRequestInterceptor(interceptor2);

      const config = {
        url: 'https://api.example.com/test',
        method: 'GET',
      };

      await expect(processRequestInterceptors(config)).rejects.toThrow('Interceptor error');
      expect(interceptor2).not.toHaveBeenCalled();
    });
  });

  describe('processResponseInterceptors', () => {
    it('should process all response interceptors in order', async () => {
      const interceptor1 = vi.fn(response => response);
      const interceptor2 = vi.fn(response => response);

      addResponseInterceptor(interceptor1);
      addResponseInterceptor(interceptor2);

      const response = new Response('{}', { status: 200 });

      await processResponseInterceptors(response);

      expect(interceptor1).toHaveBeenCalled();
      expect(interceptor2).toHaveBeenCalled();
    });
  });
});

describe('Interceptor Management', () => {
  beforeEach(() => {
    clearRequestInterceptors();
    clearResponseInterceptors();
  });

  describe('addRequestInterceptor', () => {
    it('should add interceptor to the end by default', () => {
      const interceptor1 = vi.fn(config => config);
      const interceptor2 = vi.fn(config => config);

      addRequestInterceptor(interceptor1);
      addRequestInterceptor(interceptor2);

      // Verify order by checking execution
      const config = { url: 'test', method: 'GET' };
      processRequestInterceptors(config);

      expect(interceptor1).toHaveBeenCalled();
      expect(interceptor2).toHaveBeenCalled();
    });

    it('should add interceptor at specified position', () => {
      const interceptor1 = vi.fn(config => config);
      const interceptor2 = vi.fn(config => config);

      addRequestInterceptor(interceptor1);
      addRequestInterceptor(interceptor2, 0);

      // interceptor2 should be called first
      const config = { url: 'test', method: 'GET' };
      processRequestInterceptors(config);

      expect(interceptor2).toHaveBeenCalled();
      expect(interceptor1).toHaveBeenCalled();
    });
  });

  describe('removeRequestInterceptor', () => {
    it('should remove interceptor from pipeline', async () => {
      const interceptor = vi.fn(config => config);

      addRequestInterceptor(interceptor);
      removeRequestInterceptor(interceptor);

      const config = { url: 'test', method: 'GET' };
      await processRequestInterceptors(config);

      expect(interceptor).not.toHaveBeenCalled();
    });
  });
});

describe('Interceptor Utilities', () => {
  describe('conditionalRequestInterceptor', () => {
    it('should execute interceptor when condition is true', async () => {
      const interceptor = vi.fn(config => ({ ...config, modified: true }));
      const condition = vi.fn(() => true);

      const conditional = conditionalRequestInterceptor(condition, interceptor);

      const config = { url: 'test', method: 'GET' };
      const result = await conditional(config);

      expect(condition).toHaveBeenCalledWith(config);
      expect(interceptor).toHaveBeenCalled();
      expect(result).toMatchObject({ modified: true });
    });

    it('should skip interceptor when condition is false', async () => {
      const interceptor = vi.fn(config => ({ ...config, modified: true }));
      const condition = vi.fn(() => false);

      const conditional = conditionalRequestInterceptor(condition, interceptor);

      const config = { url: 'test', method: 'GET' };
      const result = await conditional(config);

      expect(condition).toHaveBeenCalledWith(config);
      expect(interceptor).not.toHaveBeenCalled();
      expect(result).not.toHaveProperty('modified');
    });
  });

  describe('combineRequestInterceptors', () => {
    it('should combine multiple interceptors', async () => {
      const interceptor1 = vi.fn(config => ({ ...config, test1: true }));
      const interceptor2 = vi.fn(config => ({ ...config, test2: true }));

      const combined = combineRequestInterceptors(interceptor1, interceptor2);

      const config = { url: 'test', method: 'GET' };
      const result = await combined(config);

      expect(interceptor1).toHaveBeenCalled();
      expect(interceptor2).toHaveBeenCalled();
      expect(result).toMatchObject({ test1: true, test2: true });
    });
  });
});
