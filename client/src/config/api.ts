// API Configuration Types and Constants
// Comprehensive, type-safe configuration for API communication

/**
 * Core API configuration interface
 * This defines all the essential settings that control how your application
 * communicates with backend services. Each property is readonly to prevent
 * accidental modification after initialization.
 */
export interface ApiConfig {
  readonly baseUrl: string;
  readonly timeout: number;
  readonly retries: number;
  readonly retryDelay: number;
  readonly enableLogging: boolean;
}

/**
 * Environment detection with comprehensive fallback logic
 * This function safely determines whether we're in development mode by checking
 * multiple possible environment indicators. The try-catch ensures we never crash
 * if certain globals aren't available.
 */
const isDevelopment = (): boolean => {
  try {
    // Vite and modern bundlers expose import.meta.env
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV === true) {
      return true;
    }
  } catch {
    // import.meta might not be available in all environments
  }
  
  try {
    // Node.js and webpack use process.env
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      return true;
    }
  } catch {
    // process might not be available in browser environments
  }
  
  // Default to production for safety
  return false;
};

/**
 * Development port detection for intelligent API URL resolution
 * Common development servers use specific ports, and we can use this to
 * automatically route API requests to the correct backend port.
 */
const isDevelopmentPort = (origin: string): boolean => {
  const devPorts = [':5173', ':5174', ':3000', ':8080', ':8000', ':4201'];
  return devPorts.some(port => origin.includes(port));
};

/**
 * Safe environment variable accessor with type safety
 * Attempts to read from multiple environment sources and returns undefined
 * if the variable isn't found, preventing runtime errors.
 */
const getEnvironmentVariable = (key: string): string | undefined => {
  try {
    // Try Vite-style environment variables first
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const value = import.meta.env[key];
      if (value !== undefined) return String(value);
    }
  } catch {
    // Continue to next attempt
  }
  
  try {
    // Try Node/webpack-style environment variables
    if (typeof process !== 'undefined' && process.env) {
      const value = process.env[key];
      if (value !== undefined) return String(value);
    }
  } catch {
    // All attempts failed
  }
  
  return undefined;
};

/**
 * Intelligent API base URL resolution with priority hierarchy
 * This function implements a smart decision tree to determine the correct
 * API endpoint based on your deployment context. It prioritizes explicit
 * configuration, then makes intelligent guesses for development, and finally
 * falls back to secure production defaults.
 */
const getApiBaseUrl = (): string => {
  // Priority 1: Explicit environment variable override
  // This allows developers and DevOps to force a specific API URL when needed
  const explicitUrl = getEnvironmentVariable('VITE_API_URL') || 
                      getEnvironmentVariable('REACT_APP_API_URL');
  if (explicitUrl) {
    return explicitUrl;
  }

  // Priority 2: Development environment auto-configuration
  if (isDevelopment()) {
    // Only access window in browser environments
    if (typeof window !== 'undefined' && window.location) {
      const currentOrigin = window.location.origin;
      
      // Transform known dev server ports to API server port
      // This is a common pattern where frontend runs on :5173 and backend on :4201
      if (isDevelopmentPort(currentOrigin)) {
        return currentOrigin.replace(/:\d+$/, ':4201');
      }
      
      // If we're already on the API server port, use it directly
      if (currentOrigin.includes(':4201')) {
        return currentOrigin;
      }
    }
    
    // Fallback to localhost for development environments
    return 'http://localhost:4201';
  }

  // Priority 3: Production - use same origin for security
  // This is the most secure approach as it avoids CORS issues and keeps
  // everything under the same domain
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  
  // Final fallback for server-side rendering or unusual environments
  return '';
};

/**
 * Default API configuration with sensible, production-ready defaults
 * These values are tuned based on typical API performance characteristics
 * and provide a good balance between responsiveness and reliability.
 */
export const defaultApiConfig: Readonly<ApiConfig> = {
  baseUrl: getApiBaseUrl(),
  timeout: 10_000,        // 10 seconds - aggressive enough to catch issues, patient enough for slow networks
  retries: 3,             // Three attempts gives ~30 seconds total for transient failures
  retryDelay: 1_000,      // 1 second between retries - enough to let transient issues resolve
  enableLogging: isDevelopment(), // Verbose logs in dev, quiet in production
} as const;

/**
 * Strongly-typed API endpoint definitions
 * This centralized configuration eliminates string-based URL construction
 * throughout your codebase, making refactoring safer and autocomplete better.
 */
export const API_ENDPOINTS = {
  // System health and monitoring endpoints
  health: '/api/health',
  frontendHealth: '/api/frontend-health', 
  system: '/api/system',
  
  // Authentication and session management
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    verify: '/api/auth/verify',
  },
  
  // Bills management with dynamic ID interpolation
  bills: {
    list: '/api/bills',
    detail: (id: number): string => `/api/bills/${id}`,
    comments: (id: number): string => `/api/bills/${id}/comments`,
    engagement: (id: number): string => `/api/bills/${id}/engagement`,
    categories: '/api/bills/meta/categories',
    statuses: '/api/bills/meta/statuses',
  },
  
  // Sponsors and stakeholder management
  sponsors: {
    list: '/api/sponsors',
    detail: (id: number): string => `/api/sponsors/${id}`,
    conflicts: (id: number): string => `/api/sponsors/${id}/conflicts`,
  },
  
  // Analytics and insights generation
  analysis: {
    transparency: '/api/analysis/transparency',
    conflicts: '/api/analysis/conflicts', 
    patterns: '/api/analysis/patterns',
  },
  
  // User profile and preferences
  users: {
    profile: '/api/users/profile',
    preferences: '/api/users/preferences',
    verification: '/api/verification',
  },
  
  // Community and social features
  community: {
    discussions: '/api/community/discussions',
    comments: '/api/community/comments',
    votes: '/api/community/votes',
  },
} as const;

/**
 * CORS configuration following security best practices
 * Credentials are included to support cookie-based authentication, and we
 * explicitly set JSON as our communication format to ensure consistent parsing.
 */
export const CORS_CONFIG: Readonly<RequestInit> = {
  credentials: 'include', // Required for cookie-based auth and CSRF tokens
  mode: 'cors',           // Explicit CORS mode for cross-origin requests
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
} as const;

/**
 * Operation-specific timeout configurations
 * Different operations have different time requirements. File uploads need
 * patience, while real-time updates need speed. These tuned values prevent
 * premature timeouts while still catching genuine failures.
 */
export const TIMEOUT_CONFIG = {
  default: 10_000,   // 10 seconds for standard CRUD operations
  upload: 30_000,    // 30 seconds for file uploads (network + processing)
  download: 60_000,  // 60 seconds for large downloads
  realtime: 5_000,   // 5 seconds for real-time features (notifications, live updates)
  analytics: 20_000, // 20 seconds for complex analytical queries
} as const;

/**
 * Sophisticated retry strategies for different criticality levels
 * Not all requests are created equal. Critical operations get more aggressive
 * retries, while background tasks can wait longer between attempts to reduce
 * server load.
 */
export const RETRY_CONFIG = {
  default: {
    maxRetries: 3,
    retryDelay: 1_000,
    backoffMultiplier: 2,    // Exponential backoff: 1s, 2s, 4s
    maxDelay: 10_000,        // Cap at 10 seconds to avoid indefinite waits
  },
  critical: {
    maxRetries: 5,           // More attempts for critical operations
    retryDelay: 500,         // Start faster for user-facing operations
    backoffMultiplier: 1.5,  // Gentler exponential growth
    maxDelay: 5_000,
  },
  background: {
    maxRetries: 2,           // Fewer retries for non-urgent tasks
    retryDelay: 2_000,       // Longer initial delay to reduce server pressure
    backoffMultiplier: 2,
    maxDelay: 15_000,
  },
  immediate: {
    maxRetries: 1,           // Fast fail for interactive operations
    retryDelay: 100,
    backoffMultiplier: 1,
    maxDelay: 1_000,
  },
} as const;

/**
 * Comprehensive error handling configuration
 * This defines which errors we show to users, which we retry, and how we
 * categorize failures. The distinction between retryable and non-retryable
 * errors prevents wasted retry attempts on permanent failures.
 */
export const ERROR_CONFIG = {
  showNetworkErrors: true,
  showServerErrors: true,
  showValidationErrors: true,
  logErrors: isDevelopment(),
  
  // Status codes that indicate temporary failures worth retrying
  retryableStatusCodes: [
    408, // Request Timeout - network hiccup
    429, // Too Many Requests - rate limiting, try again later
    500, // Internal Server Error - might be transient
    502, // Bad Gateway - upstream server issue
    503, // Service Unavailable - server overloaded
    504, // Gateway Timeout - upstream timeout
  ] as const,
  
  // Status codes that indicate permanent failures
  nonRetryableStatusCodes: [
    400, // Bad Request - client error, won't fix with retry
    401, // Unauthorized - needs authentication
    403, // Forbidden - lacks permission
    404, // Not Found - resource doesn't exist
    409, // Conflict - business logic error
    422, // Unprocessable Entity - validation failure
  ] as const,
  
  // Client-side errors (4xx range) - the request itself is wrong
  clientErrorCodes: [400, 401, 403, 404, 409, 422, 451] as const,
  
  // Server-side errors (5xx range) - server had a problem
  serverErrorCodes: [500, 502, 503, 504] as const,
} as const;

/**
 * Request priority levels for implementing smart queuing
 * When your app makes many requests simultaneously, priority levels help
 * ensure critical user-facing operations complete first, while background
 * tasks wait their turn.
 */
export const REQUEST_PRIORITY = {
  CRITICAL: 'critical',    // User authentication, critical data loads
  HIGH: 'high',            // User-initiated actions, form submissions
  NORMAL: 'normal',        // Regular page loads, standard CRUD
  LOW: 'low',              // Prefetching, non-urgent updates
  BACKGROUND: 'background', // Analytics, logging, cleanup tasks
} as const;

/**
 * Response caching configuration for performance optimization
 * Strategic caching reduces server load and improves user experience by
 * serving frequently-accessed, slowly-changing data from memory.
 */
export const CACHE_CONFIG = {
  // Cache durations optimized for different data change frequencies
  durations: {
    short: 5 * 60 * 1_000,      // 5 minutes - frequently changing data
    medium: 30 * 60 * 1_000,    // 30 minutes - semi-static data
    long: 24 * 60 * 60 * 1_000, // 24 hours - rarely changing data
  },
  
  // Endpoint-specific caching strategies
  // These mappings tell your cache layer how long to keep specific data
  strategies: {
    '/api/bills/meta/categories': 'long',  // Category lists rarely change
    '/api/bills/meta/statuses': 'long',    // Status enums are stable
    '/api/users/profile': 'medium',        // Profile data updates occasionally
    '/api/health': 'short',                // Health checks need freshness
    '/api/analysis/': 'medium',            // Analytics can be slightly stale
  },
  
  // Cache invalidation patterns
  // When these actions occur, we know certain caches need clearing
  invalidateOn: {
    logout: ['/api/users/profile', '/api/users/preferences'],
    billUpdate: ['/api/bills/'],
    profileUpdate: ['/api/users/profile'],
  },
} as const;

/**
 * Rate limiting configuration to prevent API abuse
 * These limits protect both your API and the client from making too many
 * requests in a short time period, which could degrade performance or
 * trigger server-side rate limiting.
 */
export const RATE_LIMIT_CONFIG = {
  // Requests per minute by priority level
  limits: {
    critical: 60,    // Allow critical requests through aggressively
    high: 30,        // Moderate limiting for important operations
    normal: 20,      // Standard rate limit
    low: 10,         // More restrictive for non-urgent requests
    background: 5,   // Heavily throttled for background tasks
  },
  
  // Window duration for rate limiting (in milliseconds)
  windowMs: 60_000, // 1 minute window
  
  // Whether to queue requests that exceed the limit or reject them
  queueOnLimit: true,
} as const;

// Additional exports for backward compatibility with tests
export const API_BASE_URL = defaultApiConfig.baseUrl;
export const API_TIMEOUT = defaultApiConfig.timeout;
export const MAX_RETRIES = defaultApiConfig.retries;

// Type exports for enhanced TypeScript integration throughout your codebase
// These types enable autocomplete, type checking, and safer refactoring
export type ApiEndpoints = typeof API_ENDPOINTS;
export type RetryConfigType = keyof typeof RETRY_CONFIG;
export type RequestPriority = typeof REQUEST_PRIORITY[keyof typeof REQUEST_PRIORITY];
export type CacheDuration = keyof typeof CACHE_CONFIG.durations;
export type TimeoutType = keyof typeof TIMEOUT_CONFIG;

/**
 * Helper function to construct full URLs with type safety
 * This utility ensures all API calls use consistent URL construction
 */
export const buildApiUrl = (endpoint: string, config: ApiConfig = defaultApiConfig): string => {
  const baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

/**
 * Helper to determine if an HTTP status code indicates success
 */
export const isSuccessStatus = (status: number): boolean => {
  return status >= 200 && status < 300;
};

/**
 * Helper to determine if an error should trigger a retry
 */
export const shouldRetryError = (status: number): boolean => {
  return ERROR_CONFIG.retryableStatusCodes.includes(status as any);
};











































