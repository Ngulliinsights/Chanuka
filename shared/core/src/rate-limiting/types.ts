export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  testMax?: number;
  devMax?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number | undefined;
}

export interface RateLimitStore {
  check(key: string, options: RateLimitOptions): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
  cleanup(): Promise<void>;
}

export interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
  resetTime: number;
}

export interface AIRateLimitOptions extends RateLimitOptions {
  modelCosts: Record<string, number>;
  baseCost: number;
  maxCostPerWindow: number;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-RateLimit-Window': string;
}
