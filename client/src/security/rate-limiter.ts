/**
 * Client-Side Rate Limiting Service
 * Provides rate limiting for user actions and API requests
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class ClientRateLimiter {
  private static instance: ClientRateLimiter;
  private storage: Map<string, { count: number; resetTime: number }> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  private constructor() {
    this.startCleanup();
  }

  public static getInstance(): ClientRateLimiter {
    if (!ClientRateLimiter.instance) {
      ClientRateLimiter.instance = new ClientRateLimiter();
    }
    return ClientRateLimiter.instance;
  }

  /**
   * Check if an action is allowed under rate limit
   */
  public checkLimit(
    key: string, 
    config: RateLimitConfig
  ): RateLimitResult {
    const now = Date.now();
    const fullKey = `${config.keyPrefix || 'default'}:${key}`;
    
    // Get or create rate limit entry
    let entry = this.storage.get(fullKey);
    
    // Reset if window has expired
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      };
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      };
    }

    // Increment counter and update storage
    entry.count++;
    this.storage.set(fullKey, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  /**
   * Attempt to perform a rate-limited action
   */
  public async attemptAction<T>(
    key: string,
    config: RateLimitConfig,
    action: () => Promise<T>
  ): Promise<T> {
    const result = this.checkLimit(key, config);
    
    if (!result.allowed) {
      throw new Error(
        `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`
      );
    }

    return await action();
  }

  /**
   * Get current rate limit status
   */
  public getStatus(key: string, keyPrefix?: string): RateLimitResult | null {
    const fullKey = `${keyPrefix || 'default'}:${key}`;
    const entry = this.storage.get(fullKey);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.resetTime) {
      this.storage.delete(fullKey);
      return null;
    }

    return {
      allowed: true,
      remaining: Math.max(0, entry.count),
      resetTime: entry.resetTime,
      retryAfter: entry.resetTime > now ? Math.ceil((entry.resetTime - now) / 1000) : 0
    };
  }

  /**
   * Clear rate limit for a specific key
   */
  public clearLimit(key: string, keyPrefix?: string): void {
    const fullKey = `${keyPrefix || 'default'}:${key}`;
    this.storage.delete(fullKey);
  }

  /**
   * Clear all rate limits
   */
  public clearAll(): void {
    this.storage.clear();
  }

  /**
   * Start cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.storage.entries()) {
        if (now > entry.resetTime) {
          this.storage.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Stop cleanup interval
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Predefined rate limit configurations
export const RateLimitConfigs = {
  // Search requests
  search: {
    maxRequests: 30,
    windowMs: 60000, // 1 minute
    keyPrefix: 'search'
  },

  // Comment posting
  comments: {
    maxRequests: 10,
    windowMs: 300000, // 5 minutes
    keyPrefix: 'comments'
  },

  // Bill saves/bookmarks
  billActions: {
    maxRequests: 50,
    windowMs: 300000, // 5 minutes
    keyPrefix: 'bill_actions'
  },

  // Profile updates
  profileUpdates: {
    maxRequests: 5,
    windowMs: 300000, // 5 minutes
    keyPrefix: 'profile'
  },

  // Password reset requests
  passwordReset: {
    maxRequests: 3,
    windowMs: 3600000, // 1 hour
    keyPrefix: 'password_reset'
  },

  // Login attempts
  login: {
    maxRequests: 5,
    windowMs: 900000, // 15 minutes
    keyPrefix: 'login'
  },

  // Registration attempts
  registration: {
    maxRequests: 3,
    windowMs: 3600000, // 1 hour
    keyPrefix: 'registration'
  },

  // API requests (general)
  api: {
    maxRequests: 100,
    windowMs: 300000, // 5 minutes
    keyPrefix: 'api'
  }
};

// Export singleton instance
export const clientRateLimiter = ClientRateLimiter.getInstance();

/**
 * Rate limiting decorator for functions
 */
export function rateLimit(config: RateLimitConfig, keyGenerator?: (...args: any[]) => string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator ? keyGenerator(...args) : `${target.constructor.name}.${propertyName}`;
      
      const result = clientRateLimiter.checkLimit(key, config);
      if (!result.allowed) {
        throw new Error(
          `Rate limit exceeded for ${propertyName}. Try again in ${result.retryAfter} seconds.`
        );
      }

      return await method.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Hook for React components to use rate limiting
 */
export function useRateLimit(key: string, config: RateLimitConfig) {
  const checkLimit = () => clientRateLimiter.checkLimit(key, config);
  
  const attemptAction = async <T>(action: () => Promise<T>): Promise<T> => {
    return clientRateLimiter.attemptAction(key, config, action);
  };

  const getStatus = () => clientRateLimiter.getStatus(key, config.keyPrefix);
  
  const clearLimit = () => clientRateLimiter.clearLimit(key, config.keyPrefix);

  return {
    checkLimit,
    attemptAction,
    getStatus,
    clearLimit
  };
}