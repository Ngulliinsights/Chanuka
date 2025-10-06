# Optimized Rate Limiting System - Task 6 Refinements

## Core Architecture Improvements

The current implementation provides a solid foundation, but we can enhance it significantly for production use. Let me walk you through the key optimizations and refinements.

## 1. Enhanced Core Contracts

```typescript
// core/src/rate-limiting/types/RateLimit.ts
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  // Enhanced fields for better observability
  totalHits: number;
  windowStart: number;
  algorithm: string;
}

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  algorithm: 'sliding-window' | 'token-bucket' | 'fixed-window';
  burstAllowance?: number;
  keyPrefix?: string;
}

export interface RateLimitStore {
  check(key: string, config: RateLimitConfig): Promise<RateLimitResult>;
  cleanup?(): Promise<void>; // For graceful shutdown
  healthCheck?(): Promise<boolean>; // For monitoring
}
```

## 2. Optimized Sliding Window Implementation

The original sliding window has a potential race condition. Here's an improved version:

```typescript
// core/src/rate-limiting/algorithms/sliding-window.ts
import { Redis } from 'ioredis';
import { RateLimitStore, RateLimitResult, RateLimitConfig } from '../types/RateLimit';

export class SlidingWindowStore implements RateLimitStore {
  private readonly luaScript = `
    local key = KEYS[1]
    local window = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    local ttl = tonumber(ARGV[4])
    
    -- Remove old entries atomically
    redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
    
    -- Count current entries
    local current = redis.call('ZCARD', key)
    
    -- Check if request is allowed
    local allowed = current < limit
    local remaining = math.max(0, limit - current - (allowed and 1 or 0))
    
    if allowed then
      -- Add current request with unique score to handle concurrent requests
      local score = now + math.random()
      redis.call('ZADD', key, score, score)
    end
    
    -- Set expiration
    redis.call('PEXPIRE', key, ttl)
    
    -- Return results: allowed, remaining, current_count, oldest_entry
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local oldestTime = oldest[2] and tonumber(oldest[2]) or now
    
    return {allowed and 1 or 0, remaining, current, oldestTime}
  `;

  constructor(
    private redis: Redis,
    private readonly keyPrefix: string = 'rl:sw'
  ) {}

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const storeKey = `${this.keyPrefix}:${key}`;
    
    try {
      const [allowedRaw, remainingRaw, currentRaw, oldestRaw] = await this.redis.eval(
        this.luaScript,
        1,
        storeKey,
        config.windowMs,
        config.limit,
        now,
        Math.ceil(config.windowMs * 1.2) // TTL slightly longer than window
      ) as number[];

      const allowed = !!allowedRaw;
      const windowStart = oldestRaw || now;

      return {
        allowed,
        remaining: remainingRaw,
        resetTime: windowStart + config.windowMs,
        retryAfter: allowed ? undefined : Math.ceil((windowStart + config.windowMs - now) / 1000),
        totalHits: currentRaw + (allowed ? 1 : 0),
        windowStart,
        algorithm: 'sliding-window'
      };
    } catch (error) {
      // Fail-open with logging
      throw new Error(`Sliding window check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }
}
```

## 3. Enhanced Token Bucket with Persistence

```typescript
// core/src/rate-limiting/algorithms/token-bucket.ts
import { Redis } from 'ioredis';
import { RateLimitStore, RateLimitResult, RateLimitConfig } from '../types/RateLimit';

export class TokenBucketStore implements RateLimitStore {
  private readonly luaScript = `
    local key = KEYS[1]
    local capacity = tonumber(ARGV[1])
    local refillRate = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    local ttl = tonumber(ARGV[4])
    
    -- Get current state
    local state = redis.call('HMGET', key, 'tokens', 'lastRefill')
    local tokens = tonumber(state[1]) or capacity
    local lastRefill = tonumber(state[2]) or now
    
    -- Calculate refill
    local elapsed = now - lastRefill
    tokens = math.min(capacity, tokens + elapsed * refillRate / 1000)
    
    -- Check if request allowed
    local allowed = tokens >= 1
    if allowed then
      tokens = tokens - 1
    end
    
    -- Update state
    redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
    redis.call('PEXPIRE', key, ttl)
    
    -- Calculate when bucket will have tokens
    local nextTokenTime = allowed and 0 or math.ceil((1 - tokens) / refillRate * 1000)
    
    return {allowed and 1 or 0, math.floor(tokens), nextTokenTime}
  `;

  constructor(
    private redis: Redis,
    private readonly keyPrefix: string = 'rl:tb'
  ) {}

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const storeKey = `${this.keyPrefix}:${key}`;
    
    // Calculate refill rate: tokens per millisecond
    const refillRate = config.limit / config.windowMs;
    const capacity = Math.ceil(config.limit * (1 + (config.burstAllowance || 0)));
    
    try {
      const [allowedRaw, remainingRaw, nextTokenTimeRaw] = await this.redis.eval(
        this.luaScript,
        1,
        storeKey,
        capacity,
        refillRate,
        now,
        config.windowMs * 2 // Keep state longer than window
      ) as number[];

      const allowed = !!allowedRaw;
      const nextTokenTime = nextTokenTimeRaw;

      return {
        allowed,
        remaining: remainingRaw,
        resetTime: now + nextTokenTime,
        retryAfter: allowed ? undefined : Math.ceil(nextTokenTime / 1000),
        totalHits: capacity - remainingRaw,
        windowStart: now - config.windowMs,
        algorithm: 'token-bucket'
      };
    } catch (error) {
      throw new Error(`Token bucket check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }
}
```

## 4. Production-Ready Middleware

```typescript
// core/src/rate-limiting/middleware/rateLimitMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { RateLimitStore, RateLimitConfig } from '../types/RateLimit';
import { Logger } from '../../logging';
import { RateLimitMetrics } from '../metrics/RateLimitMetrics';

export interface RateLimitMiddlewareOptions {
  store: RateLimitStore;
  config: RateLimitConfig;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: Request, res: Response) => void;
  standardHeaders?: boolean; // RFC 6585 headers
  legacyHeaders?: boolean;   // X-RateLimit-* headers
}

export function rateLimitMiddleware(options: RateLimitMiddlewareOptions) {
  const {
    store,
    config,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    onLimitReached,
    standardHeaders = true,
    legacyHeaders = true
  } = options;

  const logger = Logger.getInstance();
  const metrics = new RateLimitMetrics();

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    
    try {
      // Check if we should skip this request based on previous response
      const shouldSkip = shouldSkipRequest(req, res, skipSuccessfulRequests, skipFailedRequests);
      if (shouldSkip) {
        return next();
      }

      const result = await store.check(key, config);

      // Add headers
      if (standardHeaders) {
        res.set({
          'RateLimit-Limit': String(config.limit),
          'RateLimit-Remaining': String(result.remaining),
          'RateLimit-Reset': String(Math.ceil(result.resetTime / 1000))
        });
      }

      if (legacyHeaders) {
        res.set({
          'X-RateLimit-Limit': String(config.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.resetTime)
        });
      }

      if (result.retryAfter) {
        res.set('Retry-After', String(result.retryAfter));
      }

      // Record metrics
      metrics.record({
        allowed: result.allowed,
        key: key,
        algorithm: result.algorithm,
        remaining: result.remaining
      });

      if (!result.allowed) {
        // Log security event with enhanced context
        logger.logSecurityEvent('rate_limit_exceeded', {
          key,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          algorithm: result.algorithm,
          limit: config.limit,
          windowMs: config.windowMs,
          totalHits: result.totalHits
        });

        // Call custom handler if provided
        if (onLimitReached) {
          onLimitReached(req, res);
        }

        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter
        });
      }

      next();
    } catch (error) {
      // Enhanced error handling with circuit breaker logic
      const errorMessage = error instanceof Error ? error.message : 'Unknown rate limiting error';
      
      logger.error('Rate limiter error - failing open', {
        key,
        error: errorMessage,
        ip: req.ip,
        path: req.path
      });

      metrics.recordError(errorMessage);

      // Fail open - allow the request to proceed
      next();
    }
  };
}

function defaultKeyGenerator(req: Request): string {
  // More sophisticated key generation
  const ip = req.ip || 'unknown';
  const userId = (req as any).user?.id;
  
  if (userId) {
    return `user:${userId}`;
  }
  
  return `ip:${ip}`;
}

function shouldSkipRequest(
  req: Request,
  res: Response,
  skipSuccessfulRequests: boolean,
  skipFailedRequests: boolean
): boolean {
  if (skipSuccessfulRequests && res.statusCode < 400) {
    return true;
  }
  
  if (skipFailedRequests && res.statusCode >= 400) {
    return true;
  }
  
  return false;
}
```

## 5. Enhanced Metrics and Monitoring

```typescript
// core/src/rate-limiting/metrics/RateLimitMetrics.ts
export interface RateLimitEvent {
  allowed: boolean;
  key: string;
  algorithm: string;
  remaining: number;
  timestamp?: number;
}

export class RateLimitMetrics {
  private events: RateLimitEvent[] = [];
  private errors: string[] = [];
  private readonly maxEvents = 1000;

  record(event: RateLimitEvent) {
    event.timestamp = Date.now();
    this.events.push(event);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  recordError(error: string) {
    this.errors.push(error);
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }
  }

  getDetailedSnapshot(windowMs: number = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const recentEvents = this.events.filter(e => 
      e.timestamp && e.timestamp >= windowStart
    );

    const byAlgorithm = recentEvents.reduce((acc, event) => {
      if (!acc[event.algorithm]) {
        acc[event.algorithm] = { total: 0, blocked: 0 };
      }
      acc[event.algorithm].total++;
      if (!event.allowed) {
        acc[event.algorithm].blocked++;
      }
      return acc;
    }, {} as Record<string, {total: number, blocked: number}>);

    return {
      totalRequests: recentEvents.length,
      blockedRequests: recentEvents.filter(e => !e.allowed).length,
      blockRate: recentEvents.length ? 
        recentEvents.filter(e => !e.allowed).length / recentEvents.length : 0,
      algorithmStats: byAlgorithm,
      recentErrors: this.errors.slice(-10),
      windowMs,
      timestamp: now
    };
  }

  reset() {
    this.events = [];
    this.errors = [];
  }
}
```

## 6. Configuration Factory

```typescript
// core/src/rate-limiting/factory/RateLimitFactory.ts
import { Redis } from 'ioredis';
import { RateLimitStore, RateLimitConfig } from '../types/RateLimit';
import { SlidingWindowStore } from '../algorithms/sliding-window';
import { TokenBucketStore } from '../algorithms/token-bucket';
import { FixedWindowStore } from '../algorithms/fixed-window';
import { MemoryRateLimitStore } from '../stores/MemoryRateLimitStore';

export interface RateLimitFactoryOptions {
  redis?: Redis;
  defaultToMemory?: boolean;
}

export class RateLimitFactory {
  constructor(private options: RateLimitFactoryOptions = {}) {}

  createStore(algorithm: RateLimitConfig['algorithm']): RateLimitStore {
    if (this.options.redis) {
      switch (algorithm) {
        case 'sliding-window':
          return new SlidingWindowStore(this.options.redis);
        case 'token-bucket':
          return new TokenBucketStore(this.options.redis);
        case 'fixed-window':
          return new FixedWindowStore(this.options.redis);
        default:
          throw new Error(`Unknown algorithm: ${algorithm}`);
      }
    }

    if (this.options.defaultToMemory) {
      return new MemoryRateLimitStore();
    }

    throw new Error('No Redis instance provided and memory fallback disabled');
  }

  // Predefined configurations for common use cases
  static configs = {
    // API endpoints
    api: {
      strict: { limit: 100, windowMs: 15 * 60 * 1000, algorithm: 'sliding-window' as const },
      normal: { limit: 1000, windowMs: 15 * 60 * 1000, algorithm: 'fixed-window' as const },
      burst: { limit: 1000, windowMs: 15 * 60 * 1000, algorithm: 'token-bucket' as const, burstAllowance: 0.5 }
    },
    // Authentication endpoints
    auth: {
      login: { limit: 5, windowMs: 15 * 60 * 1000, algorithm: 'fixed-window' as const },
      signup: { limit: 3, windowMs: 60 * 60 * 1000, algorithm: 'fixed-window' as const },
      resetPassword: { limit: 3, windowMs: 60 * 60 * 1000, algorithm: 'fixed-window' as const }
    },
    // Content creation
    content: {
      upload: { limit: 10, windowMs: 60 * 1000, algorithm: 'token-bucket' as const },
      post: { limit: 50, windowMs: 60 * 60 * 1000, algorithm: 'sliding-window' as const }
    }
  };
}
```

## Key Improvements Summary

The refined implementation addresses several critical areas:

**Atomicity and Race Conditions**: The Lua scripts ensure atomic operations in Redis, preventing race conditions that could occur with multiple Redis calls.

**Enhanced Observability**: The metrics system now tracks algorithm-specific performance, error rates, and provides detailed snapshots for monitoring.

**Flexible Configuration**: The factory pattern makes it easy to switch between algorithms and provides predefined configurations for common scenarios.

**Production Resilience**: Better error handling, health checks, and fail-open behavior ensure the system degrades gracefully under load.

**Standards Compliance**: Support for both RFC 6585 standard headers and legacy X-RateLimit headers improves compatibility.

These optimizations make the rate limiting system more robust, observable, and suitable for production environments while maintaining the clean architecture of the original design.
