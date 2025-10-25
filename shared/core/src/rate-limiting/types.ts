import { Result } from '../primitives/types/result';

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

export interface RateLimitData {
  tokens: number;
  lastRefill: number;
  resetTime: number;
}

export interface IRateLimitStore {
  get(key: string): Promise<Result<RateLimitData | null>>;
  set(key: string, data: RateLimitData, ttl?: number): Promise<Result<void>>;
  delete(key: string): Promise<Result<void>>;
  increment(key: string, field: string, amount?: number): Promise<Result<number>>;
  expire(key: string, ttl: number): Promise<Result<void>>;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: any) => string;
  skip?: (req: any) => boolean;
  onLimitReached?: (req: any, res: any) => void;
}





































