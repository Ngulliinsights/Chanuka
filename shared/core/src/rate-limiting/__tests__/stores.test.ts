import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRateLimitStore } from '../stores/memory-store';
import { RedisRateLimitStore } from '../stores/redis-store';
import { ok, err } from '../../primitives/types/result';

// Mock Redis
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn(),
      set: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      pexpire: vi.fn(),
      quit: vi.fn(),
      on: vi.fn(),
    })),
  };
});

describe('Rate Limiting Stores', () => {
  describe('MemoryRateLimitStore', () => {
    let store: MemoryRateLimitStore;

    beforeEach(() => {
      store = new MemoryRateLimitStore(1000); // 1 second cleanup interval
      vi.useFakeTimers();
    });

    afterEach(() => {
    cleanup();
      store.destroy();
      vi.useRealTimers();
    
  });

    describe('Basic Operations', () => {
      it('should get non-existent key', async () => {
        const result = await store.get('nonexistent');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(null);
      });

      it('should set and get data', async () => {
        const data = {
          tokens: 5,
          lastRefill: Date.now(),
          resetTime: Date.now() + 60000
        };

        const setResult = await store.set('test', data);
        expect(setResult.isOk()).toBe(true);

        const getResult = await store.get('test');
        expect(getResult.isOk()).toBe(true);
        expect(getResult.unwrap()).toEqual(data);
      });

      it('should set data with TTL', async () => {
        const data = {
          tokens: 10,
          lastRefill: Date.now(),
          resetTime: Date.now() + 60000
        };

        const setResult = await store.set('test', data, 1000); // 1 second TTL
        expect(setResult.isOk()).toBe(true);

        // Should exist immediately
        let getResult = await store.get('test');
        expect(getResult.unwrap()).toEqual(data);

        // Advance time past TTL
        vi.advanceTimersByTime(1001);

        // Should be expired
        getResult = await store.get('test');
        expect(getResult.unwrap()).toBe(null);
      });

      it('should delete data', async () => {
        const data = {
          tokens: 5,
          lastRefill: Date.now(),
          resetTime: Date.now() + 60000
        };

        await store.set('test', data);
        let getResult = await store.get('test');
        expect(getResult.unwrap()).toEqual(data);

        const deleteResult = await store.delete('test');
        expect(deleteResult.isOk()).toBe(true);

        getResult = await store.get('test');
        expect(getResult.unwrap()).toBe(null);
      });
    });

    describe('Increment Operations', () => {
      it('should increment tokens field', async () => {
        const incrementResult = await store.increment('test', 'tokens', 5);
        expect(incrementResult.isOk()).toBe(true);
        expect(incrementResult.unwrap()).toBe(5);

        const getResult = await store.get('test');
        expect(getResult.unwrap()).toEqual({
          tokens: 5,
          lastRefill: expect.any(Number),
          resetTime: expect.any(Number)
        });
      });

      it('should increment existing data', async () => {
        const initialData = {
          tokens: 10,
          lastRefill: Date.now(),
          resetTime: Date.now() + 60000
        };

        await store.set('test', initialData);
        const incrementResult = await store.increment('test', 'tokens', 3);
        expect(incrementResult.unwrap()).toBe(13);

        const getResult = await store.get('test');
        expect(getResult.unwrap()?.tokens).toBe(13);
      });

      it('should handle increment with default amount', async () => {
        const incrementResult = await store.increment('test', 'tokens');
        expect(incrementResult.unwrap()).toBe(1);
      });

      it('should handle unknown field', async () => {
        const incrementResult = await store.increment('test', 'unknown' as any, 1);
        expect(incrementResult.isErr()).toBe(true);
      });
    });

    describe('Expire Operations', () => {
      it('should set expiration on key', async () => {
        const data = {
          tokens: 5,
          lastRefill: Date.now(),
          resetTime: Date.now() + 60000
        };

        await store.set('test', data);
        const expireResult = await store.expire('test', 500); // 500ms TTL
        expect(expireResult.isOk()).toBe(true);

        // Should exist immediately
        let getResult = await store.get('test');
        expect(getResult.unwrap()).toEqual(data);

        // Advance time past TTL
        vi.advanceTimersByTime(501);

        // Should be expired
        getResult = await store.get('test');
        expect(getResult.unwrap()).toBe(null);
      });
    });

    describe('Concurrency and Thread Safety', () => {
      it('should handle concurrent increments safely', async () => {
        const promises = Array.from({ length: 10 }, () =>
          store.increment('test', 'tokens', 1)
        );

        const results = await Promise.all(promises);
        const successful = results.filter(r => r.isOk()).length;
        expect(successful).toBe(10);

        const getResult = await store.get('test');
        expect(getResult.unwrap()?.tokens).toBe(10);
      });

      it('should prevent race conditions with locks', async () => {
        // Start multiple concurrent operations
        const promises = Array.from({ length: 5 }, async () => {
          const results = await Promise.all([
            store.increment('test', 'tokens', 1),
            store.increment('test', 'tokens', 1),
            store.increment('test', 'tokens', 1)
          ]);
          return results.every(r => r.isOk());
        });

        const allSuccessful = await Promise.all(promises);
        expect(allSuccessful.every(Boolean)).toBe(true);

        const getResult = await store.get('test');
        expect(getResult.unwrap()?.tokens).toBe(15); // 5 operations * 3 increments each
      });
    });

    describe('Cleanup Functionality', () => {
      it('should cleanup expired data', async () => {
        const now = Date.now();
        const expiredData = {
          tokens: 5,
          lastRefill: now - 10000,
          resetTime: now - 5000 // Already expired
        };

        const validData = {
          tokens: 10,
          lastRefill: now,
          resetTime: now + 60000 // Still valid
        };

        await store.set('expired', expiredData);
        await store.set('valid', validData);

        // Trigger cleanup
        vi.advanceTimersByTime(1000); // Advance past cleanup interval

        // Verify expired data is removed, valid data remains
        const expiredResult = await store.get('expired');
        const validResult = await store.get('valid');

        expect(expiredResult.unwrap()).toBe(null);
        expect(validResult.unwrap()).toEqual(validData);
      });

      it('should handle cleanup interval configuration', () => {
        const customStore = new MemoryRateLimitStore(5000); // 5 second interval
        expect(customStore).toBeDefined();
        customStore.destroy();
      });
    });

    describe('Error Handling', () => {
      it('should handle storage errors gracefully', async () => {
        // Mock a storage failure by corrupting internal state
        (store as any).data = null;

        const result = await store.get('test');
        expect(result.isErr()).toBe(true);
      });
    });

    describe('Memory Management', () => {
      it('should properly destroy and cleanup resources', () => {
        const testStore = new MemoryRateLimitStore();
        testStore.destroy();

        // Should not throw errors after destroy
        expect(() => testStore.destroy()).not.toThrow();
      });

      it('should handle large number of keys', async () => {
        const promises = Array.from({ length: 1000 }, (_, i) =>
          store.set(`key${i}`, {
            tokens: i,
            lastRefill: Date.now(),
            resetTime: Date.now() + 60000
          })
        );

        await Promise.all(promises);

        // Verify all keys exist
        const results = await Promise.all(
          Array.from({ length: 100 }, (_, i) =>
            store.get(`key${i * 10}`)
          )
        );

        const found = results.filter(r => r.unwrap() !== null).length;
        expect(found).toBe(100);
      });
    });
  });

  describe('RedisRateLimitStore', () => {
    let store: RedisRateLimitStore;
    let mockRedis: any;

    beforeEach(() => {
      // Create a fresh mock Redis instance
      mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        setex: vi.fn(),
        del: vi.fn(),
        pexpire: vi.fn(),
        quit: vi.fn(),
        on: vi.fn(),
      };

      // Mock the Redis constructor
      const RedisMock = vi.fn().mockImplementation(() => mockRedis);
      vi.mocked(require('ioredis').default).mockImplementation(RedisMock);

      store = new RedisRateLimitStore();
    });

    afterEach(async () => {
      await store.disconnect();
    });

    describe('Basic Operations', () => {
      it('should get non-existent key', async () => {
        mockRedis.get.mockResolvedValue(null);

        const result = await store.get('nonexistent');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(null);
        expect(mockRedis.get).toHaveBeenCalledWith('ratelimit:nonexistent');
      });

      it('should get existing data', async () => {
        const data = {
          tokens: 5,
          lastRefill: Date.now(),
          resetTime: Date.now() + 60000
        };
        mockRedis.get.mockResolvedValue(JSON.stringify(data));

        const result = await store.get('test');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toEqual(data);
      });

      it('should handle JSON parse errors', async () => {
        mockRedis.get.mockResolvedValue('invalid json');

        const result = await store.get('test');
        expect(result.isErr()).toBe(true);
      });

      it('should set data without TTL', async () => {
        mockRedis.set.mockResolvedValue('OK');

        const data = {
          tokens: 10,
          lastRefill: Date.now(),
          resetTime: Date.now() + 60000
        };

        const result = await store.set('test', data);
        expect(result.isOk()).toBe(true);
        expect(mockRedis.set).toHaveBeenCalledWith('ratelimit:test', JSON.stringify(data));
      });

      it('should set data with TTL', async () => {
        mockRedis.setex.mockResolvedValue('OK');

        const data = {
          tokens: 10,
          lastRefill: Date.now(),
          resetTime: Date.now() + 60000
        };

        const result = await store.set('test', data, 5000);
        expect(result.isOk()).toBe(true);
        expect(mockRedis.setex).toHaveBeenCalledWith('ratelimit:test', 5, JSON.stringify(data));
      });

      it('should delete data', async () => {
        mockRedis.del.mockResolvedValue(1);

        const result = await store.delete('test');
        expect(result.isOk()).toBe(true);
        expect(mockRedis.del).toHaveBeenCalledWith('ratelimit:test');
      });
    });

    describe('Increment Operations', () => {
      it('should increment field on existing data', async () => {
        const existingData = {
          tokens: 5,
          lastRefill: Date.now(),
          resetTime: Date.now() + 60000
        };

        mockRedis.get.mockResolvedValue(JSON.stringify(existingData));
        mockRedis.set.mockResolvedValue('OK');

        const result = await store.increment('test', 'tokens', 3);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(8);

        expect(mockRedis.set).toHaveBeenCalledWith('ratelimit:test', expect.stringContaining('"tokens":8'));
      });

      it('should create new data when incrementing non-existent key', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.set.mockResolvedValue('OK');

        const result = await store.increment('test', 'tokens', 5);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(5);

        const setCall = mockRedis.set.mock.calls[0];
        const savedData = JSON.parse(setCall[1]);
        expect(savedData.tokens).toBe(5);
      });

      it('should handle increment errors', async () => {
        mockRedis.get.mockRejectedValue(new Error('Redis error'));

        const result = await store.increment('test', 'tokens', 1);
        expect(result.isErr()).toBe(true);
      });
    });

    describe('Expire Operations', () => {
      it('should set expiration on key', async () => {
        mockRedis.pexpire.mockResolvedValue(1);

        const result = await store.expire('test', 5000);
        expect(result.isOk()).toBe(true);
        expect(mockRedis.pexpire).toHaveBeenCalledWith('ratelimit:test', 5000);
      });
    });

    describe('Error Handling', () => {
      it('should handle Redis connection errors', async () => {
        mockRedis.get.mockRejectedValue(new Error('Connection failed'));

        const result = await store.get('test');
        expect(result.isErr()).toBe(true);
      });

      it('should handle Redis set errors', async () => {
        mockRedis.set.mockRejectedValue(new Error('Set failed'));

        const data = {
          tokens: 5,
          lastRefill: Date.now(),
          resetTime: Date.now() + 60000
        };

        const result = await store.set('test', data);
        expect(result.isErr()).toBe(true);
      });
    });

    describe('Connection Management', () => {
      it('should configure Redis with default options', () => {
        // Verify Redis was created with expected options
        expect(require('ioredis').default).toHaveBeenCalledWith(
          'redis://localhost:6379',
          expect.objectContaining({
            maxRetriesPerRequest: 3,
            enableReadyCheck: false,
            lazyConnect: true
          })
        );
      });

      it('should configure Redis with custom URL', () => {
        const customStore = new RedisRateLimitStore('redis://custom:6379');
        expect(require('ioredis').default).toHaveBeenLastCalledWith(
          'redis://custom:6379',
          expect.any(Object)
        );
      });

      it('should handle Redis errors gracefully', () => {
        const errorStore = new RedisRateLimitStore();
        // The store should handle Redis errors without throwing
        expect(errorStore).toBeDefined();
      });

      it('should disconnect properly', async () => {
        mockRedis.quit.mockResolvedValue('OK');

        await store.disconnect();
        expect(mockRedis.quit).toHaveBeenCalled();
      });
    });

    describe('Key Prefixing', () => {
      it('should prefix all keys with ratelimit:', async () => {
        mockRedis.get.mockResolvedValue(null);
        mockRedis.set.mockResolvedValue('OK');

        await store.get('test');
        await store.set('test', { tokens: 1, lastRefill: Date.now(), resetTime: Date.now() });
        await store.delete('test');

        expect(mockRedis.get).toHaveBeenCalledWith('ratelimit:test');
        expect(mockRedis.set).toHaveBeenCalledWith('ratelimit:test', expect.any(String));
        expect(mockRedis.del).toHaveBeenCalledWith('ratelimit:test');
      });
    });
  });

  describe('Store Interface Consistency', () => {
    it('should implement same interface', async () => {
      const memoryStore = new MemoryRateLimitStore();
      const redisStore = new RedisRateLimitStore();

      const stores = [memoryStore, redisStore];

      for (const store of stores) {
        // All stores should have the same methods
        expect(typeof store.get).toBe('function');
        expect(typeof store.set).toBe('function');
        expect(typeof store.delete).toBe('function');
        expect(typeof store.increment).toBe('function');
        expect(typeof store.expire).toBe('function');

        // All methods should return Result types
        const getResult = await store.get('test');
        expect(getResult).toHaveProperty('isOk');
        expect(getResult).toHaveProperty('isErr');

        const setResult = await store.set('test', {
          tokens: 1,
          lastRefill: Date.now(),
          resetTime: Date.now() + 60000
        });
        expect(setResult).toHaveProperty('isOk');
        expect(setResult).toHaveProperty('isErr');
      }

      memoryStore.destroy();
      await redisStore.disconnect();
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle high-frequency operations', async () => {
      const store = new MemoryRateLimitStore();

      const startTime = Date.now();
      const promises = Array.from({ length: 100 }, (_, i) =>
        store.set(`key${i}`, {
          tokens: i,
          lastRefill: Date.now(),
          resetTime: Date.now() + 60000
        })
      );

      await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
      store.destroy();
    });

    it('should handle Redis batch operations efficiently', async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue('OK'),
        del: vi.fn().mockResolvedValue(1),
        pexpire: vi.fn().mockResolvedValue(1),
        quit: vi.fn().mockResolvedValue('OK'),
        on: vi.fn(),
      };

      vi.mocked(require('ioredis').default).mockImplementation(() => mockRedis);

      const store = new RedisRateLimitStore();

      const startTime = Date.now();
      const promises = Array.from({ length: 50 }, (_, i) =>
        store.set(`key${i}`, {
          tokens: i,
          lastRefill: Date.now(),
          resetTime: Date.now() + 60000
        })
      );

      await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(200);
      await store.disconnect();
    });
  });
});
