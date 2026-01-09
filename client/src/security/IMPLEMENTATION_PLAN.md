# Security Systems Consistency Improvements - Implementation Plan

## Executive Summary

This plan addresses the dual implementation architecture between `client/src/security/` (comprehensive) and `client/src/core/security/` (foundational) by creating a unified, consistent security system that maintains backward compatibility while improving code quality and maintainability.

## Current Architecture Analysis

### Dual Implementation Structure

**Comprehensive Security System** (`client/src/security/`)
- Full-featured security implementation with advanced capabilities
- Components: CSP Manager, CSRF Protection, Input Sanitizer, Rate Limiter, Vulnerability Scanner, Security Monitor
- Production-ready with comprehensive error handling and monitoring
- Uses external dependencies (DOMPurify, etc.)

**Foundational Security System** (`client/src/core/security/`)
- Basic security utilities and functions
- Components: CSP generation, input sanitization, URL validation, token generation
- Lightweight implementation without external dependencies
- Core security primitives

### Key Inconsistencies Identified

1. **CSP Implementation**: Two different approaches with different capabilities
2. **Input Sanitization**: DOMPurify-based vs. regex-based implementations
3. **Error Handling**: Inconsistent patterns across security components
4. **Configuration**: Different configuration structures and patterns
5. **Testing**: Incomplete test coverage with different testing approaches

## Implementation Strategy

### Phase 1: Unified Architecture Design (Week 1)

#### 1.1 Create Unified Security Interface

**File**: `client/src/security/unified/security-interface.ts`

```typescript
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
```

#### 1.2 Standardize Error Handling Patterns

**File**: `client/src/security/unified/error-handler.ts`

```typescript
/**
 * Unified Security Error Handler
 * Consistent error handling across all security components
 */
export class SecurityErrorHandler {
  private config: ErrorHandlingConfig;
  private logger: SecurityLogger;

  constructor(config: ErrorHandlingConfig) {
    this.config = config;
    this.logger = new SecurityLogger(config.logLevel);
  }

  handleSecurityError(error: SecurityError): SecurityErrorResult {
    // Standardized error processing
    const result = this.processError(error);
    
    // Log based on severity
    this.logger.log(result.severity, result.message, result.context);
    
    // Report to backend if configured
    if (this.config.reportToBackend) {
      this.reportToBackend(result);
    }
    
    return result;
  }

  private processError(error: SecurityError): SecurityErrorResult {
    // Standard error processing logic
    return {
      id: generateSecureId(),
      timestamp: new Date(),
      severity: this.assessSeverity(error),
      message: this.formatMessage(error),
      context: this.extractContext(error),
      handled: true
    };
  }
}
```

### Phase 2: CSP Unification (Week 2)

#### 2.1 Create Unified CSP Manager

**File**: `client/src/security/unified/csp-manager.ts`

```typescript
/**
 * Unified CSP Manager
 * Combines server-side and client-side CSP approaches
 */
export class UnifiedCSPManager implements SecurityComponent {
  private config: CSPConfig;
  private nonceManager: CSPNonceManager;
  private violationHandler: CSPViolationHandler;

  constructor(config: CSPConfig) {
    this.config = config;
    this.nonceManager = new CSPNonceManager(config.nonce);
    this.violationHandler = new CSPViolationHandler(config.reportUri);
  }

  async initialize(config: UnifiedSecurityConfig): Promise<void> {
    if (!config.csp.enabled) return;

    // Generate and apply CSP header
    const cspHeader = this.generateCSPHeader(config.csp.directives);
    
    // Apply via meta tag (fallback)
    this.applyMetaTagCSP(cspHeader);
    
    // Set up violation reporting
    this.violationHandler.setupReporting();
    
    // Store nonce for script execution
    this.nonceManager.initialize();
  }

  private generateCSPHeader(directives: CSPDirectives): string {
    // Enhanced CSP generation with environment-specific directives
    const baseDirectives = this.getBaseDirectives();
    const environmentDirectives = this.getEnvironmentDirectives();
    const mergedDirectives = this.mergeDirectives(baseDirectives, directives, environmentDirectives);
    
    return Object.entries(mergedDirectives)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');
  }

  private getEnvironmentDirectives(): CSPDirectives {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      return {
        'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
        'connect-src': ["'self'", 'ws://localhost:*', 'http://localhost:*'],
        'style-src': ["'self'", "'unsafe-inline'"],
      };
    }
    
    return {
      'script-src': ["'self'", "'strict-dynamic'"],
      'connect-src': ["'self'", 'wss://ws.chanuka.ke'],
      'style-src': ["'self'"],
    };
  }
}
```

#### 2.2 CSP Configuration Standardization

**File**: `client/src/security/unified/csp-config.ts`

```typescript
/**
 * Standardized CSP Configuration
 * Environment-aware CSP directives
 */
export const STANDARD_CSP_CONFIG: Record<string, CSPDirectives> = {
  development: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-eval'", // Required for Vite HMR
      "'unsafe-inline'", // Required for development
      'https://cdn.chanuka.ke',
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind CSS
      'https://fonts.googleapis.com',
    ],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'connect-src': [
      "'self'",
      'ws://localhost:*',
      'http://localhost:*',
      'https://api.chanuka.ke',
    ],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'object-src': ["'none'"],
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  },
  
  production: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'strict-dynamic'",
      'https://cdn.chanuka.ke',
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for CSS-in-JS
      'https://fonts.googleapis.com',
    ],
    'img-src': ["'self'", 'data:', 'blob:', 'https://cdn.chanuka.ke'],
    'connect-src': [
      "'self'",
      'wss://ws.chanuka.ke',
      'https://api.chanuka.ke',
    ],
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'https://cdn.chanuka.ke'],
    'object-src': ["'none'"],
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': [],
    'block-all-mixed-content': [],
  },
};
```

### Phase 3: Input Sanitization Standardization (Week 3)

#### 3.1 Create Unified Input Sanitizer

**File**: `client/src/security/unified/input-sanitizer.ts`

```typescript
/**
 * Unified Input Sanitizer
 * Combines basic and comprehensive sanitization approaches
 */
export class UnifiedInputSanitizer implements SecurityComponent {
  private config: InputSanitizationConfig;
  private basicSanitizer: BasicSanitizer;
  private comprehensiveSanitizer: ComprehensiveSanitizer;
  private threatDetector: ThreatDetector;

  constructor(config: InputSanitizationConfig) {
    this.config = config;
    this.basicSanitizer = new BasicSanitizer();
    this.comprehensiveSanitizer = new ComprehensiveSanitizer(config);
    this.threatDetector = new ThreatDetector();
  }

  async sanitize(input: string, options: SanitizationOptions = {}): Promise<SanitizationResult> {
    if (!this.config.enabled) {
      return { sanitized: input, wasModified: false, threats: [] };
    }

    const sanitizationMode = options.mode || this.config.mode;
    const result: SanitizationResult = {
      sanitized: input,
      wasModified: false,
      threats: [],
      removedElements: [],
      removedAttributes: [],
    };

    // Detect threats first
    const threats = this.threatDetector.detect(input);
    result.threats = threats;

    // Apply appropriate sanitization based on mode
    switch (sanitizationMode) {
      case 'basic':
        result.sanitized = this.basicSanitizer.sanitize(input);
        break;
      case 'comprehensive':
        const comprehensiveResult = await this.comprehensiveSanitizer.sanitize(input);
        result.sanitized = comprehensiveResult.sanitized;
        result.removedElements = comprehensiveResult.removedElements;
        result.removedAttributes = comprehensiveResult.removedAttributes;
        break;
      default:
        // Auto-detect based on threat level
        if (threats.some(t => t.severity === 'high' || t.severity === 'critical')) {
          const comprehensiveResult = await this.comprehensiveSanitizer.sanitize(input);
          result.sanitized = comprehensiveResult.sanitized;
          result.removedElements = comprehensiveResult.removedElements;
          result.removedAttributes = comprehensiveResult.removedAttributes;
        } else {
          result.sanitized = this.basicSanitizer.sanitize(input);
        }
    }

    result.wasModified = result.sanitized !== input;
    
    // Report high-severity threats
    if (threats.some(t => t.severity === 'high' || t.severity === 'critical')) {
      this.reportThreats(threats, input);
    }

    return result;
  }

  private reportThreats(threats: ThreatDetection[], originalInput: string): void {
    const securityEvent: SecurityEvent = {
      type: 'input_threat_detected',
      severity: 'high',
      source: 'UnifiedInputSanitizer',
      details: {
        threats: threats,
        originalInputLength: originalInput.length,
        threatCount: threats.length,
      },
    };

    // Emit security event
    const customEvent = new CustomEvent('security-event', { detail: securityEvent });
    document.dispatchEvent(customEvent);
  }
}
```

#### 3.2 Threat Detection System

**File**: `client/src/security/unified/threat-detector.ts`

```typescript
/**
 * Unified Threat Detector
 * Standardized threat detection patterns
 */
export class ThreatDetector {
  private threatPatterns: Map<ThreatType, RegExp[]>;

  constructor() {
    this.threatPatterns = this.initializeThreatPatterns();
  }

  detect(input: string): ThreatDetection[] {
    const threats: ThreatDetection[] = [];

    for (const [threatType, patterns] of this.threatPatterns) {
      for (const pattern of patterns) {
        const matches = input.match(pattern);
        if (matches) {
          matches.forEach(match => {
            threats.push({
              type: threatType,
              severity: this.assessThreatSeverity(threatType, match),
              description: `${threatType.replace('_', ' ')} detected: ${match.substring(0, 50)}...`,
              originalContent: match,
              location: this.findLocation(input, match),
            });
          });
        }
      }
    }

    return threats;
  }

  private initializeThreatPatterns(): Map<ThreatType, RegExp[]> {
    return new Map([
      [
        'script_injection',
        [
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /eval\s*\(/gi,
          /setTimeout\s*\(/gi,
          /setInterval\s*\(/gi,
        ],
      ],
      [
        'html_injection',
        [
          /<iframe\b[^>]*>/gi,
          /<object\b[^>]*>/gi,
          /<embed\b[^>]*>/gi,
          /<form\b[^>]*>/gi,
          /<input\b[^>]*>/gi,
          /<meta\b[^>]*>/gi,
        ],
      ],
      [
        'attribute_injection',
        [
          /style\s*=.*expression\s*\(/gi,
          /style\s*=.*javascript:/gi,
          /href\s*=.*javascript:/gi,
          /src\s*=.*javascript:/gi,
        ],
      ],
      [
        'url_injection',
        [/data:text\/html/gi, /data:application\/javascript/gi, /vbscript:/gi, /file:/gi, /ftp:/gi],
      ],
      ['css_injection', [/expression\s*\(/gi, /@import/gi, /behavior\s*:/gi, /-moz-binding/gi]],
      ['data_uri_abuse', [/data:image\/svg\+xml.*<script/gi, /data:text\/html.*<script/gi]],
      [
        'suspicious_pattern',
        [
          /\x00/g, // Null bytes
          /\uFEFF/g, // BOM
          /[\u0000-\u001F\u007F-\u009F]/g, // Control characters
          /�*[0-9a-f]{2,}/gi, // Hex entities
          /�*[0-9]{2,}/gi, // Decimal entities
        ],
      ],
    ]);
  }

  private assessThreatSeverity(threatType: ThreatType, content: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (threatType) {
      case 'script_injection':
        return 'critical';
      case 'html_injection':
        return content.includes('script') ? 'critical' : 'high';
      case 'attribute_injection':
        return 'high';
      case 'url_injection':
        return content.includes('javascript:') ? 'critical' : 'medium';
      case 'css_injection':
        return 'medium';
      case 'data_uri_abuse':
        return 'critical';
      case 'protocol_violation':
        return 'high';
      case 'suspicious_pattern':
        return 'low';
      default:
        return 'medium';
    }
  }
}
```

### Phase 4: Error Handling Unification (Week 4)

#### 4.1 Standardized Error Types

**File**: `client/src/security/unified/error-types.ts`

```typescript
/**
 * Unified Security Error Types
 * Standardized error definitions across all security components
 */
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

export class SecurityErrorFactory {
  static createError(
    type: SecurityErrorType,
    message: string,
    component: string,
    context?: Record<string, unknown>,
    originalError?: Error
  ): SecurityError {
    return {
      type,
      message,
      severity: this.assessSeverity(type),
      component,
      timestamp: new Date(),
      context,
      originalError,
    };
  }

  private static assessSeverity(type: SecurityErrorType): 'low' | 'medium' | 'high' | 'critical' {
    switch (type) {
      case SecurityErrorType.CSP_VIOLATION:
      case SecurityErrorType.INPUT_VALIDATION_FAILED:
      case SecurityErrorType.VULNERABILITY_DETECTED:
        return 'high';
      case SecurityErrorType.RATE_LIMIT_EXCEEDED:
      case SecurityErrorType.AUTHENTICATION_FAILED:
      case SecurityErrorType.CSRF_TOKEN_INVALID:
        return 'critical';
      case SecurityErrorType.CONFIGURATION_ERROR:
        return 'medium';
      case SecurityErrorType.NETWORK_ERROR:
      case SecurityErrorType.TIMEOUT_ERROR:
        return 'low';
      default:
        return 'medium';
    }
  }
}
```

#### 4.2 Error Handling Middleware

**File**: `client/src/security/unified/error-middleware.ts`

```typescript
/**
 * Security Error Handling Middleware
 * Consistent error handling across all security operations
 */
export class SecurityErrorMiddleware {
  private errorHandler: SecurityErrorHandler;
  private errorLogger: SecurityLogger;

  constructor(config: ErrorHandlingConfig) {
    this.errorHandler = new SecurityErrorHandler(config);
    this.errorLogger = new SecurityLogger(config.logLevel);
  }

  async handleSecurityOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    component: string
  ): Promise<T> {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      const securityError = this.createSecurityError(error, operationName, component);
      const errorResult = this.errorHandler.handleSecurityError(securityError);
      
      // Log the error
      this.errorLogger.error(`Security operation failed: ${operationName}`, {
        component,
        error: errorResult,
      });

      // Throw or return based on configuration
      if (this.shouldThrowError(securityError)) {
        throw new SecurityOperationError(securityError, errorResult);
      } else {
        // Return safe default or empty result
        return this.getSafeDefault(operationName) as T;
      }
    }
  }

  private createSecurityError(
    error: unknown,
    operationName: string,
    component: string
  ): SecurityError {
    if (error instanceof SecurityError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const type = this.inferErrorType(error, operationName);

    return SecurityErrorFactory.createError(
      type,
      message,
      component,
      { operation: operationName },
      error instanceof Error ? error : undefined
    );
  }

  private inferErrorType(error: unknown, operationName: string): SecurityErrorType {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('csp') || message.includes('content security')) {
        return SecurityErrorType.CSP_VIOLATION;
      }
      if (message.includes('validation') || message.includes('sanitization')) {
        return SecurityErrorType.INPUT_VALIDATION_FAILED;
      }
      if (message.includes('rate limit') || message.includes('too many requests')) {
        return SecurityErrorType.RATE_LIMIT_EXCEEDED;
      }
      if (message.includes('authentication') || message.includes('auth')) {
        return SecurityErrorType.AUTHENTICATION_FAILED;
      }
      if (message.includes('csrf') || message.includes('token')) {
        return SecurityErrorType.CSRF_TOKEN_INVALID;
      }
      if (message.includes('vulnerability') || message.includes('security')) {
        return SecurityErrorType.VULNERABILITY_DETECTED;
      }
      if (message.includes('network') || message.includes('connection')) {
        return SecurityErrorType.NETWORK_ERROR;
      }
      if (message.includes('timeout') || message.includes('timed out')) {
        return SecurityErrorType.TIMEOUT_ERROR;
      }
    }

    return SecurityErrorType.CONFIGURATION_ERROR;
  }

  private shouldThrowError(error: SecurityError): boolean {
    // Don't throw for low-severity errors in permissive mode
    return error.severity !== 'low' || this.errorHandler.config.mode === 'strict';
  }

  private getSafeDefault(operationName: string): unknown {
    // Return safe defaults based on operation
    switch (operationName) {
      case 'sanitize':
        return { sanitized: '', wasModified: false, threats: [] };
      case 'validate':
        return { valid: false, errors: [] };
      case 'checkLimit':
        return { allowed: false, remaining: 0, resetTime: 0 };
      default:
        return null;
    }
  }
}
```

### Phase 5: Migration Strategy (Week 5)

#### 5.1 Backward Compatibility Layer

**File**: `client/src/security/migration/compatibility-layer.ts`

```typescript
/**
 * Security Migration Compatibility Layer
 * Ensures backward compatibility during migration
 */
export class SecurityCompatibilityLayer {
  private legacySecurity: LegacySecuritySystem;
  private unifiedSecurity: UnifiedSecuritySystem;

  constructor() {
    this.legacySecurity = new LegacySecuritySystem();
    this.unifiedSecurity = new UnifiedSecuritySystem();
  }

  async initialize(config: SecurityConfig): Promise<void> {
    // Initialize both systems during transition period
    await this.legacySecurity.initialize(config);
    await this.unifiedSecurity.initialize(config);
  }

  // Legacy API compatibility methods
  async sanitizeInput(input: string): Promise<string> {
    // Route to appropriate implementation based on configuration
    if (this.shouldUseUnifiedImplementation()) {
      const result = await this.unifiedSecurity.sanitizer.sanitize(input);
      return result.sanitized;
    } else {
      return this.legacySecurity.sanitizeInput(input);
    }
  }

  async checkRateLimit(key: string, configName: string): Promise<RateLimitResult> {
    if (this.shouldUseUnifiedImplementation()) {
      return this.unifiedSecurity.rateLimiter.checkLimit(key, configName);
    } else {
      return this.legacySecurity.checkRateLimit(key, configName);
    }
  }

  private shouldUseUnifiedImplementation(): boolean {
    // Feature flag or configuration-based routing
    return process.env.USE_UNIFIED_SECURITY === 'true' ||
           process.env.NODE_ENV === 'production';
  }
}
```

#### 5.2 Migration Utilities

**File**: `client/src/security/migration/migration-utils.ts`

```typescript
/**
 * Security Migration Utilities
 * Helper functions for migrating from legacy to unified security
 */
export class SecurityMigrationUtils {
  static async migrateConfiguration(
    legacyConfig: LegacySecurityConfig
  ): Promise<UnifiedSecurityConfig> {
    return {
      csp: {
        enabled: legacyConfig.enableCSP,
        reportOnly: process.env.NODE_ENV === 'development',
        directives: this.convertCSPDirectives(legacyConfig.csp),
        nonce: legacyConfig.csp?.nonce,
      },
      inputSanitization: {
        enabled: legacyConfig.enableInputSanitization,
        mode: 'comprehensive', // Default to comprehensive mode
        allowedTags: legacyConfig.allowedTags || ['b', 'i', 'em', 'strong', 'p', 'br'],
        allowedAttributes: legacyConfig.allowedAttributes || {},
      },
      rateLimiting: {
        enabled: legacyConfig.enableRateLimit,
        windowMs: legacyConfig.windowMs || 15 * 60 * 1000,
        maxRequests: legacyConfig.maxRequests || 100,
      },
      errorHandling: {
        mode: 'strict', // Default to strict mode
        logLevel: 'info',
        reportToBackend: true,
      },
    };
  }

  private static convertCSPDirectives(legacyCSP: any): CSPDirectives {
    // Convert legacy CSP configuration to unified format
    return {
      'default-src': legacyCSP?.defaultSrc || ["'self'"],
      'script-src': legacyCSP?.scriptSrc || ["'self'"],
      'style-src': legacyCSP?.styleSrc || ["'self'"],
      'img-src': legacyCSP?.imgSrc || ["'self'", 'data:', 'https:'],
      'connect-src': legacyCSP?.connectSrc || ["'self'"],
      'font-src': legacyCSP?.fontSrc || ["'self'"],
      'object-src': legacyCSP?.objectSrc || ["'none'"],
      'frame-src': legacyCSP?.frameSrc || ["'none'"],
      'form-action': legacyCSP?.formAction || ["'self'"],
    };
  }

  static validateMigration(config: UnifiedSecurityConfig): MigrationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate CSP configuration
    if (config.csp.enabled) {
      const cspErrors = this.validateCSPConfig(config.csp);
      errors.push(...cspErrors);
    }

    // Validate input sanitization configuration
    if (config.inputSanitization.enabled) {
      const sanitizationErrors = this.validateSanitizationConfig(config.inputSanitization);
      errors.push(...sanitizationErrors);
    }

    // Validate rate limiting configuration
    if (config.rateLimiting.enabled) {
      const rateLimitErrors = this.validateRateLimitConfig(config.rateLimiting);
      errors.push(...rateLimitErrors);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
```

### Phase 6: Testing Strategy (Week 6)

#### 6.1 Comprehensive Test Suite

**File**: `client/src/security/__tests__/unified-security.test.ts`

```typescript
/**
 * Unified Security System Tests
 * Comprehensive test coverage for the unified security system
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('Unified Security System', () => {
  let unifiedSecurity: UnifiedSecuritySystem;
  let mockConfig: UnifiedSecurityConfig;

  beforeEach(() => {
    mockConfig = {
      csp: {
        enabled: true,
        reportOnly: false,
        directives: STANDARD_CSP_CONFIG.development,
        nonce: 'test-nonce',
      },
      inputSanitization: {
        enabled: true,
        mode: 'comprehensive',
        allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
        allowedAttributes: { a: ['href', 'target'] },
      },
      rateLimiting: {
        enabled: true,
        windowMs: 60000,
        maxRequests: 10,
      },
      errorHandling: {
        mode: 'strict',
        logLevel: 'info',
        reportToBackend: true,
      },
    };

    unifiedSecurity = new UnifiedSecuritySystem();
  });

  describe('CSP Management', () => {
    it('should generate correct CSP header', async () => {
      await unifiedSecurity.initialize(mockConfig);
      
      const cspHeader = unifiedSecurity.cspManager.generateCSPHeader();
      expect(cspHeader).toContain("default-src 'self'");
      expect(cspHeader).toContain("script-src 'self'");
      expect(cspHeader).toContain("style-src 'self'");
    });

    it('should handle CSP violations', async () => {
      const violationHandler = vi.fn();
      unifiedSecurity.cspManager.onViolation(violationHandler);

      // Simulate CSP violation
      const violation = {
        documentUri: 'https://example.com',
        violatedDirective: 'script-src',
        blockedUri: 'https://evil.com/script.js',
      };

      await unifiedSecurity.cspManager.handleViolation(violation);
      expect(violationHandler).toHaveBeenCalledWith(violation);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts', async () => {
      const maliciousInput = '<script>alert("XSS")</script><img src="x" onerror="alert(1)">';
      
      const result = await unifiedSecurity.sanitizer.sanitize(maliciousInput);
      
      expect(result.wasModified).toBe(true);
      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).not.toContain('onerror');
      expect(result.threats).toHaveLength(2);
    });

    it('should preserve safe HTML', async () => {
      const safeInput = '<p>This is <strong>safe</strong> HTML content.</p>';
      
      const result = await unifiedSecurity.sanitizer.sanitize(safeInput);
      
      expect(result.wasModified).toBe(false);
      expect(result.sanitized).toBe(safeInput);
      expect(result.threats).toHaveLength(0);
    });

    it('should handle different sanitization modes', async () => {
      const input = '<script>alert("test")</script>';
      
      // Test basic mode
      const basicResult = await unifiedSecurity.sanitizer.sanitize(input, { mode: 'basic' });
      expect(basicResult.sanitized).toBe('alert("test")');
      
      // Test comprehensive mode
      const comprehensiveResult = await unifiedSecurity.sanitizer.sanitize(input, { mode: 'comprehensive' });
      expect(comprehensiveResult.wasModified).toBe(true);
      expect(comprehensiveResult.threats.length).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const key = 'test-user';
      const configName = 'api-endpoint';

      // Make requests up to the limit
      for (let i = 0; i < 10; i++) {
        const result = await unifiedSecurity.rateLimiter.checkLimit(key, configName);
        expect(result.allowed).toBe(true);
      }

      // Next request should be blocked
      const result = await unifiedSecurity.rateLimiter.checkLimit(key, configName);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle different rate limit configurations', async () => {
      const configs = [
        { name: 'strict', windowMs: 60000, maxRequests: 5 },
        { name: 'permissive', windowMs: 300000, maxRequests: 100 },
      ];

      for (const config of configs) {
        const result = await unifiedSecurity.rateLimiter.checkLimit('user', config.name);
        expect(result).toBeDefined();
        expect(result.windowMs).toBe(config.windowMs);
        expect(result.maxRequests).toBe(config.maxRequests);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle security errors consistently', async () => {
      const errorHandler = vi.spyOn(unifiedSecurity.errorHandler, 'handleSecurityError');
      
      const testError = SecurityErrorFactory.createError(
        SecurityErrorType.INPUT_VALIDATION_FAILED,
        'Invalid input detected',
        'TestComponent'
      );

      unifiedSecurity.errorHandler.handleSecurityError(testError);
      
      expect(errorHandler).toHaveBeenCalledWith(testError);
      expect(testError.severity).toBe('high');
    });

    it('should provide error context', async () => {
      const error = new Error('Test error');
      const securityError = SecurityErrorFactory.createError(
        SecurityErrorType.CONFIGURATION_ERROR,
        'Configuration error occurred',
        'TestComponent',
        { configKey: 'test' },
        error
      );

      expect(securityError.context).toEqual({ configKey: 'test' });
      expect(securityError.originalError).toBe(error);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete security workflow', async () => {
      const workflow = {
        input: '<script>alert("test")</script>',
        endpoint: 'api/test',
        user: 'test-user',
      };

      // Sanitize input
      const sanitizationResult = await unifiedSecurity.sanitizer.sanitize(workflow.input);
      expect(sanitizationResult.wasModified).toBe(true);

      // Check rate limit
      const rateLimitResult = await unifiedSecurity.rateLimiter.checkLimit(workflow.user, workflow.endpoint);
      expect(rateLimitResult.allowed).toBe(true);

      // Verify CSP is active
      const cspStatus = unifiedSecurity.cspManager.getHealthStatus();
      expect(cspStatus.enabled).toBe(true);
    });

    it('should handle security breach scenarios', async () => {
      const breachInputs = [
        '<script>alert("xss")</script>',
        "'; DROP TABLE users; --",
        'javascript:alert("injection")',
      ];

      for (const input of breachInputs) {
        const result = await unifiedSecurity.sanitizer.sanitize(input);
        expect(result.threats.length).toBeGreaterThan(0);
        expect(result.wasModified).toBe(true);
      }
    });
  });
});
```

#### 6.2 Performance Tests

**File**: `client/src/security/__tests__/performance.test.ts`

```typescript
/**
 * Security System Performance Tests
 * Performance benchmarks and load testing
 */
describe('Security System Performance', () => {
  describe('Input Sanitization Performance', () => {
    it('should sanitize large inputs efficiently', async () => {
      const largeInput = '<p>' + 'A'.repeat(10000) + '</p>';
      const startTime = performance.now();

      const result = await unifiedSecurity.sanitizer.sanitize(largeInput);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      expect(result.sanitized).toBeDefined();
    });

    it('should handle concurrent sanitization requests', async () => {
      const inputs = Array.from({ length: 100 }, (_, i) => `<p>Input ${i}</p>`);
      const startTime = performance.now();

      const promises = inputs.map(input => unifiedSecurity.sanitizer.sanitize(input));
      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(results).toHaveLength(100);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should handle high request volumes', async () => {
      const startTime = performance.now();

      // Simulate 1000 requests
      const promises = Array.from({ length: 1000 }, (_, i) =>
        unifiedSecurity.rateLimiter.checkLimit(`user-${i % 10}`, 'api-endpoint')
      );

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
      expect(results).toHaveLength(1000);
    });
  });
});
```

### Phase 7: Documentation and Guidelines (Week 7)

#### 7.1 Security Implementation Guidelines

**File**: `client/src/security/GUIDELINES.md`

```markdown
# Security Implementation Guidelines

## When to Use Comprehensive vs Foundational Security

### Comprehensive Security (`client/src/security/`)
Use comprehensive security when:
- Building production applications with high security requirements
- Need advanced threat detection and monitoring
- Require detailed logging and reporting
- Working with user-generated content
- Handling sensitive data or financial transactions
- Need compliance with security standards (OWASP, etc.)

### Foundational Security (`client/src/core/security/`)
Use foundational security when:
- Building lightweight applications or prototypes
- Need minimal dependencies and fast startup
- Working in resource-constrained environments
- Implementing basic security measures
- Building internal tools with lower risk profiles
- Need maximum compatibility across environments

### Unified Security (`client/src/security/unified/`)
Use unified security when:
- Migrating from dual implementations
- Need consistent API across different security levels
- Want to standardize security practices
- Building new applications with future scalability in mind
- Need to maintain backward compatibility during transitions

## Security Configuration Guidelines

### Development Environment
```typescript
const devConfig: UnifiedSecurityConfig = {
  csp: {
    enabled: true,
    reportOnly: true, // Don't block in development
    directives: STANDARD_CSP_CONFIG.development,
  },
  inputSanitization: {
    enabled: true,
    mode: 'comprehensive', // Always use comprehensive in development
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'script'], // Allow script for HMR
  },
  rateLimiting: {
    enabled: false, // Disable in development for easier testing
    windowMs: 60000,
    maxRequests: 1000, // High limits for development
  },
  errorHandling: {
    mode: 'permissive', // Don't break development flow
    logLevel: 'debug', // Maximum logging for debugging
    reportToBackend: false, // Don't spam backend in development
  },
};
```

### Production Environment
```typescript
const prodConfig: UnifiedSecurityConfig = {
  csp: {
    enabled: true,
    reportOnly: false, // Enforce CSP in production
    directives: STANDARD_CSP_CONFIG.production,
  },
  inputSanitization: {
    enabled: true,
    mode: 'comprehensive', // Always use comprehensive in production
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'], // Strict tag filtering
  },
  rateLimiting: {
    enabled: true,
    windowMs: 900000, // 15 minutes
    maxRequests: 100, // Reasonable limits
  },
  errorHandling: {
    mode: 'strict', // Fail fast on security issues
    logLevel: 'warn', // Don't log too much in production
    reportToBackend: true, // Report security events
  },
};
```

## Best Practices

### 1. Input Validation
- Always validate input on both client and server
- Use whitelist approach for allowed content
- Never trust user input
- Log suspicious input for analysis

### 2. CSP Implementation
- Start with report-only mode
- Gradually tighten directives
- Monitor CSP violation reports
- Use nonces for inline scripts
- Avoid unsafe-inline and unsafe-eval

### 3. Rate Limiting
- Implement multiple layers (IP, user, endpoint)
- Use adaptive rate limiting based on behavior
- Monitor for abuse patterns
- Provide clear error messages

### 4. Error Handling
- Never expose sensitive information in errors
- Use consistent error formats
- Log security events for analysis
- Implement circuit breakers for failing services

### 5. Testing
- Test with malicious input
- Verify CSP effectiveness
- Test rate limiting under load
- Include security tests in CI/CD

## Migration Checklist

### Before Migration
- [ ] Audit current security implementation
- [ ] Identify all security dependencies
- [ ] Create backup of current configuration
- [ ] Plan migration timeline
- [ ] Set up monitoring for migration

### During Migration
- [ ] Enable compatibility layer
- [ ] Migrate configuration gradually
- [ ] Test each component individually
- [ ] Monitor for security issues
- [ ] Update documentation

### After Migration
- [ ] Remove compatibility layer
- [ ] Clean up legacy code
- [ ] Update tests
- [ ] Train team on new system
- [ ] Review security posture

## Security Monitoring

### Key Metrics to Monitor
- CSP violation rates
- Input sanitization threat detection
- Rate limiting effectiveness
- Security error rates
- Performance impact of security measures

### Alerting Thresholds
- CSP violations > 100/hour
- High-severity threats > 10/hour
- Rate limiting blocking > 50% of requests
- Security errors > 5% of operations

### Regular Security Reviews
- Monthly CSP directive review
- Quarterly threat pattern updates
- Bi-annual security configuration audit
- Annual penetration testing
```

#### 7.2 API Documentation

**File**: `client/src/security/API.md`

```markdown
# Unified Security System API Documentation

## Core Interfaces

### UnifiedSecurityConfig
```typescript
interface UnifiedSecurityConfig {
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
```

### SecurityComponent
```typescript
interface SecurityComponent {
  initialize(config: UnifiedSecurityConfig): Promise<void>;
  shutdown(): Promise<void>;
  getHealthStatus(): SecurityHealth;
  getMetrics(): SecurityMetrics;
}
```

## CSP Manager API

### Methods
```typescript
class UnifiedCSPManager implements SecurityComponent {
  // Initialize CSP with configuration
  async initialize(config: UnifiedSecurityConfig): Promise<void>
  
  // Get current CSP header
  generateCSPHeader(): string
  
  // Get current nonce
  getCurrentNonce(): string
  
  // Refresh nonce
  refreshNonce(): string
  
  // Handle CSP violations
  handleViolation(violation: CSPViolation): void
  
  // Get violation history
  getViolations(): CSPViolation[]
  
  // Clear violation history
  clearViolations(): void
}
```

## Input Sanitizer API

### Methods
```typescript
class UnifiedInputSanitizer implements SecurityComponent {
  // Sanitize input with options
  async sanitize(
    input: string, 
    options?: SanitizationOptions
  ): Promise<SanitizationResult>
  
  // Perform security check without sanitization
  isSafe(input: string, type?: 'html' | 'text' | 'url'): boolean
  
  // Validate input against schema
  async validateInput<T>(
    schema: Record<string, unknown>,
    input: unknown
  ): Promise<{ success: true; data: T } | { success: false; errors: string[] }>
  
  // Batch sanitize multiple inputs
  sanitizeBatch(
    inputs: Record<string, string>,
    type?: 'html' | 'text' | 'url'
  ): Promise<Record<string, SanitizationResult>>
}
```

### Options
```typescript
interface SanitizationOptions {
  mode?: 'basic' | 'comprehensive' | 'auto';
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  maxLength?: number;
}
```

### Result
```typescript
interface SanitizationResult {
  sanitized: string;
  wasModified: boolean;
  threats: ThreatDetection[];
  removedElements: string[];
  removedAttributes: string[];
}
```

## Rate Limiter API

### Methods
```typescript
class UnifiedRateLimiter implements SecurityComponent {
  // Check if request is allowed
  checkLimit(key: string, configName: string): RateLimitResult
  
  // Increment usage counter
  increment(key: string, configName: string): void
  
  // Reset usage for key
  reset(key: string, configName: string): void
  
  // Get current usage
  getUsage(key: string, configName: string): RateLimitUsage
  
  // Block user temporarily
  blockUser(key: string, duration: number): void
  
  // Unblock user
  unblockUser(key: string): void
}
```

### Result
```typescript
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  blocked?: boolean;
  reason?: string;
}
```

## Error Handler API

### Methods
```typescript
class SecurityErrorHandler {
  // Handle security error
  handleSecurityError(error: SecurityError): SecurityErrorResult
  
  // Create security error
  createError(
    type: SecurityErrorType,
    message: string,
    component: string,
    context?: Record<string, unknown>,
    originalError?: Error
  ): SecurityError
  
  // Report error to backend
  reportToBackend(error: SecurityErrorResult): Promise<void>
  
  // Get error statistics
  getErrorStats(): ErrorStatistics
}
```

## Usage Examples

### Basic Usage
```typescript
import { UnifiedSecuritySystem } from '@client/security/unified';

const security = new UnifiedSecuritySystem();

const config: UnifiedSecurityConfig = {
  csp: {
    enabled: true,
    reportOnly: false,
    directives: STANDARD_CSP_CONFIG.production,
  },
  inputSanitization: {
    enabled: true,
    mode: 'comprehensive',
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
    allowedAttributes: { a: ['href', 'target'] },
  },
  rateLimiting: {
    enabled: true,
    windowMs: 900000, // 15 minutes
    maxRequests: 100,
  },
  errorHandling: {
    mode: 'strict',
    logLevel: 'info',
    reportToBackend: true,
  },
};

await security.initialize(config);

// Use security components
const sanitized = await security.sanitizer.sanitize(userInput);
const rateLimit = security.rateLimiter.checkLimit(userId, 'api-endpoint');
```

### Advanced Usage
```typescript
// Custom CSP configuration
const customCSP = {
  ...STANDARD_CSP_CONFIG.production,
  'script-src': [
    "'self'",
    "'strict-dynamic'",
    'https://trusted.cdn.com',
  ],
};

// Custom sanitization
const sanitizationOptions = {
  mode: 'comprehensive' as const,
  allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'a'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  maxLength: 5000,
};

const result = await security.sanitizer.sanitize(
  userInput, 
  sanitizationOptions
);
```

### Error Handling
```typescript
try {
  const result = await security.sanitizer.sanitize(userInput);
  if (result.threats.length > 0) {
    console.warn('Security threats detected:', result.threats);
  }
} catch (error) {
  if (error instanceof SecurityError) {
    console.error('Security error occurred:', error);
    // Handle security-specific error
  } else {
    console.error('Unexpected error:', error);
    // Handle general error
  }
}
```
```

## Implementation Timeline

### Week 1: Foundation (Days 1-7)
- [ ] Create unified security interface
- [ ] Design error handling patterns
- [ ] Set up project structure
- [ ] Create basic configuration system

### Week 2: CSP Unification (Days 8-14)
- [ ] Implement unified CSP manager
- [ ] Create standardized CSP configuration
- [ ] Add CSP violation handling
- [ ] Implement nonce management

### Week 3: Input Sanitization (Days 15-21)
- [ ] Create unified input sanitizer
- [ ] Implement threat detection system
- [ ] Add sanitization modes
- [ ] Create sanitization utilities

### Week 4: Error Handling (Days 22-28)
- [ ] Implement standardized error types
- [ ] Create error handling middleware
- [ ] Add error reporting system
- [ ] Implement error logging

### Week 5: Migration (Days 29-35)
- [ ] Create compatibility layer
- [ ] Implement migration utilities
- [ ] Add feature flags
- [ ] Test backward compatibility

### Week 6: Testing (Days 36-42)
- [ ] Create comprehensive test suite
- [ ] Add performance tests
- [ ] Implement integration tests
- [ ] Add security-specific tests

### Week 7: Documentation (Days 43-49)
- [ ] Create implementation guidelines
- [ ] Write API documentation
- [ ] Create migration guide
- [ ] Add best practices documentation

## Success Criteria

### Functional Requirements
- [ ] All security components work with unified interface
- [ ] Backward compatibility maintained during migration
- [ ] Error handling is consistent across all components
- [ ] Configuration is standardized and documented
- [ ] Performance meets or exceeds current implementation

### Quality Requirements
- [ ] 95% test coverage for new unified components
- [ ] Performance impact < 5% compared to current implementation
- [ ] Zero breaking changes during migration
- [ ] All security vulnerabilities addressed
- [ ] Documentation covers all public APIs

### Operational Requirements
- [ ] Migration can be completed without downtime
- [ ] Monitoring and alerting in place for security events
- [ ] Team trained on new unified system
- [ ] Rollback plan available if issues occur
- [ ] Security review completed before production deployment

## Risk Mitigation

### High Risk Items
1. **Breaking Changes**: Mitigated by compatibility layer and thorough testing
2. **Performance Impact**: Mitigated by performance testing and optimization
3. **Security Gaps**: Mitigated by comprehensive security review and testing
4. **Migration Complexity**: Mitigated by phased approach and rollback plan

### Medium Risk Items
1. **Configuration Complexity**: Mitigated by clear documentation and examples
2. **Team Adoption**: Mitigated by training and gradual rollout
3. **Monitoring Gaps**: Mitigated by comprehensive monitoring setup

### Low Risk Items
1. **Documentation Gaps**: Mitigated by peer review and user feedback
2. **Testing Coverage**: Mitigated by automated testing and code review
3. **Performance Variations**: Mitigated by performance monitoring

## Next Steps

After completing this implementation plan:

1. **Review and Approval**: Get stakeholder approval for the plan
2. **Resource Allocation**: Assign team members to each phase
3. **Environment Setup**: Prepare development and testing environments
4. **Implementation Start**: Begin with Phase 1 implementation
5. **Regular Reviews**: Weekly progress reviews and adjustments
6. **Final Deployment**: Complete migration and remove legacy systems

This plan provides a comprehensive roadmap for unifying the security systems while maintaining backward compatibility and improving overall security posture.