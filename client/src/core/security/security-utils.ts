/**
 * Security Utilities - Core Security Functions
 *
 * Comprehensive security utilities including CSP, sanitization, and validation
 */

export interface CSPDirectives {
  'default-src': string[];
  'script-src': string[];
  'style-src': string[];
  'img-src': string[];
  'font-src': string[];
  'connect-src': string[];
  'media-src': string[];
  'object-src': string[];
  'child-src': string[];
  'worker-src': string[];
  'frame-src': string[];
  'form-action': string[];
}

export interface SecurityConfig {
  csp: CSPDirectives;
  enableXSSProtection: boolean;
  enableCSRFProtection: boolean;
  enableClickjackingProtection: boolean;
  enableContentTypeSniffing: boolean;
}

// Default CSP configuration
export const DEFAULT_CSP: CSPDirectives = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'child-src': ["'self'"],
  'worker-src': ["'self'"],
  'frame-src': ["'none'"],
  'form-action': ["'self'"],
};

/**
 * Generate Content Security Policy header value
 */
export function generateCSPHeader(directives: CSPDirectives = DEFAULT_CSP): string {
  return Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;');
}

/**
 * Sanitize HTML content while preserving safe tags
 */
export function sanitizeHTML(
  html: string,
  allowedTags: string[] = ['b', 'i', 'em', 'strong', 'p', 'br']
): string {
  if (typeof html !== 'string') return '';

  // Simple HTML sanitization - in production, use a proper library like DOMPurify
  let sanitized = html;

  // Remove script tags completely
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove dangerous attributes
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*javascript\s*:/gi, '');

  // Only allow specified tags
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  sanitized = sanitized.replace(tagRegex, (match, tagName) => {
    return allowedTags.includes(tagName.toLowerCase()) ? match : '';
  });

  return sanitized;
}

/**
 * Validate and sanitize URL to prevent open redirect attacks
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== 'string') return null;

  try {
    const parsedUrl = new URL(url, window.location.origin);

    // Only allow same origin URLs or specific allowed domains
    const allowedOrigins = [window.location.origin];

    if (!allowedOrigins.includes(parsedUrl.origin)) {
      return null;
    }

    return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
  } catch {
    return null;
  }
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash sensitive data using Web Crypto API
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate CSRF token using constant-time comparison
 */
export function validateCSRFToken(token: string, expectedToken: string): boolean {
  if (!token || !expectedToken) return false;
  if (token.length !== expectedToken.length) return false;

  // Constant-time comparison to prevent timing attacks
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  score: number;
  feedback: string[];
  isValid: boolean;
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push('Password must be at least 8 characters long');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Password must contain lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Password must contain uppercase letters');

  if (/\d/.test(password)) score += 1;
  else feedback.push('Password must contain numbers');

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  else feedback.push('Password must contain special characters');

  return {
    score,
    feedback,
    isValid: score >= 4,
  };
}

/**
 * Security headers for API responses
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
} as const;

/**
 * Check if current environment is secure (HTTPS)
 */
export function isSecureContext(): boolean {
  return window.isSecureContext || window.location.protocol === 'https:';
}

/**
 * Rate limiting utility
 */
export class RateLimiter {
  private attempts = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);

    if (!attempt || now > attempt.resetTime) {
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (attempt.count >= this.maxAttempts) {
      return false;
    }

    attempt.count++;
    return true;
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

export const securityUtils = {
  generateCSPHeader,
  sanitizeInput,
  sanitizeHTML,
  sanitizeUrl,
  generateSecureToken,
  hashData,
  validateCSRFToken,
  validatePasswordStrength,
  isSecureContext,
  RateLimiter,
  SECURITY_HEADERS,
  DEFAULT_CSP,
};
