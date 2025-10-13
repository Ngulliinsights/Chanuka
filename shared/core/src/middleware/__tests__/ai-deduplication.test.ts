/**
 * AI Deduplication Middleware Tests
 * 
 * Tests for AI request deduplication including:
 * - Single-flight pattern implementation
 * - Cache-based deduplication
 * - Concurrent request handling
 * - Metrics and monitoring
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  AIDeduplicationMiddleware,
  createAIDeduplicationMiddleware,
  createServiceDeduplicationMiddleware,
  getDefaultDeduplicationMiddleware,
  DeduplicationOptions
} from '../ai-deduplication';
import { getDefaultCache } from '../../cache';
import { logger } from '../utils/logger';

// Mock dependencies
vi.mock('../../cache');

describe('AI Deduplication Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockCache: any;
  let deduplicationMiddleware: AIDeduplicationMiddleware;

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

    // Mock request
    mockReq = {
      method: 'POST',
      path: '/ai/property-analysis/valuation',
      body: { propertyId: '123', location: 'Nairobi' },
      query: {},
      ip: '127.0.0.1',
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

    // Create deduplication middleware instance
    deduplicationMiddleware = new AIDeduplicationMiddleware({
      enabled: true,
      ttl: 300,
      enableMetrics: true
    });

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    deduplicationMiddleware.clearPendingRequests();
  });

  describe('AIDeduplicationMiddleware', () => {
    it('should return cached result when available', async () => {
      const cachedResult = { value: 1000000, confidence: 0.85 };
      mockCache.get.mockResolvedValue(cachedResult);

      const middleware = deduplicationMiddleware.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCache.get).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        ...cachedResult,
        _deduplicated: true,
        _source: 'cache'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should proceed with new request when no cache hit', async () => {
      mockCache.get.mockResolvedValue(null);

      const middleware = deduplicationMiddleware.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCache.get).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should handle concurrent identical requests', async () => {
      mockCache.get.mockResolvedValue(null);
      
      const middleware = deduplicationMiddleware.middleware();
      
      // Create multiple identical requests
      const requests = Array.from({ length: 3 }, () => ({
        req: { ...mockReq },
        res: { 
          ...mockRes,
          json: vi.fn().mockReturnThis(),
          on: vi.fn()
        },
        next: vi.fn()
      }));

      // Start all requests simultaneously
      const promises = requests.map(({ req, res, next }) =>
        middleware(req as Request, res as Response, next)
      );

      // Only the first request should call next
      await Promise.all(promises);
      
      const nextCallCount = requests.reduce((count, { next }) => 
        count + (next as any).mock.calls.length, 0
      );
      
      expect(nextCallCount).toBe(1);
    });

    it('should generate consistent keys for identical requests', () => {
      const middleware = deduplicationMiddleware.middleware();
      
      // Use the private method through reflection for testing
      const keyGenerator = (deduplicationMiddleware as any).defaultKeyGenerator;
      
      const key1 = keyGenerator(mockReq);
      const key2 = keyGenerator(mockReq);
      
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different requests', () => {
      const middleware = deduplicationMiddleware.middleware();
      
      const keyGenerator = (deduplicationMiddleware as any).defaultKeyGenerator;
      
      const key1 = keyGenerator(mockReq);
      
      // Modify request
      const modifiedReq = {
        ...mockReq,
        body: { propertyId: '456', location: 'Mombasa' }
      };
      
      const key2 = keyGenerator(modifiedReq);
      
      expect(key1).not.toBe(key2);
    });

    it('should skip deduplication when disabled', async () => {
      const disabledMiddleware = new AIDeduplicationMiddleware({
        enabled: false
      });

      const middleware = disabledMiddleware.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip deduplication based on skip condition', async () => {
      const conditionalMiddleware = new AIDeduplicationMiddleware({
        enabled: true,
        skipCondition: (req) => req.method === 'POST'
      });

      const middleware = conditionalMiddleware.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should record metrics when enabled', async () => {
      const cachedResult = { value: 1000000 };
      mockCache.get.mockResolvedValue(cachedResult);

      const middleware = deduplicationMiddleware.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(console.log).toHaveBeenCalledWith(
        'AI Deduplication Metrics',
        expect.objectContaining({
          type: 'cache_hit',
          timestamp: expect.any(String)
        })
      );
    });

    it('should handle cache errors gracefully', async () => {
      mockCache.get.mockRejectedValue(new Error('Cache error'));

      const middleware = deduplicationMiddleware.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(console.error).toHaveBeenCalledWith(
        'Deduplication error:',
        expect.any(Error)
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Factory Functions', () => {
    it('should create deduplication middleware with custom options', () => {
      const options: DeduplicationOptions = {
        enabled: true,
        ttl: 600,
        enableMetrics: false
      };

      const middleware = createAIDeduplicationMiddleware(options);
      
      expect(typeof middleware).toBe('function');
    });

    it('should create service-specific deduplication middleware', () => {
      const middleware = createServiceDeduplicationMiddleware('property-analysis', {
        ttl: 300,
        enableMetrics: true
      });
      
      expect(typeof middleware).toBe('function');
    });

    it('should provide default deduplication middleware', () => {
      const middleware1 = getDefaultDeduplicationMiddleware();
      const middleware2 = getDefaultDeduplicationMiddleware();
      
      expect(middleware1).toBe(middleware2); // Should be singleton
      expect(middleware1).toBeInstanceOf(AIDeduplicationMiddleware);
    });
  });

  describe('Statistics and Health Check', () => {
    it('should provide deduplication statistics', () => {
      const stats = deduplicationMiddleware.getStats();
      
      expect(stats).toHaveProperty('pendingRequests');
      expect(stats).toHaveProperty('pendingKeys');
      expect(typeof stats.pendingRequests).toBe('number');
      expect(Array.isArray(stats.pendingKeys)).toBe(true);
    });

    it('should clear pending requests', () => {
      deduplicationMiddleware.clearPendingRequests();
      
      const stats = deduplicationMiddleware.getStats();
      expect(stats.pendingRequests).toBe(0);
      expect(stats.pendingKeys).toHaveLength(0);
    });

    it('should perform health check', async () => {
      mockCache.set.mockResolvedValue(undefined);
      mockCache.get.mockResolvedValue('test');
      mockCache.del.mockResolvedValue(undefined);

      const health = await deduplicationMiddleware.healthCheck();
      
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('pendingRequests');
      expect(health).toHaveProperty('cacheHealthy');
      expect(typeof health.healthy).toBe('boolean');
    });

    it('should report unhealthy when cache fails', async () => {
      mockCache.set.mockRejectedValue(new Error('Cache error'));

      const health = await deduplicationMiddleware.healthCheck();
      
      expect(health.healthy).toBe(false);
      expect(health.cacheHealthy).toBe(false);
    });
  });

  describe('Custom Key Generator', () => {
    it('should use custom key generator when provided', async () => {
      const customKeyGenerator = vi.fn().mockReturnValue('custom-key');
      
      const customMiddleware = new AIDeduplicationMiddleware({
        keyGenerator: customKeyGenerator
      });

      mockCache.get.mockResolvedValue(null);

      const middleware = customMiddleware.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(customKeyGenerator).toHaveBeenCalledWith(mockReq);
      expect(mockCache.get).toHaveBeenCalledWith('custom-key');
    });
  });

  describe('Custom Duplicate Handler', () => {
    it('should use custom duplicate handler when provided', async () => {
      const customOnDuplicate = vi.fn();
      const cachedResult = { value: 1000000 };
      
      const customMiddleware = new AIDeduplicationMiddleware({
        onDuplicate: customOnDuplicate
      });

      mockCache.get.mockResolvedValue(cachedResult);

      const middleware = customMiddleware.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(customOnDuplicate).toHaveBeenCalledWith(
        mockReq,
        mockRes,
        cachedResult
      );
    });
  });

  describe('Request ID Generation', () => {
    it('should generate unique request IDs', () => {
      const generateRequestId = (deduplicationMiddleware as any).generateRequestId;
      
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });

  describe('Hash Function', () => {
    it('should generate consistent hashes for identical strings', () => {
      const hashString = (deduplicationMiddleware as any).hashString;
      
      const hash1 = hashString('test-string');
      const hash2 = hashString('test-string');
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different strings', () => {
      const hashString = (deduplicationMiddleware as any).hashString;
      
      const hash1 = hashString('test-string-1');
      const hash2 = hashString('test-string-2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Error Handling', () => {
    it('should handle response errors gracefully', async () => {
      mockCache.get.mockResolvedValue(null);
      
      const middleware = deduplicationMiddleware.middleware();
      
      // Mock response error
      const errorHandler = vi.fn();
      mockRes.on = vi.fn((event, handler) => {
        if (event === 'error') {
          errorHandler.mockImplementation(handler);
        }
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      // Simulate response error
      const error = new Error('Response error');
      errorHandler(error);
      
      // Should not throw
      expect(mockNext).toHaveBeenCalled();
    });

    it('should clean up pending requests on response finish', async () => {
      mockCache.get.mockResolvedValue(null);
      
      const middleware = deduplicationMiddleware.middleware();
      
      let finishHandler: Function;
      mockRes.on = vi.fn((event, handler) => {
        if (event === 'finish') {
          finishHandler = handler;
        }
      });

      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      // Simulate response finish
      if (finishHandler!) {
        finishHandler();
      }
      
      // Should clean up after timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(mockNext).toHaveBeenCalled();
    });
  });
});






