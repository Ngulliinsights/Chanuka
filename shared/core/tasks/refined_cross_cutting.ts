// -----------------------------------------------------------------------------
// 7. ENHANCED RATE LIMITING WITH MULTIPLE ALGORITHMS
// -----------------------------------------------------------------------------

// core/rate-limit/RateLimiter.ts
export interface RateLimitStore {
  hit(key: string, max: number, windowMs: number, algorithm?: string): Promise<{ 
    allowed: boolean; 
    remaining: number; 
    resetTime: Date;
    retryAfter: number;
  }>;
  getMetrics?(): RateLimitMetrics;
}

export interface RateLimitMetrics {
  totalRequests: number;
  blockedRequests: number;
  blockRate: number;
  avgProcessingTime: number;
}

export class RedisRateLimitStore implements RateLimitStore {
  private redis: Redis;
  private scripts: Map<string, string> = new Map();
  private metrics: RateLimitMetrics = {
    totalRequests: 0,
    blockedRequests: 0,
    blockRate: 0,
    avgProcessingTime: 0,
  };
  private processingTimes: number[] = [];

  constructor(redis: Redis) {
    this.redis = redis;
    this.initializeScripts();
  }

  private initializeScripts() {
    // Sliding window algorithm
    this.scripts.set('sliding-window', `
      local key = KEYS[1]
      local max = tonumber(ARGV[1])
      local window = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local uuid = ARGV[4]
      
      -- Remove expired entries
      redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
      
      -- Count current entries
      local current = redis.call('ZCARD', key)
      
      if current < max then
        -- Add current timestamp with unique identifier
        redis.call('ZADD', key, now, uuid)
        redis.call('EXPIRE', key, math.ceil(window / 1000))
        return {1, max - current - 1, now + window}
      else
        -- Get the oldest entry for reset time calculation
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local resetTime = oldest[2] and (tonumber(oldest[2]) + window) or (now + window)
        return {0, 0, resetTime}
      end
    `);

    // Token bucket algorithm
    this.scripts.set('token-bucket', `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refill_rate = tonumber(ARGV[2])
      local requested = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])
      
      local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
      local tokens = tonumber(bucket[1]) or capacity
      local last_refill = tonumber(bucket[2]) or now
      
      -- Calculate tokens to add based on time elapsed
      local elapsed = (now - last_refill) / 1000
      local tokens_to_add = math.floor(elapsed * refill_rate)
      tokens = math.min(capacity, tokens + tokens_to_add)
      
      if tokens >= requested then
        tokens = tokens - requested
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
        redis.call('EXPIRE', key, capacity / refill_rate * 2)
        return {1, tokens, now + ((requested - tokens) / refill_rate * 1000)}
      else
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
        redis.call('EXPIRE', key, capacity / refill_rate * 2)
        local wait_time = ((requested - tokens) / refill_rate * 1000)
        return {0, tokens, now + wait_time}
      end
    `);

    // Fixed window algorithm
    this.scripts.set('fixed-window', `
      local key = KEYS[1]
      local max = tonumber(ARGV[1])
      local window = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      
      local window_start = math.floor(now / window) * window
      local window_key = key .. ':' .. window_start
      
      local current = redis.call('GET', window_key)
      current = current and tonumber(current) or 0
      
      if current < max then
        local new_count = redis.call('INCR', window_key)
        if new_count == 1 then
          redis.call('EXPIRE', window_key, math.ceil(window / 1000))
        end
        return {1, max - new_count, window_start + window}
      else
        return {0, 0, window_start + window}
      end
    `);
  }

  async hit(key: string, max: number, windowMs: number, algorithm = 'sliding-window'): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    retryAfter: number;
  }> {
    const start = performance.now();
    this.metrics.totalRequests++;

    try {
      const script = this.scripts.get(algorithm);
      if (!script) {
        throw new Error(`Unknown rate limiting algorithm: ${algorithm}`);
      }

      let result: [number, number, number];
      const now = Date.now();

      switch (algorithm) {
        case 'sliding-window':
          result = await this.redis.eval(
            script,
            1,
            key,
            max.toString(),
            windowMs.toString(),
            now.toString(),
            crypto.randomUUID()
          ) as [number, number, number];
          break;

        case 'token-bucket':
          const refillRate = max / (windowMs / 1000); // tokens per second
          result = await this.redis.eval(
            script,
            1,
            key,
            max.toString(),
            refillRate.toString(),
            '1',
            now.toString()
          ) as [number, number, number];
          break;

        case 'fixed-window':
        default:
          result = await this.redis.eval(
            script,
            1,
            key,
            max.toString(),
            windowMs.toString(),
            now.toString()
          ) as [number, number, number];
          break;
      }

      const allowed = result[0] === 1;
      const remaining = result[1];
      const resetTime = new Date(result[2]);
      const retryAfter = Math.ceil((result[2] - now) / 1000);

      if (!allowed) {
        this.metrics.blockedRequests++;
      }

      this.updateMetrics(performance.now() - start);

      return {
        allowed,
        remaining,
        resetTime,
        retryAfter: Math.max(0, retryAfter),
      };
    } catch (error) {
      logger.error({ err: error, key, algorithm }, 'Rate limit store error');
      // Fail open - allow request if rate limiter fails
      return {
        allowed: true,
        remaining: max,
        resetTime: new Date(Date.now() + windowMs),
        retryAfter: 0,
      };
    }
  }

  private updateMetrics(processingTime: number) {
    this.processingTimes.push(processingTime);
    
    // Keep only last 1000 measurements
    if (this.processingTimes.length > 1000) {
      this.processingTimes.shift();
    }
    
    this.metrics.avgProcessingTime = 
      this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
    
    this.metrics.blockRate = this.metrics.totalRequests > 0 
      ? this.metrics.blockedRequests / this.metrics.totalRequests 
      : 0;
  }

  getMetrics(): RateLimitMetrics {
    return { ...this.metrics };
  }
}

export class MemoryRateLimitStore implements RateLimitStore {
  private windows = new Map<string, any>();
  private metrics: RateLimitMetrics = {
    totalRequests: 0,
    blockedRequests: 0,
    blockRate: 0,
    avgProcessingTime: 0,
  };

  async hit(key: string, max: number, windowMs: number, algorithm = 'sliding-window'): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    retryAfter: number;
  }> {
    const start = performance.now();
    this.metrics.totalRequests++;

    try {
      let result: { allowed: boolean; remaining: number; resetTime: Date };

      switch (algorithm) {
        case 'sliding-window':
          result = this.slidingWindowCheck(key, max, windowMs);
          break;
        case 'token-bucket':
          result = this.tokenBucketCheck(key, max, windowMs);
          break;
        case 'fixed-window':
        default:
          result = this.fixedWindowCheck(key, max, windowMs);
          break;
      }

      if (!result.allowed) {
        this.metrics.blockedRequests++;
      }

      const processingTime = performance.now() - start;
      this.metrics.avgProcessingTime = 
        (this.metrics.avgProcessingTime * (this.metrics.totalRequests - 1) + processingTime) / 
        this.metrics.totalRequests;

      this.metrics.blockRate = this.metrics.blockedRequests / this.metrics.totalRequests;

      return {
        ...result,
        retryAfter: Math.ceil((result.resetTime.getTime() - Date.now()) / 1000),
      };
    } catch (error) {
      logger.error({ err: error, key }, 'Memory rate limit error');
      return {
        allowed: true,
        remaining: max,
        resetTime: new Date(Date.now() + windowMs),
        retryAfter: 0,
      };
    }
  }

  private slidingWindowCheck(key: string, max: number, windowMs: number) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.windows.has(key)) {
      this.windows.set(key, []);
    }
    
    const window = this.windows.get(key);
    const validEntries = window.filter((timestamp: number) => timestamp > windowStart);
    
    if (validEntries.length < max) {
      validEntries.push(now);
      this.windows.set(key, validEntries);
      
      return {
        allowed: true,
        remaining: max - validEntries.length,
        resetTime: new Date(validEntries[0] + windowMs),
      };
    }
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(validEntries[0] + windowMs),
    };
  }

  private tokenBucketCheck(key: string, max: number, windowMs: number) {
    const now = Date.now();
    const refillRate = max / (windowMs / 1000); // tokens per second
    
    if (!this.windows.has(key)) {
      this.windows.set(key, { tokens: max, lastRefill: now });
    }
    
    const bucket = this.windows.get(key);
    const elapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = Math.floor(elapsed * refillRate);
    
    bucket.tokens = Math.min(max, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
    
    if (bucket.tokens >= 1) {
      bucket.tokens--;
      this.windows.set(key, bucket);
      
      return {
        allowed: true,
        remaining: bucket.tokens,
        resetTime: new Date(now + ((1 - bucket.tokens) / refillRate * 1000)),
      };
    }
    
    return {
      allowed: false,
      remaining: bucket.tokens,
      resetTime: new Date(now + (1 / refillRate * 1000)),
    };
  }

  private fixedWindowCheck(key: string, max: number, windowMs: number) {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const windowKey = `${key}:${windowStart}`;
    
    if (!this.windows.has(windowKey)) {
      this.windows.set(windowKey, 0);
      // Set cleanup for this window
      setTimeout(() => this.windows.delete(windowKey), windowMs);
    }
    
    const current = this.windows.get(windowKey);
    
    if (current < max) {
      this.windows.set(windowKey, current + 1);
      return {
        allowed: true,
        remaining: max - current - 1,
        resetTime: new Date(windowStart + windowMs),
      };
    }
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(windowStart + windowMs),
    };
  }

  getMetrics(): RateLimitMetrics {
    return { ...this.metrics };
  }
}

export class RateLimiter {
  private store: RateLimitStore;
  private algorithm: string;

  constructor(store: RateLimitStore, algorithm = 'sliding-window') {
    this.store = store;
    this.algorithm = algorithm;
  }

  async checkLimit(key: string, max: number, windowMs: number, algorithm?: string) {
    return this.store.hit(key, max, windowMs, algorithm || this.algorithm);
  }

  getMetrics() {
    return this.store.getMetrics?.() || null;
  }
}

// Enhanced factory with algorithm selection
export function createRateLimiter(): RateLimiter {
  const store = config.rateLimit.provider === 'redis'
    ? new RedisRateLimitStore(new Redis(config.cache.redisUrl))
    : new MemoryRateLimitStore();
    
  return new RateLimiter(store, config.rateLimit.algorithm);
}

export const rateLimiter = createRateLimiter();

// Enhanced middleware with burst allowance and adaptive limits
export function rateLimitMiddleware(options?: {
  max?: number;
  windowMs?: number;
  algorithm?: string;
  keyGenerator?: (req: any) => string;
  skipIf?: (req: any) => boolean;
  onLimitReached?: (req: any, res: any) => void;
}) {
  const opts = {
    max: config.rateLimit.defaultMax,
    windowMs: config.rateLimit.defaultWindowMs,
    algorithm: config.rateLimit.algorithm,
    ...options,
  };
  
  return async (req: any, res: any, next: any) => {
    // Skip if condition met
    if (opts.skipIf && opts.skipIf(req)) {
      return next();
    }

    // Generate rate limit key
    const key = opts.keyGenerator 
      ? opts.keyGenerator(req)
      : config.security.rateLimitByIp 
        ? `rate_limit:${req.ip}:${req.route?.path || req.path}` 
        : `rate_limit:${req.user?.id || req.ip}:${req.route?.path || req.path}`;
    
    try {
      // Calculate burst allowance
      const burstMax = Math.floor(opts.max * (1 + config.rateLimit.burstAllowance));
      
      const result = await rateLimiter.checkLimit(
        key, 
        burstMax, 
        opts.windowMs, 
        opts.algorithm
      );
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': opts.max.toString(),
        'X-RateLimit-Remaining': Math.max(0, result.remaining).toString(),
        'X-RateLimit-Reset': result.resetTime.toISOString(),
        'X-RateLimit-RetryAfter': result.retryAfter.toString(),
      });
      
      if (!result.allowed) {
        // Log rate limit violation
        logger.logSecurityEvent('rate_limit_exceeded', {
          key,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          path: req.path,
          method: req.method,
        });

        // Call custom handler if provided
        if (opts.onLimitReached) {
          opts.onLimitReached(req, res);
        }

        const errorBody = config.rateLimit.legacyResponseBody
          ? { 
              message: 'Too many requests',
              retryAfter: result.retryAfter,
              resetTime: result.resetTime.toISOString(),
            }
          : { 
              error: 'Rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: result.retryAfter,
            };
          
        res.set('Retry-After', result.retryAfter.toString());
        return res.status(429).json(errorBody);
      }
      
      next();
    } catch (err) {
      // Fail open on rate limiter errors
      logger.warn({ err, key }, 'Rate limiter error, failing open');
      next();
    }
  };
}

// Enhanced decorator with multiple limit types
export function RateLimit(options: {
  max: number;
  windowMs: number;
  algorithm?: string;
  keyGenerator?: (...args: any[]) => string;
  skipCondition?: (...args: any[]) => boolean;
}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // Skip if condition met
      if (options.skipCondition && options.skipCondition(...args)) {
        return originalMethod.apply(this, args);
      }

      const req = args.find(arg => arg && typeof arg === 'object' && arg.ip);
      const identifier = req?.ip || 'anonymous';
      
      const key = options.keyGenerator 
        ? options.keyGenerator(...args)
        : `${target.constructor.name}:${propertyKey}:${identifier}`;
        
      const result = await rateLimiter.checkLimit(
        key, 
        options.max, 
        options.windowMs, 
        options.algorithm
      );
      
      if (!result.allowed) {
        const error = new Error('Rate limit exceeded') as any;
        error.status = 429;
        error.remaining = result.remaining;
        error.resetTime = result.resetTime;
        error.retryAfter = result.retryAfter;
        throw error;
      }
      
      return originalMethod.apply(this, args);
    };
  };
}

// -----------------------------------------------------------------------------
// 8. COMPREHENSIVE ERROR HANDLING & CIRCUIT BREAKER
// -----------------------------------------------------------------------------

// core/error-handling/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors: any[]) {
    super(message, 422, 'VALIDATION_ERROR', { errors });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    super(
      identifier ? `${resource} with id '${identifier}' not found` : `${resource} not found`,
      404, 
      'NOT_FOUND',
      { resource, identifier }
    );
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions', requiredPermissions?: string[]) {
    super(message, 403, 'FORBIDDEN', { requiredPermissions });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, conflictingResource?: string) {
    super(message, 409, 'CONFLICT', { conflictingResource });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(retryAfter: number) {
    super('Too many requests', 429, 'TOO_MANY_REQUESTS', { retryAfter });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string, retryAfter?: number) {
    super(`Service ${service} is currently unavailable`, 503, 'SERVICE_UNAVAILABLE', {
      service,
      retryAfter,
    });
  }
}

// Enhanced circuit breaker with adaptive thresholds
export class CircuitBreaker {
  private failures = 0;
  private successes = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private nextAttempt = 0;
  private responseTimeWindow: number[] = [];
  private adaptiveThreshold: number;

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private successThreshold: number = 3,
    private slowCallThreshold: number = 5000,
    private slowCallRateThreshold: number = 0.5
  ) {
    this.adaptiveThreshold = threshold;
  }

  async call<T>(fn: () => Promise<T>, timeoutMs?: number): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttempt) {
        throw new ServiceUnavailableError('Circuit breaker', Math.ceil((this.nextAttempt - Date.now()) / 1000));
      }
      this.state = 'half-open';
      this.successes = 0;
    }

    const start = performance.now();
    
    try {
      const result = timeoutMs 
        ? await Promise.race([
            fn(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
            )
          ])
        : await fn();

      const duration = performance.now() - start;
      this.onSuccess(duration);
      return result;
    } catch (err) {
      const duration = performance.now() - start;
      this.onFailure(duration);
      throw err;
    }
  }

  private onSuccess(duration: number) {
    this.failures = 0;
    this.successes++;
    this.updateResponseTime(duration);
    
    if (this.state === 'half-open' && this.successes >= this.successThreshold) {
      this.state = 'closed';
      this.adaptiveThreshold = Math.max(this.threshold, this.adaptiveThreshold - 1);
    }
  }

  private onFailure(duration: number) {
    this.failures++;
    this.successes = 0;
    this.updateResponseTime(duration);
    
    // Adaptive threshold based on slow calls
    const slowCallRate = this.calculateSlowCallRate();
    if (slowCallRate > this.slowCallRateThreshold) {
      this.adaptiveThreshold = Math.min(this.threshold * 2, this.adaptiveThreshold + 1);
    }
    
    if (this.failures >= this.adaptiveThreshold) {
      this.state = 'open';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }

  private updateResponseTime(duration: number) {
    this.responseTimeWindow.push(duration);
    if (this.responseTimeWindow.length > 100) {
      this.responseTimeWindow.shift();
    }
  }

  private calculateSlowCallRate(): number {
    if (this.responseTimeWindow.length === 0) return 0;
    
    const slowCalls = this.responseTimeWindow.filter(t => t > this.slowCallThreshold).length;
    return slowCalls / this.responseTimeWindow.length;
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      nextAttempt: this.nextAttempt,
      adaptiveThreshold: this.adaptiveThreshold,
      slowCallRate: this.calculateSlowCallRate(),
      avgResponseTime: this.responseTimeWindow.length > 0
        ? this.responseTimeWindow.reduce((a, b) => a + b, 0) / this.responseTimeWindow.length
        : 0,
    };
  }
}

// Enhanced unified error handling middleware with context preservation
export function unifiedErrorHandler() {
  return (err: any, req: any, res: any, next: any) => {
    if (res.headersSent) {
      return next(err);
    }
    
    // Preserve async context for logging
    logger.withContext({ 
      requestId: req.headers['x-request-id'],
      userId: req.user?.id,
    }, () => {
      // Log error with full context
      if (config.errors.logErrors) {
        const logLevel = err.isOperational ? 'warn' : 'error';
        logger[logLevel]({
          err: {
            name: err.name,
            message: err.message,
            stack: err.stack?.split('\n').slice(0, config.errors.maxStackTraceDepth),
            code: err.code,
            statusCode: err.statusCode,
            isOperational: err.isOperational,
          },
          req: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.method !== 'GET' ? req.body : undefined,
            query: req.query,
            params: req.params,
            ip: req.ip,
            userAgent: req.get('user-agent'),
          },
        }, 'Request error occurred');
      }
    });
    
    // Report to external monitoring if configured
    if (config.errors.reportToSentry && config.errors.sentryDsn && !err.isOperational) {
      // In real implementation, this would send to Sentry
      logger.info({ err }, 'Error reported to Sentry');
    }
    
    // Handle known error types
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        error: {
          message: err.message,
          code: err.code,
          ...(config.errors.includeStack && !err.isOperational && { 
            stack: err.stack?.split('\n').slice(0, 10) 
          }),
          ...(err.details && { details: err.details }),
        },
      });
    }
    
    // Handle validation errors from different libraries
    if (err.name === 'ValidationError' || err.errors || err.details?.errors) {
      return res.status(422).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: err.errors || err.details?.errors || [{ message: err.message }],
        },
      });
    }
    
    // Handle JWT errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          message: 'Invalid or expired token',
          code: 'TOKEN_ERROR',
        },
      });
    }
    
    // Handle database constraint errors
    if (err.code === '23505' || err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: {
          message: 'Resource already exists',
          code: 'DUPLICATE_ERROR',
          field: err.fields?.[0] || 'unknown',
        },
      });
    }
    
    // Default error response
    const statusCode = err.statusCode || err.status || 500;
    const message = statusCode === 500 ? 'Internal server error' : err.message;
    
    res.status(statusCode).json({
      error: {
        message,
        code: err.code || 'INTERNAL_ERROR',
        ...(config.errors.includeStack && statusCode === 500 && { 
          stack: err.stack?.split('\n').slice(0, 5) 
        }),
      },
    });
  };
}

// Global unhandled error handlers
export function setupGlobalErrorHandlers() {
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception - shutting down');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled promise rejection');
    // Don't exit on unhandled rejections in production
    if (config.app.environment !== 'production') {
      process.exit(1);
    }
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received - shutting down gracefully');
    // Implement graceful shutdown logic here
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received - shutting down gracefully');
    process.exit(0);
  });
}

// Error boundary decorator for async operations
export function ErrorBoundary(options: {
  fallback?: any;
  logError?: boolean;
  rethrow?: boolean;
  circuitBreaker?: CircuitBreaker;
} = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      try {
        const operation = () => originalMethod.apply(this, args);
        
        return options.circuitBreaker 
          ? await options.circuitBreaker.call(operation)
          : await operation();
      } catch (error) {
        if (options.logError !== false) {
          logger.error({ 
            err: error, 
            method: `${target.constructor.name}.${propertyKey}`,
            args: args.length,
          }, 'Method execution failed');
        }
        
        if (options.rethrow !== false) {
          throw error;
        }
        
        return options.fallback;
      }
    };
  };
}// =============================================================================
// REFINED CROSS-CUTTING CONCERNS IMPLEMENTATION
// Enhanced with validation, better error handling, and performance optimizations
// =============================================================================

// -----------------------------------------------------------------------------
// 1. ENHANCED CONFIGURATION WITH SCHEMA VALIDATION
// -----------------------------------------------------------------------------

// core/shared/config.ts
import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv-expand';
import { watchFile } from 'chokidar';
import { EventEmitter } from 'events';

// Enhanced schema with more comprehensive validation
const configSchema = z.object({
  // Environment and application settings
  app: z.object({
    name: z.string().default('app'),
    version: z.string().default('1.0.0'),
    environment: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    port: z.coerce.number().min(1).max(65535).default(3000),
    host: z.string().default('localhost'),
  }),

  // Cache configuration with validation
  cache: z.object({
    provider: z.enum(['redis', 'memory', 'cloudflare-kv']).default('redis'),
    defaultTtlSec: z.coerce.number().min(1).max(86400).default(300), // Max 24 hours
    redisUrl: z.string().url().default('redis://localhost:6379'),
    legacyCompression: z.coerce.boolean().default(true),
    legacyPrefixing: z.coerce.boolean().default(true),
    maxMemoryMB: z.coerce.number().min(1).max(1000).default(100), // Max 1GB
    compressionThreshold: z.coerce.number().min(100).default(1024), // Compress if > 1KB
  }),
  
  // Enhanced logging configuration  
  log: z.object({
    level: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    pretty: z.coerce.boolean().default(process.env.NODE_ENV !== 'production'),
    redactPaths: z.array(z.string()).default(['*.password', '*.token', '*.ssn', '*.creditCard']),
    asyncTransport: z.coerce.boolean().default(true),
    maxFileSize: z.string().regex(/^\d+[kmg]b?$/i).default('10mb'), // e.g., "10mb", "1gb"
    maxFiles: z.coerce.number().min(1).default(5),
    enableMetrics: z.coerce.boolean().default(true),
  }),
  
  // Enhanced rate limiting with algorithm selection
  rateLimit: z.object({
    provider: z.enum(['redis', 'memory']).default('redis'),
    defaultMax: z.coerce.number().min(1).max(10000).default(100),
    defaultWindowMs: z.coerce.number().min(1000).max(3600000).default(60000), // 1s to 1h
    legacyResponseBody: z.coerce.boolean().default(true),
    algorithm: z.enum(['sliding-window', 'token-bucket', 'fixed-window']).default('sliding-window'),
    burstAllowance: z.coerce.number().min(0).max(1).default(0.2), // 20% burst
    enableDistributedMode: z.coerce.boolean().default(false),
  }),
  
  // Error handling with enhanced options
  errors: z.object({
    includeStack: z.coerce.boolean().default(process.env.NODE_ENV !== 'production'),
    logErrors: z.coerce.boolean().default(true),
    reportToSentry: z.coerce.boolean().default(false),
    sentryDsn: z.string().url().optional(),
    maxStackTraceDepth: z.coerce.number().min(5).max(50).default(20),
    enableCircuitBreaker: z.coerce.boolean().default(true),
    circuitBreakerThreshold: z.coerce.number().min(1).max(20).default(5),
    circuitBreakerTimeout: z.coerce.number().min(1000).max(300000).default(60000),
  }),
  
  // Enhanced security configuration
  security: z.object({
    jwtSecret: z.string().min(32),
    jwtExpiryHours: z.coerce.number().min(1).max(168).default(24), // Max 1 week
    jwtRefreshExpiryHours: z.coerce.number().min(24).max(720).default(168), // Default 1 week
    bcryptRounds: z.coerce.number().min(10).max(15).default(12),
    corsOrigins: z.array(z.string().url()).default(['http://localhost:3000']),
    rateLimitByIp: z.coerce.boolean().default(true),
    enableCsrf: z.coerce.boolean().default(true),
    sessionSecret: z.string().min(32).optional(),
    maxRequestSize: z.string().regex(/^\d+[kmg]b?$/i).default('10mb'),
  }),
  
  // Enhanced storage configuration
  storage: z.object({
    provider: z.enum(['local', 's3', 'cloudflare-r2', 'gcs']).default('local'),
    localPath: z.string().default('./uploads'),
    maxFileSizeMB: z.coerce.number().min(1).max(100).default(10),
    allowedMimeTypes: z.array(z.string()).default([
      'image/jpeg', 'image/png', 'image/webp', 
      'application/pdf', 'text/plain', 'application/json'
    ]),
    enableVirusScanning: z.coerce.boolean().default(false),
    compressionQuality: z.coerce.number().min(1).max(100).default(85),
  }),

  // Database configuration
  database: z.object({
    url: z.string().url(),
    maxConnections: z.coerce.number().min(1).max(100).default(10),
    connectionTimeout: z.coerce.number().min(1000).max(30000).default(5000),
    enableQueryLogging: z.coerce.boolean().default(false),
    enableSlowQueryLogging: z.coerce.boolean().default(true),
    slowQueryThreshold: z.coerce.number().min(100).default(1000),
  }),
  
  // Feature flags with metadata
  features: z.record(z.object({
    enabled: z.coerce.boolean(),
    description: z.string().optional(),
    rolloutPercentage: z.coerce.number().min(0).max(100).default(100),
    enabledForUsers: z.array(z.string()).default([]),
  })).default({
    newAuth: { enabled: false, description: 'New authentication system' },
    advancedSearch: { enabled: false, description: 'Enhanced search capabilities' },
    imageOptimization: { enabled: true, description: 'Automatic image optimization' },
  }),

  // Monitoring and observability
  monitoring: z.object({
    enableHealthCheck: z.coerce.boolean().default(true),
    healthCheckPath: z.string().default('/health'),
    enableMetrics: z.coerce.boolean().default(true),
    metricsPath: z.string().default('/metrics'),
    enableTracing: z.coerce.boolean().default(false),
    tracingSampleRate: z.coerce.number().min(0).max(1).default(0.1),
  }),
});

// Type inference for better TypeScript support
export type AppConfig = z.infer<typeof configSchema>;

class ConfigManager extends EventEmitter {
  private _config: AppConfig;
  private watchingFiles = new Set<string>();
  private validationCache = new Map<string, boolean>();

  constructor() {
    super();
    this.loadConfiguration();
    
    // Hot reload in development
    if (process.env.NODE_ENV === 'development') {
      this.watchEnvFiles();
    }
  }

  private loadConfiguration() {
    try {
      // Load environment variables with cascading priority
      dotenvConfig({ path: this.getEnvFilePath() });
      
      // Parse and validate configuration
      const parsed = configSchema.safeParse(process.env);
      
      if (!parsed.success) {
        const errors = parsed.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        throw new Error(`Configuration validation failed: ${errors}`);
      }
      
      this._config = parsed.data;
      
      // Validate runtime dependencies
      this.validateRuntimeDependencies();
      
    } catch (error) {
      logger.error('Configuration initialization failed:', { component: 'Chanuka' }, error);
      process.exit(1);
    }
  }

  private getEnvFilePath(): string {
    const env = process.env.NODE_ENV || 'development';
    const envFiles = ['.env', `.env.${env}`, '.env.local'];
    
    // Return the first existing file
    return envFiles.find(file => {
      try {
        require('fs').accessSync(file);
        return true;
      } catch {
        return false;
      }
    }) || '.env';
  }

  private validateRuntimeDependencies() {
    // Validate Redis connection if using Redis
    if (this._config.cache.provider === 'redis') {
      this.validateRedisConnection();
    }
    
    // Validate database connection
    this.validateDatabaseConnection();
    
    // Validate external service dependencies
    this.validateExternalServices();
  }

  private async validateRedisConnection() {
    // This would typically test the Redis connection
    // For now, we'll just validate the URL format
    try {
      new URL(this._config.cache.redisUrl);
    } catch {
      throw new Error('Invalid Redis URL format');
    }
  }

  private async validateDatabaseConnection() {
    try {
      new URL(this._config.database.url);
    } catch {
      throw new Error('Invalid database URL format');
    }
  }

  private validateExternalServices() {
    // Validate Sentry DSN if configured
    if (this._config.errors.reportToSentry && this._config.errors.sentryDsn) {
      try {
        new URL(this._config.errors.sentryDsn);
      } catch {
        throw new Error('Invalid Sentry DSN format');
      }
    }
  }

  get config(): AppConfig {
    return this._config;
  }

  // Feature flag helper with rollout support
  isFeatureEnabled(featureName: string, userId?: string): boolean {
    const feature = this._config.features[featureName];
    if (!feature) return false;
    
    if (!feature.enabled) return false;
    
    // Check if user is specifically enabled
    if (userId && feature.enabledForUsers.includes(userId)) {
      return true;
    }
    
    // Check rollout percentage
    if (feature.rolloutPercentage < 100) {
      const hash = this.hashString(`${featureName}-${userId || 'anonymous'}`);
      return (hash % 100) < feature.rolloutPercentage;
    }
    
    return true;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  configure(overrides: Partial<AppConfig>) {
    const merged = { ...this._config, ...overrides };
    const parsed = configSchema.safeParse(merged);
    
    if (!parsed.success) {
      throw new Error(`Configuration update failed: ${parsed.error.message}`);
    }
    
    this._config = parsed.data;
    this.emit('config:changed', this._config);
  }

  private watchEnvFiles() {
    const envFiles = ['.env', '.env.local', '.env.development'];
    
    envFiles.forEach(file => {
      if (!this.watchingFiles.has(file)) {
        this.watchingFiles.add(file);
        watchFile(file, () => {
          try {
            this.loadConfiguration();
            this.emit('config:changed', this._config);
          } catch (err) {
            this.emit('config:error', err);
          }
        });
      }
    });
  }
}

export const configManager = new ConfigManager();
export const config = configManager.config;

// -----------------------------------------------------------------------------
// 2. COMPREHENSIVE VALIDATION MODULE
// -----------------------------------------------------------------------------

// core/validation/index.ts
import { z, ZodSchema, ZodError } from 'zod';

// Common validation schemas that can be reused
export const commonSchemas = {
  // UUID validation
  uuid: z.string().uuid(),
  
  // Email with comprehensive validation
  email: z.string()
    .email()
    .max(254) // RFC 5321 limit
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'),
  
  // Password with security requirements
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  
  // Phone number (international format)
  phone: z.string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Must be a valid international phone number starting with +'),
  
  // URL with protocol validation
  url: z.string()
    .url()
    .refine(url => ['http:', 'https:'].includes(new URL(url).protocol), 
      'Only HTTP and HTTPS protocols are allowed'),
  
  // Date range validation
  dateRange: z.object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  }).refine(data => data.end > data.start, {
    message: 'End date must be after start date',
    path: ['end'],
  }),
  
  // Pagination parameters
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
  
  // File upload validation
  fileUpload: z.object({
    filename: z.string().min(1).max(255),
    mimetype: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/),
    size: z.number().min(1).max(config.storage.maxFileSizeMB * 1024 * 1024),
  }),
  
  // Search query validation
  searchQuery: z.object({
    q: z.string().min(1).max(1000).trim(),
    filters: z.record(z.any()).optional(),
    facets: z.array(z.string()).optional(),
  }),
};

// Validation error class with detailed information
export class ValidationError extends Error {
  public readonly errors: ValidationErrorDetail[];
  public readonly statusCode = 422;

  constructor(zodError: ZodError) {
    const errors = zodError.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      received: err.received,
    }));
    
    super(`Validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`);
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  received?: any;
}

// Validation service with caching and preprocessing
export class ValidationService {
  private schemaCache = new Map<string, ZodSchema>();
  private resultCache = new Map<string, { result: any; timestamp: number }>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  // Register a reusable schema
  registerSchema(name: string, schema: ZodSchema) {
    this.schemaCache.set(name, schema);
  }

  // Get a registered schema
  getSchema(name: string): ZodSchema | undefined {
    return this.schemaCache.get(name);
  }

  // Validate data with comprehensive error handling
  async validate<T>(schema: ZodSchema<T>, data: unknown, options?: {
    stripUnknown?: boolean;
    enableCache?: boolean;
    cacheKey?: string;
  }): Promise<T> {
    const opts = { stripUnknown: true, enableCache: false, ...options };
    
    // Check cache if enabled
    if (opts.enableCache && opts.cacheKey) {
      const cached = this.getCachedResult(opts.cacheKey);
      if (cached) return cached as T;
    }
    
    try {
      // Preprocess data
      const preprocessed = this.preprocessData(data);
      
      // Validate with Zod
      const result = opts.stripUnknown 
        ? schema.parse(preprocessed)
        : schema.strict().parse(preprocessed);
      
      // Cache result if enabled
      if (opts.enableCache && opts.cacheKey) {
        this.setCachedResult(opts.cacheKey, result);
      }
      
      return result;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(error);
      }
      throw error;
    }
  }

  // Validate data and return result with success flag
  async validateSafe<T>(schema: ZodSchema<T>, data: unknown): Promise<{
    success: boolean;
    data?: T;
    errors?: ValidationErrorDetail[];
  }> {
    try {
      const result = await this.validate(schema, data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { success: false, errors: error.errors };
      }
      throw error;
    }
  }

  // Validate multiple objects with the same schema
  async validateBatch<T>(schema: ZodSchema<T>, dataArray: unknown[]): Promise<{
    valid: T[];
    invalid: Array<{ index: number; errors: ValidationErrorDetail[] }>;
  }> {
    const valid: T[] = [];
    const invalid: Array<{ index: number; errors: ValidationErrorDetail[] }> = [];
    
    await Promise.all(
      dataArray.map(async (data, index) => {
        const result = await this.validateSafe(schema, data);
        if (result.success && result.data) {
          valid.push(result.data);
        } else if (result.errors) {
          invalid.push({ index, errors: result.errors });
        }
      })
    );
    
    return { valid, invalid };
  }

  // Data preprocessing for common issues
  private preprocessData(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }
    
    if (typeof data === 'string') {
      // Trim whitespace
      const trimmed = data.trim();
      
      // Convert string numbers
      if (/^\d+$/.test(trimmed)) {
        return parseInt(trimmed, 10);
      }
      if (/^\d+\.\d+$/.test(trimmed)) {
        return parseFloat(trimmed);
      }
      
      // Convert boolean strings
      if (trimmed.toLowerCase() === 'true') return true;
      if (trimmed.toLowerCase() === 'false') return false;
      
      return trimmed;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.preprocessData(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const processed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        processed[key] = this.preprocessData(value);
      }
      return processed;
    }
    
    return data;
  }

  private getCachedResult(key: string): unknown | null {
    const cached = this.resultCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }
    this.resultCache.delete(key);
    return null;
  }

  private setCachedResult(key: string, result: unknown) {
    this.resultCache.set(key, { result, timestamp: Date.now() });
  }

  // Clean up expired cache entries
  private cleanupCache() {
    const now = Date.now();
    for (const [key, cached] of this.resultCache.entries()) {
      if (now - cached.timestamp >= this.cacheTimeout) {
        this.resultCache.delete(key);
      }
    }
  }
}

// Global validation service instance
export const validationService = new ValidationService();

// Register common schemas
Object.entries(commonSchemas).forEach(([name, schema]) => {
  validationService.registerSchema(name, schema);
});

// Express middleware for request validation
export function validateRequest(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}) {
  return async (req: any, res: any, next: any) => {
    try {
      // Validate each part of the request
      if (schemas.body && req.body) {
        req.body = await validationService.validate(schemas.body, req.body);
      }
      
      if (schemas.query && req.query) {
        req.query = await validationService.validate(schemas.query, req.query);
      }
      
      if (schemas.params && req.params) {
        req.params = await validationService.validate(schemas.params, req.params);
      }
      
      if (schemas.headers && req.headers) {
        req.headers = await validationService.validate(schemas.headers, req.headers, {
          stripUnknown: false // Don't strip headers
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Validation decorator for methods
export function Validate(schema: ZodSchema, paramIndex: number = 0) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      try {
        // Validate the specified parameter
        args[paramIndex] = await validationService.validate(schema, args[paramIndex]);
        return await originalMethod.apply(this, args);
      } catch (error) {
        if (error instanceof ValidationError) {
          throw error;
        }
        throw new Error(`Validation failed in ${target.constructor.name}.${propertyKey}: ${error.message}`);
      }
    };
    
    return descriptor;
  };
}

// -----------------------------------------------------------------------------
// 3. OPTIMIZED CACHE SERVICE WITH PERFORMANCE ENHANCEMENTS
// -----------------------------------------------------------------------------

// core/cache/index.ts
import Redis from 'ioredis';
import { compress, decompress } from 'zlib';
import { promisify } from 'util';
import { performance } from 'perf_hooks';

const compressAsync = promisify(compress);
const decompressAsync = promisify(decompress);

// Enhanced cache interface with metrics
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSec?: number): Promise<void>;
  del(key: string): Promise<void>;
  flush?(): Promise<void>;
  mget?<T>(keys: string[]): Promise<(T | null)[]>;
  mset?<T>(entries: [string, T, number?][]): Promise<void>;
  getMetrics?(): CacheMetrics;
  exists?(key: string): Promise<boolean>;
  ttl?(key: string): Promise<number>;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  operations: number;
  avgResponseTime: number;
  errors: number;
}

// Enhanced Redis adapter with compression and metrics
export class RedisAdapter implements CacheService {
  private redis: Redis;
  private compression: boolean;
  private keyPrefix: string;
  private compressionThreshold: number;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    operations: 0,
    avgResponseTime: 0,
    errors: 0,
  };
  private responseTimes: number[] = [];

  constructor(options: {
    url: string;
    compression?: boolean;
    keyPrefix?: string;
    compressionThreshold?: number;
  }) {
    this.redis = new Redis(options.url, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4, // Use IPv4
    });
    
    this.compression = options.compression ?? false;
    this.keyPrefix = options.keyPrefix ?? '';
    this.compressionThreshold = options.compressionThreshold ?? 1024;
    
    // Set up Redis event handlers
    this.redis.on('error', (err) => {
      this.metrics.errors++;
      logger.error({ err }, 'Redis error');
    });
  }

  private formatKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}:${key}` : key;
  }

  private shouldCompress(data: string): boolean {
    return this.compression && Buffer.byteLength(data) > this.compressionThreshold;
  }

  private async measureOperation<T>(operation: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      this.updateMetrics(performance.now() - start, true);
      return result;
    } catch (error) {
      this.updateMetrics(performance.now() - start, false);
      throw error;
    }
  }

  private updateMetrics(responseTime: number, success: boolean) {
    this.metrics.operations++;
    this.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
    
    this.metrics.avgResponseTime = 
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    
    if (!success) {
      this.metrics.errors++;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const start = performance.now();
    this.metrics.operations++;
    
    try {
      const entry = this.cache.get(key);
      if (!entry) {
        this.metrics.misses++;
        return null;
      }
      
      if (entry.expires && Date.now() > entry.expires) {
        this.cache.delete(key);
        this.metrics.misses++;
        return null;
      }
      
      // Update last accessed for LRU
      entry.lastAccessed = Date.now();
      this.metrics.hits++;
      
      return entry.value;
    } finally {
      this.updateMetrics(performance.now() - start);
    }
  }

  async set<T>(key: string, value: T, ttlSec?: number): Promise<void> {
    const start = performance.now();
    this.metrics.operations++;
    
    try {
      const serialized = JSON.stringify(value);
      const sizeBytes = Buffer.byteLength(serialized);
      
      // Evict LRU entries if needed
      while (this.currentSizeBytes + sizeBytes > this.maxSizeBytes && this.cache.size > 0) {
        this.evictLRU();
      }
      
      const expires = ttlSec ? Date.now() + (ttlSec * 1000) : undefined;
      this.cache.set(key, { value, expires, lastAccessed: Date.now() });
      this.currentSizeBytes += sizeBytes;
    } finally {
      this.updateMetrics(performance.now() - start);
    }
  }

  async del(key: string): Promise<void> {
    const start = performance.now();
    this.metrics.operations++;
    
    try {
      this.cache.delete(key);
    } finally {
      this.updateMetrics(performance.now() - start);
    }
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (entry.expires && Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry || !entry.expires) return -1;
    
    const remaining = Math.floor((entry.expires - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2; // -2 means expired
  }

  async flush(): Promise<void> {
    this.cache.clear();
    this.currentSizeBytes = 0;
  }

  getMetrics(): CacheMetrics {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      hitRate: total > 0 ? this.metrics.hits / total : 0,
    };
  }

  private evictLRU() {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires && now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }

  private updateMetrics(responseTime: number) {
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime * (this.metrics.operations - 1) + responseTime) / 
      this.metrics.operations;
  }
}

// Multi-tier cache with L1 (memory) and L2 (Redis)
export class MultiTierCache implements CacheService {
  private l1Cache: MemoryAdapter;
  private l2Cache: RedisAdapter;
  private l1MaxSize: number;

  constructor(l1MaxSizeMB = 50, redisUrl: string) {
    this.l1Cache = new MemoryAdapter(l1MaxSizeMB);
    this.l2Cache = new RedisAdapter({ url: redisUrl });
    this.l1MaxSize = l1MaxSizeMB;
  }

  async get<T>(key: string): Promise<T | null> {
    // Try L1 first
    const l1Result = await this.l1Cache.get<T>(key);
    if (l1Result !== null) {
      return l1Result;
    }

    // Try L2
    const l2Result = await this.l2Cache.get<T>(key);
    if (l2Result !== null) {
      // Promote to L1 with short TTL
      await this.l1Cache.set(key, l2Result, 300); // 5 minutes
      return l2Result;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttlSec?: number): Promise<void> {
    // Set in both tiers
    await Promise.all([
      this.l1Cache.set(key, value, Math.min(ttlSec || 300, 300)), // Max 5 min in L1
      this.l2Cache.set(key, value, ttlSec),
    ]);
  }

  async del(key: string): Promise<void> {
    await Promise.all([
      this.l1Cache.del(key),
      this.l2Cache.del(key),
    ]);
  }

  getMetrics(): CacheMetrics {
    const l1Metrics = this.l1Cache.getMetrics();
    const l2Metrics = this.l2Cache.getMetrics();
    
    return {
      hits: l1Metrics.hits + l2Metrics.hits,
      misses: l1Metrics.misses + l2Metrics.misses,
      hitRate: (l1Metrics.hits + l2Metrics.hits) / 
        (l1Metrics.hits + l2Metrics.hits + l1Metrics.misses + l2Metrics.misses),
      operations: l1Metrics.operations + l2Metrics.operations,
      avgResponseTime: (l1Metrics.avgResponseTime + l2Metrics.avgResponseTime) / 2,
      errors: l1Metrics.errors + l2Metrics.errors,
    };
  }
}

// Single-flight wrapper with enhanced error handling
class SingleFlightCache implements CacheService {
  private pending = new Map<string, Promise<any>>();
  private circuitBreaker: Map<string, { failures: number; lastFailure: number }> = new Map();
  
  constructor(private adapter: CacheService) {}

  async get<T>(key: string): Promise<T | null> {
    // Check circuit breaker
    if (this.isCircuitOpen(key)) {
      logger.warn({ key }, 'Cache circuit breaker open');
      return null;
    }

    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    const promise = this.executeWithCircuitBreaker(key, () => this.adapter.get<T>(key));
    this.pending.set(key, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.pending.delete(key);
    }
  }

  set<T>(key: string, value: T, ttlSec?: number): Promise<void> {
    return this.executeWithCircuitBreaker(key, () => this.adapter.set(key, value, ttlSec));
  }

  del(key: string): Promise<void> {
    return this.executeWithCircuitBreaker(key, () => this.adapter.del(key));
  }

  private async executeWithCircuitBreaker<T>(key: string, operation: () => Promise<T>): Promise<T> {
    try {
      const result = await operation();
      this.recordSuccess(key);
      return result;
    } catch (error) {
      this.recordFailure(key);
      throw error;
    }
  }

  private isCircuitOpen(key: string): boolean {
    const circuit = this.circuitBreaker.get(key);
    if (!circuit) return false;
    
    const threshold = 5;
    const timeout = 60000; // 1 minute
    
    return circuit.failures >= threshold && 
           Date.now() - circuit.lastFailure < timeout;
  }

  private recordSuccess(key: string) {
    this.circuitBreaker.delete(key);
  }

  private recordFailure(key: string) {
    const circuit = this.circuitBreaker.get(key) || { failures: 0, lastFailure: 0 };
    circuit.failures++;
    circuit.lastFailure = Date.now();
    this.circuitBreaker.set(key, circuit);
  }

  getMetrics(): CacheMetrics | undefined {
    return this.adapter.getMetrics?.();
  }
}

// Enhanced cache factory with configuration-driven selection
export function createCacheService(): CacheService {
  let adapter: CacheService;
  
  switch (config.cache.provider) {
    case 'redis':
      adapter = new RedisAdapter({
        url: config.cache.redisUrl,
        compression: config.cache.legacyCompression,
        keyPrefix: config.cache.legacyPrefixing ? config.app.environment : '',
        compressionThreshold: config.cache.compressionThreshold,
      });
      break;
    case 'memory':
      adapter = new MemoryAdapter(config.cache.maxMemoryMB);
      break;
    default:
      // Multi-tier cache for production
      if (config.app.environment === 'production') {
        adapter = new MultiTierCache(50, config.cache.redisUrl);
      } else {
        adapter = new MemoryAdapter(config.cache.maxMemoryMB);
      }
      break;
  }
  
  return new SingleFlightCache(adapter);
}

export const cache = createCacheService();

// Enhanced cache decorators with validation
export function Cached(options: {
  ttl?: number;
  keyGenerator?: (...args: any[]) => string;
  condition?: (...args: any[]) => boolean;
  invalidatePatterns?: string[];
} = {}) {
  const ttlSec = options.ttl ?? config.cache.defaultTtlSec;
  
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // Check condition if provided
      if (options.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args);
      }
      
      // Generate cache key
      const cacheKey = options.keyGenerator 
        ? options.keyGenerator(...args)
        : `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
      
      const cached = await cache.get(cacheKey);
      if (cached !== null) return cached;
      
      const result = await originalMethod.apply(this, args);
      await cache.set(cacheKey, result, ttlSec);
      
      return result;
    };
  };
}

// Cache invalidation decorator
export function CacheInvalidate(patterns: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      // Invalidate matching cache keys
      for (const pattern of patterns) {
        const key = pattern.replace(/\$(\d+)/g, (_, index) => args[parseInt(index)]);
        await cache.del(key);
      }
      
      return result;
    };
  };
}

// -----------------------------------------------------------------------------
// 4. ENHANCED STRUCTURED LOGGING
// -----------------------------------------------------------------------------

// core/logging/Logger.ts
import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
import { logger } from '../src/observability/logging';

const requestContext = new AsyncLocalStorage<{
  requestId: string;
  userId?: string;
  traceId?: string;
  spanId?: string;
  operationName?: string;
}>();

export interface LogContext {
  requestId?: string;
  userId?: string;
  traceId?: string;
  spanId?: string;
  operationName?: string;
  [key: string]: any;
}

export class Logger {
  private pino: pino.Logger;
  private metrics = {
    logCounts: new Map<string, number>(),
    errorCounts: new Map<string, number>(),
  };

  constructor(options: {
    level: string;
    pretty: boolean;
    redactPaths: string[];
    asyncTransport: boolean;
    maxFileSize: string;
    maxFiles: number;
    enableMetrics: boolean;
  }) {
    const transport = options.asyncTransport
      ? pino.transport({
          targets: [
            {
              target: 'pino/file',
              options: {
                destination: './logs/app.log',
                maxFileSize: options.maxFileSize,
                maxFiles: options.maxFiles,
              },
            },
            {
              target: 'pino/file',
              options: {
                destination: './logs/error.log',
                level: 'error',
                maxFileSize: options.maxFileSize,
                maxFiles: options.maxFiles,
              },
            },
            ...(options.pretty ? [{
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            }] : []),
          ],
        })
      : undefined;

    this.pino = pino({
      level: options.level,
      redact: {
        paths: options.redactPaths,
        censor: '***REDACTED***',
      },
      transport,
      formatters: {
        level: (label) => ({ level: label }),
        log: (object) => {
          const ctx = requestContext.getStore();
          return {
            ...object,
            ...(ctx && {
              requestId: ctx.requestId,
              userId: ctx.userId,
              traceId: ctx.traceId,
              spanId: ctx.spanId,
              operationName: ctx.operationName,
            }),
            timestamp: new Date().toISOString(),
          };
        },
      },
      hooks: {
        logMethod(inputArgs, method) {
          if (options.enableMetrics) {
            this.updateMetrics(inputArgs[0]);
          }
          return method.apply(this, inputArgs);
        },
      },
    });

    // Set up metrics collection
    if (options.enableMetrics) {
      setInterval(() => this.logMetrics(), 60000); // Every minute
    }
  }

  withContext<T>(context: LogContext, fn: () => T): T {
    return requestContext.run(context, fn);
  }

  // Enhanced logging methods with automatic context enrichment
  fatal(obj: any, msg?: string) {
    this.pino.fatal(this.enrichLog(obj), msg);
  }

  error(obj: any, msg?: string) {
    this.pino.error(this.enrichLog(obj), msg);
  }

  warn(obj: any, msg?: string) {
    this.pino.warn(this.enrichLog(obj), msg);
  }

  info(obj: any, msg?: string) {
    this.pino.info(this.enrichLog(obj), msg);
  }

  debug(obj: any, msg?: string) {
    this.pino.debug(this.enrichLog(obj), msg);
  }

  trace(obj: any, msg?: string) {
    this.pino.trace(this.enrichLog(obj), msg);
  }

  // Structured logging for different event types
  logRequest(req: any, res?: any, duration?: number) {
    this.info({
      type: 'http_request',
      method: req.method,
      url: req.url,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      statusCode: res?.statusCode,
      duration,
      contentLength: res?.get('content-length'),
    }, 'HTTP request');
  }

  logDatabaseQuery(query: string, duration: number, params?: any[]) {
    this.debug({
      type: 'database_query',
      query,
      duration,
      params: params?.length,
    }, 'Database query executed');
  }

  logCacheOperation(operation: string, key: string, hit: boolean, duration?: number) {
    this.debug({
      type: 'cache_operation',
      operation,
      key,
      hit,
      duration,
    }, 'Cache operation');
  }

  logBusinessEvent(event: string, data: any) {
    this.info({
      type: 'business_event',
      event,
      ...data,
    }, `Business event: ${event}`);
  }

  logSecurityEvent(event: string, details: any) {
    this.warn({
      type: 'security_event',
      event,
      ...details,
    }, `Security event: ${event}`);
  }

  private enrichLog(obj: any): any {
    if (typeof obj === 'string') {
      return { message: obj };
    }
    
    return {
      ...obj,
      environment: config.app.environment,
      service: config.app.name,
      version: config.app.version,
    };
  }

  private updateMetrics(logObj: any) {
    const level = logObj.level || 'info';
    this.metrics.logCounts.set(level, (this.metrics.logCounts.get(level) || 0) + 1);
    
    if (level === 'error' || level === 'fatal') {
      const errorType = logObj.err?.name || logObj.error?.name || 'unknown';
      this.metrics.errorCounts.set(errorType, (this.metrics.errorCounts.get(errorType) || 0) + 1);
    }
  }

  private logMetrics() {
    const totalLogs = Array.from(this.metrics.logCounts.values()).reduce((a, b) => a + b, 0);
    const totalErrors = Array.from(this.metrics.errorCounts.values()).reduce((a, b) => a + b, 0);
    
    this.info({
      type: 'metrics',
      totalLogs,
      totalErrors,
      logsByLevel: Object.fromEntries(this.metrics.logCounts),
      errorsByType: Object.fromEntries(this.metrics.errorCounts),
    }, 'Logging metrics');
    
    // Reset counters
    this.metrics.logCounts.clear();
    this.metrics.errorCounts.clear();
  }

  getMetrics() {
    return {
      logCounts: Object.fromEntries(this.metrics.logCounts),
      errorCounts: Object.fromEntries(this.metrics.errorCounts),
    };
  }
}

export const logger = new Logger({
  level: config.log.level,
  pretty: config.log.pretty,
  redactPaths: config.log.redactPaths,
  asyncTransport: config.log.asyncTransport,
  maxFileSize: config.log.maxFileSize,
  maxFiles: config.log.maxFiles,
  enableMetrics: config.log.enableMetrics,
});

// Enhanced Express middleware with performance monitoring
export function requestLoggingMiddleware() {
  return (req: any, res: any, next: any) => {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    const traceId = req.headers['x-trace-id'] || crypto.randomUUID();
    const userId = req.user?.id;
    const startTime = performance.now();
    
    // Store in async context
    const context = {
      requestId,
      traceId,
      userId,
      operationName: `${req.method} ${req.route?.path || req.path}`,
    };
    
    logger.withContext(context, () => {
      logger.logRequest(req);
      
      // Override res.end to log response
      const originalEnd = res.end;
      res.end = function(...args: any[]) {
        const duration = performance.now() - startTime;
        logger.logRequest(req, res, duration);
        return originalEnd.apply(this, args);
      };
      
      next();
    });
  };
}

// Logging decorator for methods
export function Logged(options: { level?: string; includeArgs?: boolean; includeResult?: boolean } = {}) {
  const level = options.level || 'debug';
  
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      const methodName = `${target.constructor.name}.${propertyKey}`;
      
      // Log method entry
      (logger as any)[level]({
        type: 'method_call',
        method: methodName,
        ...(options.includeArgs && { args }),
      }, `Method called: ${methodName}`);
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - start;
        
        // Log method success
        (logger as any)[level]({
          type: 'method_success',
          method: methodName,
          duration,
          ...(options.includeResult && { result }),
        }, `Method completed: ${methodName}`);
        
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        
        // Log method error
        logger.error({
          type: 'method_error',
          method: methodName,
          duration,
          err: error,
        }, `Method failed: ${methodName}`);
        
        throw error;
      }
    };
  };
}

// -----------------------------------------------------------------------------
// 5. BARREL EXPORTS WITH HEALTH CHECK
// -----------------------------------------------------------------------------

// core/health/HealthChecker.ts
export interface HealthCheck {
  name: string;
  check: () => Promise<{ status: 'healthy' | 'unhealthy'; details?: any }>;
}

export class HealthChecker {
  private checks: Map<string, HealthCheck> = new Map();

  register(check: HealthCheck) {
    this.checks.set(check.name, check);
  }

  async runChecks(): Promise<{
    status: 'healthy' | 'unhealthy';
    checks: Record<string, any>;
    timestamp: string;
  }> {
    const results: Record<string, any> = {};
    let overallHealthy = true;

    await Promise.all(
      Array.from(this.checks.values()).map(async (check) => {
        try {
          const result = await Promise.race([
            check.check(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Health check timeout')), 5000)
            ),
          ]) as any;
          
          results[check.name] = {
            status: result.status,
            details: result.details,
            timestamp: new Date().toISOString(),
          };
          
          if (result.status !== 'healthy') {
            overallHealthy = false;
          }
        } catch (error) {
          results[check.name] = {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString(),
          };
          overallHealthy = false;
        }
      })
    );

    return {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      checks: results,
      timestamp: new Date().toISOString(),
    };
  }
}

export const healthChecker = new HealthChecker();

// Register default health checks
if (config.cache.provider === 'redis') {
  healthChecker.register({
    name: 'redis',
    check: async () => {
      try {
        await cache.set('health-check', 'ok', 10);
        const result = await cache.get('health-check');
        return {
          status: result === 'ok' ? 'healthy' : 'unhealthy',
          details: { connected: true },
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          details: { error: error.message },
        };
      }
    },
  });
}

healthChecker.register({
  name: 'memory',
  check: async () => {
    const memUsage = process.memoryUsage();
    const maxMemory = 1024 * 1024 * 1024; // 1GB threshold
    
    return {
      status: memUsage.heapUsed < maxMemory ? 'healthy' : 'unhealthy',
      details: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
      },
    };
  },
});

// Express health check endpoint
export function healthCheckEndpoint() {
  return async (req: any, res: any) => {
    try {
      const health = await healthChecker.runChecks();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json({
        ...health,
        uptime: process.uptime(),
        environment: config.app.environment,
        version: config.app.version,
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  };
}

// -----------------------------------------------------------------------------
// 6. FINAL EXPORTS
// -----------------------------------------------------------------------------

// core/index.ts
export * from './cache';
export * from './logging';  
export * from './rate-limit';
export * from './error-handling';
export * from './shared/config';
export * from './validation';
export * from './health/HealthChecker';

export {
  cache,
  logger, 
  rateLimiter,
  configManager,
  config,
  validationService,
  commonSchemas,
  healthChecker,
};
    return this.measureOperation(async () => {
      try {
        const data = await this.redis.get(this.formatKey(key));
        if (!data) {
          this.metrics.misses++;
          return null;
        }

        this.metrics.hits++;

        let parsed = data;
        if (this.shouldCompress(data) && data.startsWith('compressed:')) {
          const compressedData = data.slice(11); // Remove 'compressed:' prefix
          const decompressed = await decompressAsync(Buffer.from(compressedData, 'base64'));
          parsed = decompressed.toString();
        }

        return JSON.parse(parsed);
      } catch (error) {
        this.metrics.misses++;
        return null;
      }
    });
  }

  async set<T>(key: string, value: T, ttlSec?: number): Promise<void> {
    return this.measureOperation(async () => {
      try {
        let serialized = JSON.stringify(value);
        
        if (this.shouldCompress(serialized)) {
          const compressed = await compressAsync(Buffer.from(serialized));
          serialized = 'compressed:' + compressed.toString('base64');
        }

        const formattedKey = this.formatKey(key);
        
        if (ttlSec) {
          await this.redis.setex(formattedKey, ttlSec, serialized);
        } else {
          await this.redis.set(formattedKey, serialized);
        }
      } catch (err) {
        logger.warn({ err, key }, 'Cache set error');
      }
    });
  }

  async del(key: string): Promise<void> {
    return this.measureOperation(async () => {
      try {
        await this.redis.del(this.formatKey(key));
      } catch (err) {
        logger.warn({ err, key }, 'Cache delete error');
      }
    });
  }

  async exists(key: string): Promise<boolean> {
    return this.measureOperation(async () => {
      const result = await this.redis.exists(this.formatKey(key));
      return result === 1;
    });
  }

  async ttl(key: string): Promise<number> {
    return this.measureOperation(async () => {
      return await this.redis.ttl(this.formatKey(key));
    });
  }

  async flush(): Promise<void> {
    await this.redis.flushall();
  }

  getMetrics(): CacheMetrics {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      hitRate: total > 0 ? this.metrics.hits / total : 0,
    };
  }
}

// Enhanced memory adapter with LRU eviction
export class MemoryAdapter implements CacheService {
  private cache = new Map<string, { value: any; expires?: number; lastAccessed: number }>();
  private maxSizeBytes: number;
  private currentSizeBytes = 0;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    operations: 0,
    avgResponseTime: 0,
    errors: 0,
  };

  constructor(maxSizeMB = 100) {
    this.maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  async get<T>(key: string): Promise<T | null> {






