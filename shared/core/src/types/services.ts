export interface Services {
  cache: CacheService;
  validator: ValidationService;
  rateLimitStore: RateLimitStore;
  healthChecker: HealthChecker;
}

export interface CacheService {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface ValidationService {
  validate(schema: any, data: any): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<number>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
  getRateLimitInfo(key: string): Promise<RateLimitInfo>;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

export interface HealthChecker {
  check(): Promise<HealthStatus>;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  details?: Record<string, any>;
}













































