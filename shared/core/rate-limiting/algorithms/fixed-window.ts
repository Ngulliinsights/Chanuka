import { Result, ok, err } from '../../primitives/types/result';

import { RateLimitAlgorithm } from './interfaces';

/**
 * Configuration for FixedWindow algorithm
 */
export interface FixedWindowConfig {
  /** Duration of each window in milliseconds */
  windowDuration: number;
  /** Maximum number of requests allowed per window */
  maxRequests: number;
}

/**
 * Fixed Window Rate Limiting Algorithm
 *
 * Implements the fixed window algorithm where requests are tracked within
 * fixed time windows. Each window has a fixed duration, and when the window
 * expires, a new window starts with a fresh request count.
 */
export class FixedWindow implements RateLimitAlgorithm {
  constructor(
    private readonly config: FixedWindowConfig,
    private readonly store: Map<string, { count: number; windowStart: number }> = new Map()
  ) { }

  /**
   * Check if a request is allowed within the current fixed window
   * @param key - The rate limit key
   * @param cost - The cost of the request (default: 1)
   * @returns Promise<Result<boolean>> - true if allowed, false if rate limited
   */
  async checkLimit(key: string, cost: number = 1): Promise<Result<boolean>> {
    try {
      const now = Date.now();
      const currentWindow = this.getCurrentWindow(now);

      // Get or initialize the window data for this key
      let windowData = this.store.get(key);

      // Check if we need to reset the window
      if (!windowData || windowData.windowStart !== currentWindow) {
        windowData = { count: 0, windowStart: currentWindow };
      }

      // Check if adding this request would exceed the limit
      if (windowData.count + cost > this.config.maxRequests) {
        this.store.set(key, windowData);
        return ok(false);
      }

      // Allow the request and update the count
      windowData.count += cost;
      this.store.set(key, windowData);
      return ok(true);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Fixed window check failed'));
    }
  }

  /**
   * Reset the rate limit for a key
   * @param key - The rate limit key
   * @returns Promise<Result<void>>
   */
  async reset(key: string): Promise<Result<void>> {
    try {
      this.store.delete(key);
      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Fixed window reset failed'));
    }
  }

  /**
   * Get the remaining requests allowed in the current window for a key
   * @param key - The rate limit key
   * @returns Promise<Result<number>> - remaining request count
   */
  async getRemaining(key: string): Promise<Result<number>> {
    try {
      const now = Date.now();
      const currentWindow = this.getCurrentWindow(now);

      // Get the window data for this key
      let windowData = this.store.get(key);

      // Check if we need to reset the window
      if (!windowData || windowData.windowStart !== currentWindow) {
        windowData = { count: 0, windowStart: currentWindow };
        this.store.set(key, windowData);
      }

      const remaining = Math.max(0, this.config.maxRequests - windowData.count);
      return ok(remaining);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Fixed window get remaining failed'));
    }
  }

  /**
   * Calculate the current window start time based on the current time
   * @param currentTime - Current timestamp in milliseconds
   * @returns The start time of the current window
   */
  private getCurrentWindow(currentTime: number): number {
    return Math.floor(currentTime / this.config.windowDuration) * this.config.windowDuration;
  }
}

// Export alias for backward compatibility
export { FixedWindow as FixedWindowStore };



