/**
 * Redis Mock Implementation for Testing
 * Provides consistent Redis mocking across all test environments
 */

import { vi } from 'vitest';

export interface RedisMockInstance {
  // String operations
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  setex: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  exists: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
  pexpire: ReturnType<typeof vi.fn>;
  ttl: ReturnType<typeof vi.fn>;
  incr: ReturnType<typeof vi.fn>;
  decr: ReturnType<typeof vi.fn>;
  
  // Hash operations
  hget: ReturnType<typeof vi.fn>;
  hset: ReturnType<typeof vi.fn>;
  hdel: ReturnType<typeof vi.fn>;
  hgetall: ReturnType<typeof vi.fn>;
  
  // Set operations
  sadd: ReturnType<typeof vi.fn>;
  srem: ReturnType<typeof vi.fn>;
  smembers: ReturnType<typeof vi.fn>;
  
  // Sorted set operations
  zadd: ReturnType<typeof vi.fn>;
  zrem: ReturnType<typeof vi.fn>;
  zrange: ReturnType<typeof vi.fn>;
  zremrangebyscore: ReturnType<typeof vi.fn>;
  
  // Lua scripting
  eval: ReturnType<typeof vi.fn>;
  
  // Connection operations
  ping: ReturnType<typeof vi.fn>;
  quit: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  
  // Database operations
  flushall: ReturnType<typeof vi.fn>;
  flushdb: ReturnType<typeof vi.fn>;
  
  // Event handling
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
}

export const createRedisMock = (): RedisMockInstance => ({
  // String operations
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  setex: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  exists: vi.fn().mockResolvedValue(0),
  expire: vi.fn().mockResolvedValue(1),
  pexpire: vi.fn().mockResolvedValue(1),
  ttl: vi.fn().mockResolvedValue(-1),
  incr: vi.fn().mockResolvedValue(1),
  decr: vi.fn().mockResolvedValue(0),
  
  // Hash operations
  hget: vi.fn().mockResolvedValue(null),
  hset: vi.fn().mockResolvedValue(1),
  hdel: vi.fn().mockResolvedValue(1),
  hgetall: vi.fn().mockResolvedValue({}),
  
  // Set operations
  sadd: vi.fn().mockResolvedValue(1),
  srem: vi.fn().mockResolvedValue(1),
  smembers: vi.fn().mockResolvedValue([]),
  
  // Sorted set operations
  zadd: vi.fn().mockResolvedValue(1),
  zrem: vi.fn().mockResolvedValue(1),
  zrange: vi.fn().mockResolvedValue([]),
  zremrangebyscore: vi.fn().mockResolvedValue(1),
  
  // Lua scripting - Mock sliding window rate limiting response
  eval: vi.fn().mockResolvedValue([1, 9, Date.now() + 60000, 1, Date.now()]),
  
  // Connection operations
  ping: vi.fn().mockResolvedValue('PONG'),
  quit: vi.fn().mockResolvedValue('OK'),
  disconnect: vi.fn().mockResolvedValue(undefined),
  
  // Database operations
  flushall: vi.fn().mockResolvedValue('OK'),
  flushdb: vi.fn().mockResolvedValue('OK'),
  
  // Event handling
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn(),
});

/**
 * Redis Mock Utilities
 */
export const redisMockUtils = {
  /**
   * Create a fresh Redis mock instance
   */
  create: createRedisMock,
  
  /**
   * Reset all mocks in a Redis instance
   */
  reset: (mockInstance: RedisMockInstance) => {
    Object.values(mockInstance).forEach(mock => {
      if (typeof mock.mockClear === 'function') {
        mock.mockClear();
      }
    });
  },
  
  /**
   * Mock successful rate limiting check
   */
  mockRateLimitAllow: (mockInstance: RedisMockInstance, remaining = 9) => {
    mockInstance.eval.mockResolvedValue([1, remaining, Date.now() + 60000, 1, Date.now()]);
  },
  
  /**
   * Mock rate limit exceeded
   */
  mockRateLimitExceeded: (mockInstance: RedisMockInstance) => {
    mockInstance.eval.mockResolvedValue([0, 0, Date.now() + 60000, 11, Date.now()]);
  },
  
  /**
   * Mock Redis connection error
   */
  mockConnectionError: (mockInstance: RedisMockInstance) => {
    const error = new Error('Redis connection failed');
    Object.values(mockInstance).forEach(mock => {
      if (typeof mock.mockRejectedValue === 'function') {
        mock.mockRejectedValue(error);
      }
    });
  },
  
  /**
   * Mock cache hit scenario
   */
  mockCacheHit: (mockInstance: RedisMockInstance, key: string, value: any) => {
    mockInstance.get.mockImplementation((k: string) => 
      k === key ? Promise.resolve(JSON.stringify(value)) : Promise.resolve(null)
    );
  },
  
  /**
   * Mock cache miss scenario
   */
  mockCacheMiss: (mockInstance: RedisMockInstance) => {
    mockInstance.get.mockResolvedValue(null);
  },
};

/**
 * Global Redis mock setup for ioredis module
 */
export const setupRedisMock = () => {
  vi.mock('ioredis', () => ({
    default: vi.fn().mockImplementation(() => createRedisMock()),
    Redis: vi.fn().mockImplementation(() => createRedisMock()),
  }));
};