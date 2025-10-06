/**
 * AI Rate Limiter Tests
 * 
 * Tests for AI-specific rate limiting including:
 * - Service-specific limits
 * - Operation-specific limits
 * - User tier multipliers
 * - Cost-aware rate limiting
 * - Multiple limit checking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AIRateLimiter,
  createAIRateLimiter,
  getDefaultAIRateLimiter,
  setDefaultAIRateLimiter,
  AIRateLimitConfig
} from '../ai-rate-limiter';
import { RateLimitStore, RateLimitResult } from '../types';
import { MemoryStore } from '../stores/memory-store';

describe('AI Rate Limiter', () => {
  let mockStore: RateLimitStore;
  let aiRateLimiter: AIRateLimiter;

  beforeEach(() => {
    // Mock rate limit store
    mockStore = {
      check: vi.fn(),
      reset: vi.fn(),
      healthCheck: vi.fn()
    };

    // Create AI rate limiter
    aiRateLimiter = new AIRateLimiter({
      store: mockStore,
      defaultConfig: {
        service: 'test',
        limit: 100,
        windowMs: 60000,
        algorithm: 'sliding-window'
      }
    });

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rate Limiting', () => {
    it('should check rate limit for AI operation', async () => {
      const mockResult: RateLimitResult = {
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalHits: 1,
        windowStart: Date.now(),
        algorithm: 'sliding-window'
      };

      mockStore.check = vi.fn().mockResolvedValue(mockResult);

      const result = await aiRateLimiter.checkLimit(
        'user123',
        'property-analysis',
        'valuation'
      );

      expect(result).toEqual(mockResult);
      expect(mockStore.check).toHaveBeenCalledWith(
        expect.stringContaining('ai:rate_limit:property-analysis:valuation:user123'),
        expect.objectContaining({
          service: 'property-analysis',
          operation: 'valuation'
        })
      );
    });

    it('should handle rate limit exceeded', async () => {
      const mockResult: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30000,
        totalHits: 100,
        windowStart: Date.now() - 30000,
        algorithm: 'sliding-window'
      };

      mockStore.check = vi.fn().mockResolvedValue(mockResult);

      const result = await aiRateLimiter.checkLimit(
        'user123',
        'property-analysis',
        'valuation'
      );

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should fail open on store errors', async () => {
      mockStore.check = vi.fn().mockRejectedValue(new Error('Store error'));

      const result = await aiRateLimiter.checkLimit(
        'user123',
        'property-analysis',
        'valuation'
      );

      expect(result.allowed).toBe(true);
      expect(console.error).toHaveBeenCalledWith(
        'AI rate limit check failed:',
        expect.any(Error)
      );
    });
  });

  describe('Service-Specific Configuration', () => {
    it('should apply service-specific limits', async () => {
      const rateLimiter = new AIRateLimiter({
        store: mockStore,
        serviceConfigs: {
          'property-analysis': {
            limit: 30,
            windowMs: 60000,
            costMultiplier: 2
          }
        }
      });

      mockStore.check = vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 29,
        resetTime: Date.now() + 60000,
        totalHits: 1,
        windowStart: Date.now(),
        algorithm: 'sliding-window'
      });

      await rateLimiter.checkLimit('user123', 'property-analysis');

      expect(mockStore.check).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: 30,
          windowMs: 60000,
          costMultiplier: 2
        })
      );
    });

    it('should use default config for unknown services', async () => {
      mockStore.check = vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalHits: 1,
        windowStart: Date.now(),
        algorithm: 'sliding-window'
      });

      await aiRateLimiter.checkLimit('user123', 'unknown-service');

      expect(mockStore.check).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: 100 // Default limit
        })
      );
    });
  });

  describe('Operation-Specific Configuration', () => {
    it('should apply operation-specific limits', async () => {
      const rateLimiter = new AIRateLimiter({
        store: mockStore,
        operationConfigs: {
          'property-analysis': {
            'valuation': {
              limit: 10,
              costMultiplier: 5
            }
          }
        }
      });

      mockStore.check = vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetTime: Date.now() + 60000,
        totalHits: 1,
        windowStart: Date.now(),
        algorithm: 'sliding-window'
      });

      await rateLimiter.checkLimit('user123', 'property-analysis', 'valuation');

      expect(mockStore.check).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: 10,
          costMultiplier: 5
        })
      );
    });

    it('should fall back to service config for unknown operations', async () => {
      const rateLimiter = new AIRateLimiter({
        store: mockStore,
        serviceConfigs: {
          'property-analysis': {
            limit: 30
          }
        }
      });

      mockStore.check = vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 29,
        resetTime: Date.now() + 60000,
        totalHits: 1,
        windowStart: Date.now(),
        algorithm: 'sliding-window'
      });

      await rateLimiter.checkLimit('user123', 'property-analysis', 'unknown-operation');

      expect(mockStore.check).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: 30 // Service limit, not operation-specific
        })
      );
    });
  });

  describe('User Tier Multipliers', () => {
    it('should apply user tier multipliers', async () => {
      mockStore.check = vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 199,
        resetTime: Date.now() + 60000,
        totalHits: 1,
        windowStart: Date.now(),
        algorithm: 'sliding-window'
      });

      // Premium user should get 2x limit
      await aiRateLimiter.checkLimit('user123', 'property-analysis', undefined, 'premium');

      expect(mockStore.check).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: 200 // 100 * 2 (premium multiplier)
        })
      );
    });

    it('should apply free tier restrictions', async () => {
      mockStore.check = vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 49,
        resetTime: Date.now() + 60000,
        totalHits: 1,
        windowStart: Date.now(),
        algorithm: 'sliding-window'
      });

      // Free user should get 0.5x limit
      await aiRateLimiter.checkLimit('user123', 'property-analysis', undefined, 'free');

      expect(mockStore.check).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: 50 // 100 * 0.5 (free multiplier)
        })
      );
    });

    it('should handle unknown user tiers', async () => {
      mockStore.check = vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalHits: 1,
        windowStart: Date.now(),
        algorithm: 'sliding-window'
      });

      await aiRateLimiter.checkLimit('user123', 'property-analysis', undefined, 'unknown-tier');

      expect(mockStore.check).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: 100 // Default limit (no multiplier applied)
        })
      );
    });
  });

  describe('Cost-Aware Rate Limiting', () => {
    it('should reduce limits for high-cost operations', async () => {
      mockStore.check = vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetTime: Date.now() + 60000,
        totalHits: 1,
        windowStart: Date.now(),
        algorithm: 'sliding-window'
      });

      // High cost should reduce the effective limit
      await aiRateLimiter.checkLimit('user123', 'property-analysis', 'valuation', undefined, 10);

      expect(mockStore.check).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: expect.any(Number)
        })
      );

      const call = mockStore.check.mock.calls[0];
      const config = call[1] as AIRateLimitConfig;
      expect(config.limit).toBeLessThan(100); // Should be reduced due to cost
    });

    it('should ensure minimum limit of 1', async () => {
      mockStore.check = vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 0,
        resetTime: Date.now() + 60000,
        totalHits: 1,
        windowStart: Date.now(),
        algorithm: 'sliding-window'
      });

      // Very high cost should still allow at least 1 request
      await aiRateLimiter.checkLimit('user123', 'property-analysis', 'valuation', undefined, 1000);

      const call = mockStore.check.mock.calls[0];
      const config = call[1] as AIRateLimitConfig;
      expect(config.limit).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Multiple Limit Checking', () => {
    it('should check multiple limits and allow when all pass', async () => {
      mockStore.check = vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 50,
        resetTime: Date.now() + 60000,
        totalHits: 1,
        windowStart: Date.now(),
        algorithm: 'sliding-window'
      });

      const checks = [
        { key: 'user123', service: 'property-analysis', operation: 'valuation' },
        { key: '127.0.0.1', service: 'property-analysis', operation: 'valuation' }
      ];

      const result = await aiRateLimiter.checkMultipleLimit(checks);

      expect(result.allowed).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.limitingResult).toBeUndefined();
      expect(mockStore.check).toHaveBeenCalledTimes(2);
    });

    it('should block when any limit is exceeded', async () => {
      const allowedResult: RateLimitResult = {
        allowed: true,
        remaining: 50,
        resetTime: Date.now() + 60000,
        totalHits: 1,
        windowStart: Date.now(),
        algorithm: 'sliding-window'
      };

      const blockedResult: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30000,
        totalHits: 100,
        windowStart: Date.now() - 30000,
        algorithm: 'sliding-window'
      };

      mockStore.check = vi.fn()
        .mockResolvedValueOnce(allowedResult)
        .mockResolvedValueOnce(blockedResult);

      const checks = [
        { key: 'user123', service: 'property-analysis', operation: 'valuation' },
        { key: '127.0.0.1', service: 'property-analysis', operation: 'valuation' }
      ];

      const result = await aiRateLimiter.checkMultipleLimit(checks);

      expect(result.allowed).toBe(false);
      expect(result.results).toHaveLength(2);
      expect(result.limitingResult).toEqual(blockedResult);
    });
  });

  describe('Default Service Configurations', () => {
    it('should have predefined HuggingFace configuration', async () => {
      mockStore.check = vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 59,
        resetTime: Date.now() + 60000,
        totalHits: 1,
        windowStart: Date.now(),
        algorithm: 'sliding-window'
      });

      await aiRateLimiter.checkLimit('user123', 'huggingface');

      expect(mockStore.check).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: 60, // HuggingFace specific limit
          algorithm: 'sliding-window',
          costMultiplier: 1.5
        })
      );
    });

    it('should have predefined property analysis configuration', async () => {
      mockStore.check = vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 29,
        resetTime: Date.now() + 60000,
        totalHits: 1,
        windowStart: Date.now(),
        algorithm: 'token-bucket'
      });

      await aiRateLimiter.checkLimit('user123', 'property-analysis');

      expect(mockStore.check).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: 30, // Property analysis specific limit
          algorithm: 'token-bucket',
          costMultiplier: 2
        })
      );
    });

    it('should have operation-specific limits for property analysis', async () => {
      mockStore.check = vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetTime: Date.now() + 60000,
        totalHits: 1,
        windowStart: Date.now(),
        algorithm: 'token-bucket'
      });

      await aiRateLimiter.checkLimit('user123', 'property-analysis', 'valuation');

      expect(mockStore.check).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: 10, // Valuation specific limit
          costMultiplier: 5 // Valuations are expensive
        })
      );
    });
  });

  describe('Status and Debugging', () => {
    it('should get current rate limit status', async () => {
      const mockResult: RateLimitResult = {
        allowed: true,
        remaining: 50,
        resetTime: Date.now() + 60000,
        totalHits: 50,
        windowStart: Date.now() - 30000,
        algorithm: 'sliding-window'
      };

      mockStore.check = vi.fn().mockResolvedValue(mockResult);

      const status = await aiRateLimiter.getStatus('user123', 'property-analysis', 'valuation');

      expect(status.config).toBeDefined();
      expect(status.current).toEqual(mockResult);
      expect(status.config.service).toBe('property-analysis');
      expect(status.config.operation).toBe('valuation');
    });

    it('should handle status check errors', async () => {
      mockStore.check = vi.fn().mockRejectedValue(new Error('Status error'));

      const status = await aiRateLimiter.getStatus('user123', 'property-analysis');

      expect(status.config).toBeDefined();
      expect(status.current).toBeUndefined();
    });

    it('should reset rate limits', async () => {
      await aiRateLimiter.resetLimit('user123', 'property-analysis', 'valuation');

      expect(console.log).toHaveBeenCalledWith(
        'Rate limit reset requested',
        expect.objectContaining({
          service: 'property-analysis',
          operation: 'valuation'
        })
      );
    });
  });

  describe('Health Check', () => {
    it('should perform health check', async () => {
      mockStore.healthCheck = vi.fn().mockResolvedValue(true);

      const health = await aiRateLimiter.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.store).toBe(true);
      expect(typeof health.latency).toBe('number');
    });

    it('should handle health check failures', async () => {
      mockStore.healthCheck = vi.fn().mockRejectedValue(new Error('Health check failed'));

      const health = await aiRateLimiter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.store).toBe(false);
      expect(typeof health.latency).toBe('number');
    });

    it('should work without store health check method', async () => {
      delete (mockStore as any).healthCheck;

      const health = await aiRateLimiter.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.store).toBe(true);
    });
  });

  describe('Factory Functions', () => {
    it('should create AI rate limiter with Redis', () => {
      const mockRedis = { ping: vi.fn() };
      
      const rateLimiter = createAIRateLimiter({
        redis: mockRedis,
        serviceConfigs: {
          'test-service': { limit: 50 }
        }
      });

      expect(rateLimiter).toBeInstanceOf(AIRateLimiter);
    });

    it('should create AI rate limiter with memory store', () => {
      const rateLimiter = createAIRateLimiter();

      expect(rateLimiter).toBeInstanceOf(AIRateLimiter);
    });

    it('should provide default AI rate limiter singleton', () => {
      const limiter1 = getDefaultAIRateLimiter();
      const limiter2 = getDefaultAIRateLimiter();

      expect(limiter1).toBe(limiter2);
      expect(limiter1).toBeInstanceOf(AIRateLimiter);
    });

    it('should allow setting default AI rate limiter', () => {
      const customLimiter = createAIRateLimiter();
      setDefaultAIRateLimiter(customLimiter);

      const defaultLimiter = getDefaultAIRateLimiter();
      expect(defaultLimiter).toBe(customLimiter);
    });
  });

  describe('Metrics', () => {
    it('should get rate limiting metrics', async () => {
      const metrics = await aiRateLimiter.getMetrics();

      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('blockedRequests');
      expect(metrics).toHaveProperty('serviceBreakdown');
      expect(typeof metrics.totalRequests).toBe('number');
      expect(typeof metrics.blockedRequests).toBe('number');
      expect(typeof metrics.serviceBreakdown).toBe('object');
    });
  });

  describe('Configuration Merging', () => {
    it('should merge service and operation configs correctly', async () => {
      const rateLimiter = new AIRateLimiter({
        store: mockStore,
        serviceConfigs: {
          'property-analysis': {
            limit: 30,
            windowMs: 60000,
            burstAllowance: 5
          }
        },
        operationConfigs: {
          'property-analysis': {
            'valuation': {
              limit: 10, // Should override service limit
              costMultiplier: 5 // Should add to service config
            }
          }
        }
      });

      mockStore.check = vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 9,
        resetTime: Date.now() + 60000,
        totalHits: 1,
        windowStart: Date.now(),
        algorithm: 'sliding-window'
      });

      await rateLimiter.checkLimit('user123', 'property-analysis', 'valuation');

      expect(mockStore.check).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: 10, // Operation-specific limit
          windowMs: 60000, // From service config
          burstAllowance: 5, // From service config
          costMultiplier: 5 // From operation config
        })
      );
    });
  });
});