export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  statusCode?: number;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<number>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
  getRateLimitInfo(key: string): Promise<RateLimitInfo>;
}












































