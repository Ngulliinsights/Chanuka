/**
 * Error Rate Limiter
 * 
 * Prevents error spam and implements intelligent throttling
 * to maintain application performance during error storms.
 */

import { AppError, ErrorDomain, ErrorSeverity } from './unified-error-handler';

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxErrors: number; // Maximum errors per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (error: AppError) => string;
  onLimitReached?: (error: AppError, resetTime: number) => void;
  skipIf?: (error: AppError) => boolean;
}

// Rate limit entry
interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstErrorTime: number;
  lastErrorTime: number;
  errors: AppError[];
}

// Error rate limiter
export class ErrorRateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private config: Required<RateLimitConfig>;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs,
      maxErrors: config.maxErrors,
      skipSuccessfulRequests: config.skipSuccessfulRequests ?? false,
      skipFailedRequests: config.skipFailedRequests ?? false,
      keyGenerator: config.keyGenerator ?? this.defaultKeyGenerator,
      onLimitReached: config.onLimitReached ?? (() => {}),
      skipIf: config.skipIf ?? (() => false),
    };

    // Start cleanup interval
    this.startCleanup();
  }

  private defaultKeyGenerator(error: AppError): string {
    // Group by error type and component
    return `${error.type}:${error.context?.component || 'unknown'}`;
  }

  private startCleanup(): void {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  shouldLimit(error: AppError): boolean {
    // Skip if configured to skip
    if (this.config.skipIf(error)) {
      return false;
    }

    const key = this.config.keyGenerator(error);
    const now = Date.now();
    
    let entry = this.limits.get(key);
    
    // Create new entry if doesn't exist or expired
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        firstErrorTime: now,
        lastErrorTime: now,
        errors: [],
      };
      this.limits.set(key, entry);
    }

    // Update entry
    entry.count++;
    entry.lastErrorTime = now;
    entry.errors.push(error);

    // Keep only recent errors in memory (last 10)
    if (entry.errors.length > 10) {
      entry.errors = entry.errors.slice(-10);
    }

    // Check if limit exceeded
    if (entry.count > this.config.maxErrors) {
      this.config.onLimitReached(error, entry.resetTime);
      return true;
    }

    return false;
  }

  getRateLimitInfo(error: AppError): {
    limited: boolean;
    count: number;
    limit: number;
    resetTime: number;
    retryAfter: number;
  } {
    const key = this.config.keyGenerator(error);
    const entry = this.limits.get(key);
    const now = Date.now();

    if (!entry || now > entry.resetTime) {
      return {
        limited: false,
        count: 0,
        limit: this.config.maxErrors,
        resetTime: now + this.config.windowMs,
        retryAfter: 0,
      };
    }

    const limited = entry.count > this.config.maxErrors;
    
    return {
      limited,
      count: entry.count,
      limit: this.config.maxErrors,
      resetTime: entry.resetTime,
      retryAfter: limited ? entry.resetTime - now : 0,
    };
  }

  getStats(): {
    totalKeys: number;
    limitedKeys: number;
    topErrorSources: Array<{
      key: string;
      count: number;
      limited: boolean;
      errorRate: number;
    }>;
  } {
    const now = Date.now();
    const stats = {
      totalKeys: this.limits.size,
      limitedKeys: 0,
      topErrorSources: [] as Array<{
        key: string;
        count: number;
        limited: boolean;
        errorRate: number;
      }>,
    };

    const sources: Array<{
      key: string;
      count: number;
      limited: boolean;
      errorRate: number;
    }> = [];

    for (const [key, entry] of this.limits.entries()) {
      if (now <= entry.resetTime) {
        const limited = entry.count > this.config.maxErrors;
        if (limited) stats.limitedKeys++;

        const duration = entry.lastErrorTime - entry.firstErrorTime;
        const errorRate = duration > 0 ? entry.count / (duration / 1000) : entry.count;

        sources.push({
          key,
          count: entry.count,
          limited,
          errorRate,
        });
      }
    }

    stats.topErrorSources = sources
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  reset(key?: string): void {
    if (key) {
      this.limits.delete(key);
    } else {
      this.limits.clear();
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.limits.clear();
  }
}

// Predefined rate limiters for different scenarios
export class ErrorRateLimiterManager {
  private limiters: Map<string, ErrorRateLimiter> = new Map();

  constructor() {
    this.setupDefaultLimiters();
  }

  private setupDefaultLimiters(): void {
    // General error rate limiter
    this.addLimiter('general', new ErrorRateLimiter({
      windowMs: 60000, // 1 minute
      maxErrors: 50,
      keyGenerator: (error) => `${error.type}:${error.context?.component || 'unknown'}`,
      onLimitReached: (error, resetTime) => {
        console.warn(`Rate limit reached for ${error.type}. Reset at ${new Date(resetTime)}`);
      },
    }));

    // Network error rate limiter (more restrictive)
    this.addLimiter('network', new ErrorRateLimiter({
      windowMs: 30000, // 30 seconds
      maxErrors: 10,
      keyGenerator: (error) => `network:${error.context?.url || 'unknown'}`,
      skipIf: (error) => error.type !== ErrorDomain.NETWORK,
      onLimitReached: (error, resetTime) => {
        console.warn(`Network error rate limit reached. Backing off until ${new Date(resetTime)}`);
        // Could trigger circuit breaker here
      },
    }));

    // Critical error rate limiter (very restrictive)
    this.addLimiter('critical', new ErrorRateLimiter({
      windowMs: 300000, // 5 minutes
      maxErrors: 3,
      keyGenerator: (error) => `critical:${error.context?.component || 'unknown'}`,
      skipIf: (error) => error.severity !== ErrorSeverity.CRITICAL,
      onLimitReached: (error, resetTime) => {
        console.error(`Critical error rate limit reached! System may be unstable.`);
        // Could trigger emergency protocols here
      },
    }));

    // User-specific rate limiter
    this.addLimiter('user', new ErrorRateLimiter({
      windowMs: 120000, // 2 minutes
      maxErrors: 20,
      keyGenerator: (error) => `user:${error.context?.userId || 'anonymous'}`,
      onLimitReached: (error, resetTime) => {
        console.warn(`User error rate limit reached for ${error.context?.userId}`);
      },
    }));
  }

  addLimiter(name: string, limiter: ErrorRateLimiter): void {
    this.limiters.set(name, limiter);
  }

  removeLimiter(name: string): void {
    const limiter = this.limiters.get(name);
    if (limiter) {
      limiter.destroy();
      this.limiters.delete(name);
    }
  }

  shouldLimit(error: AppError): {
    limited: boolean;
    limitedBy: string[];
    retryAfter: number;
  } {
    const result = {
      limited: false,
      limitedBy: [] as string[],
      retryAfter: 0,
    };

    for (const [name, limiter] of this.limiters.entries()) {
      if (limiter.shouldLimit(error)) {
        result.limited = true;
        result.limitedBy.push(name);
        
        const info = limiter.getRateLimitInfo(error);
        result.retryAfter = Math.max(result.retryAfter, info.retryAfter);
      }
    }

    return result;
  }

  getRateLimitInfo(error: AppError, limiterName?: string): Record<string, any> {
    if (limiterName) {
      const limiter = this.limiters.get(limiterName);
      return limiter ? limiter.getRateLimitInfo(error) : {};
    }

    const info: Record<string, any> = {};
    for (const [name, limiter] of this.limiters.entries()) {
      info[name] = limiter.getRateLimitInfo(error);
    }
    return info;
  }

  getGlobalStats(): {
    totalLimiters: number;
    activeLimiters: number;
    totalLimitedKeys: number;
    overallErrorRate: number;
    limiterStats: Record<string, any>;
  } {
    const stats = {
      totalLimiters: this.limiters.size,
      activeLimiters: 0,
      totalLimitedKeys: 0,
      overallErrorRate: 0,
      limiterStats: {} as Record<string, any>,
    };

    let totalErrors = 0;
    let totalDuration = 0;

    for (const [name, limiter] of this.limiters.entries()) {
      const limiterStats = limiter.getStats();
      stats.limiterStats[name] = limiterStats;
      
      if (limiterStats.totalKeys > 0) {
        stats.activeLimiters++;
      }
      
      stats.totalLimitedKeys += limiterStats.limitedKeys;
      
      // Calculate overall error rate (simplified)
      limiterStats.topErrorSources.forEach(source => {
        totalErrors += source.count;
        totalDuration += 60; // Assume 1 minute average
      });
    }

    stats.overallErrorRate = totalDuration > 0 ? totalErrors / totalDuration : 0;

    return stats;
  }

  reset(limiterName?: string): void {
    if (limiterName) {
      const limiter = this.limiters.get(limiterName);
      if (limiter) {
        limiter.reset();
      }
    } else {
      for (const limiter of this.limiters.values()) {
        limiter.reset();
      }
    }
  }

  destroy(): void {
    for (const limiter of this.limiters.values()) {
      limiter.destroy();
    }
    this.limiters.clear();
  }
}

// Global rate limiter manager
export const errorRateLimiter = new ErrorRateLimiterManager();

// React hook for rate limiting
export function useErrorRateLimit() {
  return {
    shouldLimit: errorRateLimiter.shouldLimit.bind(errorRateLimiter),
    getRateLimitInfo: errorRateLimiter.getRateLimitInfo.bind(errorRateLimiter),
    getGlobalStats: errorRateLimiter.getGlobalStats.bind(errorRateLimiter),
    reset: errorRateLimiter.reset.bind(errorRateLimiter),
  };
}

// Utility functions
export function createRateLimitedErrorHandler(
  originalHandler: (error: AppError) => void,
  limiterName?: string
): (error: AppError) => void {
  return (error: AppError) => {
    const limitResult = errorRateLimiter.shouldLimit(error);
    
    if (limitResult.limited) {
      console.warn(`Error rate limited by: ${limitResult.limitedBy.join(', ')}. Retry after ${limitResult.retryAfter}ms`);
      
      // Could show user-friendly message about rate limiting
      window.dispatchEvent(new CustomEvent('error-rate-limited', {
        detail: {
          error,
          limitedBy: limitResult.limitedBy,
          retryAfter: limitResult.retryAfter,
        },
      }));
      
      return;
    }

    // Process error normally
    originalHandler(error);
  };
}

export function isErrorRateLimited(error: AppError): boolean {
  return errorRateLimiter.shouldLimit(error).limited;
}