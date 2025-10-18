// core/src/rate-limiting/__tests__/integration/rate-limiting.integration.test.ts

import request from 'supertest';
import express from 'express';
import Redis from 'ioredis-mock'; // Mock Redis for testing
import { RateLimitFactory } from '../../factory/RateLimitFactory';
import { rateLimitMiddleware } from '../../middleware/rateLimitMiddleware';
import { RateLimitConfig } from '../../types/RateLimit';
import { logger } from '../src/observability/logging';

/**
 * Integration Test Philosophy:
 * 
 * These tests verify that the entire rate limiting system works correctly
 * when all components are integrated together. Unlike unit tests that test
 * individual pieces in isolation, integration tests ensure that:
 * 
 * 1. Middleware correctly calls the store
 * 2. Store algorithms behave as expected under load
 * 3. Error handling works across component boundaries
 * 4. Headers are set correctly
 * 5. Metrics are captured accurately
 * 
 * Think of this as testing the entire "conversation" between components
 * rather than testing each component's individual vocabulary.
 */

describe('Rate Limiting Integration Tests', () => {
  let app: express.Application;
  let redis: Redis;
  let factory: RateLimitFactory;

  // Helper function to create a test app with rate limiting
  const createTestApp = (config: RateLimitConfig, customKeyGen?: (req: express.Request) => string) => {
    const testApp = express();
    const store = factory.createStore(config.algorithm);
    
    // Apply rate limiting middleware
    testApp.use(rateLimitMiddleware({
      store,
      config,
      keyGenerator: customKeyGen,
      standardHeaders: true,
      legacyHeaders: true
    }));

    // Simple test endpoint that echoes back request info
    testApp.get('/test', (req, res) => {
      res.json({ 
        message: 'success',
        ip: req.ip,
        timestamp: Date.now()
      });
    });

    // Endpoint that simulates different response codes
    testApp.get('/test/:status', (req, res) => {
      const status = parseInt(req.params.status);
      res.status(status).json({ 
        message: `Response with status ${status}`,
        timestamp: Date.now()
      });
    });

    return testApp;
  };

  beforeEach(() => {
    // Create a fresh Redis mock and factory for each test
    // This ensures test isolation - each test starts with a clean slate
    redis = new Redis();
    factory = new RateLimitFactory({ redis, defaultToMemory: false });
  });

  afterEach(async () => {
    // Clean up Redis connections to prevent memory leaks
    if (redis) {
      redis.disconnect();
    }
  });

  /**
   * BASIC FUNCTIONALITY TESTS
   * 
   * These tests verify that the core rate limiting behavior works correctly.
   * We start with simple scenarios before moving to edge cases.
   */
  describe('Basic Rate Limiting Behavior', () => {
    it('should allow requests within the limit', async () => {
      // Test the happy path: requests should go through when under the limit
      const config: RateLimitConfig = {
        limit: 3,
        windowMs: 60000, // 1 minute window
        algorithm: 'fixed-window'
      };

      app = createTestApp(config);

      // Make requests within the limit
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .get('/test')
          .expect(200);

        // Verify that rate limiting headers are present and accurate
        expect(response.headers['ratelimit-limit']).toBe('3');
        expect(response.headers['x-ratelimit-limit']).toBe('3');
        expect(parseInt(response.headers['ratelimit-remaining'])).toBe(2 - i);
      }
    });

    it('should block requests that exceed the limit', async () => {
      const config: RateLimitConfig = {
        limit: 2,
        windowMs: 60000,
        algorithm: 'fixed-window'
      };

      app = createTestApp(config);

      // First two requests should succeed
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);

      // Third request should be blocked
      const blockedResponse = await request(app)
        .get('/test')
        .expect(429);

      // Verify the error response format
      expect(blockedResponse.body).toMatchObject({
        error: 'Too Many Requests',
        message: expect.stringContaining('Rate limit exceeded')
      });

      // Verify that Retry-After header is present
      expect(blockedResponse.headers['retry-after']).toBeDefined();
    });

    it('should reset the window correctly for fixed-window algorithm', async () => {
      const config: RateLimitConfig = {
        limit: 2,
        windowMs: 100, // Very short window for testing
        algorithm: 'fixed-window'
      };

      app = createTestApp(config);

      // Use up the limit
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(429);

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be able to make requests again
      await request(app).get('/test').expect(200);
    });
  });

  /**
   * ALGORITHM-SPECIFIC INTEGRATION TESTS
   * 
   * Each algorithm has different behavior patterns. These tests ensure
   * that the integration correctly implements each algorithm's logic.
   */
  describe('Sliding Window Algorithm Integration', () => {
    it('should provide smooth rate limiting across time', async () => {
      const config: RateLimitConfig = {
        limit: 3,
        windowMs: 1000, // 1 second window
        algorithm: 'sliding-window'
      };

      app = createTestApp(config);

      // Make requests at the start of the window
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);

      // Wait half the window duration
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should still be able to make one more request
      await request(app).get('/test').expect(200);

      // This should be blocked (4th request in sliding window)
      await request(app).get('/test').expect(429);

      // Wait for the first requests to slide out of the window
      await new Promise(resolve => setTimeout(resolve, 600));

      // Should be able to make requests again as old ones slide out
      await request(app).get('/test').expect(200);
    });

    it('should handle concurrent requests correctly', async () => {
      const config: RateLimitConfig = {
        limit: 5,
        windowMs: 5000,
        algorithm: 'sliding-window'
      };

      app = createTestApp(config);

      // Make multiple concurrent requests
      // This tests the atomic nature of our Lua script implementation
      const promises = Array.from({ length: 10 }, () => 
        request(app).get('/test')
      );

      const responses = await Promise.all(promises);

      // Count successful vs blocked requests
      const successful = responses.filter(r => r.status === 200).length;
      const blocked = responses.filter(r => r.status === 429).length;

      // Should have exactly the limit number of successful requests
      expect(successful).toBe(5);
      expect(blocked).toBe(5);
    });
  });

  describe('Token Bucket Algorithm Integration', () => {
    it('should allow burst requests with proper refill', async () => {
      const config: RateLimitConfig = {
        limit: 3, // 3 tokens per second
        windowMs: 1000,
        algorithm: 'token-bucket',
        burstAllowance: 1.0 // Allow 100% burst (6 tokens total capacity)
      };

      app = createTestApp(config);

      // Should be able to make burst requests initially
      // With burstAllowance of 1.0, we get 6 tokens total capacity
      for (let i = 0; i < 6; i++) {
        await request(app).get('/test').expect(200);
      }

      // 7th request should be blocked (no tokens left)
      await request(app).get('/test').expect(429);

      // Wait for tokens to refill (should get 3 tokens per second)
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be able to make requests again after refill
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
    });
  });

  /**
   * KEY GENERATION AND ISOLATION TESTS
   * 
   * These tests verify that different users/IPs are properly isolated
   * and that custom key generation works correctly.
   */
  describe('Key Generation and User Isolation', () => {
    it('should isolate different IP addresses', async () => {
      const config: RateLimitConfig = {
        limit: 2,
        windowMs: 60000,
        algorithm: 'fixed-window'
      };

      app = createTestApp(config);

      // Simulate requests from different IP addresses
      // In real applications, this would be different actual IPs
      const makeRequestWithIP = (ip: string) => {
        return request(app)
          .get('/test')
          .set('X-Forwarded-For', ip); // Simulate different source IPs
      };

      // Each IP should have its own limit
      await makeRequestWithIP('192.168.1.1').expect(200);
      await makeRequestWithIP('192.168.1.1').expect(200);
      await makeRequestWithIP('192.168.1.1').expect(429); // Third request blocked

      // Different IP should have fresh limit
      await makeRequestWithIP('192.168.1.2').expect(200);
      await makeRequestWithIP('192.168.1.2').expect(200);
      await makeRequestWithIP('192.168.1.2').expect(429); // Third request blocked
    });

    it('should work with custom key generation', async () => {
      const config: RateLimitConfig = {
        limit: 2,
        windowMs: 60000,
        algorithm: 'fixed-window'
      };

      // Custom key generator that uses a header value
      const customKeyGen = (req: express.Request) => {
        return `user:${req.headers['x-user-id'] || 'anonymous'}`;
      };

      app = createTestApp(config, customKeyGen);

      // Requests with same user ID should share limit
      await request(app)
        .get('/test')
        .set('X-User-ID', 'user123')
        .expect(200);

      await request(app)
        .get('/test')
        .set('X-User-ID', 'user123')
        .expect(200);

      await request(app)
        .get('/test')
        .set('X-User-ID', 'user123')
        .expect(429);

      // Different user ID should have separate limit
      await request(app)
        .get('/test')
        .set('X-User-ID', 'user456')
        .expect(200);
    });
  });

  /**
   * ERROR HANDLING AND RESILIENCE TESTS
   * 
   * These tests verify that the system handles failures gracefully
   * and continues to operate when things go wrong.
   */
  describe('Error Handling and Resilience', () => {
    it('should fail open when Redis is unavailable', async () => {
      const config: RateLimitConfig = {
        limit: 1, // Very restrictive limit
        windowMs: 60000,
        algorithm: 'fixed-window'
      };

      app = createTestApp(config);

      // First request should work normally
      await request(app).get('/test').expect(200);

      // Second request should be blocked normally
      await request(app).get('/test').expect(429);

      // Simulate Redis failure by disconnecting
      redis.disconnect();

      // Requests should now be allowed through (fail-open behavior)
      // This prevents rate limiting failures from taking down the entire API
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(200);
    });

    it('should handle Redis connection recovery', async () => {
      const config: RateLimitConfig = {
        limit: 2,
        windowMs: 60000,
        algorithm: 'fixed-window'
      };

      app = createTestApp(config);

      // Normal operation
      await request(app).get('/test').expect(200);

      // Simulate temporary Redis failure
      const originalEval = redis.eval;
      redis.eval = jest.fn().mockRejectedValue(new Error('Redis connection failed'));

      // Should fail open during Redis failure
      await request(app).get('/test').expect(200);

      // Restore Redis functionality
      redis.eval = originalEval;

      // Should return to normal rate limiting behavior
      await request(app).get('/test').expect(200);
      await request(app).get('/test').expect(429); // Should be blocked now
    });
  });

  /**
   * HEADER VALIDATION TESTS
   * 
   * These tests ensure that the HTTP headers are set correctly
   * according to standards and provide useful information to clients.
   */
  describe('HTTP Header Validation', () => {
    it('should set correct rate limiting headers', async () => {
      const config: RateLimitConfig = {
        limit: 5,
        windowMs: 300000, // 5 minutes
        algorithm: 'fixed-window'
      };

      app = createTestApp(config);

      const response = await request(app).get('/test').expect(200);

      // Check standard headers (RFC 6585)
      expect(response.headers['ratelimit-limit']).toBe('5');
      expect(response.headers['ratelimit-remaining']).toBe('4');
      expect(response.headers['ratelimit-reset']).toBeDefined();

      // Check legacy headers for backward compatibility
      expect(response.headers['x-ratelimit-limit']).toBe('5');
      expect(response.headers['x-ratelimit-remaining']).toBe('4');
      expect(response.headers['x-ratelimit-reset']).toBeDefined();

      // Check that reset time is reasonable (within the next 5 minutes)
      const resetTime = parseInt(response.headers['ratelimit-reset']);
      const now = Math.floor(Date.now() / 1000);
      expect(resetTime).toBeGreaterThan(now);
      expect(resetTime).toBeLessThan(now + 301); // Within 5 minutes + 1 second buffer
    });

    it('should set Retry-After header when rate limited', async () => {
      const config: RateLimitConfig = {
        limit: 1,
        windowMs: 60000,
        algorithm: 'fixed-window'
      };

      app = createTestApp(config);

      // Use up the limit
      await request(app).get('/test').expect(200);

      // Get blocked response
      const blockedResponse = await request(app).get('/test').expect(429);

      // Verify Retry-After header is present and reasonable
      const retryAfter = parseInt(blockedResponse.headers['retry-after']);
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60); // Should be within window duration
    });
  });

  /**
   * PERFORMANCE AND LOAD TESTS
   * 
   * These tests verify that the system performs well under load
   * and doesn't create bottlenecks or memory leaks.
   */
  describe('Performance Under Load', () => {
    it('should handle high-frequency requests efficiently', async () => {
      const config: RateLimitConfig = {
        limit: 100,
        windowMs: 10000, // 10 seconds
        algorithm: 'sliding-window'
      };

      app = createTestApp(config);

      const startTime = Date.now();
      const promises: Promise<any>[] = [];

      // Make 50 concurrent requests (within limit)
      for (let i = 0; i < 50; i++) {
        promises.push(request(app).get('/test'));
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // All requests should succeed
      const successful = responses.filter(r => r.status === 200).length;
      expect(successful).toBe(50);

      // Should complete reasonably quickly (less than 5 seconds for 50 requests)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it('should not leak memory with many unique keys', async () => {
      const config: RateLimitConfig = {
        limit: 5,
        windowMs: 1000, // Short window to allow quick testing
        algorithm: 'fixed-window'
      };

      // Custom key generator that creates many unique keys
      const customKeyGen = (req: express.Request) => {
        return `unique-key-${req.query.id}`;
      };

      app = createTestApp(config, customKeyGen);

      // Make requests with many different keys
      // In production, this could represent many different users
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get(`/test?id=${i}`)
          .expect(200);
      }

      // Wait for windows to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Redis should clean up expired keys automatically
      // We can't easily test memory usage in integration tests,
      // but we verify the system still responds correctly
      await request(app).get('/test?id=new').expect(200);
    });
  });

  /**
   * REAL-WORLD SCENARIO TESTS
   * 
   * These tests simulate realistic usage patterns that might
   * occur in production environments.
   */
  describe('Real-World Scenarios', () => {
    it('should handle mixed legitimate and abusive traffic', async () => {
      const config: RateLimitConfig = {
        limit: 10,
        windowMs: 5000,
        algorithm: 'sliding-window'
      };

      app = createTestApp(config);

      // Simulate legitimate user making reasonable requests
      const legitimatePromises = Array.from({ length: 8 }, (_, i) => 
        request(app)
          .get('/test')
          .set('X-User-ID', 'legitimate-user')
          .delay(i * 100) // Spread requests over time
      );

      // Simulate abusive user trying to overwhelm the system
      const abusivePromises = Array.from({ length: 20 }, () => 
        request(app)
          .get('/test')
          .set('X-User-ID', 'abusive-user')
      );

      // Run both types of traffic simultaneously
      const [legitimateResponses, abusiveResponses] = await Promise.all([
        Promise.all(legitimatePromises),
        Promise.all(abusivePromises)
      ]);

      // Legitimate user should mostly succeed (requests spread over time)
      const legitimateSuccess = legitimateResponses.filter(r => r.status === 200).length;
      expect(legitimateSuccess).toBeGreaterThanOrEqual(7); // Most should succeed

      // Abusive user should be heavily rate limited
      const abusiveSuccess = abusiveResponses.filter(r => r.status === 200).length;
      const abusiveBlocked = abusiveResponses.filter(r => r.status === 429).length;
      expect(abusiveBlocked).toBeGreaterThan(abusiveSuccess); // More blocked than allowed
    });

    it('should work correctly with API endpoints that have different limits', async () => {
      // Create separate apps for different endpoint types
      const publicApiConfig: RateLimitConfig = {
        limit: 100,
        windowMs: 60000,
        algorithm: 'fixed-window'
      };

      const authConfig: RateLimitConfig = {
        limit: 5,
        windowMs: 60000,
        algorithm: 'fixed-window'
      };

      // Public API with higher limits
      const publicApp = express();
      const publicStore = factory.createStore(publicApiConfig.algorithm);
      publicApp.use(rateLimitMiddleware({ store: publicStore, config: publicApiConfig }));
      publicApp.get('/api/data', (req, res) => res.json({ data: 'public' }));

      // Auth endpoints with stricter limits
      const authApp = express();
      const authStore = factory.createStore(authConfig.algorithm);
      authApp.use(rateLimitMiddleware({ store: authStore, config: authConfig }));
      authApp.post('/auth/login', (req, res) => res.json({ token: 'fake-token' }));

      // Test that each endpoint respects its own limits
      // Public API should allow many requests
      for (let i = 0; i < 10; i++) {
        await request(publicApp).get('/api/data').expect(200);
      }

      // Auth endpoint should have stricter limits
      for (let i = 0; i < 5; i++) {
        await request(authApp).post('/auth/login').expect(200);
      }

      await request(authApp).post('/auth/login').expect(429);
    });
  });
});

/**
 * HELPER FUNCTIONS AND UTILITIES
 * 
 * These utilities make the tests more readable and maintainable.
 * They encapsulate common test patterns and provide reusable functionality.
 */

// Helper to wait for a specific duration with a promise
const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// Helper to make multiple requests and return response summaries
const makeConcurrentRequests = async (
  app: express.Application, 
  count: number, 
  path: string = '/test'
): Promise<{ successful: number; blocked: number; total: number }> => {
  const promises = Array.from({ length: count }, () => request(app).get(path));
  const responses = await Promise.all(promises);
  
  return {
    successful: responses.filter(r => r.status === 200).length,
    blocked: responses.filter(r => r.status === 429).length,
    total: responses.length
  };
};

// Helper to verify rate limiting headers are present and valid
const verifyRateLimitHeaders = (response: request.Response, expectedLimit: number) => {
  expect(response.headers['ratelimit-limit']).toBe(String(expectedLimit));
  expect(response.headers['x-ratelimit-limit']).toBe(String(expectedLimit));
  expect(response.headers['ratelimit-remaining']).toBeDefined();
  expect(response.headers['x-ratelimit-remaining']).toBeDefined();
  expect(response.headers['ratelimit-reset']).toBeDefined();
  expect(response.headers['x-ratelimit-reset']).toBeDefined();
};






