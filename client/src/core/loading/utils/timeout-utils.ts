/**
 * Timeout management utilities for loading operations
 */

export interface TimeoutManagerOptions {
  timeout: number;
  onTimeout: () => void;
  onWarning?: (remainingTime: number) => void;
  warningThreshold?: number;
}

export class TimeoutManager {
  private timeoutId?: NodeJS.Timeout;
  private warningId?: NodeJS.Timeout;
  private startTime: number = 0;
  private isActive: boolean = false;

  constructor(private options: TimeoutManagerOptions) {}

  start(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.startTime = Date.now();

    // Set timeout
    this.timeoutId = setTimeout(() => {
      this.options.onTimeout();
      this.stop();
    }, this.options.timeout);

    // Set warning if threshold provided
    const warningThreshold = this.options.warningThreshold || this.options.timeout * 0.7;
    if (warningThreshold > 0 && this.options.onWarning) {
      this.warningId = setTimeout(() => {
        const elapsed = Date.now() - this.startTime;
        const remaining = this.options.timeout - elapsed;
        this.options.onWarning?.(remaining);
      }, warningThreshold);
    }
  }

  stop(): void {
    if (!this.isActive) return;

    this.isActive = false;

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }

    if (this.warningId) {
      clearTimeout(this.warningId);
      this.warningId = undefined;
    }
  }

  extend(additionalTime: number): void {
    if (!this.isActive) return;

    const elapsed = Date.now() - this.startTime;
    const newTimeout = elapsed + additionalTime;

    // Clear existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Set new timeout
    this.timeoutId = setTimeout(() => {
      this.options.onTimeout();
      this.stop();
    }, newTimeout);
  }

  getElapsedTime(): number {
    return this.isActive ? Date.now() - this.startTime : 0;
  }

  getRemainingTime(): number {
    if (!this.isActive) return 0;
    const elapsed = Date.now() - this.startTime;
    return Math.max(0, this.options.timeout - elapsed);
  }

  isExpired(): boolean {
    return this.getRemainingTime() <= 0;
  }
}

/**
 * Create a timeout manager instance
 */
export function createTimeoutManager(options: TimeoutManagerOptions): TimeoutManager {
  return new TimeoutManager(options);
}

/**
 * Execute a function with timeout
 */
export async function withTimeout<T>(asyncFn: () => Promise<T>, timeout: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let timeoutId: NodeJS.Timeout;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
    };

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Operation timed out after ${timeout}ms`));
    }, timeout);

    asyncFn()
      .then(result => {
        cleanup();
        resolve(result);
      })
      .catch(error => {
        cleanup();
        reject(error);
      });
  });
}

/**
 * Execute multiple functions with individual timeouts
 */
export async function withMultipleTimeouts<T>(
  operations: Array<() => Promise<T>>,
  timeout: number
): Promise<T[]> {
  const promises = operations.map(op => withTimeout(op, timeout));
  return Promise.all(promises);
}

/**
 * Race multiple operations with timeout
 */
export async function raceWithTimeout<T>(
  operations: Array<() => Promise<T>>,
  timeout: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`All operations timed out after ${timeout}ms`)), timeout);
  });

  const operationPromises = operations.map(op => op());
  return Promise.race([...operationPromises, timeoutPromise]);
}

/**
 * Create a cancellable timeout
 */
export class CancellableTimeout {
  private timeoutId?: NodeJS.Timeout;
  private isCancelled: boolean = false;

  constructor(
    private callback: () => void,
    private delay: number
  ) {}

  start(): void {
    if (this.isCancelled) return;

    this.timeoutId = setTimeout(() => {
      if (!this.isCancelled) {
        this.callback();
      }
    }, this.delay);
  }

  cancel(): void {
    this.isCancelled = true;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  extend(additionalDelay: number): void {
    if (this.isCancelled) return;

    this.cancel();
    this.delay += additionalDelay;
    this.start();
  }
}

/**
 * Create a cancellable timeout instance
 */
export function createCancellableTimeout(callback: () => void, delay: number): CancellableTimeout {
  return new CancellableTimeout(callback, delay);
}
