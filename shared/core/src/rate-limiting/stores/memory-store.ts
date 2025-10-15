import { RateLimitStore, RateLimitOptions, RateLimitResult, RateLimitBucket } from '../types';

export class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, RateLimitBucket>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private cleanupIntervalMs: number = 60000) {
    this.startCleanup();
  }

  async check(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = options.windowMs;
    const maxRequests = this.getMaxRequests(options);

    let bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetTime) {
      // Create new bucket
      bucket = {
        tokens: maxRequests - 1,
        lastRefill: now,
        resetTime: now + windowMs
      };
      this.buckets.set(key, bucket);
      return {
        allowed: true,
        remaining: bucket.tokens,
        resetAt: new Date(bucket.resetTime)
      };
    }

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return {
        allowed: true,
        remaining: bucket.tokens,
        resetAt: new Date(bucket.resetTime)
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(bucket.resetTime),
      retryAfter: Math.ceil((bucket.resetTime - now) / 1000)
    };
  }

  async reset(key: string): Promise<void> {
    this.buckets.delete(key);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, bucket] of this.buckets.entries()) {
      if (now >= bucket.resetTime) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.buckets.delete(key));
  }

  private getMaxRequests(options: RateLimitOptions): number {
    const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isTestEnvironment && options.testMax) {
      return options.testMax;
    } else if (isDevelopment && options.devMax) {
      return options.devMax;
    }

    return options.max;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch(console.error);
    }, this.cleanupIntervalMs);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.buckets.clear();
  }
}
