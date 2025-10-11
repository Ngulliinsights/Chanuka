/**
 * Comprehensive Race Condition Prevention Utilities
 * 
 * This module provides production-ready utilities to prevent race conditions
 * and manage concurrent operations safely across your application.
 */

/**
 * AsyncLock provides mutual exclusion for asynchronous operations.
 * Use this when you need to ensure only one operation at a time can access
 * a shared resource, identified by a key.
 */
export class AsyncLock {
  // Store both the promise and its resolver for better control
  private locks = new Map<string, { promise: Promise<void>; waitCount: number }>();
  private lockCounts = new Map<string, number>();

  /**
   * Acquire a lock for the given key. If the key is already locked,
   * this will wait until the lock is released.
   */
  async acquire(key: string): Promise<() => void> {
    // Get or create lock entry atomically to prevent race conditions
    let lockEntry = this.locks.get(key);
    
    if (lockEntry) {
      // Increment wait count for monitoring before waiting
      lockEntry.waitCount++;
      await lockEntry.promise;
      // After waiting, we need to recursively try again since another
      // operation might have acquired the lock before us
      return this.acquire(key);
    }

    // No existing lock, create a new one atomically
    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.locks.set(key, { promise: lockPromise, waitCount: 0 });
    this.lockCounts.set(key, (this.lockCounts.get(key) || 0) + 1);

    // Return release function with proper cleanup
    return () => {
      this.locks.delete(key);
      releaseLock!();
    };
  }

  /**
   * Execute a function with exclusive access to the resource identified by key.
   * This is the recommended way to use AsyncLock as it handles cleanup automatically.
   */
  async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire(key);
    try {
      return await fn();
    } finally {
      // Ensure release is called even if fn throws
      release();
    }
  }

  /**
   * Check if a key is currently locked
   */
  isLocked(key: string): boolean {
    return this.locks.has(key);
  }

  /**
   * Get the total number of times a key has been locked (historical count)
   */
  getLockCount(key: string): number {
    return this.lockCounts.get(key) || 0;
  }

  /**
   * Get the number of operations waiting for a specific key
   */
  getWaitingCount(key: string): number {
    const entry = this.locks.get(key);
    return entry ? entry.waitCount : 0;
  }

  /**
   * Get all currently locked keys
   */
  getLockedKeys(): string[] {
    return Array.from(this.locks.keys());
  }

  /**
   * Get detailed statistics about all locks
   */
  getStats() {
    return {
      activeLocksCount: this.locks.size,
      lockedKeys: this.getLockedKeys(),
      totalLockCounts: Object.fromEntries(this.lockCounts)
    };
  }

  /**
   * Clear all locks. Use with extreme caution - only for testing or emergency shutdown.
   */
  clearAll(): void {
    // Resolve all pending locks to prevent deadlocks
    for (const entry of this.locks.values()) {
      // The promise resolver will be called when we delete the entry
    }
    this.locks.clear();
    this.lockCounts.clear();
  }
}

/**
 * Semaphore limits the number of concurrent operations to a specified permit count.
 * Unlike AsyncLock which allows only one operation per key, Semaphore allows
 * N concurrent operations across all callers.
 */
export class Semaphore {
  private permits: number;
  private readonly maxPermits: number;
  private waitQueue: Array<() => void> = [];
  private activeOperations = 0; // Track operations in flight for better monitoring

  constructor(permits: number) {
    if (permits <= 0 || !Number.isInteger(permits)) {
      throw new Error('Semaphore permits must be a positive integer');
    }
    this.permits = permits;
    this.maxPermits = permits;
  }

  /**
   * Acquire a permit. Returns a release function that must be called
   * when the operation completes.
   */
  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        if (this.permits > 0) {
          this.permits--;
          this.activeOperations++;
          
          // Create release function with protection against double-release
          let released = false;
          const releaseFunc = () => {
            if (released) {
              console.warn('Semaphore: Attempted to release permit twice');
              return;
            }
            released = true;
            this.release();
          };
          
          resolve(releaseFunc);
        } else {
          this.waitQueue.push(tryAcquire);
        }
      };
      tryAcquire();
    });
  }

  /**
   * Release a permit back to the semaphore, allowing waiting operations to proceed
   */
  private release(): void {
    this.permits++;
    this.activeOperations--;
    
    // Sanity check to prevent bugs from corrupting state
    if (this.permits > this.maxPermits) {
      console.error(`Semaphore: permits (${this.permits}) exceeded max (${this.maxPermits}). Correcting.`);
      this.permits = this.maxPermits;
    }
    
    // Process next waiting operation if any
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) {
        // Use queueMicrotask for better performance than setImmediate
        queueMicrotask(() => next());
      }
    }
  }

  /**
   * Execute a function with a permit. Automatically handles acquire and release.
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
   * Get the number of currently available permits
   */
  getAvailablePermits(): number {
    return this.permits;
  }

  /**
   * Get the number of operations waiting for a permit
   */
  getWaitingCount(): number {
    return this.waitQueue.length;
  }

  /**
   * Get the number of operations currently holding permits
   */
  getActiveOperations(): number {
    return this.activeOperations;
  }

  /**
   * Get the utilization percentage (0-100)
   */
  getUtilization(): number {
    return ((this.maxPermits - this.permits) / this.maxPermits) * 100;
  }

  /**
   * Get comprehensive stats about the semaphore
   */
  getStats() {
    return {
      maxPermits: this.maxPermits,
      availablePermits: this.permits,
      activeOperations: this.activeOperations,
      waitingCount: this.waitQueue.length,
      utilization: this.getUtilization()
    };
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
 * CircuitBreaker prevents cascading failures by stopping operations
 * when error rates exceed a threshold.
 */
export class CircuitBreaker {
  private failures = 0;
  private successes = 0;
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
    this.successes = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = 0;
    this.totalExecutions = 0;
    this.totalFailures = 0;
    this.transitionTo('CLOSED');
  }
}

/**
 * Debounce prevents rapid successive calls by delaying execution
 * until after a specified wait period has passed without new calls.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number,
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
    if (leading && timeSinceLastCall > waitMs) {
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
      }, waitMs);
    }
  };
}

/**
 * Throttle limits execution frequency by ensuring the function
 * is called at most once per specified time period.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limitMs: number,
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
    if (timeSinceLastExecution >= limitMs && leading) {
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
        const timeUntilNextExecution = limitMs - timeSinceLastExecution;
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

/**
 * Retry executes a function with exponential backoff on failure.
 * Useful for handling transient errors in network or database operations.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    exponentialBase?: number;
    jitterFactor?: number;
    shouldRetry?: (error: Error, attempt: number) => boolean;
    onRetry?: (attempt: number, error: Error, delayMs: number) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
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
      const exponentialDelay = baseDelayMs * Math.pow(exponentialBase, attempt - 1);
      const jitter = exponentialDelay * jitterFactor * (Math.random() * 2 - 1); // Symmetric jitter
      const delayMs = Math.min(Math.max(0, exponentialDelay + jitter), maxDelayMs);
      
      // Notify about retry if callback provided
      if (onRetry) {
        onRetry(attempt, lastError, delayMs);
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw lastError!;
}

/**
 * Global instances for common use cases throughout your application.
 * These provide convenient access to shared synchronization primitives.
 */
export const globalAsyncLock = new AsyncLock();
export const databaseLock = new AsyncLock();
export const apiLock = new AsyncLock();
export const cacheLock = new AsyncLock();

// Semaphores for resource pools
export const databaseSemaphore = new Semaphore(10); // Max 10 concurrent DB operations
export const apiSemaphore = new Semaphore(5);       // Max 5 concurrent API calls
export const fileSemaphore = new Semaphore(3);      // Max 3 concurrent file operations

// Rate limiters (tokens per second)
export const apiRateLimiter = new RateLimiter(100, 100);    // 100 requests/sec
export const emailRateLimiter = new RateLimiter(10, 1);     // 10 emails per second
export const authRateLimiter = new RateLimiter(5, 0.5);     // 5 attempts per 10 seconds

// Circuit breakers
export const databaseCircuitBreaker = new CircuitBreaker(5, 60000, 2);
export const apiCircuitBreaker = new CircuitBreaker(3, 30000, 1);
export const cacheCircuitBreaker = new CircuitBreaker(10, 10000, 3);

/**
 * Cleanup function to properly dispose of resources.
 * Call this during application shutdown to prevent memory leaks.
 */
export function cleanup(): void {
  apiRateLimiter.stopAutoRefill();
  emailRateLimiter.stopAutoRefill();
  authRateLimiter.stopAutoRefill();
}






