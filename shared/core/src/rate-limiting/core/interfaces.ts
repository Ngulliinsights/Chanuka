/**
 * Core interfaces for the unified rate limiting system
 * This provides the foundation for all rate limiting implementations
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
  totalHits: number;
  windowStart: number;
  algorithm: string;
}

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
  algorithm: 'sliding-window' | 'token-bucket' | 'fixed-window';
  burstAllowance?: number;
  keyPrefix?: string;
  message?: string;
  testMax?: number;
  devMax?: number;
}

export interface RateLimitStore {
  check(key: string, config: RateLimitConfig): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
  cleanup(): Promise<void>;
  healthCheck?(): Promise<boolean>;
}

export interface RateLimitService {
  checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult>;
  getRateLimitStatus(key: string, config: RateLimitConfig): Promise<RateLimitResult>;
  resetRateLimit(key: string): Promise<void>;
  cleanup(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export interface AIRateLimitConfig extends RateLimitConfig {
  service: string;
  modelCosts: Record<string, number>;
  baseCost: number;
  maxCostPerWindow: number;
  userTierMultipliers?: Record<string, number>;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-RateLimit-Window': string;
  'RateLimit-Limit'?: string;
  'RateLimit-Remaining'?: string;
  'RateLimit-Reset'?: string;
}

export interface RateLimitMetrics {
  totalRequests: number;
  blockedRequests: number;
  blockRate: number;
  algorithmStats: Record<string, { total: number; blocked: number; avgResponseTime: number }>;
  recentErrors: string[];
  windowMs: number;
  timestamp: number;
}




































