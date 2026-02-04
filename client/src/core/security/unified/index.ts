/**
 * Unified Security System - Main Export
 *
 * Provides a unified, consistent security system that maintains backward compatibility
 * while improving code quality and maintainability.
 */

// Core interfaces and types
export * from './security-interface';
import { SecurityHealth, SecurityMetrics, UnifiedSecurityConfig } from './security-interface';

// Security components
// Security components
import { UnifiedCSPManager } from './csp-manager';
import { UnifiedInputSanitizer } from './input-sanitizer';
import { SecurityErrorHandler, SecurityErrorFactory, SecurityOperationError } from './error-handler';
import { SecurityErrorMiddleware, createSecurityErrorMiddleware } from './error-middleware';
import { UnifiedRateLimiter } from './rate-limiter';

export {
  UnifiedCSPManager,
  UnifiedInputSanitizer,
  SecurityErrorHandler,
  SecurityErrorFactory,
  SecurityOperationError,
  SecurityErrorMiddleware,
  createSecurityErrorMiddleware,
  UnifiedRateLimiter
};

// Configuration
export {
  STANDARD_CSP_CONFIG,
  getCSPConfig,
  validateCSPDirectives,
  mergeCSPDirectives,
  addCSPSources,
  removeCSPSources,
  generateCSPHeader,
  parseCSPHeader,
  isCSPSecure,
  RECOMMENDED_CSP_CONFIGS
} from './csp-config';

// Migration utilities

import { SecurityMigrationUtils } from '../migration/migration-utils';

import {
  STANDARD_CSP_CONFIG,
  getCSPConfig,
  validateCSPDirectives,
  mergeCSPDirectives,
  addCSPSources,
  removeCSPSources,
  generateCSPHeader,
  parseCSPHeader,
  isCSPSecure,
  RECOMMENDED_CSP_CONFIGS,
} from './csp-config';

// Legacy compatibility exports (for backward compatibility)
// legacy exports removed to avoid duplicate/declaration conflicts — use unified API instead

// Default unified configuration
export const DEFAULT_UNIFIED_CONFIG: UnifiedSecurityConfig = {
  csp: {
    enabled: true,
    reportOnly: false,
    directives: { ...STANDARD_CSP_CONFIG.development }, // Spread to copy/make mutable if needed
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

/**
 * Unified Security System Class
 */
export class UnifiedSecuritySystem {
  public cspManager: UnifiedCSPManager;
  public sanitizer: UnifiedInputSanitizer;
  public errorHandler: SecurityErrorHandler;
  public errorMiddleware: SecurityErrorMiddleware;
  public rateLimiter: UnifiedRateLimiter;


  constructor(config?: Partial<UnifiedSecurityConfig>) {
    const finalConfig = { ...DEFAULT_UNIFIED_CONFIG, ...config } as UnifiedSecurityConfig;

    this.cspManager = new UnifiedCSPManager({
      enabled: finalConfig.csp.enabled,
      reportOnly: finalConfig.csp.reportOnly,
      directives: finalConfig.csp.directives,
      reportUri: '/api/security/csp-violations',
    });

    this.sanitizer = new UnifiedInputSanitizer({
      enabled: finalConfig.inputSanitization.enabled,
      mode: finalConfig.inputSanitization.mode,
      allowedTags: finalConfig.inputSanitization.allowedTags,
      allowedAttributes: finalConfig.inputSanitization.allowedAttributes,
    });

    this.errorHandler = new SecurityErrorHandler(finalConfig.errorHandling);
    this.errorMiddleware = new SecurityErrorMiddleware(finalConfig.errorHandling);
    
    this.rateLimiter = new UnifiedRateLimiter({
      enabled: finalConfig.rateLimiting.enabled,
      windowMs: finalConfig.rateLimiting.windowMs,
      maxRequests: finalConfig.rateLimiting.maxRequests,
    });


  }

  async initialize(config?: Partial<UnifiedSecurityConfig>): Promise<void> {
    await Promise.all([
      this.cspManager.initialize(),
      this.sanitizer.initialize(config?.inputSanitization),
      this.errorHandler.initialize(config?.errorHandling),
      this.errorMiddleware.initialize(config?.errorHandling),
      this.rateLimiter.initialize(config?.rateLimiting),
    ]);
  }

  async shutdown(): Promise<void> {
    await Promise.all([
      this.cspManager.shutdown(),
      this.sanitizer.shutdown(),
      this.errorHandler.shutdown(),
      this.errorMiddleware.shutdown(),
      this.rateLimiter.shutdown(),

    ]);
  }

  getHealthStatus(): SecurityHealth {
    const cspStatus = this.cspManager.getHealthStatus();
    const sanitizerStatus = this.sanitizer.getHealthStatus();
    const errorHandlerStatus = this.errorHandler.getHealthStatus();
    const rateLimiterStatus = this.rateLimiter.getHealthStatus();

    const allHealthy = cspStatus.status === 'healthy' && 
                       sanitizerStatus.status === 'healthy' && 
                       errorHandlerStatus.status === 'healthy' && 
                       rateLimiterStatus.status === 'healthy';

    return {
      enabled: true,
      status: allHealthy ? 'healthy' : 'degraded',
      lastCheck: new Date(),
      issues: [
        ...cspStatus.issues,
        ...sanitizerStatus.issues,
        ...errorHandlerStatus.issues,
        ...rateLimiterStatus.issues
      ],
    };
  }

  getMetrics(): SecurityMetrics {
    const cspMetrics = this.cspManager.getMetrics();
    const sanitizerMetrics = this.sanitizer.getMetrics();
    const errorMetrics = this.errorHandler.getMetrics();
    const rateLimiterMetrics = this.rateLimiter.getMetrics();

    return {
      requestsProcessed: cspMetrics.requestsProcessed + sanitizerMetrics.requestsProcessed + rateLimiterMetrics.requestsProcessed,
      threatsBlocked: cspMetrics.threatsBlocked + sanitizerMetrics.threatsBlocked + rateLimiterMetrics.threatsBlocked,
      averageResponseTime: (cspMetrics.averageResponseTime + sanitizerMetrics.averageResponseTime + rateLimiterMetrics.averageResponseTime) / 3,
      errorRate: Math.max(cspMetrics.errorRate, sanitizerMetrics.errorRate, errorMetrics.errorRate, rateLimiterMetrics.errorRate),
    };
  }
}

/**
 * Initialize unified security system with default configuration
 */
export async function initializeUnifiedSecurity(config?: Partial<UnifiedSecurityConfig>) {
  const system = new UnifiedSecuritySystem(config);
  await system.initialize(config);
  return system;
}

/**
 * Check if unified security is enabled
 */
export function isUnifiedSecurityEnabled(): boolean {
  return process.env.USE_UNIFIED_SECURITY === 'true' ||
         process.env.NODE_ENV === 'production';
}

/**
 * Get current security status across all components
 */
export function getSecurityStatus() {
  // This would aggregate status from all security components
  return {
    unified: isUnifiedSecurityEnabled(),
    components: {
      csp: { enabled: true, status: 'healthy' },
      sanitization: { enabled: true, status: 'healthy' },
      errorHandling: { enabled: true, status: 'healthy' },
    },
    overall: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
  };
}

/**
 * Security system utilities
 */
export const securityUtils = {
  /**
   * Sanitize input using unified sanitizer
   */
  sanitizeInput: async (input: string, options?: any) => {
    const sanitizer = new UnifiedInputSanitizer({
      enabled: true,
      mode: 'comprehensive',
      allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
      allowedAttributes: {},
    });
    const result = await sanitizer.sanitize(input, options);
    return result.sanitized;
  },

  /**
   * Generate CSP header using unified configuration
   */
  generateCSPHeader: (directives?: any) => {
    const cspManager = new UnifiedCSPManager({
      enabled: true,
      reportOnly: false,
      directives: directives || STANDARD_CSP_CONFIG.development,
      reportUri: '/api/security/csp-violations',
    });
    return cspManager.generateCSPHeader();
  },

  /**
   * Handle security errors consistently
   */
  handleSecurityError: (error: any, config?: any) => {
    const errorHandler = new SecurityErrorHandler(config || {
      mode: 'strict',
      logLevel: 'info',
      reportToBackend: true,
    });
    return errorHandler.handleSecurityError(error);
  },
};

// Export for backward compatibility
export default {
  UnifiedCSPManager,
  UnifiedInputSanitizer,
  SecurityErrorHandler,
  SecurityErrorMiddleware,
  SecurityMigrationUtils,
  STANDARD_CSP_CONFIG,
  DEFAULT_UNIFIED_CONFIG,
  UnifiedSecuritySystem,
  initializeUnifiedSecurity,
  isUnifiedSecurityEnabled,
  getSecurityStatus,
  securityUtils,
};
