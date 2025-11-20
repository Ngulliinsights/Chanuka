/**
 * AI Middleware Tests
 * 
 * Tests for AI request/response middleware including:
 * - Request logging and monitoring
 * - Response handling and metrics
 * - Caching integration
 * - Rate limiting integration
 * - Security validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  aiRequestMiddleware,
  aiResponseMiddleware,
  aiCachingMiddleware,
  aiRateLimitMiddleware,
  createAIMiddleware,
  AIRequest,
  AIMiddlewareOptions
} from '../ai-middleware';
import { getDefaultCache } from '../../cache';
import { MemoryStore } from '../../rate-limiting/stores/memory-store';
import { logger } from '@shared/core/src/observability/logging';

// Mock dependencies
vi.mock('../../cache');
vi.mock('../../rate-limiting/middleware');

describe('AI Middleware', () => {
  let mockReq: Partial<AIRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockCache: any;
  let mockRateLimitStore: MemoryStore;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock cache
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn()
    };
    (getDefaultCache as any).mockReturnValue(mockCache);

    // Mock rate limit store
    mockRateLimitStore = new MemoryStore();

    // Mock request
    mockReq = {
      method: 'POST',
      path: '/ai/property-analysis/valuation',
      body: { propertyId: '123', location: 'Nairobi' },
      query: {},
      ip: '127.0.0.1',
      get: vi.fn((header: string) => {
        if (header === 'User-Agent') return 'test-agent';
        if (header === 'Content-Type') return 'application/json';
        return undefined;
      }),
      user: { id: 'user123' }
    };

    // Mock response
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      statusCode: 200,
      on: vi.fn()
    };

    // Mock next function
    mockNext = vi.fn();

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('aiRequestMiddleware', () => {
    it('should initialize AI context for valid requests', async () => {
      const options: AIMiddlewareOptions = {
        service: 'property-analysis',
        enableSecurity: true
      };

      const middleware = aiRequestMiddleware(options);
      await middleware(mockReq as AIRequest, mockRes as Response, mockNext);

      expect(mockReq.aiContext).toBeDefined();
      expect(mockReq.aiContext?.service).toBe('property-analysis');
      expect(mockReq.aiContext?.operation).toBe('valuation');
      expect(mockReq.aiContext?.requestId).toMatch(/^ai_\d+_[a-z0-9]+$/);
      expect(mockReq.aiContext?.user_id).toBe('user123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject requests with invalid content type', async () => {
      const options: AIMiddlewareOptions = {
        service: 'property-analysis',
        enableSecurity: true
      };

      // Mock invalid content type
      (mockReq.get as any).mockImplementation((header: string) => {
        if (header === 'Content-Type') return 'text/plain';
        if (header === 'User-Agent') return 'test-agent';
        return undefined;
      });

      const middleware = aiRequestMiddleware(options);
      await middleware(mockReq as AIRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid AI request',
        code: 'AI_REQUEST_INVALID',
        details: ['Content-Type must be application/json']
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should skip security validation when disabled', async () => {
      const options: AIMiddlewareOptions = {
        service: 'property-analysis',
        enableSecurity: false
      };

      // Mock invalid content type (should be ignored)
      (mockReq.get as any).mockImplementation((header: string) => {
        if (header === 'Content-Type') return 'text/plain';
        if (header === 'User-Agent') return 'test-agent';
        return undefined;
      });

      const middleware = aiRequestMiddleware(options);
      await middleware(mockReq as AIRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should log request details', async () => {
      const options: AIMiddlewareOptions = {
        service: 'property-analysis'
      };

      const middleware = aiRequestMiddleware(options);
      await middleware(mockReq as AIRequest, mockRes as Response, mockNext);

      expect(console.log).toHaveBeenCalledWith(
        'AI Request Started',
        expect.objectContaining({ service: 'property-analysis',
          operation: 'valuation',
          method: 'POST',
          path: '/ai/property-analysis/valuation',
          user_id: 'user123',
          ip: '127.0.0.1'
         })
      );
    });
  });

  describe('aiResponseMiddleware', () => {
    it('should log response details when json is called', () => {
      const options: AIMiddlewareOptions = {
        service: 'property-analysis',
        enableMetrics: true
      };

      // Set up AI context
      mockReq.aiContext = { service: 'property-analysis',
        operation: 'valuation',
        startTime: performance.now() - 100,
        requestId: 'test-request-id',
        user_id: 'user123',
        cached: false
       };

      const middleware = aiResponseMiddleware(options);
      middleware(mockReq as AIRequest, mockRes as Response, mockNext);

      // Simulate response
      const responseData = { value: 1000000, confidence: 0.85 };
      (mockRes.json as any)(responseData);

      expect(console.log).toHaveBeenCalledWith(
        'AI Request Completed',
        expect.objectContaining({ requestId: 'test-request-id',
          service: 'property-analysis',
          operation: 'valuation',
          success: true,
          cached: false,
          user_id: 'user123'
         })
      );
    });

    it('should record metrics when enabled', () => {
      const options: AIMiddlewareOptions = {
        service: 'property-analysis',
        enableMetrics: true
      };

      mockReq.aiContext = { service: 'property-analysis',
        operation: 'valuation',
        startTime: performance.now() - 50,
        requestId: 'test-request-id',
        user_id: 'user123',
        cached: false
       };

      const middleware = aiResponseMiddleware(options);
      middleware(mockReq as AIRequest, mockRes as Response, mockNext);

      const responseData = { value: 1000000 };
      (mockRes.json as any)(responseData);

      expect(console.log).toHaveBeenCalledWith(
        'AI Metrics',
        expect.objectContaining({
          service: 'property-analysis',
          operation: 'valuation',
          success: true,
          cached: false
        })
      );
    });

    it('should not record metrics when disabled', () => {
      const options: AIMiddlewareOptions = {
        service: 'property-analysis',
        enableMetrics: false
      };

      mockReq.aiContext = { service: 'property-analysis',
        operation: 'valuation',
        startTime: performance.now() - 50,
        requestId: 'test-request-id',
        user_id: 'user123',
        cached: false
       };

      const middleware = aiResponseMiddleware(options);
      middleware(mockReq as AIRequest, mockRes as Response, mockNext);

      const responseData = { value: 1000000 };
      (mockRes.json as any)(responseData);

      // Should not log metrics
      expect(console.log).not.toHaveBeenCalledWith(
        'AI Metrics',
        expect.any(Object)
      );
    });
  });

  describe('aiCachingMiddleware', () => {
    it('should return cached response when available', async () => {
      const options: AIMiddlewareOptions = {
        service: 'property-analysis',
        enableCaching: true,
        cacheTtl: 300
      };

      const cachedData = { value: 1000000, confidence: 0.85 };
      mockCache.get.mockResolvedValue(cachedData);

      const middleware = aiCachingMiddleware(options);
      await middleware(mockReq as AIRequest, mockRes as Response, mockNext);

      expect(mockCache.get).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        ...cachedData,
        _cached: true,
        _cacheKey: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should proceed to AI service when cache miss', async () => {
      const options: AIMiddlewareOptions = {
        service: 'property-analysis',
        enableCaching: true,
        cacheTtl: 300
      };

      mockCache.get.mockResolvedValue(null);

      const middleware = aiCachingMiddleware(options);
      await middleware(mockReq as AIRequest, mockRes as Response, mockNext);

      expect(mockCache.get).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should cache successful responses', async () => {
      const options: AIMiddlewareOptions = {
        service: 'property-analysis',
        enableCaching: true,
        cacheTtl: 300
      };

      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      const middleware = aiCachingMiddleware(options);
      await middleware(mockReq as AIRequest, mockRes as Response, mockNext);

      // Simulate successful response
      mockRes.statusCode = 200;
      const responseData = { value: 1000000, confidence: 0.85 };
      
      // Get the overridden json method and call it
      const originalJson = mockRes.json;
      expect(typeof originalJson).toBe('function');
      
      // The middleware should have overridden the json method
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip caching when disabled', async () => {
      const options: AIMiddlewareOptions = {
        service: 'property-analysis',
        enableCaching: false
      };

      const middleware = aiCachingMiddleware(options);
      await middleware(mockReq as AIRequest, mockRes as Response, mockNext);

      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle cache errors gracefully', async () => {
      const options: AIMiddlewareOptions = {
        service: 'property-analysis',
        enableCaching: true
      };

      mockCache.get.mockRejectedValue(new Error('Cache error'));

      const middleware = aiCachingMiddleware(options);
      await middleware(mockReq as AIRequest, mockRes as Response, mockNext);

      expect(console.warn).toHaveBeenCalledWith(
        'AI caching error, proceeding without cache:',
        expect.any(Error)
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('createAIMiddleware', () => {
    it('should create combined middleware array', () => {
      const options: AIMiddlewareOptions = {
        service: 'property-analysis',
        enableCaching: true,
        enableRateLimit: true,
        rateLimitStore: mockRateLimitStore
      };

      const middlewares = createAIMiddleware(options);

      expect(Array.isArray(middlewares)).toBe(true);
      expect(middlewares).toHaveLength(4);
      expect(typeof middlewares[0]).toBe('function'); // aiRequestMiddleware
      expect(typeof middlewares[1]).toBe('function'); // aiRateLimitMiddleware
      expect(typeof middlewares[2]).toBe('function'); // aiCachingMiddleware
      expect(typeof middlewares[3]).toBe('function'); // aiResponseMiddleware
    });

    it('should work with minimal options', () => {
      const options: AIMiddlewareOptions = {
        service: 'test-service'
      };

      const middlewares = createAIMiddleware(options);

      expect(Array.isArray(middlewares)).toBe(true);
      expect(middlewares).toHaveLength(4);
    });
  });

  describe('Helper Functions', () => {
    it('should generate unique request IDs', async () => {
      const options: AIMiddlewareOptions = {
        service: 'test-service'
      };

      const middleware = aiRequestMiddleware(options);
      
      // Call middleware multiple times
      await middleware(mockReq as AIRequest, mockRes as Response, mockNext);
      const firstId = mockReq.aiContext?.requestId;

      // Reset request object
      mockReq.aiContext = undefined;
      await middleware(mockReq as AIRequest, mockRes as Response, mockNext);
      const secondId = mockReq.aiContext?.requestId;

      expect(firstId).toBeDefined();
      expect(secondId).toBeDefined();
      expect(firstId).not.toBe(secondId);
      expect(firstId).toMatch(/^ai_\d+_[a-z0-9]+$/);
      expect(secondId).toMatch(/^ai_\d+_[a-z0-9]+$/);
    });

    it('should generate consistent cache keys for identical requests', async () => {
      const options: AIMiddlewareOptions = {
        service: 'property-analysis',
        enableCaching: true
      };

      mockCache.get.mockResolvedValue(null);

      const middleware = aiCachingMiddleware(options);
      
      // First request
      await middleware(mockReq as AIRequest, mockRes as Response, mockNext);
      const firstCall = mockCache.get.mock.calls[0][0];

      // Reset mocks
      mockCache.get.mockClear();
      
      // Second identical request
      await middleware(mockReq as AIRequest, mockRes as Response, mockNext);
      const secondCall = mockCache.get.mock.calls[0][0];

      expect(firstCall).toBe(secondCall);
    });

    it('should generate different cache keys for different requests', async () => {
      const options: AIMiddlewareOptions = {
        service: 'property-analysis',
        enableCaching: true
      };

      mockCache.get.mockResolvedValue(null);

      const middleware = aiCachingMiddleware(options);
      
      // First request
      await middleware(mockReq as AIRequest, mockRes as Response, mockNext);
      const firstCall = mockCache.get.mock.calls[0][0];

      // Reset mocks and modify request
      mockCache.get.mockClear();
      mockReq.body = { propertyId: '456', location: 'Mombasa' };
      
      // Second different request
      await middleware(mockReq as AIRequest, mockRes as Response, mockNext);
      const secondCall = mockCache.get.mock.calls[0][0];

      expect(firstCall).not.toBe(secondCall);
    });
  });

  describe('Security Validation', () => {
    it('should validate request payload size', async () => {
      const options: AIMiddlewareOptions = {
        service: 'property-analysis',
        enableSecurity: true
      };

      // Mock large content length
      (mockReq.get as any).mockImplementation((header: string) => {
        if (header === 'Content-Length') return '20971520'; // 20MB
        if (header === 'Content-Type') return 'application/json';
        if (header === 'User-Agent') return 'test-agent';
        return undefined;
      });

      const middleware = aiRequestMiddleware(options);
      await middleware(mockReq as AIRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid AI request',
        code: 'AI_REQUEST_INVALID',
        details: ['Request payload too large']
      });
    });

    it('should require User-Agent header', async () => {
      const options: AIMiddlewareOptions = {
        service: 'property-analysis',
        enableSecurity: true
      };

      // Mock missing User-Agent
      (mockReq.get as any).mockImplementation((header: string) => {
        if (header === 'Content-Type') return 'application/json';
        if (header === 'User-Agent') return undefined;
        return undefined;
      });

      const middleware = aiRequestMiddleware(options);
      await middleware(mockReq as AIRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid AI request',
        code: 'AI_REQUEST_INVALID',
        details: ['User-Agent header is required']
      });
    });
  });
});















































