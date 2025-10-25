// Main exports for the unified rate limiting system
export * from './core';
export * from './adapters';
export * from './middleware';

// Specific exports for backward compatibility
export { RateLimitMiddleware } from './middleware';
export const rateLimitMiddleware = RateLimitMiddleware;

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
  return createExpressRateLimitMiddleware({
    store: rateLimitStore,
    limit: 100,
    windowMs: 15 * 60 * 1000,
    algorithm: 'fixed-window'
  });
}

export function createAIRateLimiter(store?: any, maxCostPerWindow: number = 100) {
  const rateLimitStore = store || createMemoryStore();
  return AIRateLimiter.createOpenAIRateLimiter(rateLimitStore, maxCostPerWindow);
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





































