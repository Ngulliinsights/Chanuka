import { Result, ok, err } from '../../primitives/types/result';
import { RateLimitAlgorithm } from './interfaces';

/**
 * Configuration for SlidingWindow algorithm
 */
export interface SlidingWindowConfig {
  /** Size of the sliding window in milliseconds */
  windowSize: number;
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
}

/**
 * Sliding Window Rate Limiting Algorithm
 *
 * Implements the sliding window algorithm where requests are tracked within
 * a moving time window. Requests are allowed only if the number of requests
 * within the current window does not exceed the limit.
 */
export class SlidingWindow implements RateLimitAlgorithm {
  constructor(
    private readonly config: SlidingWindowConfig,
    private readonly store: Map<string, number[]> = new Map()
  ) {}

  /**
   * Check if a request is allowed within the sliding window
   * @param key - The rate limit key
   * @param cost - The cost of the request (default: 1)
   * @returns Promise<Result<boolean>> - true if allowed, false if rate limited
   */
  async checkLimit(key: string, cost: number = 1): Promise<Result<boolean>> {
    try {
      const now = Date.now();
      const windowStart = now - this.config.windowSize;

      // Get or initialize request timestamps for this key
      let timestamps = this.store.get(key) ?? [];

      // Remove timestamps outside the current window
      timestamps = timestamps.filter(timestamp => timestamp > windowStart);

      // Check if adding this request would exceed the limit
      if (timestamps.length + cost > this.config.maxRequests) {
        this.store.set(key, timestamps);
        return ok(false);
      }

      // Add the current request timestamp(s)
      for (let i = 0; i < cost; i++) {
        timestamps.push(now);
      }

      this.store.set(key, timestamps);
      return ok(true);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Sliding window check failed'));
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
      return err(error instanceof Error ? error : new Error('Sliding window reset failed'));
    }
  }

  /**
   * Get the remaining requests allowed for a key within the current window
   * @param key - The rate limit key
   * @returns Promise<Result<number>> - remaining request count
   */
  async getRemaining(key: string): Promise<Result<number>> {
    try {
      const now = Date.now();
      const windowStart = now - this.config.windowSize;

      // Get request timestamps for this key
      let timestamps = this.store.get(key) ?? [];

      // Remove timestamps outside the current window
      timestamps = timestamps.filter(timestamp => timestamp > windowStart);

      // Update the store with cleaned timestamps
      this.store.set(key, timestamps);

      const remaining = Math.max(0, this.config.maxRequests - timestamps.length);
      return ok(remaining);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Sliding window get remaining failed'));
    }
  }
}
// Export alias for backward compatibility
export { SlidingWindow as SlidingWindowStore };



