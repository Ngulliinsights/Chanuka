/**
 * Security Configuration
 *
 * Centralized security configuration for the Chanuka platform
 */

import type { SecurityConfig } from '@client/shared/types';

const isDevelopment = import.meta.env.MODE === 'development';
const isProduction = import.meta.env.MODE === 'production';

export const securityConfig: SecurityConfig = {
  csp: {
    enabled: true,
    reportOnly: isDevelopment,
    directives: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'nonce-{NONCE}'",
        ...(isDevelopment ? ["'unsafe-eval'"] : []),
        'https://cdn.chanuka.ke',
        'https://www.google-analytics.com',
        'https://www.googletagmanager.com',
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for Tailwind CSS
        'https://cdn.chanuka.ke',
        'https://fonts.googleapis.com',
      ],
      'img-src': [
        "'self'",
        'data:',
        'blob:',
        'https:',
        'https://cdn.chanuka.ke',
        'https://www.google-analytics.com',
      ],
      'connect-src': [
        "'self'",
        'https://api.chanuka.ke',
        'wss://ws.chanuka.ke',
        'https://www.google-analytics.com',
        ...(isDevelopment ? ['ws://localhost:*', 'http://localhost:*'] : []),
      ],
      'font-src': ["'self'", 'https://cdn.chanuka.ke', 'https://fonts.gstatic.com'],
      'object-src': ["'none'"],
      'media-src': ["'self'", 'https://cdn.chanuka.ke'],
      'frame-src': ["'none'"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'upgrade-insecure-requests': isProduction,
      'block-all-mixed-content': isProduction,
    },
    nonce: {
      enabled: true,
      length: 32,
    },
  },
  csrf: {
    enabled: true,
    tokenName: 'csrf_token',
    headerName: 'X-CSRF-Token',
    cookieName: 'chanuka_csrf',
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 3600000, // 1 hour
  },
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  headers: {
    hsts: {
      enabled: isProduction,
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    xFrameOptions: 'DENY',
    xContentTypeOptions: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: ['camera=()', 'microphone=()', 'geolocation=(self)', 'payment=()'],
  },
  sanitization: {
    enabled: true,
    allowedTags: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      'i',
      'b',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'a',
      'span',
      'div',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      span: ['class'],
      div: ['class'],
      '*': ['class', 'id'],
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'],
  },
};

// Environment-specific overrides
if (isDevelopment) {
  // Allow more permissive settings in development
  securityConfig.csp.reportOnly = true;
  securityConfig.rateLimit.maxRequests = 1000;
}

export default securityConfig;
