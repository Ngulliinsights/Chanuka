/**
 * Security Types
 * 
 * Type definitions for security infrastructure components
 */

export interface CSPDirectives {
  'default-src': string[];
  'script-src': string[];
  'style-src': string[];
  'img-src': string[];
  'connect-src': string[];
  'font-src': string[];
  'object-src': string[];
  'media-src': string[];
  'frame-src': string[];
  'frame-ancestors': string[];
  'base-uri': string[];
  'form-action': string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
}

export interface CSRFToken {
  token: string;
  expiresAt: number;
  sessionId: string;
}

export interface SecurityConfig {
  csp: {
    enabled: boolean;
    reportOnly: boolean;
    directives: CSPDirectives;
    nonce: {
      enabled: boolean;
      length: number;
    };
  };
  csrf: {
    enabled: boolean;
    tokenName: string;
    headerName: string;
    cookieName: string;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  };
  headers: {
    hsts: {
      enabled: boolean;
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
    xFrameOptions: string;
    xContentTypeOptions: boolean;
    referrerPolicy: string;
    permissionsPolicy: string[];
  };
  sanitization: {
    enabled: boolean;
    allowedTags: string[];
    allowedAttributes: Record<string, string[]>;
    stripIgnoreTag: boolean;
    stripIgnoreTagBody: string[];
  };
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (request: any) => void;
}

export interface VulnerabilityReport {
  id: string;
  type: 'xss' | 'csrf' | 'injection' | 'insecure-request' | 'rate-limit-exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
  timestamp: number;
  userAgent?: string;
  ip?: string;
  payload?: any;
  blocked: boolean;
}

export interface SecurityEvent {
  id: string;
  type: 'csp-violation' | 'csrf-attempt' | 'rate-limit-exceeded' | 'xss-attempt' | 'vulnerability-detected';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface SecurityMetrics {
  totalEvents: number;
  blockedAttacks: number;
  cspViolations: number;
  csrfAttempts: number;
  rateLimitExceeded: number;
  xssAttempts: number;
  lastUpdated: number;
}

export interface SecurityAuditResult {
  passed: boolean;
  score: number;
  maxScore: number;
  checks: SecurityCheck[];
  recommendations: string[];
}

export interface SecurityCheck {
  name: string;
  passed: boolean;
  score: number;
  maxScore: number;
  description: string;
  recommendation?: string;
}