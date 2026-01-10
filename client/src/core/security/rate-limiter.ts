/**
 * Client-Side Rate Limiter
 * Prevents abuse by limiting API requests and user actions
 */

import { SecurityEvent, RateLimitInfo } from '@client/shared/types';
import { logger } from '@client/shared/utils/logger';

export interface RateLimiterConfig {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  keyGenerator?: (request: Request) => string;
  onLimitReached?: (info: RateLimitInfo) => void;
}

interface RequestRecord {
  timestamp: number;
  success: boolean;
  endpoint: string;
}

interface RateLimitBucket {
  requests: RequestRecord[];
  windowStart: number;
  blocked: boolean;
}

export class RateLimiter {
  private config: RateLimiterConfig;
  private buckets: Map<string, RateLimitBucket> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: RateLimiterConfig) {
    this.config = {
      keyGenerator: (request: Request) => this.defaultKeyGenerator(request),
      ...config,
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Rate Limiter disabled');
      return;
    }

    try {
      // Set up request interception
      this.setupRequestInterception();

      // Set up cleanup timer
      this.setupCleanup();

      // Set up action rate limiting
      this.setupActionLimiting();

      logger.info('Rate Limiter initialized successfully', {
        windowMs: this.config.windowMs,
        maxRequests: this.config.maxRequests,
      });
    } catch (error) {
      logger.error('Failed to initialize Rate Limiter', undefined, error);
      throw error;
    }
  }

  private defaultKeyGenerator(request: Request): string {
    // Generate key based on endpoint and user identifier
    const url = new URL(request.url);
    const endpoint = url.pathname;
    const userId = this.getUserId();
    const sessionId = this.getSessionId();

    return `${userId || sessionId || 'anonymous'}:${endpoint}`;
  }

  private getUserId(): string | null {
    // Try to get user ID from various sources
    try {
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.state?.user?.id || null;
      }
    } catch (error) {
      // Ignore parsing errors
    }
    return null;
  }

  private getSessionId(): string | null {
    try {
      return sessionStorage.getItem('session-id') || null;
    } catch (error) {
      return null;
    }
  }

  private setupRequestInterception(): void {
    const originalFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = new Request(input, init);

      // Check rate limit before making request
      const rateLimitResult = this.checkRateLimit(request);

      if (rateLimitResult.blocked) {
        // Create a rate limit exceeded response
        const response = new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 1000),
          }),
          {
            status: 429,
            statusText: 'Too Many Requests',
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil(
                (rateLimitResult.resetTime.getTime() - Date.now()) / 1000
              ).toString(),
              'X-RateLimit-Limit': this.config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': rateLimitResult.resetTime.getTime().toString(),
            },
          }
        );

        // Report rate limit violation
        this.reportRateLimitViolation(request, rateLimitResult);

        return response;
      }

      // Make the actual request
      const response = await originalFetch(request);

      // Record the request
      this.recordRequest(request, response.ok);

      return response;
    };
  }

  private setupActionLimiting(): void {
    // Limit form submissions
    this.limitFormSubmissions();

    // Limit button clicks
    this.limitButtonClicks();

    // Limit search queries
    this.limitSearchQueries();
  }

  private limitFormSubmissions(): void {
    document.addEventListener('submit', event => {
      const form = event.target as HTMLFormElement;
      if (!form) return;

      const key = `form-submit:${form.action || window.location.pathname}`;
      const bucket = this.getBucket(key);

      if (this.isRateLimited(bucket, 'form-submit')) {
        event.preventDefault();
        this.showRateLimitMessage(
          'Form submissions are rate limited. Please wait before submitting again.'
        );

        // Report rate limit violation
        this.reportActionRateLimit('form-submit', key);
      } else {
        this.recordAction(bucket, 'form-submit');
      }
    });
  }

  private limitButtonClicks(): void {
    document.addEventListener('click', event => {
      const button = event.target as HTMLElement;
      if (!button || !button.matches('button[data-rate-limit]')) return;

      const action = button.getAttribute('data-rate-limit') || 'button-click';
      const key = `button-click:${action}`;
      const bucket = this.getBucket(key);

      if (this.isRateLimited(bucket, action)) {
        event.preventDefault();
        event.stopPropagation();

        this.showRateLimitMessage('This action is rate limited. Please wait before trying again.');
        this.reportActionRateLimit('button-click', key);
      } else {
        this.recordAction(bucket, action);
      }
    });
  }

  private limitSearchQueries(): void {
    // Debounce and rate limit search inputs
    const searchInputs = document.querySelectorAll('input[type="search"], input[data-search]');

    searchInputs.forEach(input => {
      let debounceTimer: NodeJS.Timeout;

      input.addEventListener('input', _event => {
        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {
          const key = 'search-query';
          const bucket = this.getBucket(key);

          if (this.isRateLimited(bucket, 'search')) {
            this.showRateLimitMessage(
              'Search queries are rate limited. Please wait before searching again.'
            );
            this.reportActionRateLimit('search', key);
          } else {
            this.recordAction(bucket, 'search');
          }
        }, 300); // 300ms debounce
      });
    });
  }

  private checkRateLimit(request: Request): RateLimitInfo {
    const key = this.config.keyGenerator!(request);
    const bucket = this.getBucket(key);

    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Clean old requests
    bucket.requests = bucket.requests.filter(req => req.timestamp > windowStart);

    // Count current requests
    let currentRequests = bucket.requests.length;

    // Skip successful requests if configured
    if (this.config.skipSuccessfulRequests) {
      currentRequests = bucket.requests.filter(req => !req.success).length;
    }

    const blocked = currentRequests >= this.config.maxRequests;
    const resetTime = new Date(bucket.windowStart + this.config.windowMs);

    return {
      windowMs: this.config.windowMs,
      maxRequests: this.config.maxRequests,
      currentRequests,
      resetTime,
      blocked,
    };
  }

  private getBucket(key: string): RateLimitBucket {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket || now - bucket.windowStart > this.config.windowMs) {
      bucket = {
        requests: [],
        windowStart: now,
        blocked: false,
      };
      this.buckets.set(key, bucket);
    }

    return bucket;
  }

  private isRateLimited(bucket: RateLimitBucket, _action: string): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Clean old requests
    bucket.requests = bucket.requests.filter(req => req.timestamp > windowStart);

    return bucket.requests.length >= this.config.maxRequests;
  }

  private recordRequest(request: Request, success: boolean): void {
    const key = this.config.keyGenerator!(request);
    const bucket = this.getBucket(key);

    bucket.requests.push({
      timestamp: Date.now(),
      success,
      endpoint: new URL(request.url).pathname,
    });
  }

  private recordAction(bucket: RateLimitBucket, action: string): void {
    bucket.requests.push({
      timestamp: Date.now(),
      success: true,
      endpoint: action,
    });
  }

  private reportRateLimitViolation(request: Request, rateLimitInfo: RateLimitInfo): void {
    logger.warn('Rate limit exceeded', {
      component: 'RateLimiter',
      url: request.url,
      method: request.method,
      currentRequests: rateLimitInfo.currentRequests,
      maxRequests: rateLimitInfo.maxRequests,
    });

    // Create security event
    const securityEvent: Partial<SecurityEvent> = {
      type: 'rate_limit_exceeded',
      severity: 'medium',
      source: 'RateLimiter',
      details: {
        url: request.url,
        method: request.method,
        rateLimitInfo,
        userAgent: navigator.userAgent,
      },
    };

    // Report security event
    const customEvent = new CustomEvent('security-event', {
      detail: securityEvent,
    });
    document.dispatchEvent(customEvent);

    // Call configured callback
    if (this.config.onLimitReached) {
      this.config.onLimitReached(rateLimitInfo);
    }
  }

  private reportActionRateLimit(action: string, key: string): void {
    logger.warn('Action rate limit exceeded', {
      component: 'RateLimiter',
      action,
      key,
    });

    const securityEvent: Partial<SecurityEvent> = {
      type: 'rate_limit_exceeded',
      severity: 'low',
      source: 'RateLimiter',
      details: {
        action,
        key,
        userAgent: navigator.userAgent,
      },
    };

    const customEvent = new CustomEvent('security-event', {
      detail: securityEvent,
    });
    document.dispatchEvent(customEvent);
  }

  private showRateLimitMessage(message: string): void {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.className =
      'fixed top-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded shadow-lg z-50';
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  private setupCleanup(): void {
    // Clean up old buckets periodically
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const cutoff = now - this.config.windowMs * 2; // Keep buckets for 2 windows

      for (const [key, bucket] of this.buckets.entries()) {
        if (bucket.windowStart < cutoff) {
          this.buckets.delete(key);
        }
      }
    }, this.config.windowMs);
  }

  /**
   * Check if a specific key is currently rate limited
   */
  isKeyRateLimited(key: string): boolean {
    const bucket = this.buckets.get(key);
    if (!bucket) return false;

    return this.isRateLimited(bucket, key);
  }

  /**
   * Get rate limit info for a specific key
   */
  getRateLimitInfo(key: string): RateLimitInfo {
    const bucket = this.getBucket(key);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Clean old requests
    bucket.requests = bucket.requests.filter(req => req.timestamp > windowStart);

    return {
      windowMs: this.config.windowMs,
      maxRequests: this.config.maxRequests,
      currentRequests: bucket.requests.length,
      resetTime: new Date(bucket.windowStart + this.config.windowMs),
      blocked: bucket.requests.length >= this.config.maxRequests,
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  resetKey(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Get all current rate limit buckets
   */
  getAllBuckets(): Map<string, RateLimitInfo> {
    const result = new Map<string, RateLimitInfo>();

    for (const [key, _bucket] of this.buckets.entries()) {
      result.set(key, this.getRateLimitInfo(key));
    }

    return result;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.buckets.clear();
  }

  /**
   * Check rate limit for a key with specific config
   */
  checkLimit(
    key: string,
    config: { windowMs: number; maxRequests: number }
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const bucket = this.getBucket(key);
    const now = Date.now();
    const windowStart = now - config.windowMs;
    bucket.requests = bucket.requests.filter(req => req.timestamp > windowStart);
    const currentRequests = bucket.requests.length;
    const allowed = currentRequests < config.maxRequests;
    const resetTime = bucket.windowStart + config.windowMs;
    if (allowed) {
      bucket.requests.push({
        timestamp: now,
        success: true,
        endpoint: key,
      });
    }
    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - currentRequests - 1),
      resetTime,
    };
  }

  /**
   * Get number of active keys
   */
  getActiveKeys(): number {
    return this.buckets.size;
  }
}

// Export singleton instance
export const clientRateLimiter = new RateLimiter({
  enabled: true,
  windowMs: 60000,
  maxRequests: 100,
  skipSuccessfulRequests: false,
});

// Export rate limit configs
export const RateLimitConfigs = {
  strict: { windowMs: 60000, maxRequests: 10 },
  normal: { windowMs: 60000, maxRequests: 100 },
  lenient: { windowMs: 60000, maxRequests: 1000 },
};
