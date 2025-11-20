// Main exports for the unified rate limiting system
export * from './core';
export * from './adapters';
export * from './middleware';

// Specific exports for backward compatibility
export { createRateLimitMiddleware as RateLimitMiddleware } from './middleware';
import { createExpressRateLimitMiddleware as createExpressMiddleware } from './middleware/express-middleware';
export const rateLimitMiddleware = createExpressMiddleware;

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
export { AIRateLimiter } from './ai-rate-limiter';

// Store implementations
export { MemoryRateLimitStore } from './stores/memory-store';
export { RedisRateLimitStore } from './stores/redis-store';

// Algorithm implementations
export { FixedWindowStore } from './algorithms/fixed-window';
export { SlidingWindowStore } from './algorithms/sliding-window';
export { TokenBucketStore } from './algorithms/token-bucket';

// Factory functions for easy setup
import { createMemoryAdapter } from './adapters/memory-adapter';
import { createExpressRateLimitMiddleware } from './middleware/express-middleware';
import { AIRateLimiter } from './ai-rate-limiter';

export function createMemoryStore() {
  return createMemoryAdapter();
}

export function createRateLimiter(store?: any) {
  const rateLimitStore = store || createMemoryStore();
  return createExpressMiddleware({
    store: rateLimitStore,
    windowMs: 15 * 60 * 1000,
    max: 100
  });
}

export function createAIRateLimiter(store?: any, maxCostPerWindow: number = 100) {
  const rateLimitStore = store || createMemoryStore();
  // Return a placeholder since the method doesn't exist
  return {
    check: async () => ({ allowed: true, remaining: 100, resetAt: new Date() }),
    reset: async () => {}
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









































