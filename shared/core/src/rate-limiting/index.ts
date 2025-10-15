// Main exports
export * from './types';
export * from './middleware';
export * from './ai-rate-limiter';

// Store implementations
export { MemoryRateLimitStore } from './stores/memory-store';
export { RedisRateLimitStore } from './stores/redis-store';

// Legacy adapter
export {
  LegacyRateLimitStoreAdapter,
  legacyRateLimitStore,
  clearLegacyRateLimitStore,
  getLegacyRateLimitStatus
} from './adapters/legacy-store-adapter';

// Factory functions for easy setup
import { MemoryRateLimitStore } from './stores/memory-store';
import { RedisRateLimitStore } from './stores/redis-store';
import { createRateLimitMiddleware } from './middleware';
import { AIRateLimiter } from './ai-rate-limiter';

export function createMemoryStore() {
  return new MemoryRateLimitStore();
}

export function createRedisStore(redisUrl?: string) {
  return new RedisRateLimitStore(redisUrl);
}

export function createRateLimiter(store?: any) {
  const rateLimitStore = store || createMemoryStore();
  return createRateLimitMiddleware(rateLimitStore);
}

export function createAIRateLimiter(store?: any, maxCostPerWindow: number = 100) {
  const rateLimitStore = store || createMemoryStore();
  return AIRateLimiter.createOpenAIRateLimiter(rateLimitStore, maxCostPerWindow);
}
