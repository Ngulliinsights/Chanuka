/**
 * Async Utilities Module
 *
 * Provides comprehensive utilities for asynchronous operations, including
 * debouncing, throttling, retry logic, and concurrency control.
 *
 * This module consolidates async-related utilities from '@shared/core/utils/async-utils'.ts
 * and other sources into a unified, framework-agnostic interface.
 */

// import { logger } from '../observability/logging'; // Unused import

// ==================== Type Definitions ====================

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  exponentialBase?: number;
  jitterFactor?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

export interface RaceConditionPreventionOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

// ==================== Debounce & Throttle ====================

/**
 * Creates a debounced version of a function that delays invoking func
 * until after wait milliseconds have elapsed since the last time
 * the debounced function was invoked.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): (...args: Parameters<T>) => void {
  const { leading = false, trailing = true } = options;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;
    lastCallTime = now;

    // Execute immediately on leading edge if enabled and it's the first call
    if (leading && timeSinceLastCall > wait) {
      func(...args);
    }

    // Clear existing timeout
    if (timeout) {
      clearTimeout(timeout);
    }

    // Set new timeout for trailing edge
    if (trailing) {
      timeout = setTimeout(() => {
        func(...args);
        timeout = null;
      }, wait);
    }
  };
}

/**
 * Creates a throttled version of a function that ensures the function
 * is called at most once per specified time period.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): (...args: Parameters<T>) => void {
  const { leading = true, trailing = true } = options;
  let lastExecutionTime = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecutionTime;

    // Execute immediately if enough time has passed and leading is enabled
    if (timeSinceLastExecution >= limit && leading) {
      func(...args);
      lastExecutionTime = now;
      pendingArgs = null;

      // Clear any pending trailing call
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
    } else {
      // Store args for potential trailing call
      pendingArgs = args;

      // Set up trailing call if enabled and not already scheduled
      if (trailing && !timeout) {
        const timeUntilNextExecution = limit - timeSinceLastExecution;
        timeout = setTimeout(() => {
          if (pendingArgs) {
            func(...pendingArgs);
            lastExecutionTime = Date.now();
            pendingArgs = null;
          }
          timeout = null;
        }, timeUntilNextExecution);
      }
    }
  };
}

// ==================== Retry Logic ====================

/**
 * Executes a function with retry logic for handling transient failures.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    exponentialBase = 2,
    jitterFactor = 0.3,
    shouldRetry = () => true,
    onRetry
  } = options;

  if (maxAttempts < 1) {
    throw new Error('maxAttempts must be at least 1');
  }

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry this error
      if (attempt === maxAttempts || !shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      // Calculate exponential backoff with jitter
      const exponentialDelay = baseDelay * Math.pow(exponentialBase, attempt - 1);
      const jitter = exponentialDelay * jitterFactor * (Math.random() * 2 - 1); // Symmetric jitter
      const delay = Math.min(Math.max(0, exponentialDelay + jitter), maxDelay);

      // Notify about retry if callback provided
      if (onRetry) {
        onRetry(attempt, lastError, delay);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// ==================== Concurrency Control ====================

/**
 * Creates a mutex (mutual exclusion) lock for coordinating access to shared resources.
 */
export class Mutex {
  private locked = false;
  private waiting: Array<() => void> = [];

  /**
   * Acquires the lock. Returns a function to release the lock.
   */
  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve(() => this.release());
      } else {
        this.waiting.push(() => {
          this.locked = true;
          resolve(() => this.release());
        });
      }
    });
  }

  /**
   * Releases the lock, allowing the next waiting operation to proceed.
   */
  private release(): void {
    if (this.waiting.length > 0) {
      const next = this.waiting.shift();
      if (next) next();
    } else {
      this.locked = false;
    }
  }

  /**
   * Executes a function while holding the lock.
   */
  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  /**
   * Checks if the lock is currently held.
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * Gets the number of operations waiting for the lock.
   */
  getWaitingCount(): number {
    return this.waiting.length;
  }
}

/**
 * Creates a semaphore for limiting concurrent access to a resource.
 */
export class Semaphore {
  private permits: number;
  // private readonly _maxPermits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    if (permits <= 0 || !Number.isInteger(permits)) {
      throw new Error('Semaphore permits must be a positive integer');
    }
    this.permits = permits;
    // this._maxPermits = permits;
  }

  /**
   * Acquires a permit. Returns a function to release the permit.
   */
  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        if (this.permits > 0) {
          this.permits--;
          resolve(() => this.release());
        } else {
          this.waiting.push(tryAcquire);
        }
      };
      tryAcquire();
    });
  }

  /**
   * Releases a permit back to the semaphore.
   */
  private release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift();
      if (next) next();
    }
  }

  /**
   * Executes a function with a permit.
   */
  async withPermit<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  /**
   * Gets the number of available permits.
   */
  getAvailablePermits(): number {
    return this.permits;
  }

  /**
   * Gets the number of operations waiting for a permit.
   */
  getWaitingCount(): number {
    return this.waiting.length;
  }
}

// ==================== Promise Utilities ====================

/**
 * Creates a promise that resolves after the specified delay.
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a promise that resolves after the specified delay with a value.
 */
export function delayValue<T>(ms: number, value: T): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

/**
 * Creates a timeout promise that rejects after the specified time.
 */
export function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    )
  ]);
}

/**
 * Wraps a promise with timeout and retry logic.
 */
export async function withTimeoutAndRetry<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  retryOptions: RetryOptions = {}
): Promise<T> {
  return retry(
    () => timeout(fn(), timeoutMs),
    retryOptions
  );
}

// ==================== Global Instances ====================

/**
 * Global mutex instances for common use cases.
 */
export const globalMutex = new Mutex();
export const apiMutex = new Mutex();
export const cacheMutex = new Mutex();

/**
 * CircuitBreaker prevents cascading failures by stopping operations
 * when error rates exceed a threshold.
 */
export class CircuitBreaker {
  private failures = 0;
  // private _successes = 0;
  private consecutiveSuccesses = 0;
  private lastFailureTime = 0;
  private lastStateChange = Date.now();
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private totalExecutions = 0;
  private totalFailures = 0;

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly timeoutMs: number = 60000,
    private readonly successThreshold: number = 2
  ) {
    if (failureThreshold <= 0 || timeoutMs <= 0 || successThreshold <= 0) {
      throw new Error('All CircuitBreaker thresholds must be greater than 0');
    }
  }

  /**
   * Execute a function with circuit breaker protection.
   * If the circuit is OPEN, this will throw immediately.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalExecutions++;

    // Check if we should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.timeoutMs) {
        this.transitionTo('HALF_OPEN');
      } else {
        const waitTime = this.timeoutMs - timeSinceFailure;
        throw new Error(
          `Circuit breaker is OPEN. Retry in ${Math.ceil(waitTime / 1000)} seconds`
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.failures = 0;
    this.consecutiveSuccesses++;

    if (this.state === 'HALF_OPEN') {
      if (this.consecutiveSuccesses >= this.successThreshold) {
        this.transitionTo('CLOSED');
      }
    } else if (this.state === 'CLOSED') {
      // Reset consecutive successes counter in CLOSED state
      this.consecutiveSuccesses = 0;
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failures++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();
    this.consecutiveSuccesses = 0;

    // Open circuit if we've hit the threshold (in CLOSED or HALF_OPEN state)
    if (this.state !== 'OPEN' && this.failures >= this.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: 'CLOSED' | 'OPEN' | 'HALF_OPEN'): void {
    if (this.state !== newState) {
      this.state = newState;
      this.lastStateChange = Date.now();

      // Reset counters on state transition
      if (newState === 'CLOSED') {
        this.failures = 0;
        this.consecutiveSuccesses = 0;
      } else if (newState === 'HALF_OPEN') {
        this.consecutiveSuccesses = 0;
      }
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  /**
   * Get current failure count
   */
  getFailureCount(): number {
    return this.failures;
  }

  /**
   * Get time in current state (milliseconds)
   */
  getTimeInState(): number {
    return Date.now() - this.lastStateChange;
  }

  /**
   * Calculate success rate (0-1)
   */
  getSuccessRate(): number {
    if (this.totalExecutions === 0) return 1;
    return (this.totalExecutions - this.totalFailures) / this.totalExecutions;
  }

  /**
   * Get comprehensive statistics
   */
  getStats() {
    return {
      state: this.state,
      failures: this.failures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      timeInStateMs: this.getTimeInState(),
      totalExecutions: this.totalExecutions,
      totalFailures: this.totalFailures,
      successRate: this.getSuccessRate(),
      nextRetryIn: this.state === 'OPEN'
        ? Math.max(0, this.timeoutMs - (Date.now() - this.lastFailureTime))
        : 0
    };
  }

  /**
   * Manually reset the circuit breaker to CLOSED state
   */
  reset(): void {
    this.failures = 0;
    // this._successes = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = 0;
    this.totalExecutions = 0;
    this.totalFailures = 0;
    this.transitionTo('CLOSED');
  }
}

/**
 * RateLimiter implements a token bucket algorithm to limit operation frequency.
 * Tokens are consumed on each operation and refilled at a constant rate.
 */
export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private lastRefill: number;
  private refillTimer: ReturnType<typeof setInterval> | null = null;
  private totalConsumed = 0;
  private totalWaits = 0;

  constructor(maxTokens: number, tokensPerSecond: number) {
    if (maxTokens <= 0 || tokensPerSecond <= 0) {
      throw new Error('maxTokens and tokensPerSecond must be greater than 0');
    }
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = tokensPerSecond;
    this.lastRefill = Date.now();

    // Start automatic refill process
    this.startAutoRefill();
  }

  /**
   * Start automatic token refill at optimal intervals
   */
  private startAutoRefill(): void {
    if (this.refillTimer) return;

    // Calculate optimal refill interval: aim for refilling 1 token at a time
    // but cap at 100ms to avoid excessive timer overhead
    const optimalInterval = Math.max(100, Math.min(1000, 1000 / this.refillRate));

    this.refillTimer = setInterval(() => {
      this.refillTokens();
    }, optimalInterval);

    // Prevent timer from keeping process alive in Node.js
    if (typeof this.refillTimer === 'object' && 'unref' in this.refillTimer) {
      this.refillTimer.unref();
    }
  }

  /**
   * Stop automatic token refill (call during cleanup)
   */
  stopAutoRefill(): void {
    if (this.refillTimer) {
      clearInterval(this.refillTimer);
      this.refillTimer = null;
    }
  }

  /**
   * Try to consume tokens. Returns true if successful, false if insufficient tokens.
   */
  consume(count: number = 1): boolean {
    if (count <= 0 || !Number.isFinite(count)) {
      throw new Error('Token count must be a positive finite number');
    }

    this.refillTokens();

    if (this.tokens >= count) {
      this.tokens -= count;
      this.totalConsumed += count;
      return true;
    }

    return false;
  }

  /**
   * Wait for tokens to become available, then consume them.
   * This will block until sufficient tokens are available.
   */
  async waitForToken(count: number = 1): Promise<void> {
    if (count > this.maxTokens) {
      throw new Error(`Requested ${count} tokens but maximum is ${this.maxTokens}`);
    }

    this.totalWaits++;

    return new Promise((resolve) => {
      const tryConsume = () => {
        if (this.consume(count)) {
          resolve();
        } else {
          // Calculate precise wait time based on refill rate
          const tokensNeeded = count - this.tokens;
          const waitMs = Math.ceil((tokensNeeded / this.refillRate) * 1000);

          // Use shorter intervals for more responsive behavior, but not too short
          const checkInterval = Math.min(waitMs, 100);
          setTimeout(tryConsume, checkInterval);
        }
      };
      tryConsume();
    });
  }

  /**
   * Execute a function with rate limiting
   */
  async withRateLimit<T>(fn: () => Promise<T>, tokenCost: number = 1): Promise<T> {
    await this.waitForToken(tokenCost);
    return fn();
  }

  /**
   * Refill tokens based on elapsed time since last refill
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefill;

    if (elapsedMs <= 0) return; // Handle clock adjustments

    const tokensToAdd = (elapsedMs / 1000) * this.refillRate;

    if (tokensToAdd >= 1) {
      // Only update if we're adding at least 1 token to avoid floating point drift
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Get current token count
   */
  getTokenCount(): number {
    this.refillTokens();
    return Math.floor(this.tokens); // Return integer for clarity
  }

  /**
   * Get the percentage of tokens available (0-100)
   */
  getAvailability(): number {
    return (this.getTokenCount() / this.maxTokens) * 100;
  }

  /**
   * Get comprehensive statistics
   */
  getStats() {
    return {
      tokens: this.getTokenCount(),
      maxTokens: this.maxTokens,
      refillRate: this.refillRate,
      availability: this.getAvailability(),
      totalConsumed: this.totalConsumed,
      totalWaits: this.totalWaits
    };
  }

  /**
   * Reset the rate limiter to full capacity
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.totalConsumed = 0;
    this.totalWaits = 0;
  }
}

/**
 * Global semaphore instances for resource pools.
 */
export const apiSemaphore = new Semaphore(5); // Max 5 concurrent API calls
export const fileSemaphore = new Semaphore(3); // Max 3 concurrent file operations

/**
 * Global circuit breaker instances for common use cases.
 */
export const apiCircuitBreaker = new CircuitBreaker(3, 30000, 1);
export const databaseCircuitBreaker = new CircuitBreaker(5, 60000, 2);
export const cacheCircuitBreaker = new CircuitBreaker(10, 10000, 3);

/**
 * Global rate limiter instances for common use cases.
 */
export const apiRateLimiter = new RateLimiter(100, 100);    // 100 requests/sec
export const emailRateLimiter = new RateLimiter(10, 1);     // 10 emails per second
export const authRateLimiter = new RateLimiter(5, 0.5);     // 5 attempts per 10 seconds

/**
 * Cleanup function to properly dispose of resources.
 */
export function cleanup(): void {
  // Clear any pending timeouts/intervals if they exist
  // Note: In a browser environment, we can't clear all timeouts,
  // but this provides a hook for cleanup if needed

  // Stop rate limiter auto-refill timers
  apiRateLimiter.stopAutoRefill();
  emailRateLimiter.stopAutoRefill();
  authRateLimiter.stopAutoRefill();
}



