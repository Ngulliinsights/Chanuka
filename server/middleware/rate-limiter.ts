import { Request, Response, NextFunction } from 'express';
import { logger   } from '@shared/core/src/index.js';

// Create shared rate limit store (using legacy implementation for now)
const store: RateLimitStore = {};

// Legacy interface for backward compatibility
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// const store: RateLimitStore = {};

// Environment-based configuration
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export const createRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
  testMax?: number; // Override for testing
  devMax?: number;  // Override for development
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting entirely in test environment if specified
    if (isTestEnvironment && process.env.SKIP_RATE_LIMIT === 'true') {
      return next();
    }

    const key = req.ip || 'unknown';
    const now = Date.now();
    
    // Determine the appropriate limit based on environment
    let maxRequests = options.max;
    if (isTestEnvironment && options.testMax) {
      maxRequests = options.testMax;
    } else if (isDevelopment && options.devMax) {
      maxRequests = options.devMax;
    }
    
    // Clean up expired entries
    if (store[key] && now > store[key].resetTime) {
      delete store[key];
    }
    
    // Initialize or increment counter
    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + options.windowMs
      };
    } else {
      store[key].count++;
    }
    
    // Check if limit exceeded
    if (store[key].count > maxRequests) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
      
      // Log rate limit exceeded (but not in test environment to avoid noise)
      if (!isTestEnvironment) {
        console.log(`Rate limit exceeded for IP: ${req.ip} on ${req.path} (${store[key].count}/${maxRequests})`);
      }
      
      return res.status(429).json({
        error: options.message || 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
        limit: maxRequests,
        current: store[key].count,
        windowMs: options.windowMs
      });
    }
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, maxRequests - store[key].count).toString(),
      'X-RateLimit-Reset': new Date(store[key].resetTime).toISOString(),
      'X-RateLimit-Window': options.windowMs.toString()
    });
    
    next();
  };
};

// Predefined rate limiters using legacy implementation
export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Production limit
  devMax: 1000, // Development limit
  testMax: 10000, // Very high limit for testing
  message: 'Too many API requests from this IP'
});

export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Production limit
  devMax: 50, // Development limit
  testMax: 1000, // High limit for testing
  message: 'Too many authentication attempts'
});

export const searchRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Production limit for search
  devMax: 500, // Development limit
  testMax: 5000, // High limit for testing
  message: 'Too many search requests from this IP'
});

// Legacy rate limiters for backward compatibility (deprecated)
export const legacyApiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Production limit
  devMax: 1000, // Development limit
  testMax: 10000, // Very high limit for testing
  message: 'Too many API requests from this IP'
});

export const legacyAuthRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Production limit
  devMax: 50, // Development limit
  testMax: 1000, // High limit for testing
  message: 'Too many authentication attempts'
});

export const legacySponsorRateLimit = createRateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 200, // Production limit for sponsor endpoints
  devMax: 2000, // Development limit
  testMax: 10000, // Very high limit for testing
  message: 'Too many sponsor API requests from this IP'
});

export const legacySearchRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Production limit for search
  devMax: 500, // Development limit
  testMax: 5000, // High limit for testing
  message: 'Too many search requests from this IP'
});

export const legacyPasswordResetRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Production limit for password resets
  devMax: 30, // Development limit
  testMax: 300, // High limit for testing
  message: 'Too many password reset requests from this IP'
});

export const legacyRegistrationRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Production limit for registrations
  devMax: 50, // Development limit
  testMax: 500, // High limit for testing
  message: 'Too many registration attempts from this IP'
});

// Utility function to clear rate limit store (useful for testing)
export const clearRateLimitStore = () => {
  Object.keys(store).forEach(key => delete store[key]);
};

// Utility function to get current rate limit status
export const getRateLimitStatus = (ip: string) => {
  const key = ip || 'unknown';
  return store[key] || null;
};













































