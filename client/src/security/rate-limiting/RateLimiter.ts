/**
 * Rate Limiter
 * 
 * Client-side rate limiting for API requests and user actions
 */

import type { RateLimitConfig, SecurityEvent } from '@client/types/security-types';

import { securityConfig } from '../config/security-config';
import { SecurityMonitor } from '../monitoring/SecurityMonitor';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private limits: Map<string, RateLimitEntry> = new Map();
  private monitor: SecurityMonitor;
  private cleanupInterval: number;

  private constructor() {
    this.monitor = SecurityMonitor.getInstance();
    this.startCleanupTimer();
  }

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Check if request is allowed under rate limit
   */
  public checkLimit(
    key: string, 
    config: Partial<RateLimitConfig> = {}
  ): RateLimitResult {
    const finalConfig = { ...securityConfig.rateLimit, ...config };
    const now = Date.now();
    const windowStart = now - finalConfig.windowMs;

    let entry = this.limits.get(key);

    // Initialize or reset if window has passed
    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime: now + finalConfig.windowMs,
        firstRequest: now
      };
    }

    // Check if request is within the current window
    if (entry.firstRequest < windowStart) {
      // Reset the window
      entry = {
        count: 0,
        resetTime: now + finalConfig.windowMs,
        firstRequest: now
      };
    }

    const allowed = entry.count < finalConfig.maxRequests;
    
    if (allowed) {
      entry.count++;
      this.limits.set(key, entry);
    } else {
      // Log rate limit exceeded
      this.logRateLimitExceeded(key, finalConfig);
    }

    return {
      allowed,
      remaining: Math.max(0, finalConfig.maxRequests - entry.count),
      resetTime: entry.resetTime,
      retryAfter: allowed ? undefined : entry.resetTime - now
    };
  }

  /**
   * Rate limit API requests
   */
  public limitAPIRequest(
    endpoint: string, 
    method: string = 'GET',
    config: Partial<RateLimitConfig> = {}
  ): RateLimitResult {
    const key = `api:${method}:${endpoint}`;
    return this.checkLimit(key, config);
  }

  /**
   * Rate limit user actions
   */
  public limitUserAction(
    action: string,
    userId?: string,
    config: Partial<RateLimitConfig> = {}
  ): RateLimitResult {
    const key = userId ? `user:${userId}:${action}` : `session:${this.getSessionId()}:${action}`;
    return this.checkLimit(key, config);
  }

  /**
   * Rate limit by IP (using session as proxy)
   */
  public limitBySession(
    action: string,
    config: Partial<RateLimitConfig> = {}
  ): RateLimitResult {
    const key = `session:${this.getSessionId()}:${action}`;
    return this.checkLimit(key, config);
  }

  /**
   * Create a rate-limited function
   */
  public createLimitedFunction<T extends (...args: any[]) => any>(
    fn: T,
    key: string,
    config: Partial<RateLimitConfig> = {}
  ): T {
    return ((...args: any[]) => {
      const result = this.checkLimit(key, config);
      
      if (!result.allowed) {
        throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((result.retryAfter || 0) / 1000)} seconds.`);
      }
      
      return fn(...args);
    }) as T;
  }

  /**
   * Setup automatic rate limiting for fetch requests
   */
  public setupFetchInterceptor(): void {
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || 'GET';
      
      // Extract endpoint from URL
      const endpoint = this.extractEndpoint(url);
      
      // Check rate limit
      const limitResult = this.limitAPIRequest(endpoint, method);
      
      if (!limitResult.allowed) {
        const error = new Error('Rate limit exceeded');
        (error as any).rateLimitInfo = limitResult;
        throw error;
      }

      try {
        const response = await originalFetch(input, init);
        
        // Don't count successful requests if configured
        if (!securityConfig.rateLimit.skipSuccessfulRequests || !response.ok) {
          // Request already counted in checkLimit
        }
        
        return response;
      } catch (error) {
        // Don't count failed requests if configured
        if (securityConfig.rateLimit.skipFailedRequests) {
          // Decrement counter for failed requests
          this.decrementCounter(`api:${method}:${endpoint}`);
        }
        throw error;
      }
    };
  }

  /**
   * Setup rate limiting for form submissions
   */
  public setupFormLimiting(): void {
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      const action = form.action || window.location.href;
      const endpoint = this.extractEndpoint(action);
      
      const limitResult = this.limitUserAction(`form:${endpoint}`, undefined, {
        maxRequests: 10, // More restrictive for form submissions
        windowMs: 60000 // 1 minute window
      });
      
      if (!limitResult.allowed) {
        event.preventDefault();
        this.showRateLimitError(limitResult.retryAfter || 0);
      }
    });
  }

  /**
   * Setup rate limiting for button clicks
   */
  public setupButtonLimiting(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        const button = target.tagName === 'BUTTON' ? target : target.closest('button')!;
        const action = button.getAttribute('data-action') || button.textContent?.trim() || 'click';
        
        const limitResult = this.limitUserAction(`button:${action}`, undefined, {
          maxRequests: 20,
          windowMs: 60000 // 1 minute window
        });
        
        if (!limitResult.allowed) {
          event.preventDefault();
          event.stopPropagation();
          this.showRateLimitError(limitResult.retryAfter || 0);
        }
      }
    }, true);
  }

  /**
   * Get current rate limit status for a key
   */
  public getStatus(key: string): RateLimitResult | null {
    const entry = this.limits.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const config = securityConfig.rateLimit;

    return {
      allowed: entry.count < config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      retryAfter: entry.resetTime > now ? entry.resetTime - now : undefined
    };
  }

  /**
   * Clear rate limit for a specific key
   */
  public clearLimit(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Clear all rate limits
   */
  public clearAllLimits(): void {
    this.limits.clear();
  }

  /**
   * Get session ID for rate limiting
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('chanuka_session_id');
    if (!sessionId) {
      const sessionBytes = new Uint8Array(16);
      crypto.getRandomValues(sessionBytes);
      sessionId = Array.from(sessionBytes, byte => byte.toString(16).padStart(2, '0')).join('');
      sessionStorage.setItem('chanuka_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Extract endpoint from URL for rate limiting
   */
  private extractEndpoint(url: string): string {
    try {
      const urlObj = new URL(url, window.location.origin);
      return urlObj.pathname;
    } catch {
      return url;
    }
  }

  /**
   * Decrement counter for failed requests
   */
  private decrementCounter(key: string): void {
    const entry = this.limits.get(key);
    if (entry && entry.count > 0) {
      entry.count--;
      this.limits.set(key, entry);
    }
  }

  /**
   * Log rate limit exceeded event
   */
  private logRateLimitExceeded(key: string, config: RateLimitConfig): void {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      type: 'rate-limit-exceeded',
      severity: 'warning',
      message: `Rate limit exceeded for key: ${key}`,
      source: 'RateLimiter',
      timestamp: Date.now(),
      metadata: {
        key,
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };

    this.monitor.logEvent(event);
  }

  /**
   * Show rate limit error to user
   */
  private showRateLimitError(retryAfter: number): void {
    const seconds = Math.ceil(retryAfter / 1000);
    
    let errorDiv = document.getElementById('rate-limit-error');
    
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = 'rate-limit-error';
      errorDiv.className = 'fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded z-50';
      errorDiv.setAttribute('role', 'alert');
      document.body.appendChild(errorDiv);
    }

    errorDiv.innerHTML = `
      <div class="flex items-center">
        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        <span>Too many requests. Please wait ${seconds} seconds before trying again.</span>
        <button class="ml-4 text-yellow-500 hover:text-yellow-700" onclick="this.parentElement.parentElement.remove()">
          ×
        </button>
      </div>
    `;

    // Auto-remove after retry period
    setTimeout(() => {
      if (errorDiv && errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, retryAfter + 1000);
  }

  /**
   * Start cleanup timer to remove expired entries
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = window.setInterval(() => {
      const now = Date.now();
      
      for (const [key, entry] of this.limits.entries()) {
        if (entry.resetTime <= now) {
          this.limits.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Stop cleanup timer
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.limits.clear();
  }
}