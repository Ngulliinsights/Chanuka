# Security Systems Migration - File-by-File Steps

## Overview

This document provides detailed, file-by-file migration steps to unify the dual security implementation architecture while maintaining backward compatibility.

## Migration Strategy

### Phase 1: Preparation (Week 1)
Create unified interfaces and compatibility layer without touching existing implementations.

### Phase 2: Implementation (Weeks 2-4)
Implement unified components and gradually migrate functionality.

### Phase 3: Migration (Week 5)
Switch from legacy to unified implementations with feature flags.

### Phase 4: Cleanup (Week 6)
Remove legacy code and finalize unified system.

## Detailed Migration Steps

### Phase 1: Preparation (Files to Create)

#### 1.1 Create Unified Security Interface
**File**: `client/src/security/unified/security-interface.ts`

```typescript
/**
 * Unified Security Interface
 * Provides consistent API across all security components
 */
export interface UnifiedSecurityConfig {
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
  status: 'healthy' | 'warning' | 'critical';
  components: Record<string, ComponentHealth>;
  lastCheck: Date;
}

export interface ComponentHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  errors: number;
  lastError?: Date;
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  vulnerabilitiesFound: number;
  vulnerabilitiesFixed: number;
  rateLimitViolations: number;
  cspViolations: number;
  lastScanTime: Date;
  systemHealth: 'healthy' | 'warning' | 'critical';
}
```

#### 1.2 Create Compatibility Layer
**File**: `client/src/security/migration/compatibility-layer.ts`

```typescript
/**
 * Security Migration Compatibility Layer
 * Ensures backward compatibility during migration
 */
import { SecurityConfig as LegacySecurityConfig } from '@client/core/security/security-utils';
import { UnifiedSecurityConfig } from '../unified/security-interface';

export class SecurityCompatibilityLayer {
  private legacySecurity: LegacySecuritySystem;
  private unifiedSecurity: UnifiedSecuritySystem;
  private useUnified: boolean;

  constructor() {
    this.legacySecurity = new LegacySecuritySystem();
    this.unifiedSecurity = new UnifiedSecuritySystem();
    this.useUnified = this.shouldUseUnifiedImplementation();
  }

  private shouldUseUnifiedImplementation(): boolean {
    // Feature flag or environment-based routing
    return process.env.USE_UNIFIED_SECURITY === 'true' ||
           process.env.NODE_ENV === 'production';
  }

  async initialize(config: LegacySecurityConfig | UnifiedSecurityConfig): Promise<void> {
    // Convert legacy config to unified config if needed
    const unifiedConfig = this.convertToUnifiedConfig(config);
    
    // Initialize both systems during transition period
    await this.legacySecurity.initialize(config as LegacySecurityConfig);
    await this.unifiedSecurity.initialize(unifiedConfig);
  }

  // Legacy API compatibility methods
  async sanitizeInput(input: string): Promise<string> {
    if (this.useUnified) {
      const result = await this.unifiedSecurity.sanitizer.sanitize(input);
      return result.sanitized;
    } else {
      return this.legacySecurity.sanitizeInput(input);
    }
  }

  async sanitizeHTML(html: string): Promise<string> {
    if (this.useUnified) {
      const result = await this.unifiedSecurity.sanitizer.sanitize(html, { mode: 'comprehensive' });
      return result.sanitized;
    } else {
      return this.legacySecurity.sanitizeHTML(html);
    }
  }

  checkRateLimit(key: string, configName: string): RateLimitResult {
    if (this.useUnified) {
      return this.unifiedSecurity.rateLimiter.checkLimit(key, configName);
    } else {
      return this.legacySecurity.checkRateLimit(key, configName);
    }
  }

  generateCSPHeader(directives?: CSPDirectives): string {
    if (this.useUnified) {
      return this.unifiedSecurity.cspManager.generateCSPHeader(directives);
    } else {
      return this.legacySecurity.generateCSPHeader(directives);
    }
  }

  generateSecureToken(length?: number): string {
    if (this.useUnified) {
      return this.unifiedSecurity.tokenGenerator.generateToken(length);
    } else {
      return this.legacySecurity.generateSecureToken(length);
    }
  }

  private convertToUnifiedConfig(config: LegacySecurityConfig | UnifiedSecurityConfig): UnifiedSecurityConfig {
    if ('csp' in config) {
      // Already unified config
      return config as UnifiedSecurityConfig;
    }

    // Convert legacy config
    return {
      csp: {
        enabled: config.csp ? true : false,
        reportOnly: process.env.NODE_ENV === 'development',
        directives: config.csp || DEFAULT_CSP,
        nonce: undefined,
      },
      inputSanitization: {
        enabled: config.enableXSSProtection || true,
        mode: 'comprehensive',
        allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
        allowedAttributes: {},
      },
      rateLimiting: {
        enabled: true,
        windowMs: 15 * 60 * 1000,
        maxRequests: 100,
      },
      errorHandling: {
        mode: 'strict',
        logLevel: 'info',
        reportToBackend: true,
      },
    };
  }
}
```

#### 1.3 Create Migration Utilities
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
        enabled: legacyConfig.csp ? true : false,
        reportOnly: process.env.NODE_ENV === 'development',
        directives: this.convertCSPDirectives(legacyConfig.csp),
        nonce: legacyConfig.csp?.nonce,
      },
      inputSanitization: {
        enabled: legacyConfig.enableXSSProtection || true,
        mode: 'comprehensive',
        allowedTags: legacyConfig.allowedTags || ['b', 'i', 'em', 'strong', 'p', 'br'],
        allowedAttributes: legacyConfig.allowedAttributes || {},
      },
      rateLimiting: {
        enabled: true,
        windowMs: legacyConfig.windowMs || 15 * 60 * 1000,
        maxRequests: legacyConfig.maxRequests || 100,
      },
      errorHandling: {
        mode: 'strict',
        logLevel: 'info',
        reportToBackend: true,
      },
    };
  }

  private static convertCSPDirectives(legacyCSP: any): CSPDirectives {
    if (!legacyCSP) {
      return DEFAULT_CSP;
    }

    return {
      'default-src': legacyCSP['default-src'] || ["'self'"],
      'script-src': legacyCSP['script-src'] || ["'self'"],
      'style-src': legacyCSP['style-src'] || ["'self'"],
      'img-src': legacyCSP['img-src'] || ["'self'", 'data:', 'https:'],
      'connect-src': legacyCSP['connect-src'] || ["'self'"],
      'font-src': legacyCSP['font-src'] || ["'self'"],
      'object-src': legacyCSP['object-src'] || ["'none'"],
      'frame-src': legacyCSP['frame-src'] || ["'none'"],
      'form-action': legacyCSP['form-action'] || ["'self'"],
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

  private static validateCSPConfig(csp: CSPConfig): string[] {
    const errors: string[] = [];

    if (!csp.directives) {
      errors.push('CSP directives are required when CSP is enabled');
    }

    if (csp.directives && csp.directives['script-src']?.includes("'unsafe-inline'")) {
      errors.push('unsafe-inline in script-src reduces security');
    }

    return errors;
  }

  private static validateSanitizationConfig(sanitization: InputSanitizationConfig): string[] {
    const errors: string[] = [];

    if (!sanitization.allowedTags || sanitization.allowedTags.length === 0) {
      errors.push('At least one allowed tag is required for input sanitization');
    }

    return errors;
  }

  private static validateRateLimitConfig(rateLimiting: RateLimitingConfig): string[] {
    const errors: string[] = [];

    if (rateLimiting.windowMs <= 0) {
      errors.push('Rate limit window must be greater than 0');
    }

    if (rateLimiting.maxRequests <= 0) {
      errors.push('Rate limit max requests must be greater than 0');
    }

    return errors;
  }
}

interface MigrationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

### Phase 2: Implementation (Files to Create)

#### 2.1 Create Unified CSP Manager
**File**: `client/src/security/unified/csp-manager.ts`

```typescript
/**
 * Unified CSP Manager
 * Combines server-side and client-side CSP approaches
 */
import { CSPDirectives, CSPViolation } from '@client/shared/types';
import { SecurityComponent, SecurityHealth } from './security-interface';
import { SecurityErrorHandler } from './error-handler';
import { SecurityLogger } from './logger';

export class UnifiedCSPManager implements SecurityComponent {
  private config: CSPConfig;
  private nonceManager: CSPNonceManager;
  private violationHandler: CSPViolationHandler;
  private logger: SecurityLogger;
  private errorHandler: SecurityErrorHandler;
  private violations: CSPViolation[] = [];
  private health: SecurityHealth;

  constructor(config: CSPConfig) {
    this.config = config;
    this.nonceManager = new CSPNonceManager(config.nonce);
    this.violationHandler = new CSPViolationHandler(config.reportUri);
    this.logger = new SecurityLogger('info');
    this.errorHandler = new SecurityErrorHandler();
    this.health = {
      status: 'healthy',
      components: {},
      lastCheck: new Date(),
    };
  }

  async initialize(config: UnifiedSecurityConfig): Promise<void> {
    if (!config.csp.enabled) {
      this.logger.info('CSP Manager disabled');
      return;
    }

    try {
      // Generate and apply CSP header
      const cspHeader = this.generateCSPHeader(config.csp.directives);
      
      // Apply via meta tag (fallback)
      this.applyMetaTagCSP(cspHeader);
      
      // Set up violation reporting
      this.violationHandler.setupReporting((violation) => {
        this.handleViolation(violation);
      });
      
      // Store nonce for script execution
      this.nonceManager.initialize();
      
      this.health.status = 'healthy';
      this.health.lastCheck = new Date();

      this.logger.info('CSP Manager initialized successfully', {
        reportOnly: config.csp.reportOnly,
        nonce: this.nonceManager.getCurrentNonce().substring(0, 8) + '...',
      });
    } catch (error) {
      const securityError = this.errorHandler.createError(
        'csp_violation',
        'Failed to initialize CSP Manager',
        'UnifiedCSPManager',
        { config },
        error instanceof Error ? error : undefined
      );
      
      this.errorHandler.handleSecurityError(securityError);
      this.health.status = 'critical';
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    this.violationHandler.cleanup();
    this.nonceManager.stopRotation();
    this.logger.info('CSP Manager shut down');
  }

  getHealthStatus(): SecurityHealth {
    return { ...this.health };
  }

  getMetrics(): SecurityMetrics {
    return {
      totalEvents: this.violations.length,
      eventsByType: { csp_violation: this.violations.length },
      eventsBySeverity: { high: this.violations.length },
      vulnerabilitiesFound: 0,
      vulnerabilitiesFixed: 0,
      rateLimitViolations: 0,
      cspViolations: this.violations.length,
      lastScanTime: new Date(),
      systemHealth: this.health.status,
    };
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

  private getBaseDirectives(): CSPDirectives {
    return {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'"],
      'font-src': ["'self'"],
      'object-src': ["'none'"],
      'frame-src': ["'none'"],
      'form-action': ["'self'"],
    };
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

  private mergeDirectives(...directives: CSPDirectives[]): CSPDirectives {
    const merged: CSPDirectives = { ...directives[0] };
    
    for (let i = 1; i < directives.length; i++) {
      const current = directives[i];
      for (const [key, value] of Object.entries(current)) {
        if (merged[key]) {
          // Merge arrays, removing duplicates
          merged[key] = [...new Set([...merged[key], ...value])];
        } else {
          merged[key] = value;
        }
      }
    }
    
    return merged;
  }

  private applyMetaTagCSP(cspHeader: string): void {
    // Add meta tag for CSP (fallback - note: some directives like frame-ancestors won't work)
    const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!existingCSP) {
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = cspHeader;
      document.head.appendChild(meta);
    }
  }

  private handleViolation(violation: CSPViolation): void {
    this.violations.push(violation);
    
    // Log violation
    this.logger.warn('CSP Violation detected', {
      component: 'UnifiedCSPManager',
      violation,
    });

    // Create security event
    const securityEvent = {
      type: 'csp_violation',
      severity: this.assessViolationSeverity(violation),
      source: 'UnifiedCSPManager',
      details: violation,
    };

    // Report to security monitor
    this.reportSecurityEvent(securityEvent);

    // Send to backend if configured
    if (this.config.reportUri) {
      this.reportViolationToBackend(violation);
    }
  }

  private assessViolationSeverity(violation: CSPViolation): 'low' | 'medium' | 'high' | 'critical' {
    if (violation.violatedDirective.includes('script-src')) {
      return 'high'; // Script violations are serious
    }
    if (
      violation.violatedDirective.includes('object-src') ||
      violation.violatedDirective.includes('frame-src')
    ) {
      return 'critical'; // Object/frame violations could indicate XSS
    }
    if (
      violation.violatedDirective.includes('img-src') ||
      violation.violatedDirective.includes('style-src')
    ) {
      return 'medium'; // Style/image violations are less critical
    }
    return 'low';
  }

  private reportSecurityEvent(event: any): void {
    // Emit custom event for security monitor
    const customEvent = new CustomEvent('security-event', {
      detail: event,
    });
    document.dispatchEvent(customEvent);
  }

  private async reportViolationToBackend(violation: CSPViolation): Promise<void> {
    try {
      await fetch(this.config.reportUri!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(violation),
      });
    } catch (error) {
      this.logger.error('Failed to report CSP violation to backend', { error });
    }
  }

  // Public methods
  generateCSPHeader(): string {
    return this.generateCSPHeader(this.config.directives);
  }

  getCurrentNonce(): string {
    return this.nonceManager.getCurrentNonce();
  }

  refreshNonce(): string {
    return this.nonceManager.refreshNonce();
  }

  getViolations(): CSPViolation[] {
    return [...this.violations];
  }

  clearViolations(): void {
    this.violations = [];
  }
}
```

#### 2.2 Create Unified Input Sanitizer
**File**: `client/src/security/unified/input-sanitizer.ts`

```typescript
/**
 * Unified Input Sanitizer
 * Combines basic and comprehensive sanitization approaches
 */
import DOMPurify from 'dompurify';
import { SecurityComponent, SecurityHealth } from './security-interface';
import { SecurityErrorHandler } from './error-handler';
import { SecurityLogger } from './logger';
import { ThreatDetector } from './threat-detector';

export class UnifiedInputSanitizer implements SecurityComponent {
  private config: InputSanitizationConfig;
  private basicSanitizer: BasicSanitizer;
  private comprehensiveSanitizer: ComprehensiveSanitizer;
  private threatDetector: ThreatDetector;
  private logger: SecurityLogger;
  private errorHandler: SecurityErrorHandler;
  private health: SecurityHealth;

  constructor(config: InputSanitizationConfig) {
    this.config = config;
    this.basicSanitizer = new BasicSanitizer();
    this.comprehensiveSanitizer = new ComprehensiveSanitizer(config);
    this.threatDetector = new ThreatDetector();
    this.logger = new SecurityLogger('info');
    this.errorHandler = new SecurityErrorHandler();
    this.health = {
      status: 'healthy',
      components: {},
      lastCheck: new Date(),
    };
  }

  async initialize(config: UnifiedSecurityConfig): Promise<void> {
    if (!config.inputSanitization.enabled) {
      this.logger.info('Input Sanitizer disabled');
      return;
    }

    try {
      // Initialize DOMPurify with configuration
      this.setupDOMPurify(config.inputSanitization);
      
      this.health.status = 'healthy';
      this.health.lastCheck = new Date();

      this.logger.info('Input Sanitizer initialized successfully', {
        mode: config.inputSanitization.mode,
        allowedTags: config.inputSanitization.allowedTags.length,
      });
    } catch (error) {
      const securityError = this.errorHandler.createError(
        'input_validation_failed',
        'Failed to initialize Input Sanitizer',
        'UnifiedInputSanitizer',
        { config },
        error instanceof Error ? error : undefined
      );
      
      this.errorHandler.handleSecurityError(securityError);
      this.health.status = 'critical';
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Input Sanitizer shut down');
  }

  getHealthStatus(): SecurityHealth {
    return { ...this.health };
  }

  getMetrics(): SecurityMetrics {
    return {
      totalEvents: 0,
      eventsByType: {},
      eventsBySeverity: {},
      vulnerabilitiesFound: 0,
      vulnerabilitiesFixed: 0,
      rateLimitViolations: 0,
      cspViolations: 0,
      lastScanTime: new Date(),
      systemHealth: this.health.status,
    };
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

    try {
      // Detect threats first
      const threats = this.threatDetector.detect(input);
      result.threats = threats;

      // Apply appropriate sanitization based on mode
      switch (sanitizationMode) {
        case 'basic':
          result.sanitized = this.basicSanitizer.sanitize(input);
          break;
        case 'comprehensive':
          const comprehensiveResult = await this.comprehensiveSanitizer.sanitize(input, options);
          result.sanitized = comprehensiveResult.sanitized;
          result.removedElements = comprehensiveResult.removedElements;
          result.removedAttributes = comprehensiveResult.removedAttributes;
          break;
        default:
          // Auto-detect based on threat level
          if (threats.some(t => t.severity === 'high' || t.severity === 'critical')) {
            const comprehensiveResult = await this.comprehensiveSanitizer.sanitize(input, options);
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
    } catch (error) {
      const securityError = this.errorHandler.createError(
        'input_validation_failed',
        'Failed to sanitize input',
        'UnifiedInputSanitizer',
        { input: input.substring(0, 100), options },
        error instanceof Error ? error : undefined
      );
      
      this.errorHandler.handleSecurityError(securityError);
      
      // Return safe fallback
      return {
        sanitized: '',
        wasModified: true,
        threats: [],
        removedElements: ['*'],
        removedAttributes: ['*'],
      };
    }
  }

  private setupDOMPurify(config: InputSanitizationConfig): void {
    DOMPurify.setConfig({
      ALLOWED_TAGS: config.allowedTags,
      ALLOWED_ATTR: Object.values(config.allowedAttributes).flat(),
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/|#)/i,
      KEEP_CONTENT: true,
      SANITIZE_DOM: true,
      WHOLE_DOCUMENT: false,
      FORCE_BODY: false,
    });
  }

  private reportThreats(threats: ThreatDetection[], originalInput: string): void {
    const securityEvent = {
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

  // Additional methods
  isSafe(input: string, type: 'html' | 'text' | 'url' = 'text'): boolean {
    try {
      const result = this.sanitize(input, { mode: 'basic' });
      return !result.wasModified && result.threats.length === 0;
    } catch {
      return false;
    }
  }

  async validateInput<T>(
    schema: Record<string, unknown>,
    input: unknown
  ): Promise<{ success: true; data: T } | { success: false; errors: string[] }> {
    // Simple validation - in real implementation, use a validation library
    return { success: true, data: input as T };
  }
}
```

#### 2.3 Create Unified Error Handler
**File**: `client/src/security/unified/error-handler.ts`

```typescript
/**
 * Unified Security Error Handler
 * Consistent error handling across all security components
 */
import { SecurityError, SecurityErrorResult } from './error-types';
import { SecurityLogger } from './logger';

export class SecurityErrorHandler {
  private config: ErrorHandlingConfig;
  private logger: SecurityLogger;
  private errorStats: ErrorStatistics = {
    totalErrors: 0,
    errorsByType: {},
    errorsBySeverity: {},
    lastError: null,
  };

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
    
    // Update statistics
    this.updateErrorStats(result);
    
    return result;
  }

  private processError(error: SecurityError): SecurityErrorResult {
    return {
      id: this.generateErrorId(),
      error: error,
      timestamp: new Date(),
      severity: this.assessSeverity(error),
      message: this.formatMessage(error),
      context: this.extractContext(error),
      handled: true,
      reported: this.config.reportToBackend,
      suggestedAction: this.getSuggestedAction(error),
    };
  }

  private generateErrorId(): string {
    return `sec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private assessSeverity(error: SecurityError): 'low' | 'medium' | 'high' | 'critical' {
    // Use error's existing severity or assess based on type
    return error.severity || this.assessSeverityByType(error.type);
  }

  private assessSeverityByType(type: SecurityErrorType): 'low' | 'medium' | 'high' | 'critical' {
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

  private formatMessage(error: SecurityError): string {
    return `[${error.component}] ${error.message}`;
  }

  private extractContext(error: SecurityError): Record<string, unknown> {
    const context: Record<string, unknown> = {
      component: error.component,
      timestamp: error.timestamp,
      type: error.type,
    };

    if (error.context) {
      Object.assign(context, error.context);
    }

    if (error.originalError) {
      context.originalError = {
        name: error.originalError.name,
        message: error.originalError.message,
        stack: error.originalError.stack,
      };
    }

    return context;
  }

  private getSuggestedAction(error: SecurityError): string | undefined {
    switch (error.type) {
      case SecurityErrorType.CSP_VIOLATION:
        return 'Review CSP directives and violation reports';
      case SecurityErrorType.INPUT_VALIDATION_FAILED:
        return 'Sanitize input and review validation rules';
      case SecurityErrorType.RATE_LIMIT_EXCEEDED:
        return 'Implement backoff strategy and review rate limits';
      case SecurityErrorType.AUTHENTICATION_FAILED:
        return 'Verify credentials and authentication flow';
      case SecurityErrorType.CSRF_TOKEN_INVALID:
        return 'Refresh CSRF token and verify session';
      case SecurityErrorType.VULNERABILITY_DETECTED:
        return 'Review security scan results and apply fixes';
      default:
        return 'Review error details and take appropriate action';
    }
  }

  private async reportToBackend(result: SecurityErrorResult): Promise<void> {
    try {
      await fetch('/api/security/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result),
      });
    } catch (error) {
      this.logger.error('Failed to report security error to backend', { error });
    }
  }

  private updateErrorStats(result: SecurityErrorResult): void {
    this.errorStats.totalErrors++;
    
    // Update errors by type
    const type = result.error.type;
    this.errorStats.errorsByType[type] = (this.errorStats.errorsByType[type] || 0) + 1;
    
    // Update errors by severity
    const severity = result.severity;
    this.errorStats.errorsBySeverity[severity] = (this.errorStats.errorsBySeverity[severity] || 0) + 1;
    
    // Update last error
    this.errorStats.lastError = result;
  }

  getErrorStats(): ErrorStatistics {
    return { ...this.errorStats };
  }

  clearErrorStats(): void {
    this.errorStats = {
      totalErrors: 0,
      errorsByType: {},
      errorsBySeverity: {},
      lastError: null,
    };
  }
}

interface ErrorStatistics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  lastError: SecurityErrorResult | null;
}
```

### Phase 3: Migration (Files to Update)

#### 3.1 Update Main Security Index
**File**: `client/src/security/index.ts` (Update existing file)

```typescript
/**
 * Security Infrastructure Implementation
 * Comprehensive security system for the Chanuka platform
 */

import { logger } from '@client/utils/logger';

// Import unified components
import { UnifiedSecuritySystem } from './unified/security-system';
import { SecurityCompatibilityLayer } from './migration/compatibility-layer';

// Import legacy components for backward compatibility
import { CSPManager } from './csp-manager';
import { CSRFProtection } from './csrf-protection';
import { InputSanitizer } from './input-sanitizer';
import { RateLimiter } from './rate-limiter';
import { SecurityMonitor } from './security-monitor';
import { VulnerabilityScanner } from './vulnerability-scanner';

export interface SecurityConfig {
  enableCSP: boolean;
  enableCSRF: boolean;
  enableRateLimit: boolean;
  enableVulnerabilityScanning: boolean;
  enableInputSanitization: boolean;
  scanInterval: number;
}

export interface SecuritySystem {
  csp: CSPManager;
  csrf: CSRFProtection;
  sanitizer: InputSanitizer;
  rateLimiter: RateLimiter;
  vulnerabilityScanner: VulnerabilityScanner;
  monitor: SecurityMonitor;
}

let securitySystem: SecuritySystem | null = null;
let unifiedSecuritySystem: UnifiedSecuritySystem | null = null;
let compatibilityLayer: SecurityCompatibilityLayer | null = null;

/**
 * Initialize the security infrastructure
 */
export async function initializeSecurity(config: SecurityConfig): Promise<SecuritySystem> {
  try {
    // Check if we should use unified implementation
    const useUnified = process.env.USE_UNIFIED_SECURITY === 'true' ||
                      process.env.NODE_ENV === 'production';

    if (useUnified) {
      // Initialize unified security system
      logger.info('Initializing unified security system');
      
      const unifiedConfig = await convertToUnifiedConfig(config);
      unifiedSecuritySystem = new UnifiedSecuritySystem();
      await unifiedSecuritySystem.initialize(unifiedConfig);
      
      // Create compatibility wrapper
      compatibilityLayer = new SecurityCompatibilityLayer();
      await compatibilityLayer.initialize(config);
      
      logger.info('Unified security system initialized successfully');
      
      // Return compatibility interface for backward compatibility
      return createCompatibilityInterface();
    } else {
      // Use legacy implementation
      logger.info('Initializing legacy security system');
      return await initializeLegacySecurity(config);
    }
  } catch (error) {
    logger.error('Failed to initialize security infrastructure', error);
    throw error;
  }
}

/**
 * Convert legacy config to unified config
 */
async function convertToUnifiedConfig(legacyConfig: SecurityConfig): Promise<UnifiedSecurityConfig> {
  // Import migration utilities
  const { SecurityMigrationUtils } = await import('./migration/migration-utils');
  
  return SecurityMigrationUtils.migrateConfiguration(legacyConfig);
}

/**
 * Initialize legacy security system
 */
async function initializeLegacySecurity(config: SecurityConfig): Promise<SecuritySystem> {
  // Existing legacy implementation
  if (process.env.NODE_ENV === 'development') {
    logger.info('Development mode: using minimal security configuration');
    
    const mockSecuritySystem = {
      csp: { initialize: async () => {}, getNonce: () => 'dev-nonce' },
      csrf: { initialize: async () => {}, getToken: () => 'dev-token' },
      sanitizer: { sanitize: (input: string) => input },
      rateLimiter: { initialize: async () => {} },
      vulnerabilityScanner: { initialize: async () => {} },
      monitor: { initialize: async () => {} },
    };
    
    return mockSecuritySystem as any;
  }

  logger.info('Initializing security infrastructure', { config });

  // Initialize CSP Manager
  const csp = new CSPManager({
    enabled: config.enableCSP,
    reportUri: '/api/security/csp-report',
    reportOnly: process.env.NODE_ENV === 'development',
  });

  // Initialize CSRF Protection
  const csrf = new CSRFProtection({
    enabled: config.enableCSRF,
    tokenName: 'chanuka-csrf-token',
    headerName: 'X-CSRF-Token',
  });

  // Initialize Input Sanitizer
  const sanitizer = new InputSanitizer({
    enabled: config.enableInputSanitization,
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title'],
    },
  });

  // Initialize Rate Limiter
  const rateLimiter = new RateLimiter({
    enabled: config.enableRateLimit,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // per window
    skipSuccessfulRequests: false,
  });

  // Initialize Vulnerability Scanner
  const vulnerabilityScanner = new VulnerabilityScanner({
    enabled: config.enableVulnerabilityScanning,
    scanInterval: config.scanInterval,
    reportEndpoint: '/api/security/vulnerability-report',
  });

  // Initialize Security Monitor
  const monitor = new SecurityMonitor({
    enabled: true,
    alertThreshold: 5,
    monitoringInterval: 30000, // 30 seconds
  });

  securitySystem = {
    csp,
    csrf,
    sanitizer,
    rateLimiter,
    vulnerabilityScanner,
    monitor,
  };

  // Start security services
  await csp.initialize();
  await csrf.initialize();
  await rateLimiter.initialize();
  await vulnerabilityScanner.initialize();
  await monitor.initialize();

  logger.info('Security infrastructure initialized successfully');
  return securitySystem;
}

/**
 * Create compatibility interface for unified system
 */
function createCompatibilityInterface(): SecuritySystem {
  if (!compatibilityLayer) {
    throw new Error('Compatibility layer not initialized');
  }

  return {
    csp: {
      initialize: async () => {},
      getNonce: () => compatibilityLayer!.generateSecureToken(16),
    },
    csrf: {
      initialize: async () => {},
      getToken: () => compatibilityLayer!.generateSecureToken(32),
    },
    sanitizer: {
      sanitize: (input: string) => compatibilityLayer!.sanitizeInput(input),
    },
    rateLimiter: {
      initialize: async () => {},
    },
    vulnerabilityScanner: {
      initialize: async () => {},
    },
    monitor: {
      initialize: async () => {},
    },
  };
}

/**
 * Get the current security system instance
 */
export function getSecuritySystem(): SecuritySystem | null {
  return securitySystem;
}

/**
 * Get the unified security system instance
 */
export function getUnifiedSecuritySystem(): UnifiedSecuritySystem | null {
  return unifiedSecuritySystem;
}

/**
 * Shutdown security system
 */
export async function shutdownSecurity(): Promise<void> {
  if (securitySystem) {
    await securitySystem.vulnerabilityScanner.shutdown();
    await securitySystem.monitor.shutdown();
    securitySystem = null;
    logger.info('Legacy security infrastructure shut down');
  }

  if (unifiedSecuritySystem) {
    await unifiedSecuritySystem.shutdown();
    unifiedSecuritySystem = null;
    logger.info('Unified security infrastructure shut down');
  }

  if (compatibilityLayer) {
    compatibilityLayer = null;
    logger.info('Compatibility layer shut down');
  }
}

// Export unified components
export { UnifiedSecuritySystem } from './unified/security-system';
export { SecurityCompatibilityLayer } from './migration/compatibility-layer';
export { SecurityMigrationUtils } from './migration/migration-utils';

// Export individual components
export { CSPManager } from './csp-manager';
export { CSRFProtection } from './csrf-protection';
export { InputSanitizer } from './input-sanitizer';
export { RateLimiter } from './rate-limiter';
export { VulnerabilityScanner } from './vulnerability-scanner';
export { SecurityMonitor } from './security-monitor';

// Export types
export type { SecurityEvent, SecurityAlert, VulnerabilityReport } from './types';
```

#### 3.2 Update Core Security Index
**File**: `client/src/core/security/index.ts` (Update existing file)

```typescript
/**
 * Core Security System
 *
 * Foundational security utilities and functions
 */

// Import unified security components
export * from '../security/unified/security-interface';
export * from '../security/unified/error-handler';
export * from '../security/unified/logger';

// Re-export legacy components for backward compatibility
export * from './security-utils';
export { securityUtils } from './security-utils';

// Export migration utilities
export * from '../security/migration/migration-utils';
export * from '../security/migration/compatibility-layer';
```

### Phase 4: Cleanup (Files to Remove)

#### 4.1 Legacy Cleanup Plan
After successful migration and validation:

1. **Remove legacy implementations** (after 2 weeks of stable unified system):
   - `client/src/security/csp-manager.ts` (keep only if needed for compatibility)
   - `client/src/security/input-sanitizer.ts` (keep only if needed for compatibility)
   - `client/src/security/rate-limiter.ts` (keep only if needed for compatibility)

2. **Update imports** throughout codebase:
   - Replace direct imports of legacy components with unified components
   - Update type imports to use unified interfaces

3. **Remove compatibility layer** (after 1 month of stable unified system):
   - `client/src/security/migration/compatibility-layer.ts`
   - `client/src/security/migration/migration-utils.ts`

4. **Final cleanup**:
   - Remove feature flags for unified security
   - Update documentation to reflect unified system
   - Remove legacy configuration options

## Migration Checklist

### Pre-Migration
- [ ] Create unified security interface
- [ ] Implement compatibility layer
- [ ] Create migration utilities
- [ ] Set up feature flags
- [ ] Create backup of current system

### During Migration
- [ ] Enable unified system in development
- [ ] Test compatibility layer
- [ ] Gradually enable unified system in staging
- [ ] Monitor for issues
- [ ] Enable unified system in production

### Post-Migration
- [ ] Monitor unified system performance
- [ ] Remove legacy implementations
- [ ] Clean up imports
- [ ] Update documentation
- [ ] Train team on new system

## Rollback Plan

If issues are discovered during migration:

1. **Immediate rollback**: Set `USE_UNIFIED_SECURITY=false` environment variable
2. **System restart**: Restart application to use legacy system
3. **Issue investigation**: Analyze and fix issues in unified system
4. **Gradual re-enablement**: Re-enable unified system after fixes

This migration plan ensures a smooth transition from the dual implementation architecture to a unified, consistent security system while maintaining backward compatibility and minimizing risk.
