/**
 * Concurrency Adapter for Migration
 * 
 * This adapter maintains API compatibility with existing race condition prevention utilities
 * while using established libraries (async-mutex and p-limit) under the hood.
 */

import { Mutex as AsyncMutex } from 'async-mutex';
import pLimit from 'p-limit';

// Re-export types for compatibility
export interface RaceConditionPreventionOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Adapter for Mutex functionality using async-mutex library
 */
export class Mutex {
  private asyncMutex: AsyncMutex;
  private waitingCount = 0;

  constructor() {
    this.asyncMutex = new AsyncMutex();
  }

  /**
   * Acquires the lock. Returns a function to release the lock.
   */
  async acquire(): Promise<() => void> {
    this.waitingCount++;
    try {
      const release = await this.asyncMutex.acquire();
      this.waitingCount--;
      return release;
    } catch (error) {
      this.waitingCount--;
      throw error;
    }
  }

  /**
   * Executes a function while holding the lock.
   */
  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    return this.asyncMutex.runExclusive(fn);
  }

  /**
   * Checks if the lock is currently held.
   */
  isLocked(): boolean {
    return this.asyncMutex.isLocked();
  }

  /**
   * Gets the number of operations waiting for the lock.
   */
  getWaitingCount(): number {
    return this.waitingCount;
  }
}

/**
 * Adapter for Semaphore functionality using p-limit library
 */
export class Semaphore {
  private limiter: ReturnType<typeof pLimit>;
  private permits: number;
  private activeCount = 0;

  constructor(permits: number) {
    if (permits <= 0 || !Number.isInteger(permits)) {
      throw new Error('Semaphore permits must be a positive integer');
    }
    this.permits = permits;
    this.limiter = pLimit(permits);
  }

  /**
   * Acquires a permit. Returns a function to release the permit.
   */
  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      this.limiter(() => {
        this.activeCount++;
        return new Promise<void>((releaseResolve) => {
          resolve(() => {
            this.activeCount--;
            releaseResolve();
          });
        });
      });
    });
  }

  /**
   * Executes a function with a permit.
   */
  async withPermit<T>(fn: () => Promise<T>): Promise<T> {
    return this.limiter(async () => {
      this.activeCount++;
      try {
        return await fn();
      } finally {
        this.activeCount--;
      }
    });
  }

  /**
   * Gets the number of available permits.
   */
  getAvailablePermits(): number {
    return this.permits - this.activeCount;
  }

  /**
   * Gets the number of operations waiting for a permit.
   */
  getWaitingCount(): number {
    return this.limiter.pendingCount;
  }
}

/**
 * Concurrency utilities using new library implementations
 */
export class ConcurrencyAdapter {
  private mutex: Mutex;
  private limiter: ReturnType<typeof pLimit>;

  constructor(concurrencyLimit = 10) {
    this.mutex = new Mutex();
    this.limiter = pLimit(concurrencyLimit);
  }

  /**
   * Execute function with mutex lock
   */
  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    return this.mutex.withLock(fn);
  }

  /**
   * Execute function with concurrency limit
   */
  async withLimit<T>(fn: () => Promise<T>): Promise<T> {
    return this.limiter(fn);
  }

  /**
   * Get mutex instance for direct access
   */
  getMutex(): Mutex {
    return this.mutex;
  }

  /**
   * Get current concurrency stats
   */
  getStats() {
    return {
      isLocked: this.mutex.isLocked(),
      waitingCount: this.mutex.getWaitingCount(),
      pendingCount: this.limiter.pendingCount,
      activeCount: this.limiter.activeCount
    };
  }
}

// Global instances for backward compatibility
export const globalMutex = new Mutex();
export const apiMutex = new Mutex();
export const cacheMutex = new Mutex();

export const apiSemaphore = new Semaphore(5); // Max 5 concurrent API calls
export const fileSemaphore = new Semaphore(3); // Max 3 concurrent file operations

// Default concurrency adapter instance
export const concurrencyAdapter = new ConcurrencyAdapter();

/**
 * Cleanup function to properly dispose of resources.
 */
export function cleanup(): void {
  // p-limit and async-mutex handle their own cleanup
  // This provides a hook for any additional cleanup if needed
}

