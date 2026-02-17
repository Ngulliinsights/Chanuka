// API Configuration - Redirected to unified configuration system
// This file now serves as a compatibility layer for the unified core/api/config.ts

import { globalConfig } from '@client/core/api/config';
import type { ServiceConfig } from '@client/core/api/types';

// Re-export types and configuration from the unified system
export type ApiConfig = ServiceConfig;
export { globalConfig } from '@client/core/api/config';

// Backward compatibility: provide defaultApiConfig that maps to globalConfig
export const defaultApiConfig = {
  baseUrl: globalConfig.get('api').baseUrl,
  timeout: globalConfig.get('api').timeout,
  retries: globalConfig.get('api').retry.maxRetries,
  retryDelay: globalConfig.get('api').retry.baseDelay,
  enableLogging:
    globalConfig.get('monitoring').logLevel === 'debug' ||
    globalConfig.get('monitoring').logLevel === 'info',
};

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

// Re-export commonly used configurations from globalConfig
export const CORS_CONFIG: Readonly<RequestInit> = {
  credentials: 'include',
  mode: 'cors',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
} as const;

export const TIMEOUT_CONFIG = {
  default: globalConfig.get('api').timeout,
  upload: 30000,
  download: 60000,
  realtime: 5000,
  analytics: 20000,
} as const;

export const RETRY_CONFIG = {
  default: globalConfig.get('api').retry,
  critical: {
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
  },
  background: {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 15000,
    backoffMultiplier: 2,
  },
  immediate: {
    maxRetries: 1,
    baseDelay: 100,
    maxDelay: 1000,
    backoffMultiplier: 1,
  },
} as const;

export const CACHE_CONFIG = {
  durations: {
    short: globalConfig.get('api').cache.defaultTTL,
    medium: 30 * 60 * 1000,
    long: 24 * 60 * 60 * 1000,
  },
  strategies: {
    '/api/bills/meta/categories': 'long',
    '/api/bills/meta/statuses': 'long',
    '/api/users/profile': 'medium',
    '/api/health': 'short',
    '/api/analysis/': 'medium',
  },
  invalidateOn: {
    logout: ['/api/users/profile', '/api/users/preferences'],
    billUpdate: ['/api/bills/'],
    profileUpdate: ['/api/users/profile'],
  },
} as const;

// Additional exports for backward compatibility
export const API_BASE_URL = defaultApiConfig.baseUrl;
export const API_TIMEOUT = defaultApiConfig.timeout;
export const MAX_RETRIES = defaultApiConfig.retries;

// Type exports
export type ApiEndpoints = typeof API_ENDPOINTS;
export type RetryConfigType = keyof typeof RETRY_CONFIG;
export type CacheDuration = keyof typeof CACHE_CONFIG.durations;
export type TimeoutType = keyof typeof TIMEOUT_CONFIG;

/**
 * Helper function to construct full URLs with type safety
 */
export const buildApiUrl = (endpoint: string, config: unknown = defaultApiConfig): string => {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
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
  const retryableCodes = [408, 429, 500, 502, 503, 504];
  return retryableCodes.includes(status);
};
