/**
 * Security Migration Compatibility Layer
 * Ensures backward compatibility during migration
 */

import { inputSanitizer } from '../input-sanitizer';
import { clientRateLimiter, RateLimiter, RateLimitConfigs } from '../rate-limiter';
import { SecurityService } from '../security-service';
import { securityUtils } from '../security-utils';
import { STANDARD_CSP_CONFIG } from '../unified/csp-config';
import { UnifiedCSPManager } from '../unified/csp-manager';
import { SecurityErrorHandler } from '../unified/error-handler';
import { SecurityErrorMiddleware } from '../unified/error-middleware';
import { UnifiedInputSanitizer } from '../unified/input-sanitizer';
import { UnifiedRateLimiter } from '../unified/rate-limiter';
import { UnifiedSecuritySystem } from '../unified';

// Legacy security system imports
import {
  UnifiedSecurityConfig,
  SecurityComponent,
  SecurityHealth,
  SecurityMetrics
} from '../unified/security-interface';

export interface LegacySecurityConfig {
  enableCSP: boolean;
  enableInputSanitization: boolean;
  enableRateLimit: boolean;
  enableCSRF: boolean;
  enableVulnerabilityScanning: boolean;
  csp?: {
    nonce?: string;
    directives?: Record<string, string[]>;
  };
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  windowMs?: number;
  maxRequests?: number;
}

export class SecurityCompatibilityLayer {
  private legacySecurity: LegacySecuritySystem;
  private _unifiedSecurity?: UnifiedSecuritySystem;
  private featureFlags: Record<string, boolean>;
  private config: UnifiedSecurityConfig;

  constructor() {
    this.featureFlags = this.initializeFeatureFlags();
    this.config = this.getDefaultConfig();

    this.legacySecurity = new LegacySecuritySystem();
    // Validated: unifiedSecurity is initialized lazily to avoid circular dependency ReferenceErrors
  }

  private get unifiedSecurity(): UnifiedSecuritySystem {
    if (!this._unifiedSecurity) {
      this._unifiedSecurity = new UnifiedSecuritySystem(this.config);
    }
    return this._unifiedSecurity;
  }

  async initialize(config: LegacySecurityConfig | UnifiedSecurityConfig): Promise<void> {
    // Determine if this is legacy or unified config
    const isLegacy = 'enableCSP' in config;

    if (isLegacy) {
      this.config = this.convertLegacyConfig(config as LegacySecurityConfig);
    } else {
      this.config = config as UnifiedSecurityConfig;
    }

    // Initialize both systems during transition period
    await this.legacySecurity.initialize(config as LegacySecurityConfig);
    // Accessing getter triggers initialization
    await this.unifiedSecurity.initialize(this.config);
  }

  // Legacy API compatibility methods
  async sanitizeInput(input: string): Promise<string> {
    // Route to appropriate implementation based on configuration
    if (this.shouldUseUnifiedImplementation('inputSanitization')) {
      const result = await this.unifiedSecurity.sanitizer.sanitize(input);
      return result.sanitized;
    } else {
      return this.legacySecurity.sanitizeInput(input);
    }
  }

  async checkRateLimit(key: string, configName: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    if (this.shouldUseUnifiedImplementation('rateLimiting')) {
      const config = RateLimitConfigs[configName as keyof typeof RateLimitConfigs] || RateLimitConfigs.normal;
      return this.unifiedSecurity.rateLimiter.checkLimit(key, config);
    } else {
      return this.legacySecurity.checkRateLimit(key, configName);
    }
  }

  async generateCSPHeader(directives?: Record<string, string[]>): Promise<string> {
    if (this.shouldUseUnifiedImplementation('csp')) {
      const cspManager = new UnifiedCSPManager({
        enabled: true,
        reportOnly: false,
        directives: directives as any || STANDARD_CSP_CONFIG.development,
        reportUri: '/api/security/csp-violations',
      });
      return cspManager.generateCSPHeader();
    } else {
      return this.legacySecurity.generateCSPHeader(directives);
    }
  }

  async validatePassword(password: string): Promise<{
    score: number;
    feedback: string[];
    isValid: boolean;
  }> {
    if (this.shouldUseUnifiedImplementation('inputSanitization')) {
      // Use unified sanitizer for validation
      const result = await this.unifiedSecurity.sanitizer.sanitize(password);
      const score = result.threats.length === 0 ? 5 : 1;
      return {
        score,
        feedback: result.threats.map(t => t.description),
        isValid: score >= 4,
      };
    } else {
      return this.legacySecurity.validatePasswordStrength(password);
    }
  }

  async hashData(data: string): Promise<string> {
    if (this.shouldUseUnifiedImplementation('inputSanitization')) {
      // Use Web Crypto API directly
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      return this.legacySecurity.hashData(data);
    }
  }

  // Unified API methods
  getHealthStatus(): SecurityHealth {
    if (this.shouldUseUnifiedImplementation('all')) {
      return this.unifiedSecurity.getHealthStatus();
    } else {
      return this.legacySecurity.getHealthStatus();
    }
  }

  getMetrics(): SecurityMetrics {
    if (this.shouldUseUnifiedImplementation('all')) {
      return this.unifiedSecurity.getMetrics();
    } else {
      return this.legacySecurity.getMetrics();
    }
  }

  async shutdown(): Promise<void> {
    await this.legacySecurity.shutdown();
    await this.unifiedSecurity.shutdown();
  }

  // Feature flag management
  setFeatureFlag(flag: string, enabled: boolean): void {
    this.featureFlags[flag] = enabled;
  }

  getFeatureFlag(flag: string): boolean {
    return this.featureFlags[flag] || false;
  }

  private shouldUseUnifiedImplementation(component: string): boolean {
    // Check environment variable first
    if (process.env.USE_UNIFIED_SECURITY === 'true') {
      return true;
    }

    // Check feature flags
    if (this.featureFlags[component] !== undefined) {
      return this.featureFlags[component];
    }

    // Default to unified in production
    return process.env.NODE_ENV === 'production';
  }

  private initializeFeatureFlags(): Record<string, boolean> {
    return {
      csp: process.env.NODE_ENV === 'production',
      inputSanitization: true,
      rateLimiting: process.env.NODE_ENV === 'production',
      errorHandling: true,
      all: process.env.NODE_ENV === 'production',
    };
  }

  private getDefaultConfig(): UnifiedSecurityConfig {
    return {
      csp: {
        enabled: true,
        reportOnly: false,
        directives: STANDARD_CSP_CONFIG.development,
        nonce: undefined,
      },
      inputSanitization: {
        enabled: true,
        mode: 'comprehensive',
        allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'a'],
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
  }

  private convertLegacyConfig(legacyConfig: LegacySecurityConfig): UnifiedSecurityConfig {
    return {
      csp: {
        enabled: legacyConfig.enableCSP,
        reportOnly: process.env.NODE_ENV === 'development',
        directives: legacyConfig.csp?.directives as any || STANDARD_CSP_CONFIG.development,
        nonce: legacyConfig.csp?.nonce,
      },
      inputSanitization: {
        enabled: legacyConfig.enableInputSanitization,
        mode: 'comprehensive',
        allowedTags: legacyConfig.allowedTags || ['b', 'i', 'em', 'strong', 'p', 'br'],
        allowedAttributes: legacyConfig.allowedAttributes || {},
      },
      rateLimiting: {
        enabled: legacyConfig.enableRateLimit,
        windowMs: legacyConfig.windowMs || 900000,
        maxRequests: legacyConfig.maxRequests || 100,
      },
      errorHandling: {
        mode: 'strict',
        logLevel: 'info',
        reportToBackend: true,
      },
    };
  }
}

/**
 * Legacy Security System - Wrapper for existing security utilities
 */
class LegacySecuritySystem {
  async initialize(config: LegacySecurityConfig): Promise<void> {
    // Initialize legacy security utilities
    if (config.enableCSP) {
      const cspHeader = securityUtils.generateCSPHeader(config.csp?.directives as any);
      // Apply CSP header (would be done via HTTP headers in real implementation)
      console.log('Legacy CSP initialized:', cspHeader);
    }
  }

  sanitizeInput(input: string): string {
    return securityUtils.sanitizeInput(input);
  }

  checkRateLimit(key: string, configName: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    // Use legacy rate limiter
    const rateLimiter = new securityUtils.RateLimiter();
    const allowed = rateLimiter.isAllowed(key);
    return Promise.resolve({
      allowed,
      remaining: allowed ? 10 : 0,
      resetTime: Date.now() + 900000,
    });
  }

  generateCSPHeader(directives?: Record<string, string[]>): string {
    return securityUtils.generateCSPHeader(directives as any);
  }

  validatePasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isValid: boolean;
  } {
    return securityUtils.validatePasswordStrength(password);
  }

  async hashData(data: string): Promise<string> {
    return securityUtils.hashData(data);
  }

  getHealthStatus(): SecurityHealth {
    return {
      enabled: true,
      status: 'healthy',
      lastCheck: new Date(),
      issues: [],
    };
  }

  getMetrics(): SecurityMetrics {
    return {
      requestsProcessed: 0,
      threatsBlocked: 0,
      averageResponseTime: 0,
      errorRate: 0,
    };
  }

  async shutdown(): Promise<void> {
    console.log('Legacy security system shutdown complete');
  }
}



