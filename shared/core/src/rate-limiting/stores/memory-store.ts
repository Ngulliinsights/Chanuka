/**
 * Memory-based Rate Limiting Store
 * 
 * In-memory implementation matching the reference implementation
 * Supports all rate limiting algorithms without Redis dependency
 */

import { RateLimitStore, RateLimitResult, RateLimitMetricsInterface, RateLimitConfig } from '../types';
import { logger } from '../utils/logger';

export class MemoryStore implements RateLimitStore {
  private windows = new Map<string, any>();
  private metrics: RateLimitMetricsInterface = {
    totalRequests: 0,
    blockedRequests: 0,
    blockRate: 0,
    avgProcessingTime: 0,
  };

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const start = performance.now();
    this.metrics.totalRequests++;

    try {
      let result: { allowed: boolean; remaining: number; resetTime: number; totalHits: number; windowStart: number };

      switch (config.algorithm) {
        case 'sliding-window':
          result = this.slidingWindowCheck(key, config.limit, config.windowMs);
          break;
        case 'token-bucket':
          result = this.tokenBucketCheck(key, config.limit, config.windowMs);
          break;
        case 'fixed-window':
        default:
          result = this.fixedWindowCheck(key, config.limit, config.windowMs);
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
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        algorithm: config.algorithm
      };
    } catch (error) {
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
        resetTime: validEntries[0] + windowMs,
        totalHits: validEntries.length,
        windowStart
      };
    }
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: validEntries[0] + windowMs,
      totalHits: validEntries.length,
      windowStart
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
        resetTime: now + ((1 - bucket.tokens) / refillRate * 1000),
        totalHits: max - bucket.tokens,
        windowStart: bucket.lastRefill
      };
    }
    
    return {
      allowed: false,
      remaining: bucket.tokens,
      resetTime: now + (1 / refillRate * 1000),
      totalHits: max - bucket.tokens,
      windowStart: bucket.lastRefill
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
        resetTime: windowStart + windowMs,
        totalHits: current + 1,
        windowStart
      };
    }
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: windowStart + windowMs,
      totalHits: current,
      windowStart
    };
  }

  getMetrics(): RateLimitMetricsInterface {
    return { ...this.metrics };
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.windows.forEach((entry, key) => {
      // Remove entries older than 1 hour
      if (Array.isArray(entry)) {
        // Sliding window entries
        const validEntries = entry.filter((timestamp: number) => now - timestamp < 3600000);
        if (validEntries.length === 0) {
          expiredKeys.push(key);
        } else {
          this.windows.set(key, validEntries);
        }
      } else if (entry.windowStart && now - entry.windowStart > 3600000) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.windows.delete(key));
  }

  async healthCheck(): Promise<boolean> {
    return true; // Memory store is always healthy
  }

  /**
   * Get current store size for monitoring
   */
  getSize(): number {
    return this.windows.size;
  }

  /**
   * Clear all entries (useful for testing)
   */
  clear(): void {
    this.windows.clear();
  }
}// Bac
// Backward compatibility export
export { MemoryStore as MemoryRateLimitStore };






