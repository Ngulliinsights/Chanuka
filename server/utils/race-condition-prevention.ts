/**
 * Race Condition Prevention Utilities
 * 
 * This module provides utilities to prevent race conditions in concurrent operations.
 */

export class AsyncLock {
  private locks = new Map<string, Promise<void>>();
  private lockCounts = new Map<string, number>();

  /**
   * Acquire a lock for the given key
   */
  async acquire(key: string): Promise<() => void> {
    // If there's already a lock for this key, wait for it
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }

    // Create a new lock
    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.locks.set(key, lockPromise);
    this.lockCounts.set(key, (this.lockCounts.get(key) || 0) + 1);

    // Return the release function
    return () => {
      this.locks.delete(key);
      const count = this.lockCounts.get(key) || 0;
      if (count <= 1) {
        this.lockCounts.delete(key);
      } else {
        this.lockCounts.set(key, count - 1);
      }
      releaseLock!();
    };
  }

  /**
   * Execute a function with a lock
   */
  async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire(key);
    try {
      return await fn();
    } finally {
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
   * Get the number of times a key has been locked
   */
  getLockCount(key: string): number {
    return this.lockCounts.get(key) || 0;
  }

  /**
   * Get all currently locked keys
   */
  getLockedKeys(): string[] {
    return Array.from(this.locks.keys());
  }

  /**
   * Clear all locks (use with caution)
   */
  clearAll(): void {
    this.locks.clear();
    this.lockCounts.clear();
  }
}

export class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  /**
   * Acquire a permit
   */
  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve(() => this.release());
      } else {
        this.waitQueue.push(() => {
          this.permits--;
          resolve(() => this.release());
        });
      }
    });
  }

  /**
   * Release a permit
   */
  private release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) {
        next();
      }
    }
  }

  /**
   * Execute a function with a permit
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
   * Get the number of available permits
   */
  getAvailablePermits(): number {
    return this.permits;
  }

  /**
   * Get the number of waiting tasks
   */
  getWaitingCount(): number {
    return this.waitQueue.length;
  }
}

export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private lastRefill: number;
  private waitQueue: Array<() => void> = [];

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume a token
   */
  async consume(): Promise<boolean> {
    this.refillTokens();
    
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    
    return false;
  }

  /**
   * Wait for a token to become available
   */
  async waitForToken(): Promise<void> {
    return new Promise((resolve) => {
      const tryConsume = () => {
        if (this.consume()) {
          resolve();
        } else {
          this.waitQueue.push(tryConsume);
          setTimeout(tryConsume, 1000 / this.refillRate);
        }
      };
      tryConsume();
    });
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor((timePassed / 1000) * this.refillRate);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
      
      // Process waiting queue
      while (this.waitQueue.length > 0 && this.tokens > 0) {
        const next = this.waitQueue.shift();
        if (next) {
          next();
        }
      }
    }
  }

  /**
   * Get current token count
   */
  getTokenCount(): number {
    this.refillTokens();
    return this.tokens;
  }
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private monitoringPeriod: number = 10000 // 10 seconds
  ) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
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

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failures;
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
  }
}

/**
 * Debounce function to prevent rapid successive calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function to limit execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Global instances for common use cases
 */
export const globalAsyncLock = new AsyncLock();
export const databaseLock = new AsyncLock();
export const webSocketLock = new AsyncLock();
export const schedulerLock = new AsyncLock();

// Database connection semaphore (limit concurrent connections)
export const databaseSemaphore = new Semaphore(10);

// API rate limiter (100 requests per second)
export const apiRateLimiter = new RateLimiter(100, 100);

// Database circuit breaker
export const databaseCircuitBreaker = new CircuitBreaker(5, 60000, 10000);