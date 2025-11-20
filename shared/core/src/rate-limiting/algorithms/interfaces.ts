import { Result } from '../../primitives/types/result';

/**
 * Common interface for rate limiting algorithms
 */
export interface RateLimitAlgorithm {
  /**
   * Check if a request with the given cost is allowed for the key
   * @param key - The rate limit key (e.g., user ID, IP address)
   * @param cost - The cost of the request (default: 1)
   * @returns Promise<Result<boolean>> - true if allowed, false if rate limited
   */
  checkLimit(key: string, cost?: number): Promise<Result<boolean>>;

  /**
   * Reset the rate limit for a key
   * @param key - The rate limit key
   * @returns Promise<Result<void>>
   */
  reset(key: string): Promise<Result<void>>;

  /**
   * Get the remaining requests/tokens for a key
   * @param key - The rate limit key
   * @returns Promise<Result<number>> - remaining count
   */
  getRemaining(key: string): Promise<Result<number>>;
}


