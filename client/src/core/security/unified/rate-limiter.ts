
import {
  SecurityComponent,
  UnifiedSecurityConfig,
  SecurityHealth,
  SecurityMetrics,
  RateLimitResult
} from './security-interface';
import { logger } from '@client/lib/utils/logger';

export interface RateLimiterConfig {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
}

export class UnifiedRateLimiter implements SecurityComponent {
  private config: RateLimiterConfig;
  private requests: Map<string, { count: number; windowStart: number }> = new Map();
  private isInitialized = false;
  private metrics: SecurityMetrics = {
    requestsProcessed: 0,
    threatsBlocked: 0,
    averageResponseTime: 0,
    errorRate: 0
  };

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  async initialize(config?: UnifiedSecurityConfig | RateLimiterConfig): Promise<void> {
    if (this.isInitialized) return;

    if (config) {
      if ('rateLimiting' in config) {
        this.config = config.rateLimiting;
      } else {
        this.config = config as RateLimiterConfig;
      }
    }

    if (!this.config.enabled) {
      logger.info('UnifiedRateLimiter disabled');
      return;
    }

    this.isInitialized = true;
    logger.info('UnifiedRateLimiter initialized', { config: this.config });
  }

  async shutdown(): Promise<void> {
    this.requests.clear();
    this.isInitialized = false;
  }

  getHealthStatus(): SecurityHealth {
    return {
      enabled: this.config.enabled,
      status: this.isInitialized ? 'healthy' : 'degraded',
      lastCheck: new Date(),
      issues: this.isInitialized ? [] : ['Not initialized']
    };
  }

  getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  checkLimit(key: string, overrideConfig?: Partial<RateLimiterConfig>): RateLimitResult {
    if (!this.config.enabled) {
      return { allowed: true, remaining: 9999, resetTime: Date.now() };
    }

    const effectiveConfig = { ...this.config, ...overrideConfig };
    const now = Date.now();
    let record = this.requests.get(key);

    if (!record || now - record.windowStart > effectiveConfig.windowMs) {
      record = { count: 0, windowStart: now };
      this.requests.set(key, record);
    }

    record.count++;
    this.metrics.requestsProcessed++;
    
    const allowed = record.count <= effectiveConfig.maxRequests;
    
    if (!allowed) {
      this.metrics.threatsBlocked++;
    }

    return {
      allowed,
      remaining: Math.max(0, effectiveConfig.maxRequests - record.count),
      resetTime: record.windowStart + effectiveConfig.windowMs,
      blocked: !allowed
    };
  }
  
  reset(key: string): void {
    this.requests.delete(key);
  }
}
