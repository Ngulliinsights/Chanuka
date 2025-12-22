/**
 * Error Rate Limiter
 *
 * Rate limiter prevents error floods by tracking error frequency per domain
 * and component. Migrated from utils/errors.ts with enhanced modular architecture.
 */

import { AppError } from './types';

/**
 * Internal tracking entry for rate limiting
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstErrorTime: number;
  lastErrorTime: number;
  errors: AppError[];
}

/**
 * Rate limiter prevents error floods by tracking error frequency per domain
 * and component. This protects logging systems and prevents cascading failures.
 */
export class ErrorRateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxErrors: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(windowMs: number = 60000, maxErrors: number = 50) {
    this.windowMs = windowMs;
    this.maxErrors = maxErrors;
    this.startCleanup();
  }

  /**
   * Starts periodic cleanup of expired rate limit entries to prevent memory leaks
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      this.limits.forEach((entry, key) => {
        if (now > entry.resetTime) {
          this.limits.delete(key);
        }
      });
    }, 60000); // Clean up every minute
  }

  /**
   * Checks if an error should be rate limited based on its type and component.
   * Returns whether to limit and how long to wait before retrying.
   */
  shouldLimit(error: AppError): { limited: boolean; retryAfter: number } {
    const key = `${error.type}:${error.context?.component ?? 'unknown'}`;
    const now = Date.now();
    
    let entry = this.limits.get(key);
    
    // Create new entry if none exists or window has expired
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.windowMs,
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

    // Check if limit exceeded
    const limited = entry.count > this.maxErrors;
    const retryAfter = limited ? entry.resetTime - now : 0;

    return { limited, retryAfter };
  }

  /**
   * Clears all rate limit tracking data
   */
  reset(): void {
    this.limits.clear();
  }

  /**
   * Cleanup method to stop intervals
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
export const createRateLimit = (...args: any[]) => {
  // Generated function
  return {};
};
