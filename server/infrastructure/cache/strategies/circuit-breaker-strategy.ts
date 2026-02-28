/**
 * Circuit Breaker Strategy
 *
 * Implements the circuit breaker pattern to prevent cascading failures
 * when cache operations fail repeatedly. Extracted from cache-factory.ts wrapper classes.
 */

export interface CircuitBreakerConfig {
  threshold: number; // Number of failures before opening circuit
  timeout: number; // Time to wait before attempting operation (ms)
  resetTimeout: number; // Time to wait before closing circuit (ms)
}

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/**
 * CircuitBreakerStrategy
 *
 * Provides circuit breaker functionality to protect cache operations
 * from cascading failures. Tracks failures and automatically opens/closes
 * the circuit based on configured thresholds.
 *
 * States:
 * - closed: Normal operation, all requests pass through
 * - open: Circuit is open, requests fail fast without attempting operation
 * - half-open: Testing if service has recovered, limited requests allowed
 *
 * @example
 * ```typescript
 * const strategy = new CircuitBreakerStrategy({
 *   threshold: 5,
 *   timeout: 60000,
 *   resetTimeout: 300000
 * });
 *
 * try {
 *   const result = await strategy.execute(async () => {
 *     return await cache.get('key');
 *   });
 * } catch (error) {
 *   console.error('Circuit breaker prevented operation:', error);
 * }
 * ```
 */
export class CircuitBreakerStrategy {
  private failures = 0;
  private lastFailure = 0;
  private state: CircuitBreakerState = 'closed';
  private successCount = 0;

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Execute an operation with circuit breaker protection
   *
   * @param operation - The async operation to execute
   * @returns The result of the operation
   * @throws Error if circuit is open or operation fails
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.config.resetTimeout) {
        // Try to transition to half-open
        this.state = 'half-open';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();

      // Record success
      if (this.state === 'half-open') {
        this.successCount++;
        // Close circuit after successful operations
        if (this.successCount >= 3) {
          this.state = 'closed';
          this.failures = 0;
          this.successCount = 0;
        }
      } else if (this.state === 'closed') {
        // Reset failure count on success
        this.failures = 0;
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Record a failure and update circuit state
   */
  private recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.config.threshold) {
      this.state = 'open';
      this.successCount = 0;
    }
  }

  /**
   * Get current circuit breaker state
   *
   * @returns Current state information
   */
  getState(): {
    state: CircuitBreakerState;
    failures: number;
    lastFailure: number;
    successCount: number;
  } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure,
      successCount: this.successCount,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.lastFailure = 0;
    this.successCount = 0;
  }

  /**
   * Check if circuit is currently open
   *
   * @returns True if circuit is open
   */
  isOpen(): boolean {
    return this.state === 'open';
  }

  /**
   * Check if circuit is currently closed
   *
   * @returns True if circuit is closed
   */
  isClosed(): boolean {
    return this.state === 'closed';
  }

  /**
   * Check if circuit is currently half-open
   *
   * @returns True if circuit is half-open
   */
  isHalfOpen(): boolean {
    return this.state === 'half-open';
  }

  /**
   * Get circuit breaker metrics
   *
   * @returns Metrics about circuit breaker performance
   */
  getMetrics(): {
    state: CircuitBreakerState;
    totalFailures: number;
    currentFailures: number;
    lastFailureTime: Date | null;
    timeSinceLastFailure: number;
    threshold: number;
  } {
    return {
      state: this.state,
      totalFailures: this.failures,
      currentFailures: this.failures,
      lastFailureTime: this.lastFailure > 0 ? new Date(this.lastFailure) : null,
      timeSinceLastFailure: this.lastFailure > 0 ? Date.now() - this.lastFailure : 0,
      threshold: this.config.threshold,
    };
  }
}
