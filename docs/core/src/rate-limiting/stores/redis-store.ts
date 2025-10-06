/**
 * Redis-based Rate Limiting Store
 * 
 * Production-ready Redis implementation with Lua script support for atomic operations.
 * Supports sliding window, token bucket, and fixed window algorithms with comprehensive metrics collection.
 * 
 * This implementation provides:
 * - Atomic operations using Lua scripts to prevent race conditions
 * - Comprehensive error handling with graceful fallback strategies
 * - Built-in metrics collection for monitoring and observability
 * - Memory leak prevention through proper key expiration
 * - High-performance optimizations for production workloads
 */

import { Redis } from 'ioredis';
import { RateLimitStore, RateLimitResult, RateLimitConfig, RateLimitMetricsInterface } from '../types';

interface RedisRateLimitStoreOptions {
  /** Prefix for all Redis keys to avoid collisions */
  keyPrefix?: string;
  /** Enable metrics collection for monitoring (default: true) */
  enableMetrics?: boolean;
  /** Fallback store to use when Redis is unavailable */
  fallbackStore?: RateLimitStore;
  /** Maximum number of processing times to keep for averaging (default: 1000) */
  maxMetricsHistory?: number;
}

export class RedisStore implements RateLimitStore {
  private readonly keyPrefix: string;
  private readonly enableMetrics: boolean;
  private readonly fallbackStore: RateLimitStore | undefined;
  private readonly maxMetricsHistory: number;
  private readonly scripts: Map<string, string> = new Map();
  private readonly metrics: RateLimitMetricsInterface = {
    totalRequests: 0,
    blockedRequests: 0,
    blockRate: 0,
    avgProcessingTime: 0
  };
  private readonly processingTimes: number[] = [];

  constructor(
    private redis: Redis, 
    options: RedisRateLimitStoreOptions = {}
  ) {
    // Initialize configuration options with sensible defaults
    this.keyPrefix = options.keyPrefix || 'rate_limit';
    this.enableMetrics = options.enableMetrics !== false;
    this.fallbackStore = options.fallbackStore; // Explicitly typed as potentially undefined
    this.maxMetricsHistory = options.maxMetricsHistory || 1000;
    
    // Initialize Lua scripts for atomic Redis operations
    this.initializeScripts();
  }

  /**
   * Initialize Lua scripts for each rate limiting algorithm.
   * These scripts run atomically on Redis server, preventing race conditions.
   */
  private initializeScripts(): void {
    // Sliding window algorithm with proper cleanup and burst handling
    // This script maintains a sorted set where scores are timestamps
    this.scripts.set('sliding-window', `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local window_ms = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      local burst_allowance = tonumber(ARGV[4])
      local uuid = ARGV[5]
      
      -- Calculate window boundaries for accurate rate limiting
      local window_start = now - window_ms
      local effective_limit = limit + burst_allowance
      
      -- Remove expired entries atomically to maintain accurate count
      redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)
      
      -- Count current entries in the sliding window
      local current_count = redis.call('ZCARD', key)
      
      if current_count < effective_limit then
        -- Add current request with unique identifier to prevent duplicates
        redis.call('ZADD', key, now, uuid)
        -- Set expiration slightly longer than window to handle clock skew
        redis.call('EXPIRE', key, math.ceil(window_ms / 1000) + 60)
        
        local remaining = effective_limit - current_count - 1
        local reset_time = now + window_ms
        
        return {1, remaining, reset_time, current_count + 1, window_start}
      else
        -- Get oldest entry to calculate accurate reset time
        local oldest_entries = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local reset_time = oldest_entries[2] and (tonumber(oldest_entries[2]) + window_ms) or (now + window_ms)
        
        return {0, 0, reset_time, current_count, window_start}
      end
    `);

    // Token bucket algorithm with precise refill calculations
    // This script maintains bucket state with continuous token refilling
    this.scripts.set('token-bucket', `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local capacity = tonumber(ARGV[2])
      local refill_rate = tonumber(ARGV[3])
      local tokens_requested = tonumber(ARGV[4])
      
      -- Get current bucket state or initialize with full capacity
      local bucket_data = redis.call('HMGET', key, 'tokens', 'last_refill')
      local current_tokens = tonumber(bucket_data[1]) or capacity
      local last_refill = tonumber(bucket_data[2]) or now
      
      -- Calculate tokens to add based on elapsed time since last refill
      local elapsed_seconds = (now - last_refill) / 1000
      local tokens_to_add = elapsed_seconds * refill_rate
      current_tokens = math.min(capacity, current_tokens + tokens_to_add)
      
      if current_tokens >= tokens_requested then
        -- Consume requested tokens
        current_tokens = current_tokens - tokens_requested
        
        -- Update bucket state atomically
        redis.call('HMSET', key, 'tokens', current_tokens, 'last_refill', now)
        -- Prevent memory leaks with reasonable expiration
        redis.call('EXPIRE', key, math.ceil(capacity / refill_rate * 2))
        
        -- Calculate when bucket will be full again for reset time
        local reset_time = now + ((capacity - current_tokens) / refill_rate * 1000)
        
        return {1, math.floor(current_tokens), reset_time, capacity - current_tokens, now}
      else
        -- Not enough tokens available, update timestamp but don't consume
        redis.call('HMSET', key, 'tokens', current_tokens, 'last_refill', now)
        redis.call('EXPIRE', key, math.ceil(capacity / refill_rate * 2))
        
        -- Calculate wait time until enough tokens are available
        local tokens_needed = tokens_requested - current_tokens
        local wait_time_ms = (tokens_needed / refill_rate) * 1000
        local reset_time = now + wait_time_ms
        
        return {0, math.floor(current_tokens), reset_time, capacity - current_tokens, now}
      end
    `);

    // Fixed window algorithm with burst allowance support
    // This script uses window-based keys for simple but effective rate limiting
    this.scripts.set('fixed-window', `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local window_ms = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      local burst_allowance = tonumber(ARGV[4])
      
      -- Calculate current window boundaries for consistent windowing
      local window_start = math.floor(now / window_ms) * window_ms
      local window_key = key .. ':' .. window_start
      local effective_limit = limit + burst_allowance
      
      -- Get current count for this specific time window
      local current_count = tonumber(redis.call('GET', window_key)) or 0
      
      if current_count < effective_limit then
        -- Increment counter atomically
        local new_count = redis.call('INCR', window_key)
        
        -- Set expiration on first increment to prevent memory leaks
        if new_count == 1 then
          redis.call('EXPIRE', window_key, math.ceil(window_ms / 1000) + 60)
        end
        
        local remaining = effective_limit - new_count
        local reset_time = window_start + window_ms
        
        return {1, remaining, reset_time, new_count, window_start}
      else
        local reset_time = window_start + window_ms
        return {0, 0, reset_time, current_count, window_start}
      end
    `);
  }

  /**
   * Check if a request should be allowed based on rate limiting rules.
   * This is the main entry point for rate limiting decisions.
   */
  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    // Start timing for performance metrics if enabled
    const startTime = this.enableMetrics ? performance.now() : 0;
    
    try {
      // Execute the appropriate algorithm atomically
      const result = await this.executeAlgorithm(key, config);
      
      // Update performance metrics after successful execution
      if (this.enableMetrics) {
        this.updateMetrics(performance.now() - startTime, result.allowed);
      }
      
      return result;
    } catch (error) {
      // Handle Redis failures gracefully with fallback strategy
      if (this.fallbackStore) {
        console.warn(`Redis rate limiting failed for key "${key}", falling back to memory store:`, error);
        return this.fallbackStore.check(key, config);
      }
      
      // Fail open strategy - allow request when Redis is unavailable
      // This prevents the rate limiter from becoming a single point of failure
      console.error(`Redis rate limiting failed for key "${key}" with no fallback available:`, error);
      return {
        allowed: true,
        remaining: config.limit,
        resetTime: Date.now() + config.windowMs,
        retryAfter: 0,
        totalHits: 0,
        windowStart: Date.now(),
        algorithm: config.algorithm
      };
    }
  }

  /**
   * Execute the appropriate rate limiting algorithm using Lua scripts.
   * This ensures atomic operations and prevents race conditions.
   */
  private async executeAlgorithm(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const prefixedKey = `${this.keyPrefix}:${key}`;
    const burstAllowance = Math.floor(config.limit * (config.burstAllowance || 0.2));

    // Get the appropriate Lua script for the algorithm
    const script = this.scripts.get(config.algorithm);
    if (!script) {
      throw new Error(`Unsupported rate limiting algorithm: ${config.algorithm}`);
    }

    let scriptArgs: (string | number)[];
    let result: [number, number, number, number, number];

    // Prepare algorithm-specific arguments for the Lua script
    switch (config.algorithm) {
      case 'sliding-window':
        scriptArgs = [now, config.windowMs, config.limit, burstAllowance, this.generateUUID()];
        break;
      
      case 'token-bucket': {
        // Calculate capacity with burst allowance and refill rate
        const capacity = Math.ceil(config.limit * (1 + (config.burstAllowance || 0.2)));
        const refillRate = config.limit / (config.windowMs / 1000); // tokens per second
        scriptArgs = [now, capacity, refillRate, 1]; // requesting 1 token
        break;
      }
      
      case 'fixed-window':
        scriptArgs = [now, config.windowMs, config.limit, burstAllowance];
        break;
      
      default:
        throw new Error(`Unsupported algorithm: ${config.algorithm}`);
    }

    // Execute the Lua script atomically on Redis server
    result = await this.redis.eval(script, 1, prefixedKey, ...scriptArgs) as [number, number, number, number, number];
    
    const [allowed, remaining, resetTime, totalHits, windowStart] = result;
    const isAllowed = allowed === 1;
    
    // Return standardized result format
    return {
      allowed: isAllowed,
      remaining,
      resetTime,
      retryAfter: isAllowed ? 0 : Math.ceil((resetTime - now) / 1000),
      totalHits,
      windowStart,
      algorithm: config.algorithm
    };
  }

  /**
   * Update internal metrics for performance monitoring and observability.
   * Maintains rolling averages to prevent unbounded memory growth.
   */
  private updateMetrics(processingTime: number, allowed: boolean): void {
    this.metrics.totalRequests++;
    
    if (!allowed) {
      this.metrics.blockedRequests++;
    }
    
    // Calculate block rate as percentage for easy monitoring
    this.metrics.blockRate = (this.metrics.blockedRequests / this.metrics.totalRequests) * 100;
    
    // Maintain rolling average of processing times for performance tracking
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > this.maxMetricsHistory) {
      this.processingTimes.shift();
    }
    
    // Calculate average processing time from recent measurements
    this.metrics.avgProcessingTime = this.processingTimes.length > 0
      ? this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length
      : 0;
  }

  /**
   * Generate a unique identifier for deduplication in sliding window.
   * Uses timestamp-based approach for better performance than full UUID.
   */
  private generateUUID(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get comprehensive metrics for monitoring and observability.
   * Returns a copy to prevent external modification of internal state.
   */
  getMetrics(): RateLimitMetricsInterface {
    return { ...this.metrics };
  }

  /**
   * Reset all collected metrics - useful for testing and monitoring system resets.
   * This is particularly helpful when you want to start fresh measurements.
   */
  resetMetrics(): void {
    this.metrics.totalRequests = 0;
    this.metrics.blockedRequests = 0;
    this.metrics.blockRate = 0;
    this.metrics.avgProcessingTime = 0;
    this.processingTimes.length = 0;
  }

  /**
   * Clean up expired keys matching a pattern to prevent memory leaks.
   * Uses SCAN instead of KEYS for production safety.
   * 
   * Note: This method signature matches the base interface requirement.
   */
  async cleanup(): Promise<void> {
    const searchPattern = `${this.keyPrefix}:*`;
    
    try {
      // Use SCAN instead of KEYS for better performance in production
      // SCAN doesn't block Redis server like KEYS command does
      const keys: string[] = [];
      const stream = this.redis.scanStream({
        match: searchPattern,
        count: 100 // Process in batches to avoid blocking
      });

      stream.on('data', (resultKeys: string[]) => {
        keys.push(...resultKeys);
      });

      await new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      if (keys.length > 0) {
        // Use pipeline for efficient batch operations
        const pipeline = this.redis.pipeline();
        keys.forEach(key => pipeline.del(key));
        await pipeline.exec();
      }
    } catch (error) {
      console.error('Failed to cleanup expired keys:', error);
      throw error;
    }
  }

  /**
   * Advanced cleanup method with pattern support and return count.
   * This provides more flexibility for administrative operations.
   */
  async cleanupWithPattern(pattern?: string): Promise<number> {
    const searchPattern = pattern || `${this.keyPrefix}:*`;
    
    try {
      const keys: string[] = [];
      const stream = this.redis.scanStream({
        match: searchPattern,
        count: 100
      });

      stream.on('data', (resultKeys: string[]) => {
        keys.push(...resultKeys);
      });

      await new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      if (keys.length > 0) {
        const pipeline = this.redis.pipeline();
        keys.forEach(key => pipeline.del(key));
        await pipeline.exec();
      }

      return keys.length;
    } catch (error) {
      console.error('Failed to cleanup expired keys:', error);
      throw error;
    }
  }

  /**
   * Health check for Redis connectivity and responsiveness.
   * 
   * Note: This method signature matches the base interface requirement.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Extended health check with detailed information.
   * Provides more comprehensive health information for monitoring systems.
   */
  async detailedHealthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      const start = performance.now();
      const result = await this.redis.ping();
      const latency = performance.now() - start;
      
      return {
        healthy: result === 'PONG',
        latency: Math.round(latency * 100) / 100 // Round to 2 decimal places
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get Redis connection information for debugging and monitoring.
   * Handles undefined values properly for strict type checking.
   */
  getConnectionInfo(): { 
    status: string; 
    host?: string; 
    port?: number; 
    db?: number;
    keyPrefix: string;
  } {
    // Handle potential undefined values from Redis options
    const host = this.redis.options.host;
    const port = this.redis.options.port;
    const db = this.redis.options.db;
    
    return {
      status: this.redis.status,
      // Only include properties if they have defined values
      ...(host !== undefined && { host }),
      ...(port !== undefined && { port }),
      ...(db !== undefined && { db }),
      keyPrefix: this.keyPrefix
    };
  }

  /**
   * Manually set rate limit for a key - useful for testing and administrative operations.
   * This allows you to preset rate limit states for specific scenarios.
   */
  async setRateLimit(key: string, count: number, windowMs: number, algorithm: string = 'fixed-window'): Promise<void> {
    const prefixedKey = `${this.keyPrefix}:${key}`;
    
    switch (algorithm) {
      case 'fixed-window': {
        const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
        const windowKey = `${prefixedKey}:${windowStart}`;
        // Using setex (SET with EXpiration) to set value and expiration atomically
        await this.redis.setex(windowKey, Math.ceil(windowMs / 1000), count);
        break;
      }
      
      case 'sliding-window': {
        // Clear existing entries and add count number of entries at current time
        await this.redis.del(prefixedKey);
        if (count > 0) {
          const pipeline = this.redis.pipeline();
          const now = Date.now();
          for (let i = 0; i < count; i++) {
            // Using zadd (Sorted set ADD) to add timestamped entries
            pipeline.zadd(prefixedKey, now - i, `${now}-${i}`);
          }
          pipeline.expire(prefixedKey, Math.ceil(windowMs / 1000) + 60);
          await pipeline.exec();
        }
        break;
      }
      
      case 'token-bucket': {
        const capacity = count;
        const remainingTokens = Math.max(0, capacity - count);
        // Using hmset (Hash Multi SET) to set multiple hash fields
        await this.redis.hmset(prefixedKey, 'tokens', remainingTokens, 'last_refill', Date.now());
        await this.redis.expire(prefixedKey, Math.ceil(windowMs / 1000) * 2);
        break;
      }
      
      default:
        throw new Error(`Unsupported algorithm for manual rate limit: ${algorithm}`);
    }
  }

  /**
   * Get current rate limit status for monitoring and debugging.
   * This provides real-time visibility into rate limiter state.
   */
  async getRateLimitStatus(key: string, config: RateLimitConfig): Promise<{
    currentCount: number;
    windowStart: number;
    algorithm: string;
    resetTime: number;
  }> {
    const prefixedKey = `${this.keyPrefix}:${key}`;
    const now = Date.now();
    
    switch (config.algorithm) {
      case 'sliding-window': {
        const windowStart = now - config.windowMs;
        // Clean up expired entries first using zremrangebyscore (Sorted set REMOVE by SCORE range)
        await this.redis.zremrangebyscore(prefixedKey, '-inf', windowStart);
        // Count remaining entries using zcard (Sorted set CARDinality)
        const currentCount = await this.redis.zcard(prefixedKey);
        
        return {
          currentCount,
          windowStart,
          algorithm: 'sliding-window',
          resetTime: now + config.windowMs
        };
      }
      
      case 'token-bucket': {
        // Get bucket state using hmget (Hash Multi GET)
        const bucket = await this.redis.hmget(prefixedKey, 'tokens', 'last_refill');
        const tokens = parseFloat(bucket[0] || config.limit.toString());
        const lastRefill = parseInt(bucket[1] || now.toString());
        
        // Calculate current tokens after natural refill
        const refillRate = config.limit / (config.windowMs / 1000);
        const elapsedSeconds = (now - lastRefill) / 1000;
        const currentTokens = Math.min(config.limit, tokens + (elapsedSeconds * refillRate));
        const usedTokens = config.limit - currentTokens;
        
        return {
          currentCount: Math.round(usedTokens),
          windowStart: lastRefill,
          algorithm: 'token-bucket',
          resetTime: now + ((config.limit - currentTokens) / refillRate * 1000)
        };
      }
      
      case 'fixed-window':
      default: {
        const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
        const windowKey = `${prefixedKey}:${windowStart}`;
        const currentCount = parseInt(await this.redis.get(windowKey) || '0');
        
        return {
          currentCount,
          windowStart,
          algorithm: 'fixed-window',
          resetTime: windowStart + config.windowMs
        };
      }
    }
  }

  /**
   * Gracefully close Redis connection.
   * Essential for proper application shutdown and resource cleanup.
   */
  async close(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      console.warn('Error closing Redis connection:', error);
      // Force disconnect if graceful quit fails
      this.redis.disconnect();
    }
  }
}

// Maintain backward compatibility with existing imports
export { RedisStore as RedisRateLimitStore };