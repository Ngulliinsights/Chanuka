/**
 * Unified Security Interface
 * Provides consistent API across all security components
 */

export interface UnifiedSecurityConfig {
  // Common configuration structure
  csp: {
    enabled: boolean;
    reportOnly: boolean;
    directives: CSPDirectives;
    nonce?: string;
  };
  inputSanitization: {
    enabled: boolean;
    mode: 'basic' | 'comprehensive';
    allowedTags: string[];
    allowedAttributes: Record<string, string[]>;
  };
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
  };
  errorHandling: {
    mode: 'strict' | 'permissive';
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    reportToBackend: boolean;
  };
}

export interface SecurityComponent {
  initialize(config: UnifiedSecurityConfig): Promise<void>;
  shutdown(): Promise<void>;
  getHealthStatus(): SecurityHealth;
  getMetrics(): SecurityMetrics;
}

export interface SecurityHealth {
  enabled: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  issues: string[];
}

export interface SecurityMetrics {
  requestsProcessed: number;
  threatsBlocked: number;
  averageResponseTime: number;
  errorRate: number;
}

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
  'frame-ancestors': string[];
  'base-uri': string[];
  'upgrade-insecure-requests'?: string[];
  'block-all-mixed-content'?: string[];
}

export interface SanitizationOptions {
  mode?: 'basic' | 'comprehensive' | 'auto';
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  maxLength?: number;
}

export interface SanitizationResult {
  sanitized: string;
  wasModified: boolean;
  threats: ThreatDetection[];
  removedElements: string[];
  removedAttributes: string[];
}

export interface ThreatDetection {
  type: ThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  originalContent: string;
  location?: string;
}

export type ThreatType =
  | 'script_injection'
  | 'html_injection'
  | 'attribute_injection'
  | 'url_injection'
  | 'css_injection'
  | 'data_uri_abuse'
  | 'protocol_violation'
  | 'suspicious_pattern';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  blocked?: boolean;
  reason?: string;
}

export interface RateLimitUsage {
  count: number;
  windowStart: number;
  windowEnd: number;
}

export interface SecurityError {
  type: SecurityErrorType;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  originalError?: Error;
}

export interface SecurityErrorResult {
  id: string;
  error: SecurityError;
  handled: boolean;
  reported: boolean;
  suggestedAction?: string;
}

export enum SecurityErrorType {
  CSP_VIOLATION = 'csp_violation',
  INPUT_VALIDATION_FAILED = 'input_validation_failed',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  AUTHENTICATION_FAILED = 'authentication_failed',
  CSRF_TOKEN_INVALID = 'csrf_token_invalid',
  VULNERABILITY_DETECTED = 'vulnerability_detected',
  CONFIGURATION_ERROR = 'configuration_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
}

export interface ErrorHandlingConfig {
  mode: 'strict' | 'permissive';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  reportToBackend: boolean;
}

export interface ErrorStatistics {
  totalErrors: number;
  errorsByType: Record<SecurityErrorType, number>;
  errorsBySeverity: Record<'low' | 'medium' | 'high' | 'critical', number>;
  lastErrorTime: Date | null;
  averageResolutionTime: number;
}

export interface MigrationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SecurityEvent {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  timestamp: Date;
  details: Record<string, unknown>;
}

export interface CSPViolation {
  documentUri: string;
  referrer: string;
  violatedDirective: string;
  effectiveDirective: string;
  originalPolicy: string;
  disposition: 'enforce' | 'report';
  blockedUri: string;
  lineNumber: number;
  columnNumber: number;
  sourceFile: string;
  statusCode: number;
}