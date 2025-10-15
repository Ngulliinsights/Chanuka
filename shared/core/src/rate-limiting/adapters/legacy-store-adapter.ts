import { RateLimitStore, RateLimitOptions, RateLimitResult } from '../types';

// Legacy interface that matches the old rate limiter
interface LegacyRateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const legacyStore: LegacyRateLimitStore = {};

export class LegacyRateLimitStoreAdapter implements RateLimitStore {
  async check(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    console.warn('DEPRECATED: Using legacy rate limit store. Please migrate to shared/core/src/rate-limiting');

    const now = Date.now();
    const maxRequests = this.getMaxRequests(options);

    // Clean up expired entries
    if (legacyStore[key] && now > legacyStore[key].resetTime) {
      delete legacyStore[key];
    }

    // Initialize or increment counter
    if (!legacyStore[key]) {
      legacyStore[key] = {
        count: 1,
        resetTime: now + options.windowMs
      };
    } else {
      legacyStore[key].count++;
    }

    // Check if limit exceeded
    if (legacyStore[key].count > maxRequests) {
      const retryAfter = Math.ceil((legacyStore[key].resetTime - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(legacyStore[key].resetTime),
        retryAfter
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - legacyStore[key].count),
      resetAt: new Date(legacyStore[key].resetTime)
    };
  }

  async reset(key: string): Promise<void> {
    console.warn('DEPRECATED: Using legacy rate limit store. Please migrate to shared/core/src/rate-limiting');
    delete legacyStore[key];
  }

  async cleanup(): Promise<void> {
    console.warn('DEPRECATED: Using legacy rate limit store. Please migrate to shared/core/src/rate-limiting');
    const now = Date.now();
    Object.keys(legacyStore).forEach(key => {
      if (legacyStore[key] && now > legacyStore[key].resetTime) {
        delete legacyStore[key];
      }
    });
  }

  private getMaxRequests(options: RateLimitOptions): number {
    const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isTestEnvironment && options.testMax) {
      return options.testMax;
    } else if (isDevelopment && options.devMax) {
      return options.devMax;
    }

    return options.max;
  }
}

// Export singleton instance for backward compatibility
export const legacyRateLimitStore = new LegacyRateLimitStoreAdapter();

// Utility function to clear legacy store (useful for testing)
export const clearLegacyRateLimitStore = () => {
  Object.keys(legacyStore).forEach(key => delete legacyStore[key]);
};

// Utility function to get current legacy rate limit status
export const getLegacyRateLimitStatus = (ip: string) => {
  const key = ip || 'unknown';
  return legacyStore[key] || null;
};
