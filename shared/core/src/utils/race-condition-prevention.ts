/**
 * Race Condition Prevention Utilities
 *
 * This module provides comprehensive utilities to prevent race conditions
 * and manage concurrent operations safely across your application.
 *
 * This is a shared implementation that can be used by both client and server.
 */

// ==================== Type Definitions ====================

export interface RaceConditionPreventionOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

// ==================== Utility Functions ====================

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

/**
 * Executes a function with retry logic for handling transient failures.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    exponentialBase?: number;
    jitterFactor?: number;
    shouldRetry?: (error: Error, attempt: number) => boolean;
    onRetry?: (attempt: number, error: Error, delay: number) => void;
  } = {}
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
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    if (permits <= 0 || !Number.isInteger(permits)) {
      throw new Error('Semaphore permits must be a positive integer');
    }
    this.permits = permits;
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

// ==================== Global Instances ====================

/**
 * Global mutex instances for common use cases.
 */
export const globalMutex = new Mutex();
export const apiMutex = new Mutex();
export const cacheMutex = new Mutex();

/**
 * Global semaphore instances for resource pools.
 */
export const apiSemaphore = new Semaphore(5); // Max 5 concurrent API calls
export const fileSemaphore = new Semaphore(3); // Max 3 concurrent file operations

/**
 * Cleanup function to properly dispose of resources.
 */
export function cleanup(): void {
  // Clear any pending timeouts/intervals if they exist
  // Note: In a browser environment, we can't clear all timeouts,
  // but this provides a hook for cleanup if needed
}







































