/**
 * Rate Limiting Module
 * 
 * Comprehensive rate limiting system with multiple algorithms,
 * Redis and memory stores, circuit breaker patterns, and metrics collection
 */

import {
import { logger } from '../utils/logger';
  createRateLimitFactory as _createRateLimitFactory,
  createMemoryRateLimitFactory as _createMemoryRateLimitFactory
} from './factory';

// Core types and interfaces
export type {
  RateLimitResult,
  RateLimitConfig,
  RateLimitStore,
  RateLimitMetricsInterface,
  RateLimitMiddlewareOptions
} from './types';

// Algorithms
export { SlidingWindowStore } from './algorithms/sliding-window';
export { TokenBucketStore } from './algorithms/token-bucket';
export { FixedWindowStore } from './algorithms/fixed-window';

// Stores
export { MemoryRateLimitStore } from './stores/memory-store';
export { RedisRateLimitStore } from './stores/redis-store';

// Legacy adapter
export {
  LegacyStoreAdapter,
  type LegacyRateLimitStore  
} from './adapters/legacy-store-adapter';

// Factory exports
export {
  RateLimitFactory,
  createRateLimitFactory,
  createMemoryRateLimitFactory,
  createRedisRateLimitStore,
  type RateLimitFactoryOptions
} from './factory';

// Middleware
export { rateLimitMiddleware } from './middleware';

// Utility functions
export function createApiRateLimit(redis?: any, options: { strict?: boolean; burst?: boolean } = {}) {
  const factory = redis 
    ? _createRateLimitFactory(redis)
    : _createMemoryRateLimitFactory();

  return {
    store: factory.createStore(
      options.strict ? 'sliding-window' : 
      options.burst ? 'token-bucket' : 
      'fixed-window'
    ),
    config: {
      limit: options.strict ? 100 : options.burst ? 200 : 1000,
      windowMs: 15 * 60 * 1000, // 15 minutes
      algorithm: options.strict ? 'sliding-window' : 
                options.burst ? 'token-bucket' :
                'fixed-window'
    }
  };
}

export function createAuthRateLimit(redis?: any, type: 'login' | 'signup' | 'resetPassword' = 'login') {
  const factory = redis
    ? _createRateLimitFactory(redis)
    : _createMemoryRateLimitFactory();

  const configs = {
    login: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 min
    signup: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
    resetPassword: { limit: 2, windowMs: 60 * 60 * 1000 } // 2 attempts per hour
  };

  return {
    store: factory.createStore('fixed-window'),
    config: {
      ...configs[type],
      algorithm: 'fixed-window'
    }
  };
}

export function createContentRateLimit(redis?: any, type: 'upload' | 'post' = 'post') {
  const factory = redis
    ? _createRateLimitFactory(redis)
    : _createMemoryRateLimitFactory();

  const configs = {
    upload: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 uploads per hour
    post: { limit: 50, windowMs: 60 * 60 * 1000 } // 50 posts per hour
  };

  const algorithm = type === 'upload' ? 'token-bucket' : 'sliding-window';
  
  return {
    store: factory.createStore(algorithm),
    config: {
      ...configs[type],
      algorithm
    }
  };
}
// Default rate limiter for quick setup
export function createDefaultRateLimit(redis?: any) {
  return createApiRateLimit(redis);
}






