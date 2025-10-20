import { Result, ok, err } from '../../primitives/types/result';
import { RateLimitData, IRateLimitStore } from '../types';

export class MemoryRateLimitStore implements IRateLimitStore {
  private data = new Map<string, RateLimitData>();
  private locks = new Map<string, Promise<void>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private cleanupIntervalMs: number = 60000) {
    this.startCleanup();
  }

  async get(key: string): Promise<Result<RateLimitData | null>> {
    try {
      const data = this.data.get(key) || null;
      return ok(data);
    } catch (error) {
      return err(error as Error);
    }
  }

  async set(key: string, data: RateLimitData, ttl?: number): Promise<Result<void>> {
    try {
      this.data.set(key, data);

      if (ttl) {
        setTimeout(() => {
          this.data.delete(key);
        }, ttl);
      }

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async delete(key: string): Promise<Result<void>> {
    try {
      this.data.delete(key);
      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  async increment(key: string, field: string, amount: number = 1): Promise<Result<number>> {
    const lockKey = `lock:${key}`;

    // Wait for any existing operation on this key
    const existingLock = this.locks.get(lockKey);
    if (existingLock) {
      await existingLock;
    }

    // Create a new lock for this operation
    let resolveLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    this.locks.set(lockKey, lockPromise);

    try {
      let data = this.data.get(key);

      if (!data) {
        data = {
          tokens: 0,
          lastRefill: Date.now(),
          resetTime: Date.now() + 60000 // Default 1 minute window
        };
      }

      if (field === 'tokens') {
        data.tokens += amount;
      } else if (field === 'lastRefill') {
        data.lastRefill += amount;
      } else if (field === 'resetTime') {
        data.resetTime += amount;
      } else {
        throw new Error(`Unknown field: ${field}`);
      }

      this.data.set(key, data);

      return ok(data[field as keyof RateLimitData] as number);
    } catch (error) {
      return err(error as Error);
    } finally {
      // Release the lock
      resolveLock!();
      this.locks.delete(lockKey);
    }
  }

  async expire(key: string, ttl: number): Promise<Result<void>> {
    try {
      setTimeout(() => {
        this.data.delete(key);
      }, ttl);

      return ok(undefined);
    } catch (error) {
      return err(error as Error);
    }
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch(console.error);
    }, this.cleanupIntervalMs);
  }

  private async cleanup(): Promise<void> {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, data] of this.data.entries()) {
      if (now >= data.resetTime) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.data.delete(key));
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.data.clear();
    this.locks.clear();
  }
}
