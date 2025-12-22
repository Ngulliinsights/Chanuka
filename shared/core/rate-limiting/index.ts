// Main exports for the unified rate limiting system
console.log('DEBUG: Loading rate-limiting module from shared/core');
export * from './core';
export * from './adapters';
export * from './middleware';

// Specific exports for backward compatibility
export { createRateLimitMiddleware as RateLimitMiddleware } from './middleware';

// Legacy exports for backward compatibility - be specific to avoid conflicts
export type { 
  RateLimitOptions, 
  RateLimitResult, 
  RateLimitStore, 
  RateLimitBucket, 
  AIRateLimitOptions, 
  RateLimitData, 
  IRateLimitStore,
  RateLimitConfig
} from './types';
export { RateLimitFactory } from './factory';

// Store implementations
export { MemoryRateLimitStore } from './stores/memory-store';
export { RedisRateLimitStore } from './stores/redis-store';

// Algorithm implementations
export { FixedWindowStore } from './algorithms/fixed-window';
export { SlidingWindowStore } from './algorithms/sliding-window';
export { TokenBucketStore } from './algorithms/token-bucket';

// Factory functions for easy setup
import { createMemoryAdapter } from './adapters/memory-adapter';

export function createMemoryStore() {
  return createMemoryAdapter();
}

// Type-safe rate limiter factory function
export function createRateLimiter(_store?: any): {
  check: (key: string) => Promise<{ allowed: boolean; remaining: number; resetAt: Date }>;
  reset: (key: string) => Promise<void>;
} {
  // const _rateLimitStore = store || createMemoryStore();
  return {
    check: async (_key: string) => ({ 
      allowed: true, 
      remaining: 100, 
      resetAt: new Date(Date.now() + 15 * 60 * 1000) 
    }),
    reset: async (_key: string) => {
      // Reset implementation would go here
    }
  };
}

export function createAIRateLimiter(_store?: any): {
  check: (key: string, cost?: number) => Promise<{ allowed: boolean; remaining: number; resetAt: Date }>;
  reset: (key: string) => Promise<void>;
} {
  // const _rateLimitStore = store || createMemoryStore();
  return {
    check: async (_key: string, _cost: number = 1) => ({ 
      allowed: true, 
      remaining: 100, 
      resetAt: new Date(Date.now() + 15 * 60 * 1000) 
    }),
    reset: async (_key: string) => {
      // Reset implementation would go here
    }
  };
}

export function createRateLimitFactory() {
  return {
    createMemoryStore,
    createRateLimiter,
    createAIRateLimiter
  };
}

// Feature flag for gradual migration
export const useUnifiedRateLimiting = process.env.USE_UNIFIED_RATE_LIMITING === 'true' ||
  process.env.NODE_ENV === 'test';









































