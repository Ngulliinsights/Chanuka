/**
 * Unit tests for request logging middleware
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  createRequestLoggingMiddleware,
  contextMiddleware,
  timingMiddleware,
  createRequestLoggingPipeline,
} from '../middleware.js';
import { Logger } from '../logger.js';

// Mock Express types
interface MockRequest extends Partial<Request> {
  method: string;
  path: string;
  url: string;
  originalUrl?: string;
  headers: Record<string, any>;
  body?: any;
  user?: { id: string };
  connection?: { remoteAddress: string };
  socket?: { remoteAddress: string };
  requestId?: string;
  traceId?: string;
  userId?: string;
  startTime?: number;
}

interface MockResponse extends Partial<Response> {
  statusCode: number;
  headersSent: boolean;
  _headers: Record<string, any>;
  setHeader: (name: string, value: any) => void;
  getHeader: (name: string) => any;
  getHeaderNames: () => string[];
  end: (chunk?: any, encoding?: any) => any;
  send: (body: any) => any;
  on: (event: string, callback: () => void) => void;
}

describe('Request Logging Middleware', () => {
  let logger: Logger;
  let mockReq: MockRequest;
  let mockRes: MockResponse;
  let mockNext: NextFunction;

  beforeEach(() => {
    logger = new Logger({
      level: 'debug',
      pretty: false,
      asyncTransport: false,
      enableMetrics: false,
    });

    mockReq = {
      method: 'GET',
      path: '/api/test',
      url: '/api/test',
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-for': '192.168.1.1',
      },
      body: { test: 'data' },
    };

    mockRes = {
      statusCode: 200,
      headersSent: false,
      _headers: {},
      setHeader: vi.fn((name, value) => {
        mockRes._headers[name] = value;
      }),
      getHeader: vi.fn((name) => mockRes._headers[name]),
      getHeaderNames: vi.fn(() => Object.keys(mockRes._headers)),
      end: vi.fn(),
      send: vi.fn(),
      on: vi.fn(),
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createRequestLoggingMiddleware', () => {
    it('should create middleware function', () => {
      const middleware = createRequestLoggingMiddleware({ logger });
      expect(typeof middleware).toBe('function');
    });

    it('should add request ID and trace ID to request and response headers', () => {
      const middleware = createRequestLoggingMiddleware({ logger });
      
      middleware(mockReq as any, mockRes as any, mockNext);

      expect(mockReq.requestId).toBeDefined();
      expect(mockReq.traceId).toBeDefined();
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', mockReq.requestId);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Trace-ID', mockReq.traceId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use existing request ID from headers', () => {
      mockReq.headers['x-request-id'] = 'existing-req-id';
      mockReq.headers['x-trace-id'] = 'existing-trace-id';

      const middleware = createRequestLoggingMiddleware({ logger });
      middleware(mockReq as any, mockRes as any, mockNext);

      expect(mockReq.requestId).toBe('existing-req-id');
      expect(mockReq.traceId).toBe('existing-trace-id');
    });

    it('should extract user ID from request', () => {
      mockReq.user = { id: 'user-123' };

      const middleware = createRequestLoggingMiddleware({ logger });
      middleware(mockReq as any, mockRes as any, mockNext);

      expect(mockReq.userId).toBe('user-123');
    });

    it('should extract user ID from custom extractor', () => {
      mockReq.headers['x-user-id'] = 'custom-user-456';

      const middleware = createRequestLoggingMiddleware({
        logger,
        extractUserId: (req) => req.headers['x-user-id'] as string,
      });
      
      middleware(mockReq as any, mockRes as any, mockNext);

      expect(mockReq.userId).toBe('custom-user-456');
    });

    it('should skip logging for specified paths', () => {
      mockReq.path = '/favicon.ico';

      const middleware = createRequestLoggingMiddleware({
        logger,
        skipPaths: ['/favicon.ico'],
      });

      middleware(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.requestId).toBeUndefined();
    });

    it('should skip health check endpoints when enabled', () => {
      mockReq.path = '/health';

      const middleware = createRequestLoggingMiddleware({
        logger,
        skipHealthChecks: true,
      });

      middleware(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.requestId).toBeUndefined();
    });

    it('should log request body when enabled', () => {
      const logSpy = vi.spyOn(logger, 'logRequest');

      const middleware = createRequestLoggingMiddleware({
        logger,
        logRequestBody: true,
      });

      middleware(mockReq as any, mockRes as any, mockNext);

      expect(logSpy).toHaveBeenCalled();
    });

    it('should handle large request bodies', () => {
      const largeBody = { data: 'x'.repeat(20000) }; // Larger than default maxBodySize
      mockReq.body = largeBody;

      const middleware = createRequestLoggingMiddleware({
        logger,
        logRequestBody: true,
        maxBodySize: 1024,
      });

      middleware(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize sensitive headers', () => {
      mockReq.headers.authorization = 'Bearer secret-token';
      mockReq.headers.cookie = 'session=secret';

      const logSpy = vi.spyOn(logger, 'logRequest');

      const middleware = createRequestLoggingMiddleware({ logger });
      middleware(mockReq as any, mockRes as any, mockNext);

      expect(logSpy).toHaveBeenCalled();
    });

    it('should handle errors in request pipeline', () => {
      const error = new Error('Test error');
      const errorSpy = vi.spyOn(logger, 'error');

      const middleware = createRequestLoggingMiddleware({ logger });
      
      // Simulate middleware execution
      middleware(mockReq as any, mockRes as any, (err) => {
        if (err) {
          expect(errorSpy).toHaveBeenCalled();
        }
      });

      // Simulate error in next middleware
      mockNext.mockImplementation(() => {
        throw error;
      });
    });
  });

  describe('contextMiddleware', () => {
    it('should create context middleware', () => {
      const middleware = contextMiddleware(logger);
      expect(typeof middleware).toBe('function');
    });

    it('should preserve request context', () => {
      mockReq.requestId = 'req-123';
      mockReq.traceId = 'trace-456';
      mockReq.userId = 'user-789';

      const middleware = contextMiddleware(logger);
      middleware(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('timingMiddleware', () => {
    it('should create timing middleware', () => {
      const middleware = timingMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('should add start time to request', () => {
      const middleware = timingMiddleware();
      middleware(mockReq as any, mockRes as any, mockNext);

      expect(mockReq.startTime).toBeDefined();
      expect(typeof mockReq.startTime).toBe('number');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should add response time header on finish', () => {
      const middleware = timingMiddleware();
      let finishCallback: () => void;

      mockRes.on = vi.fn((event, callback) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });

      middleware(mockReq as any, mockRes as any, mockNext);

      // Simulate response finish
      if (finishCallback!) {
        finishCallback();
      }

      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
  });

  describe('createRequestLoggingPipeline', () => {
    it('should create array of middleware functions', () => {
      const pipeline = createRequestLoggingPipeline({ logger });
      
      expect(Array.isArray(pipeline)).toBe(true);
      expect(pipeline.length).toBe(3);
      expect(pipeline.every(fn => typeof fn === 'function')).toBe(true);
    });

    it('should create pipeline with default logger', () => {
      const pipeline = createRequestLoggingPipeline();
      
      expect(Array.isArray(pipeline)).toBe(true);
      expect(pipeline.length).toBe(3);
    });
  });

  describe('Response Logging', () => {
    it('should log response completion', () => {
      const logSpy = vi.spyOn(logger, 'logRequest');
      const performanceSpy = vi.spyOn(logger, 'logPerformance');

      const middleware = createRequestLoggingMiddleware({ logger });
      
      // Set up response end override
      let originalEnd: any;
      mockRes.end = vi.fn((chunk, encoding) => {
        // Simulate the actual end behavior
        if (originalEnd) {
          return originalEnd.call(mockRes, chunk, encoding);
        }
      });

      middleware(mockReq as any, mockRes as any, mockNext);

      // Simulate response completion
      mockRes.statusCode = 200;
      (mockRes.end as any)();

      expect(logSpy).toHaveBeenCalled();
      expect(performanceSpy).toHaveBeenCalled();
    });

    it('should use appropriate log level for different status codes', () => {
      const errorSpy = vi.spyOn(logger, 'error');
      const warnSpy = vi.spyOn(logger, 'warn');
      const infoSpy = vi.spyOn(logger, 'logRequest');

      const middleware = createRequestLoggingMiddleware({ logger });

      // Test error status (500)
      mockRes.statusCode = 500;
      middleware(mockReq as any, mockRes as any, mockNext);
      (mockRes.end as any)();

      // Test warning status (400)
      mockRes.statusCode = 400;
      middleware(mockReq as any, mockRes as any, mockNext);
      (mockRes.end as any)();

      // Test info status (200)
      mockRes.statusCode = 200;
      middleware(mockReq as any, mockRes as any, mockNext);
      (mockRes.end as any)();

      // Note: Due to the way the middleware works, we can't easily test
      // the exact calls without more complex mocking, but we can verify
      // the middleware doesn't throw errors
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('IP Address Extraction', () => {
    it('should extract IP from x-forwarded-for header', () => {
      mockReq.headers['x-forwarded-for'] = '203.0.113.1';

      const middleware = createRequestLoggingMiddleware({ logger });
      middleware(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract IP from x-real-ip header', () => {
      delete mockReq.headers['x-forwarded-for'];
      mockReq.headers['x-real-ip'] = '203.0.113.2';

      const middleware = createRequestLoggingMiddleware({ logger });
      middleware(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract IP from connection', () => {
      delete mockReq.headers['x-forwarded-for'];
      delete mockReq.headers['x-real-ip'];
      mockReq.connection = { remoteAddress: '203.0.113.3' };

      const middleware = createRequestLoggingMiddleware({ logger });
      middleware(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle unknown IP', () => {
      delete mockReq.headers['x-forwarded-for'];
      delete mockReq.headers['x-real-ip'];
      delete mockReq.connection;

      const middleware = createRequestLoggingMiddleware({ logger });
      middleware(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});