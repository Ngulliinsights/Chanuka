export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
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
}

export interface RateLimitStore {
  check(key: string, config: RateLimitConfig): Promise<RateLimitResult>;
  cleanup?(): Promise<void>;
  healthCheck?(): Promise<boolean>;
}

// Enhanced interfaces for comprehensive rate limiting
export interface RateLimitMetricsInterface {
  totalRequests: number;
  blockedRequests: number;
  blockRate: number;
  avgProcessingTime: number;
}

export interface RateLimitMiddlewareOptions {
  store: RateLimitStore;
  config: RateLimitConfig;
  keyGenerator?: (req: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: any, res: any) => void;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}
