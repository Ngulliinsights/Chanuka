import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MemoryRateLimitStore } from '../stores/memory-store';

describe('MemoryRateLimitStore', () => {
  let store: MemoryRateLimitStore;

  beforeEach(() => {
    store = new MemoryRateLimitStore(100); // Short cleanup interval for testing
  });

  afterEach(() => {
    store.destroy();
  });

  describe('check', () => {
    it('should allow requests within limit', async () => {
      const options = { windowMs: 1000, max: 3 };

      for (let i = 0; i < 3; i++) {
        const result = await store.check('test-key', options);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(2 - i);
      }
    });

    it('should deny requests over limit', async () => {
      const options = { windowMs: 1000, max: 2 };

      // Use up the limit
      await store.check('test-key', options);
      await store.check('test-key', options);

      // Third request should be denied
      const result = await store.check('test-key', options);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it('should reset after window expires', async () => {
      const options = { windowMs: 100, max: 1 };

      // Use up limit
      await store.check('test-key', options);
      expect((await store.check('test-key', options)).allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should allow again
      const result = await store.check('test-key', options);
      expect(result.allowed).toBe(true);
    });

    it('should handle environment-specific limits', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const options = { windowMs: 1000, max: 10, devMax: 5 };

      const result = await store.check('test-key', options);
      expect(result.allowed).toBe(true);

      // Should be limited to devMax
      for (let i = 0; i < 4; i++) {
        await store.check('test-key', options);
      }

      const finalResult = await store.check('test-key', options);
      expect(finalResult.allowed).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('reset', () => {
    it('should reset rate limit for key', async () => {
      const options = { windowMs: 1000, max: 1 };

      await store.check('test-key', options);
      expect((await store.check('test-key', options)).allowed).toBe(false);

      await store.reset('test-key');

      const result = await store.check('test-key', options);
      expect(result.allowed).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should clean up expired entries', async () => {
      const options = { windowMs: 100, max: 1 };

      await store.check('key1', options);
      await store.check('key2', options);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      await store.cleanup();

      // Should allow new requests
      const result1 = await store.check('key1', options);
      const result2 = await store.check('key2', options);
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });
  });
});




































